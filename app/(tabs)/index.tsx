import { useAuth } from '@/contexts/auth-context';
import { api, Alert, Device, SensorReading } from '@/lib/api';
import { OverallAnalytics } from '@/components/OverallAnalytics';
import { OutletModal } from '@/components/OutletModal';
import { useWebSocket } from '@/hooks/useWebSocket';
import { splitSensorDataByOutlet, OutletData } from '@/lib/outlet-utils';
import { notificationService } from '@/services/notifications';
import { Ionicons } from '@expo/vector-icons';
import React, { useCallback, useEffect, useState, useRef } from 'react';
import * as Notifications from 'expo-notifications';
import { Swipeable } from 'react-native-gesture-handler';
import Animated, {
  useAnimatedStyle,
  useSharedValue,
  withTiming,
  interpolate,
  Extrapolate,
} from 'react-native-reanimated';
import {
  ActivityIndicator,
  Alert as RNAlert,
  Animated as RNAnimated,
  LayoutAnimation,
  Platform,
  RefreshControl,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

const COLORS = {
  primary: '#FF8C42',
  primaryLight: '#FFA660',
  white: '#FFFFFF',
  cardBg: '#FFFFFF',
  shadow: '#000000',
  success: '#4CAF50',
  warning: '#FFC107',
  danger: '#F44336',
  text: '#333333',
  textLight: '#666666',
};

// Alert type to icon and color mapping
const ALERT_CONFIG: Record<string, { icon: keyof typeof Ionicons.glyphMap; color: string; label: string }> = {
  'WATER_DETECTED': { icon: 'water', color: '#2196F3', label: 'Water Detected' },
  'GAS_LEAK_DETECTED': { icon: 'cloud', color: '#9C27B0', label: 'Gas Leak' },
  'HIGH_TEMPERATURE': { icon: 'thermometer', color: '#F44336', label: 'High Temperature' },
  'GROUND_MOVEMENT_DETECTED': { icon: 'pulse', color: '#FF9800', label: 'Ground Movement' },
  'POWER_ABNORMAL': { icon: 'flash', color: '#FFC107', label: 'Power Abnormal' },
  'MULTIPLE_HAZARDS': { icon: 'alert-circle', color: '#F44336', label: 'Multiple Hazards' },
};

// Alert priority levels (higher number = higher priority)
const ALERT_PRIORITY: Record<string, number> = {
  'GAS_LEAK_DETECTED': 3,      // High priority - critical safety issue
  'MULTIPLE_HAZARDS': 3,       // High priority - multiple issues
  'POWER_ABNORMAL': 2,         // Medium priority
  'GROUND_MOVEMENT_DETECTED': 1, // Low priority
  'WATER_DETECTED': 0,         // Filtered out but defined for completeness
  'HIGH_TEMPERATURE': 0,       // Filtered out but defined for completeness
};

// Get alert priority (defaults to 0 if not found)
const getAlertPriority = (alertType: string): number => {
  return ALERT_PRIORITY[alertType] ?? 0;
};

// Swipeable Alert Item Component
interface SwipeableAlertItemProps {
  alert: Alert;
  config: { icon: keyof typeof Ionicons.glyphMap; color: string; label: string };
  isRemoving: boolean;
  isArchiving: boolean;
  onArchive: (alertId: string) => void;
  swipeableRef: (ref: Swipeable | null) => void;
  renderRightActions: (
    progress: RNAnimated.AnimatedInterpolation<number>,
    dragX: RNAnimated.AnimatedInterpolation<number>,
    alertId: string
  ) => React.ReactElement;
}

const SwipeableAlertItem: React.FC<SwipeableAlertItemProps> = ({
  alert,
  config,
  isRemoving,
  isArchiving,
  onArchive,
  swipeableRef,
  renderRightActions,
}) => {
  // Animated values for item removal
  const itemOpacity = useSharedValue(1);
  const itemTranslateX = useSharedValue(0);
  const itemHeight = useSharedValue(100);
  
  // Track current swipe progress for time fade
  const swipeProgressValue = useRef(new RNAnimated.Value(0));
  const progressListenerIdRef = useRef<string | null>(null);

  React.useEffect(() => {
    if (isRemoving) {
      itemOpacity.value = withTiming(0, { duration: 250 });
      itemTranslateX.value = withTiming(-1000, { duration: 300 });
      itemHeight.value = withTiming(0, { duration: 300 });
    } else {
      // Reset values when not removing
      itemOpacity.value = 1;
      itemTranslateX.value = 0;
      itemHeight.value = 100;
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isRemoving]);

  // Cleanup listener on unmount
  React.useEffect(() => {
    return () => {
      if (progressListenerIdRef.current && swipeProgressValue.current) {
        swipeProgressValue.current.removeListener(progressListenerIdRef.current);
      }
    };
  }, []);

  // Animate time text - slides left and fades out as swipe progresses
  // This makes room for the delete icon to appear
  const timeOpacity = swipeProgressValue.current.interpolate({
    inputRange: [0, 0.3, 1],
    outputRange: [1, 0.3, 0],
    extrapolate: 'clamp',
  });

  // Slide time text to the left as swipe progresses (makes room for delete icon)
  const timeTranslateX = swipeProgressValue.current.interpolate({
    inputRange: [0, 0.5, 1],
    outputRange: [0, -40, -80],
    extrapolate: 'clamp',
  });

  const animatedItemStyle = useAnimatedStyle(() => {
    return {
      opacity: itemOpacity.value,
      transform: [{ translateX: itemTranslateX.value }],
      maxHeight: itemHeight.value,
      overflow: 'hidden' as const,
    };
  });

  return (
    <Animated.View style={animatedItemStyle}>
      <Swipeable
        ref={swipeableRef}
        renderRightActions={(progress, dragX) => {
          // Update swipe progress for time fade animation
          // Only add listener once
          if (!progressListenerIdRef.current) {
            progressListenerIdRef.current = progress.addListener(({ value }) => {
              swipeProgressValue.current.setValue(value);
            });
          }
          return renderRightActions(progress, dragX, alert.id);
        }}
        overshootRight={false}
        overshootLeft={false}
        friction={1.5}
        enableTrackpadTwoFingerGesture={false}
        rightThreshold={60}
        onSwipeableOpen={(direction) => {
          if (direction === 'right') {
            onArchive(alert.id);
          }
        }}
        onSwipeableClose={() => {
          // Reset time opacity when swipe closes
          swipeProgressValue.current.setValue(0);
          // Clean up listener
          if (progressListenerIdRef.current) {
            swipeProgressValue.current.removeListener(progressListenerIdRef.current);
            progressListenerIdRef.current = null;
          }
        }}
      >
        <View style={styles.alertItem}>
          <View style={[styles.alertIconBg, { backgroundColor: config.color + '20' }]}>
            <Ionicons name={config.icon} size={18} color={config.color} />
          </View>
          <View style={styles.alertInfo}>
            <View style={styles.alertHeader}>
              <Text style={styles.alertLabel}>{config.label}</Text>
              {!alert.isActive && (
                <View style={styles.clearedBadge}>
                  <Text style={styles.clearedBadgeText}>Cleared</Text>
                </View>
              )}
            </View>
            {alert.alertType === 'WATER_DETECTED' && alert.sensor && (
              <Text style={styles.alertValue}>
                {alert.sensor.startsWith('ZONE') ? alert.sensor.replace('ZONE', 'Zone ') : alert.sensor}
              </Text>
            )}
            {alert.value !== null && alert.value !== undefined && alert.alertType !== 'WATER_DETECTED' && (
              <Text style={styles.alertValue}>
                Value: {typeof alert.value === 'number' ? alert.value.toFixed(2) : alert.value}
              </Text>
            )}
          </View>
          <RNAnimated.Text 
            style={[
              styles.alertTime, 
              { 
                opacity: timeOpacity,
                transform: [{ translateX: timeTranslateX }],
              }
            ]}
          >
            {new Date(alert.receivedAt).toLocaleTimeString([], { 
              hour: '2-digit', 
              minute: '2-digit' 
            })}
          </RNAnimated.Text>
        </View>
      </Swipeable>
    </Animated.View>
  );
};

export default function HomeScreen() {
  const { user } = useAuth();
  const { isConnected: wsConnected, sendCommand: wsSendCommand } = useWebSocket();
  const [alerts, setAlerts] = useState<Alert[]>([]);
  const [devices, setDevices] = useState<Device[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [commandLoading, setCommandLoading] = useState<string | null>(null);
  const [isAlertsCollapsed, setIsAlertsCollapsed] = useState(true); // Collapsed by default
  const [alertFilter, setAlertFilter] = useState<'all' | 'active' | string>('all');
  const [modalVisible, setModalVisible] = useState(false);
  const [selectedOutlet, setSelectedOutlet] = useState<1 | 2>(1);
  const [sensorReading, setSensorReading] = useState<SensorReading | null>(null);
  const [outletsData, setOutletsData] = useState<[OutletData, OutletData] | null>(null);
  const [archivingAlertId, setArchivingAlertId] = useState<string | null>(null);
  const [removingAlertIds, setRemovingAlertIds] = useState<Set<string>>(new Set());
  const swipeableRefs = useRef<Map<string, Swipeable>>(new Map());
  const [isPowerTripped, setIsPowerTripped] = useState(false);
  
  // Swipe threshold (in pixels) - 60% of delete button width
  const SWIPE_THRESHOLD = 60;

  const fetchData = useCallback(async () => {
    try {
      const [alertsRes, devicesRes, sensorRes] = await Promise.all([
        api.getAllAlerts(100), // Get all alerts (up to 100)
        api.getDevices(),
        api.getLatestSensorReading(),
      ]);

      if (alertsRes.data) {
        console.log('📊 Fetched alerts:', JSON.stringify(alertsRes.data.alerts, null, 2));
        setAlerts(alertsRes.data.alerts);
      }
      if (devicesRes.data) {
        setDevices(devicesRes.data.devices);
      }
      if (sensorRes.data?.reading) {
        setSensorReading(sensorRes.data.reading);
        // Split sensor data by outlet (assuming breakers are both ON by default)
        const outletData = splitSensorDataByOutlet(sensorRes.data.reading, true, true);
        setOutletsData(outletData);
      }
    } catch (error) {
      console.error('Error fetching data:', error);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => {
    fetchData();
    // Refresh every 30 seconds
    const interval = setInterval(fetchData, 30000);
    return () => clearInterval(interval);
  }, [fetchData]);

  // Handle notification taps - expand alerts section and filter if needed
  useEffect(() => {
    const subscription = Notifications.addNotificationResponseReceivedListener((response) => {
      const data = response.notification.request.content.data;
      
      // Expand alerts section
      setIsAlertsCollapsed(false);
      
      // If alert type is specified, filter to that type
      if (data?.alertType) {
        setAlertFilter(data.alertType);
      } else {
        setAlertFilter('all');
      }
      
      // Refresh alerts to ensure latest data is shown
      fetchData();
    });

    return () => {
      subscription.remove();
    };
  }, [fetchData]);

  const onRefresh = useCallback(() => {
    setRefreshing(true);
    fetchData();
  }, [fetchData]);

  const sendCommand = async (command: string) => {
    console.log(`🔘 Button clicked: ${command}`);
    console.log(`📊 Button state check:`, {
      devicesLength: devices.length,
      wsConnected,
      commandLoading,
      isConnected: devices.length > 0,
    });
    
    if (devices.length === 0) {
      console.warn('⚠️ No devices paired');
      alert('No devices paired. Please pair a device first.');
      return;
    }

    if (!wsConnected) {
      console.error('❌ WebSocket is not connected (wsConnected:', wsConnected, ')');
      alert('WebSocket is not connected. Please check your connection.');
      return;
    }

    const deviceId = devices[0].deviceId;
    console.log(`📤 Sending command "${command}" to device "${deviceId}"`);
    
    setCommandLoading(command);
    try {
      const success = wsSendCommand(deviceId, command);
      if (!success) {
        console.error('❌ Failed to send command - wsSendCommand returned false');
        alert('Failed to send command. Check console for details.');
        setCommandLoading(null);
      } else {
        console.log(`✅ Command sent successfully: ${command} to device: ${deviceId}`);
        // Reset loading after a short delay to show feedback
        setTimeout(() => {
          setCommandLoading(null);
        }, 1000);
      }
    } catch (error) {
      console.error('❌ Error sending command:', error);
      alert(`Error: ${error instanceof Error ? error.message : 'Unknown error'}`);
      setCommandLoading(null);
    }
  };

  const isConnected = devices.length > 0;
  const hasAlerts = alerts.length > 0;

  const handleOutletPress = (outletNumber: 1 | 2) => {
    setSelectedOutlet(outletNumber);
    setModalVisible(true);
  };

  const handleCloseModal = () => {
    setModalVisible(false);
  };

  const testNotification = async () => {
    try {
      // Create a test alert notification
      const testAlert = {
        id: 'test-' + Date.now(),
        deviceId: devices.length > 0 ? devices[0].deviceId : 'TEST_DEVICE',
        alertType: 'GAS_LEAK_DETECTED',
        sensor: 'GAS_SENSOR',
        value: 1,
        receivedAt: new Date().toISOString(),
      };

      await notificationService.sendLocalNotification(testAlert);
      console.log('✅ Test notification sent');
    } catch (error) {
      console.error('❌ Error sending test notification:', error);
      alert('Failed to send test notification. Check console for details.');
    }
  };

  const handleArchiveAlert = async (alertId: string, shouldAnimate: boolean = true) => {
    if (shouldAnimate) {
      // Mark as removing to trigger exit animation
      setRemovingAlertIds(prev => new Set(prev).add(alertId));
      
      // Wait for animation to complete
      await new Promise(resolve => setTimeout(resolve, 300));
    }

    setArchivingAlertId(alertId);
    try {
      const response = await api.archiveAlert(alertId);
      
      if (response.error) {
        // Reset removing state on error
        setRemovingAlertIds(prev => {
          const next = new Set(prev);
          next.delete(alertId);
          return next;
        });
        
        RNAlert.alert(
          'Error',
          response.message || 'Failed to archive alert. Please try again.',
          [{ text: 'OK' }]
        );
        return;
      }

      // Configure layout animation for smooth list update
      LayoutAnimation.configureNext({
        duration: 250,
        create: {
          type: LayoutAnimation.Types.easeInEaseOut,
          property: LayoutAnimation.Properties.opacity,
        },
        update: {
          type: LayoutAnimation.Types.easeInEaseOut,
        },
        delete: {
          type: LayoutAnimation.Types.easeInEaseOut,
          property: LayoutAnimation.Properties.opacity,
        },
      });

      // Remove alert from local state
      setAlerts(prevAlerts => prevAlerts.filter(a => a.id !== alertId));
      
      console.log('✅ Alert archived successfully');
    } catch (error) {
      // Reset removing state on error
      setRemovingAlertIds(prev => {
        const next = new Set(prev);
        next.delete(alertId);
        return next;
      });
      
      console.error('❌ Error archiving alert:', error);
      RNAlert.alert(
        'Error',
        'Failed to archive alert. Please try again.',
        [{ text: 'OK' }]
      );
    } finally {
      setArchivingAlertId(null);
    }
  };

  const renderRightActions = (
    progress: RNAnimated.AnimatedInterpolation<number>,
    dragX: RNAnimated.AnimatedInterpolation<number>,
    alertId: string
  ) => {
    const isArchiving = archivingAlertId === alertId;
    
    // Animate background opacity based on swipe progress - smooth fade in
    const backgroundOpacity = progress.interpolate({
      inputRange: [0, 0.3, 1],
      outputRange: [0, 0.7, 1],
      extrapolate: 'clamp',
    });

    // Animate icon scale - starts small, grows as swipe progresses, scales up past threshold
    // dragX goes from 0 to negative, so inputRange must be ascending (most negative to 0)
    const iconScale = dragX.interpolate({
      inputRange: [-SWIPE_THRESHOLD * 1.5, -SWIPE_THRESHOLD, -SWIPE_THRESHOLD * 0.5, 0],
      outputRange: [1.3, 1, 0.7, 0.3],
      extrapolate: 'clamp',
    });

    // Icon fades in smoothly as swipe progresses
    const iconOpacity = dragX.interpolate({
      inputRange: [-SWIPE_THRESHOLD * 0.7, -SWIPE_THRESHOLD * 0.3, 0],
      outputRange: [1, 0.5, 0],
      extrapolate: 'clamp',
    });

    // Text fades in after icon starts appearing
    const textOpacity = dragX.interpolate({
      inputRange: [-SWIPE_THRESHOLD * 0.8, -SWIPE_THRESHOLD * 0.5, 0],
      outputRange: [1, 0.3, 0],
      extrapolate: 'clamp',
    });

    return (
      <RNAnimated.View 
        style={[
          styles.deleteActionContainer,
          { opacity: backgroundOpacity }
        ]}
      >
        <View style={styles.deleteActionButton}>
          {isArchiving ? (
            <ActivityIndicator size="small" color={COLORS.white} />
          ) : (
            <>
              <RNAnimated.View 
                style={{
                  transform: [{ scale: iconScale }],
                  opacity: iconOpacity,
                }}
              >
                <Ionicons 
                  name="trash" 
                  size={24} 
                  color={COLORS.white}
                />
              </RNAnimated.View>
              <RNAnimated.Text 
                style={[
                  styles.deleteActionText,
                  { opacity: textOpacity }
                ]}
              >
                Delete
              </RNAnimated.Text>
            </>
          )}
        </View>
      </RNAnimated.View>
    );
  };

  return (
    <View style={styles.container}>
      <SafeAreaView style={styles.safeArea} edges={['top']}>
        {/* Header */}
        <View style={styles.header}>
          <Text style={styles.greeting}>APN</Text>
         
        </View>

        <ScrollView 
          style={styles.scrollView}
          showsVerticalScrollIndicator={false}
          contentContainerStyle={styles.scrollContent}
          refreshControl={
            <RefreshControl
              refreshing={refreshing}
              onRefresh={onRefresh}
              colors={[COLORS.primary]}
              tintColor={COLORS.primary}
            />
          }
        >
          {/* Outlet Cards Section */}
          <View style={styles.outletsSection}>
            <TouchableOpacity
              style={styles.outletCard}
              onPress={() => handleOutletPress(1)}
              activeOpacity={0.7}
            >
              <Text style={styles.outletLabel}>Outlet 1</Text>
              <View style={[styles.outletIconPlaceholder, !isConnected && styles.outletDisabled]}>
                <View style={styles.outletFace}>
                  <View style={styles.eyesRow}>
                    <View style={styles.eye} />
                    <View style={styles.eye} />
                  </View>
                  <View style={styles.mouth} />
                </View>
              </View>
            </TouchableOpacity>

            <TouchableOpacity
              style={styles.outletCard}
              onPress={() => handleOutletPress(2)}
              activeOpacity={0.7}
            >
              <Text style={styles.outletLabel}>Outlet 2</Text>
              <View style={[styles.outletIconPlaceholder, !isConnected && styles.outletDisabled]}>
                <View style={styles.outletFace}>
                  <View style={styles.eyesRow}>
                    <View style={styles.eye} />
                    <View style={styles.eye} />
                  </View>
                  <View style={styles.mouth} />
                </View>
              </View>
            </TouchableOpacity>
          </View>

          {/* Overall Analytics Section */}
          {devices.length > 0 && (
            <View style={styles.analyticsSection}>
              <OverallAnalytics deviceId={devices[0].deviceId} isPowerTripped={isPowerTripped} />
            </View>
          )}

          {/* Current Status Section */}
          <View style={styles.statusSection}>
            <Text style={styles.sectionTitle}>Current Status:</Text>
            <View style={styles.statusCard}>
              {loading ? (
                <ActivityIndicator size="small" color={COLORS.primary} />
              ) : (
                <>
                  {/* Connection and Alert Status Row */}
                  <View style={styles.statusRow}>
                    <View style={styles.statusItem}>
                      <Ionicons 
                        name={isConnected ? "checkmark-circle" : "close-circle"} 
                        size={28} 
                        color={isConnected ? COLORS.success : COLORS.danger} 
                      />
                      <Text style={styles.statusText}>
                        {isConnected ? 'Connected' : 'No Device'}
                      </Text>
                    </View>
                    <View style={styles.statusItem}>
                      <Ionicons 
                        name={hasAlerts ? "alert-circle" : "shield-checkmark"} 
                        size={28} 
                        color={hasAlerts ? COLORS.danger : COLORS.success} 
                      />
                      <Text style={styles.statusText}>
                        {hasAlerts ? `${alerts.length} Alert${alerts.length > 1 ? 's' : ''}` : 'All Clear'}
                      </Text>
                    </View>
                  </View>

                  {/* Active Alerts List */}
                  {hasAlerts && (
                    <View style={styles.alertsList}>
                      <View style={styles.alertsDivider} />
                      
                      {/* Collapse/Expand Button */}
                      <TouchableOpacity
                        style={styles.collapseButton}
                        onPress={() => setIsAlertsCollapsed(!isAlertsCollapsed)}
                        activeOpacity={0.7}
                      >
                        <Text style={styles.collapseButtonText}>
                          {isAlertsCollapsed ? 'Show All Alerts' : 'Collapse Alerts'}
                        </Text>
                        <Ionicons
                          name={isAlertsCollapsed ? 'chevron-down' : 'chevron-up'}
                          size={16}
                          color={COLORS.primary}
                        />
                      </TouchableOpacity>
                      
                      {/* Filter Buttons */}
                      <View style={styles.filterContainer}>
                        <TouchableOpacity
                          style={[styles.filterButton, alertFilter === 'all' && styles.filterButtonActive]}
                          onPress={() => setAlertFilter('all')}
                        >
                          <Text style={[styles.filterButtonText, alertFilter === 'all' && styles.filterButtonTextActive]}>
                            All
                          </Text>
                        </TouchableOpacity>
                        <TouchableOpacity
                          style={[styles.filterButton, alertFilter === 'active' && styles.filterButtonActive]}
                          onPress={() => setAlertFilter('active')}
                        >
                          <Text style={[styles.filterButtonText, alertFilter === 'active' && styles.filterButtonTextActive]}>
                            Active
                          </Text>
                        </TouchableOpacity>
                        {Object.keys(ALERT_CONFIG)
                          .filter(alertType => 
                            alertType !== 'WATER_DETECTED' && 
                            alertType !== 'HIGH_TEMPERATURE'
                          )
                          .map((alertType) => (
                            <TouchableOpacity
                              key={alertType}
                              style={[styles.filterButton, alertFilter === alertType && styles.filterButtonActive]}
                              onPress={() => setAlertFilter(alertFilter === alertType ? 'all' : alertType)}
                            >
                              <Ionicons
                                name={ALERT_CONFIG[alertType].icon}
                                size={14}
                                color={alertFilter === alertType ? COLORS.white : ALERT_CONFIG[alertType].color}
                              />
                            </TouchableOpacity>
                          ))}
                      </View>

                      {/* Filtered Alerts */}
                      {(() => {
                        // First, filter out water and temperature alerts
                        let filteredAlerts = alerts.filter(a => 
                          a.alertType !== 'WATER_DETECTED' && 
                          a.alertType !== 'HIGH_TEMPERATURE'
                        );
                        
                        // Apply additional filters
                        if (alertFilter === 'active') {
                          filteredAlerts = filteredAlerts.filter(a => a.isActive);
                        } else if (alertFilter !== 'all') {
                          filteredAlerts = filteredAlerts.filter(a => a.alertType === alertFilter);
                        }

                        // Sort by priority (descending), then by receivedAt (descending)
                        filteredAlerts.sort((a, b) => {
                          const priorityA = getAlertPriority(a.alertType);
                          const priorityB = getAlertPriority(b.alertType);
                          
                          // First sort by priority (higher priority first)
                          if (priorityA !== priorityB) {
                            return priorityB - priorityA;
                          }
                          
                          // If same priority, sort by receivedAt (most recent first)
                          return new Date(b.receivedAt).getTime() - new Date(a.receivedAt).getTime();
                        });

                        // Smart collapsed view: ensure high-priority alerts are shown
                        let alertsToShow: Alert[];
                        if (isAlertsCollapsed) {
                          const highPriorityAlerts = filteredAlerts.filter(a => getAlertPriority(a.alertType) >= 3);
                          const otherAlerts = filteredAlerts.filter(a => getAlertPriority(a.alertType) < 3);
                          
                          // If there are high-priority alerts, include at least one
                          if (highPriorityAlerts.length > 0) {
                            // Take up to 4 high-priority alerts, then fill remaining slots with other alerts
                            const highPriorityCount = Math.min(4, highPriorityAlerts.length);
                            const remainingSlots = 5 - highPriorityCount;
                            alertsToShow = [
                              ...highPriorityAlerts.slice(0, highPriorityCount),
                              ...otherAlerts.slice(0, remainingSlots)
                            ];
                          } else {
                            // No high-priority alerts, just take first 5
                            alertsToShow = filteredAlerts.slice(0, 5);
                          }
                        } else {
                          // Expanded view: show all alerts
                          alertsToShow = filteredAlerts;
                        }
                        
                        const hasMoreAlerts = filteredAlerts.length > alertsToShow.length;

                        return (
                          <>
                            {alertsToShow.map((alert) => {
                              const config = ALERT_CONFIG[alert.alertType] || { 
                                icon: 'warning', 
                                color: COLORS.warning, 
                                label: alert.alertType 
                              };
                              const isRemoving = removingAlertIds.has(alert.id);
                              const isArchiving = archivingAlertId === alert.id;

                              return (
                                <SwipeableAlertItem
                                  key={alert.id}
                                  alert={alert}
                                  config={config}
                                  isRemoving={isRemoving}
                                  isArchiving={isArchiving}
                                  onArchive={(alertId) => handleArchiveAlert(alertId, true)}
                                  swipeableRef={(ref) => {
                                    if (ref) {
                                      swipeableRefs.current.set(alert.id, ref);
                                    } else {
                                      swipeableRefs.current.delete(alert.id);
                                    }
                                  }}
                                  renderRightActions={renderRightActions}
                                />
                              );
                            })}
                            {isAlertsCollapsed && hasMoreAlerts && (
                              <TouchableOpacity
                                style={styles.moreAlertsButton}
                                onPress={() => setIsAlertsCollapsed(false)}
                                activeOpacity={0.7}
                              >
                                <Text style={styles.moreAlerts}>
                                  +{filteredAlerts.length - alertsToShow.length} more alerts
                                </Text>
                                <Ionicons name="chevron-down" size={16} color={COLORS.primary} />
                              </TouchableOpacity>
                            )}
                            {filteredAlerts.length === 0 && (
                              <View style={styles.noAlertsContainer}>
                                <Ionicons name="checkmark-circle" size={24} color={COLORS.textLight} />
                                <Text style={styles.noAlertsText}>No alerts match this filter</Text>
                              </View>
                            )}
                          </>
                        );
                      })()}
                    </View>
                  )}
                </>
              )}
            </View>
          </View>

          {/* Actionable Insights Section */}
          <View style={styles.insightsSection}>
            <Text style={styles.sectionTitle}>Actionable Insights:</Text>
            
            <View style={styles.insightsGrid}>
              {/* Power Button */}
              <TouchableOpacity 
                style={[
                  styles.insightCard, 
                  styles.powerCard,
                  (!isConnected || !wsConnected || commandLoading !== null) && styles.buttonDisabled
                ]}
                onPress={() => {
                  console.log('🔘 Power button pressed - onPress fired');
                  if (!isConnected || !wsConnected || commandLoading !== null) {
                    console.warn('⚠️ Button is disabled:', {
                      isConnected,
                      wsConnected,
                      commandLoading,
                    });
                    return;
                  }
                  setIsPowerTripped(true);
                  sendCommand('TRIP_ALL');
                }}
                disabled={false}
                activeOpacity={0.7}
              >
                {commandLoading === 'TRIP_ALL' ? (
                  <ActivityIndicator size="large" color={COLORS.white} />
                ) : (
                  <>
                    <View style={styles.insightIconBg}>
                      <Ionicons name="power" size={32} color={COLORS.danger} />
                    </View>
                    <Text style={styles.insightTitle}>Power</Text>
                    <Text style={styles.insightSubtitle}>Trip Breakers</Text>
                  </>
                )}
              </TouchableOpacity>

              {/* Shake Button */}
              <TouchableOpacity 
                style={[
                  styles.insightCard, 
                  styles.shakeCard,
                  (!isConnected || !wsConnected || commandLoading !== null) && styles.buttonDisabled
                ]}
                onPress={() => {
                  console.log('🔘 Shake button pressed - onPress fired');
                  if (!isConnected || !wsConnected || commandLoading !== null) {
                    console.warn('⚠️ Button is disabled:', {
                      isConnected,
                      wsConnected,
                      commandLoading,
                    });
                    return;
                  }
                  sendCommand('SHAKE_TEST');
                }}
                disabled={false}
                activeOpacity={0.7}
              >
                {commandLoading === 'SHAKE_TEST' ? (
                  <ActivityIndicator size="large" color={COLORS.white} />
                ) : (
                  <>
                    <View style={styles.insightIconBg}>
                      <Ionicons name="pulse" size={32} color={COLORS.primary} />
                    </View>
                    <Text style={styles.insightTitle}>Shake</Text>
                    <Text style={styles.insightSubtitle}>Seismic Test</Text>
                  </>
                )}
              </TouchableOpacity>
            </View>
          </View>

          {/* Test Notification Section */}
          <View style={styles.testSection}>
            <Text style={styles.sectionTitle}>Test Notifications:</Text>
            <TouchableOpacity 
              style={styles.testButton}
              onPress={testNotification}
              activeOpacity={0.7}
            >
              <View style={styles.testButtonContent}>
                <Ionicons name="notifications" size={24} color={COLORS.white} />
                <Text style={styles.testButtonText}>Test Notification</Text>
              </View>
            </TouchableOpacity>
            <Text style={styles.testHint}>
              Tap to test local notification (works in Expo Go)
            </Text>
          </View>
        </ScrollView>
      </SafeAreaView>

      {/* Outlet Modal */}
      <OutletModal
        visible={modalVisible}
        outletNumber={selectedOutlet}
        onClose={handleCloseModal}
        initialOutletData={outletsData ? outletsData[selectedOutlet - 1] : null}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.white,
  },
  safeArea: {
    flex: 1,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 24,
    paddingVertical: 16,
    backgroundColor: COLORS.primary,
    borderBottomLeftRadius: 24,
    borderBottomRightRadius: 24,
    marginBottom: 24,
  },
  greeting: {
    fontSize: 24,
    fontWeight: '700',
    color: COLORS.white,
    textAlign: 'center',
    flex: 1,
  },
  avatarPlaceholder: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: COLORS.white,
    justifyContent: 'center',
    alignItems: 'center',
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    paddingHorizontal: 24,
    paddingBottom: 100,
  },
  outletsSection: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 24,
  },
  outletCard: {
    width: '48%',
    backgroundColor: COLORS.cardBg,
    borderRadius: 20,
    padding: 16,
    alignItems: 'center',
    ...Platform.select({
      ios: {
        shadowColor: COLORS.shadow,
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.1,
        shadowRadius: 8,
      },
      android: {
        elevation: 4,
      },
    }),
  },
  outletLabel: {
    fontSize: 14,
    fontWeight: '600',
    color: COLORS.primary,
    marginBottom: 12,
  },
  outletIconPlaceholder: {
    width: 100,
    height: 100,
    backgroundColor: COLORS.primary,
    borderRadius: 16,
    justifyContent: 'center',
    alignItems: 'center',
  },
  outletDisabled: {
    backgroundColor: '#CCCCCC',
  },
  outletFace: {
    justifyContent: 'center',
    alignItems: 'center',
  },
  eyesRow: {
    flexDirection: 'row',
    marginBottom: 16,
  },
  eye: {
    width: 12,
    height: 28,
    backgroundColor: COLORS.white,
    borderRadius: 2,
    marginHorizontal: 10,
  },
  mouth: {
    width: 32,
    height: 12,
    backgroundColor: COLORS.white,
    borderRadius: 2,
  },
  statusSection: {
    marginBottom: 24,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: COLORS.primary,
    marginBottom: 12,
  },
  statusCard: {
    backgroundColor: COLORS.cardBg,
    borderRadius: 16,
    padding: 20,
    minHeight: 80,
    justifyContent: 'center',
    ...Platform.select({
      ios: {
        shadowColor: COLORS.shadow,
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.1,
        shadowRadius: 8,
      },
      android: {
        elevation: 4,
      },
    }),
  },
  statusRow: {
    flexDirection: 'row',
    justifyContent: 'space-around',
  },
  statusItem: {
    alignItems: 'center',
  },
  statusText: {
    fontSize: 14,
    fontWeight: '500',
    color: COLORS.text,
    marginTop: 8,
  },
  alertsList: {
    marginTop: 8,
  },
  alertsDivider: {
    height: 1,
    backgroundColor: '#E0E0E0',
    marginVertical: 12,
  },
  collapseButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    paddingVertical: 10,
    marginBottom: 8,
  },
  collapseButtonText: {
    fontSize: 13,
    color: COLORS.primary,
    fontWeight: '600',
  },
  alertItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 8,
  },
  alertIconBg: {
    width: 36,
    height: 36,
    borderRadius: 18,
    justifyContent: 'center',
    alignItems: 'center',
  },
  alertInfo: {
    flex: 1,
    marginLeft: 12,
  },
  alertLabel: {
    fontSize: 14,
    fontWeight: '600',
    color: COLORS.text,
  },
  alertValue: {
    fontSize: 12,
    color: COLORS.textLight,
    marginTop: 2,
  },
  alertTime: {
    fontSize: 12,
    color: COLORS.textLight,
  },
  filterContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    marginBottom: 12,
    paddingHorizontal: 4,
  },
  filterButton: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 16,
    backgroundColor: '#F5F5F5',
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  filterButtonActive: {
    backgroundColor: COLORS.primary,
  },
  filterButtonText: {
    fontSize: 12,
    fontWeight: '500',
    color: COLORS.text,
  },
  filterButtonTextActive: {
    color: COLORS.white,
  },
  moreAlertsButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 4,
    marginTop: 8,
    paddingVertical: 8,
  },
  moreAlerts: {
    fontSize: 12,
    color: COLORS.primary,
    textAlign: 'center',
    fontWeight: '600',
  },
  alertHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  clearedBadge: {
    backgroundColor: '#E0E0E0',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 8,
  },
  clearedBadgeText: {
    fontSize: 10,
    color: COLORS.textLight,
    fontWeight: '500',
  },
  noAlertsContainer: {
    alignItems: 'center',
    paddingVertical: 20,
    gap: 8,
  },
  noAlertsText: {
    fontSize: 12,
    color: COLORS.textLight,
  },
  analyticsSection: {
    marginBottom: 24,
  },
  insightsSection: {
    marginBottom: 24,
  },
  insightsGrid: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  insightCard: {
    width: '48%',
    height: 140,
    backgroundColor: COLORS.cardBg,
    borderRadius: 16,
    padding: 16,
    alignItems: 'center',
    justifyContent: 'center',
    ...Platform.select({
      ios: {
        shadowColor: COLORS.shadow,
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.1,
        shadowRadius: 8,
      },
      android: {
        elevation: 4,
      },
    }),
  },
  powerCard: {
    borderWidth: 2,
    borderColor: COLORS.danger + '30',
  },
  shakeCard: {
    borderWidth: 2,
    borderColor: COLORS.primary + '30',
  },
  insightIconBg: {
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: '#F5F5F5',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 8,
  },
  insightTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: COLORS.text,
    marginTop: 4,
  },
  insightSubtitle: {
    fontSize: 12,
    color: COLORS.textLight,
    marginTop: 2,
  },
  buttonDisabled: {
    opacity: 0.5,
  },
  testSection: {
    marginBottom: 24,
  },
  testButton: {
    backgroundColor: COLORS.primary,
    borderRadius: 16,
    padding: 16,
    alignItems: 'center',
    ...Platform.select({
      ios: {
        shadowColor: COLORS.shadow,
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.1,
        shadowRadius: 8,
      },
      android: {
        elevation: 4,
      },
    }),
  },
  testButtonContent: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  testButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: COLORS.white,
  },
  testHint: {
    fontSize: 12,
    color: COLORS.textLight,
    textAlign: 'center',
    marginTop: 8,
    fontStyle: 'italic',
  },
  deleteActionContainer: {
    justifyContent: 'center',
    alignItems: 'center',
    width: 100,
    backgroundColor: COLORS.danger,
  },
  deleteActionButton: {
    backgroundColor: COLORS.danger,
    justifyContent: 'center',
    alignItems: 'center',
    width: '100%',
    height: '100%',
    gap: 6,
  },
  deleteActionText: {
    color: COLORS.white,
    fontSize: 12,
    fontWeight: '600',
  },
});
