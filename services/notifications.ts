import * as Notifications from 'expo-notifications';
import { Platform } from 'react-native';
import Constants from 'expo-constants';
import { api } from '@/lib/api';

// Configure how notifications are handled when app is in foreground
Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowAlert: true,
    shouldPlaySound: true,
    shouldSetBadge: true,
  }),
});

// Alert type to notification title mapping (user-friendly)
const ALERT_TITLES: Record<string, string> = {
  'WATER_DETECTED': '💧 Water Detected',
  'GAS_LEAK_DETECTED': '🚨 Gas Leak Alert',
  'HIGH_TEMPERATURE': '🌡️ High Temperature Warning',
  'GROUND_MOVEMENT_DETECTED': '⚠️ Ground Movement Detected',
  'POWER_ABNORMAL': '⚡ Power Issue Detected',
  'MULTIPLE_HAZARDS': '🚨 Multiple Hazards Detected',
};

// Alert type to user-friendly body message templates
const ALERT_MESSAGES: Record<string, (alert: { deviceId: string; sensor?: string; value?: number }) => string> = {
  'WATER_DETECTED': (alert) => {
    const location = alert.sensor?.startsWith('ZONE') 
      ? alert.sensor.replace('ZONE', 'Zone ') 
      : alert.sensor || 'your property';
    return `Water has been detected in ${location}. Please check the area immediately.`;
  },
  'GAS_LEAK_DETECTED': (alert) => {
    return `A gas leak has been detected! Please evacuate the area immediately and contact emergency services.`;
  },
  'HIGH_TEMPERATURE': (alert) => {
    const temp = alert.value ? `${alert.value.toFixed(1)}°C` : 'an elevated level';
    return `High temperature detected (${temp}). Please check your property for potential fire hazards.`;
  },
  'GROUND_MOVEMENT_DETECTED': (alert) => {
    const intensity = alert.value ? ` (Intensity: ${alert.value.toFixed(2)})` : '';
    return `Ground movement detected${intensity}. This may indicate seismic activity or structural issues.`;
  },
  'POWER_ABNORMAL': (alert) => {
    return `An abnormal power condition has been detected. Please check your electrical system.`;
  },
  'MULTIPLE_HAZARDS': (alert) => {
    return `Multiple hazards have been detected simultaneously. Please check your property immediately and ensure your safety.`;
  },
};

// Alert priority levels for notification priority
const ALERT_PRIORITY: Record<string, Notifications.AndroidNotificationPriority> = {
  'GAS_LEAK_DETECTED': Notifications.AndroidNotificationPriority.HIGH,
  'MULTIPLE_HAZARDS': Notifications.AndroidNotificationPriority.HIGH,
  'POWER_ABNORMAL': Notifications.AndroidNotificationPriority.DEFAULT,
  'GROUND_MOVEMENT_DETECTED': Notifications.AndroidNotificationPriority.DEFAULT,
  'WATER_DETECTED': Notifications.AndroidNotificationPriority.DEFAULT,
  'HIGH_TEMPERATURE': Notifications.AndroidNotificationPriority.DEFAULT,
};

export interface NotificationService {
  requestPermissions: () => Promise<boolean>;
  registerForPushNotifications: () => Promise<string | null>;
  sendLocalNotification: (alert: {
    id: string;
    deviceId: string;
    alertType: string;
    sensor?: string;
    value?: number;
    receivedAt: string;
  }) => Promise<void>;
  getExpoPushToken: () => Promise<string | null>;
}

class NotificationServiceImpl implements NotificationService {
  private expoPushToken: string | null = null;

  /**
   * Request notification permissions from the user
   */
  async requestPermissions(): Promise<boolean> {
    try {
      const { status: existingStatus } = await Notifications.getPermissionsAsync();
      let finalStatus = existingStatus;

      if (existingStatus !== 'granted') {
        const { status } = await Notifications.requestPermissionsAsync();
        finalStatus = status;
      }

      if (finalStatus !== 'granted') {
        console.warn('⚠️ Notification permissions not granted');
        return false;
      }

      console.log('✅ Notification permissions granted');
      return true;
    } catch (error) {
      console.error('❌ Error requesting notification permissions:', error);
      return false;
    }
  }

  /**
   * Register for push notifications and get Expo push token
   */
  async registerForPushNotifications(): Promise<string | null> {
    try {
      // Request permissions first
      const hasPermission = await this.requestPermissions();
      if (!hasPermission) {
        return null;
      }

      // Try to get projectId from various sources
      const projectId = 
        process.env.EXPO_PUBLIC_PROJECT_ID || 
        Constants.expoConfig?.extra?.eas?.projectId ||
        Constants.expoConfig?.extra?.projectId;

      if (!projectId) {
        console.warn('⚠️ No projectId found. Push notifications will not work, but local notifications will still function.');
        console.warn('   To enable push notifications, set EXPO_PUBLIC_PROJECT_ID in your .env file or configure EAS project.');
        return null;
      }

      // Get the Expo push token
      const tokenData = await Notifications.getExpoPushTokenAsync({
        projectId: projectId,
      });

      this.expoPushToken = tokenData.data;
      console.log('✅ Expo push token obtained:', this.expoPushToken);

      // Send token to backend
      await this.sendTokenToBackend(this.expoPushToken);

      return this.expoPushToken;
    } catch (error) {
      console.error('❌ Error registering for push notifications:', error);
      // Don't fail completely - local notifications will still work
      return null;
    }
  }

  /**
   * Get the current Expo push token (without re-registering)
   */
  async getExpoPushToken(): Promise<string | null> {
    if (this.expoPushToken) {
      return this.expoPushToken;
    }

    try {
      // Try to get projectId from various sources
      const projectId = 
        process.env.EXPO_PUBLIC_PROJECT_ID || 
        Constants.expoConfig?.extra?.eas?.projectId ||
        Constants.expoConfig?.extra?.projectId;

      if (!projectId) {
        return null;
      }

      const tokenData = await Notifications.getExpoPushTokenAsync({
        projectId: projectId,
      });
      this.expoPushToken = tokenData.data;
      return this.expoPushToken;
    } catch (error) {
      console.error('❌ Error getting Expo push token:', error);
      return null;
    }
  }

  /**
   * Send push token to backend API
   */
  private async sendTokenToBackend(token: string): Promise<void> {
    try {
      const platform = Platform.OS;
      // Use installationId from Constants as device identifier, or null
      const deviceId = Constants.installationId || null;
      
      const response = await api.registerPushToken(token, platform, deviceId);
      if (response.error) {
        console.error('❌ Error registering push token:', response.error);
      } else {
        console.log('✅ Push token registered with backend');
      }
    } catch (error) {
      console.error('❌ Error sending push token to backend:', error);
    }
  }

  /**
   * Send a local notification for an alert
   */
  async sendLocalNotification(alert: {
    id: string;
    deviceId: string;
    alertType: string;
    sensor?: string;
    value?: number;
    receivedAt: string;
  }): Promise<void> {
    try {
      const title = ALERT_TITLES[alert.alertType] || `⚠️ ${alert.alertType.replace(/_/g, ' ')}`;
      
      // Get user-friendly message
      const messageTemplate = ALERT_MESSAGES[alert.alertType];
      const body = messageTemplate 
        ? messageTemplate(alert)
        : `Alert detected: ${alert.alertType}. Please check your device.`;

      // Determine priority
      const priority = ALERT_PRIORITY[alert.alertType] || Notifications.AndroidNotificationPriority.DEFAULT;

      // Schedule notification
      await Notifications.scheduleNotificationAsync({
        content: {
          title,
          body,
          sound: true,
          data: {
            alertId: alert.id,
            deviceId: alert.deviceId,
            alertType: alert.alertType,
            sensor: alert.sensor,
            value: alert.value,
            receivedAt: alert.receivedAt,
          },
          ...(Platform.OS === 'android' && {
            priority,
            channelId: 'alerts',
          }),
        },
        trigger: null, // Show immediately
      });

      console.log(`✅ Local notification sent for alert: ${alert.alertType}`);
    } catch (error) {
      console.error('❌ Error sending local notification:', error);
    }
  }
}

// Export singleton instance
export const notificationService = new NotificationServiceImpl();

// Export types and constants
export { ALERT_TITLES, ALERT_PRIORITY, ALERT_MESSAGES };

