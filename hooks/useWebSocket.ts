import AsyncStorage from '@react-native-async-storage/async-storage';
import { useCallback, useEffect, useState, useRef } from 'react';
import { notificationService } from '@/services/notifications';

const TOKEN_KEY = 'auth_token';
const API_URL = process.env.EXPO_PUBLIC_API_URL || 'http://localhost:3000';
// Construct WebSocket URL from API URL
const getWebSocketUrl = () => {
  const apiUrl = process.env.EXPO_PUBLIC_API_URL || 'http://localhost:3000';
  if (process.env.EXPO_PUBLIC_WS_URL) {
    return process.env.EXPO_PUBLIC_WS_URL;
  }
  // Convert http:// to ws:// and https:// to wss://
  return apiUrl.replace(/^http:/, 'ws:').replace(/^https:/, 'wss:');
};
const WS_URL = getWebSocketUrl();

interface TelemetryMessage {
  deviceId: string;
  messageType: 'sensor_reading' | 'alert' | 'power_status' | 'alert_cleared';
  payload: any;
  receivedAt: string;
}

interface UseWebSocketOptions {
  onTelemetry?: (data: TelemetryMessage) => void;
}

export function useWebSocket(options?: UseWebSocketOptions) {
  const [isConnected, setIsConnected] = useState(false);
  const [ws, setWs] = useState<WebSocket | null>(null);
  const { onTelemetry } = options || {};
  
  // Use ref to store the latest callback so we don't need to recreate the connection
  const onTelemetryRef = useRef(onTelemetry);
  
  // Update ref when callback changes
  useEffect(() => {
    onTelemetryRef.current = onTelemetry;
  }, [onTelemetry]);

  useEffect(() => {
    let websocket: WebSocket | null = null;
    let reconnectTimeout: NodeJS.Timeout | null = null;
    let isMounted = true;

    const connect = async () => {
      try {
        // Get auth token from storage
        const token = await AsyncStorage.getItem(TOKEN_KEY);
        
        if (!token) {
          console.warn('WebSocket: No auth token found, cannot connect');
          setIsConnected(false);
          return;
        }

        // Build WebSocket URL with token
        const wsBaseUrl = getWebSocketUrl();
        const wsUrl = `${wsBaseUrl}/ws/telemetry?token=${encodeURIComponent(token)}`;
        console.log('🔌 WebSocket: API_URL =', API_URL);
        console.log('🔌 WebSocket: WS_URL =', wsBaseUrl);
        console.log('🔌 WebSocket: Connecting to', wsUrl.replace(token, '***'));

        websocket = new WebSocket(wsUrl);

        websocket.onopen = () => {
          console.log('✅ WebSocket: Connected');
          if (isMounted) {
            setIsConnected(true);
            setWs(websocket);
          }
        };

        websocket.onclose = (event) => {
          console.log('🔌 WebSocket: Disconnected', event.code, event.reason);
          if (isMounted) {
            setIsConnected(false);
            setWs(null);
          }
          
          // Don't retry on authentication errors (4001, 4002, 4004) or normal closure (1000)
          const authErrorCodes = [4001, 4002, 4004];
          if (authErrorCodes.includes(event.code)) {
            console.warn('🔌 WebSocket: Authentication error - not retrying. Please refresh token.');
            return;
          }
          
          // Attempt to reconnect after 3 seconds if not a normal closure
          if (event.code !== 1000 && isMounted) {
            reconnectTimeout = setTimeout(() => {
              console.log('🔄 WebSocket: Attempting to reconnect...');
              connect();
            }, 3000);
          }
        };

        websocket.onerror = (error) => {
          console.error('❌ WebSocket error:', error);
          if (isMounted) {
            setIsConnected(false);
          }
        };

        websocket.onmessage = async (event) => {
          try {
            const message = JSON.parse(event.data);
            console.log('📨 WebSocket message received:', message);
            
            // Handle different message types
            if (message.type === 'connected') {
              console.log('✅ WebSocket: Server confirmed connection');
            } else if (message.type === 'telemetry') {
              console.log('📊 WebSocket: Telemetry data received');
              
              const telemetryData = message.data;
              
              // Call the optional telemetry callback if provided (use ref to get latest)
              if (onTelemetryRef.current && telemetryData) {
                onTelemetryRef.current(telemetryData);
              }
              
              // Check if this is an alert message and trigger notification
              if (telemetryData && telemetryData.messageType === 'alert') {
                const alertPayload = telemetryData.payload;
                if (alertPayload && alertPayload.alert) {
                  // Format alert data for notification
                  const alertData = {
                    id: telemetryData.deviceId + '_' + Date.now(), // Temporary ID
                    deviceId: telemetryData.deviceId,
                    alertType: alertPayload.alert,
                    sensor: alertPayload.sensor || undefined,
                    value: alertPayload.value !== undefined ? alertPayload.value : undefined,
                    receivedAt: telemetryData.receivedAt || new Date().toISOString(),
                  };
                  
                  // Trigger local notification
                  await notificationService.sendLocalNotification(alertData);
                  console.log('🔔 Local notification triggered for alert:', alertPayload.alert);
                }
              }
            } else if (message.type === 'error') {
              console.error('❌ WebSocket: Server error:', message.message);
            }
          } catch (error) {
            console.error('❌ WebSocket: Error parsing message:', error);
          }
        };

      } catch (error) {
        console.error('❌ WebSocket: Connection error:', error);
        if (isMounted) {
          setIsConnected(false);
        }
      }
    };

    // Initial connection
    connect();

    return () => {
      isMounted = false;
      if (reconnectTimeout) {
        clearTimeout(reconnectTimeout);
      }
      if (websocket) {
        websocket.close();
      }
    };
  }, []); // Empty deps - connection is created once, callback is accessed via ref

  const sendCommand = useCallback((deviceId: string, command: string): boolean => {
    console.log(`📤 WebSocket: Attempting to send command "${command}" to device "${deviceId}"`);
    
    if (!ws) {
      console.warn('❌ WebSocket: WebSocket instance is null');
      return false;
    }

    if (!isConnected) {
      console.warn('❌ WebSocket: Not connected (isConnected:', isConnected, ')');
      return false;
    }

    if (ws.readyState !== WebSocket.OPEN) {
      console.warn('❌ WebSocket: Connection not open (readyState:', ws.readyState, ')');
      return false;
    }

    try {
      const message = JSON.stringify({
        command,
        deviceId,
        timestamp: new Date().toISOString(),
        type: 'command_sent',
      });
      
      ws.send(message);
      console.log(`✅ WebSocket message sent: ${message}`);
      return true;
    } catch (error) {
      console.error('❌ Error sending WebSocket command:', error);
      return false;
    }
  }, [ws, isConnected]);

  return {
    isConnected,
    sendCommand,
  };
}
