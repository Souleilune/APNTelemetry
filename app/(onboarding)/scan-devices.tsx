import { useAuth } from '@/contexts/auth-context';
import { api } from '@/lib/api';
import {
  Poppins_400Regular,
  Poppins_600SemiBold,
  Poppins_700Bold,
  useFonts,
} from '@expo-google-fonts/poppins';
import { Ionicons } from '@expo/vector-icons';
import { useLocalSearchParams, useRouter } from 'expo-router';
import * as SplashScreen from 'expo-splash-screen';
import React, { useCallback, useEffect, useRef, useState } from 'react';
import {
  Animated,
  Dimensions,
  Platform,
  StatusBar,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

const { width, height } = Dimensions.get('window');

const COLORS = {
  primary: '#FF8C42',
  primaryLight: '#FFA660',
  primaryLighter: '#FFC08A',
  white: '#FFFFFF',
  textGray: '#999999',
  textDark: '#333333',
} as const;

SplashScreen.preventAutoHideAsync();

interface DiscoveredDevice {
  deviceId: string;
  name: string;
  lastSeen: string;
  source?: 'ble' | 'mqtt';
}

export default function ScanDevicesScreen() {
  const router = useRouter();
  const params = useLocalSearchParams();
  const { signIn } = useAuth();
  const [fontsLoaded, fontError] = useFonts({
    'Poppins-Regular': Poppins_400Regular,
    'Poppins-SemiBold': Poppins_600SemiBold,
    'Poppins-Bold': Poppins_700Bold,
  });

  const [scanning, setScanning] = useState(true);
  const [status, setStatus] = useState('Scanning for devices...');
  const [devices, setDevices] = useState<DiscoveredDevice[]>([]);
  const [scanComplete, setScanComplete] = useState(false);

  // Animation refs
  const circle1Anim = useRef(new Animated.Value(0)).current;
  const circle2Anim = useRef(new Animated.Value(0)).current;
  const circle3Anim = useRef(new Animated.Value(0)).current;
  const pulseAnim = useRef(new Animated.Value(1)).current;
  const beamRotation = useRef(new Animated.Value(0)).current;

  const onLayoutRootView = useCallback(async () => {
    if (fontsLoaded || fontError) {
      await SplashScreen.hideAsync();
    }
  }, [fontsLoaded, fontError]);

  useEffect(() => {
    if (!fontsLoaded && !fontError) {
      return;
    }

    // Start scanning animation
    startAnimation();
    
    // Start device discovery
    performDiscovery();

    // Auto-login after scan completes
    const timer = setTimeout(() => {
      handleAutoLogin();
    }, 8000); // Give 8 seconds for scanning

    return () => {
      clearTimeout(timer);
      // Stop all animations
      circle1Anim.stopAnimation(() => {});
      circle2Anim.stopAnimation(() => {});
      circle3Anim.stopAnimation(() => {});
      pulseAnim.stopAnimation(() => {});
      beamRotation.stopAnimation(() => {});
      // Reset values
      circle1Anim.setValue(0);
      circle2Anim.setValue(0);
      circle3Anim.setValue(0);
      pulseAnim.setValue(1);
      beamRotation.setValue(0);
    };
  }, [fontsLoaded, fontError]);

  const startAnimation = () => {
    // Animated circles - simpler approach
    const createCircleAnimation = (animValue: Animated.Value, delay: number) => {
      const anim = Animated.loop(
        Animated.sequence([
          Animated.delay(delay),
          Animated.timing(animValue, {
            toValue: 1,
            duration: 2000,
            useNativeDriver: true,
          }),
          Animated.timing(animValue, {
            toValue: 0,
            duration: 0,
            useNativeDriver: true,
          }),
        ])
      );
      anim.start();
    };

    createCircleAnimation(circle1Anim, 0);
    createCircleAnimation(circle2Anim, 400);
    createCircleAnimation(circle3Anim, 800);

    // Pulsing center
    Animated.loop(
      Animated.sequence([
        Animated.timing(pulseAnim, {
          toValue: 1.2,
          duration: 1000,
          useNativeDriver: true,
        }),
        Animated.timing(pulseAnim, {
          toValue: 1,
          duration: 1000,
          useNativeDriver: true,
        }),
      ])
    ).start();

    // Rotating beam
    Animated.loop(
      Animated.timing(beamRotation, {
        toValue: 1,
        duration: 3000,
        useNativeDriver: true,
      })
    ).start();
  };

  const performDiscovery = async () => {
    try {
      // Phase 1: Try MQTT discovery
      setStatus('Searching via MQTT...');
      
      const mqttResult = await api.discoverDevicesMQTT();
      
      if (mqttResult.data?.devices && mqttResult.data.devices.length > 0) {
        const mqttDevices: DiscoveredDevice[] = mqttResult.data.devices.map(d => ({
          ...d,
          source: 'mqtt' as const,
        }));
        setDevices(mqttDevices);
        setStatus(`Found ${mqttDevices.length} device(s)`);
      } else {
        setStatus('No devices found');
      }

      // Note: BLE scanning would go here if implemented
      // For now, we'll rely on MQTT discovery

    } catch (error) {
      console.error('Discovery error:', error);
      setStatus('Scan failed, continuing...');
    } finally {
      setScanComplete(true);
      setScanning(false);
    }
  };

  const handleAutoLogin = async () => {
    const email = params.email as string;
    const password = params.password as string;

    if (!email || !password) {
      router.replace('/(auth)/sign-in');
      return;
    }

    try {
      setStatus('Logging in...');
      const result = await signIn(email, password);

      if (result.error) {
        // Login failed, redirect to sign-in
        router.replace('/(auth)/sign-in');
      } else {
        // Success, navigate to tabs
        router.replace('/(tabs)');
      }
    } catch (error) {
      console.error('Auto-login error:', error);
      router.replace('/(auth)/sign-in');
    }
  };

  if (!fontsLoaded && !fontError) {
    return null;
  }

  const circle1Scale = circle1Anim.interpolate({
    inputRange: [0, 1],
    outputRange: [1, 3],
  });

  const circle1Opacity = circle1Anim.interpolate({
    inputRange: [0, 1],
    outputRange: [1, 0],
  });

  const circle2Scale = circle2Anim.interpolate({
    inputRange: [0, 1],
    outputRange: [1, 3],
  });

  const circle2Opacity = circle2Anim.interpolate({
    inputRange: [0, 1],
    outputRange: [1, 0],
  });

  const circle3Scale = circle3Anim.interpolate({
    inputRange: [0, 1],
    outputRange: [1, 3],
  });

  const circle3Opacity = circle3Anim.interpolate({
    inputRange: [0, 1],
    outputRange: [1, 0],
  });

  const beamRotate = beamRotation.interpolate({
    inputRange: [0, 1],
    outputRange: ['0deg', '360deg'],
  });

  return (
    <View style={styles.container} onLayout={onLayoutRootView}>
      <StatusBar
        barStyle="light-content"
        backgroundColor={COLORS.primary}
        translucent={false}
      />
      <SafeAreaView style={styles.safeArea} edges={['top', 'bottom']}>
        <View style={styles.content}>
          {/* Sonar Animation Container */}
          <View style={styles.animationContainer}>
            {/* Scanning circles */}
            <Animated.View
              style={[
                styles.circle,
                styles.circle1,
                {
                  transform: [{ scale: circle1Scale }],
                  opacity: circle1Opacity,
                },
              ]}
            />
            <Animated.View
              style={[
                styles.circle,
                styles.circle2,
                {
                  transform: [{ scale: circle2Scale }],
                  opacity: circle2Opacity,
                },
              ]}
            />
            <Animated.View
              style={[
                styles.circle,
                styles.circle3,
                {
                  transform: [{ scale: circle3Scale }],
                  opacity: circle3Opacity,
                },
              ]}
            />

            {/* Rotating beam */}
            <Animated.View
              style={[
                styles.beamContainer,
                {
                  transform: [{ rotate: beamRotate }],
                },
              ]}
            >
              <View style={styles.beam} />
            </Animated.View>

            {/* Center pulsing icon */}
            <Animated.View
              style={[
                styles.centerIcon,
                {
                  transform: [{ scale: pulseAnim }],
                },
              ]}
            >
              <Ionicons name="hardware-chip" size={60} color={COLORS.white} />
            </Animated.View>
          </View>

          {/* Status Text */}
          <View style={styles.statusContainer}>
            <Text style={styles.statusText}>{status}</Text>
            {devices.length > 0 && (
              <Text style={styles.deviceCount}>
                {devices.length} device{devices.length !== 1 ? 's' : ''} found
              </Text>
            )}
          </View>

          {/* Device List (optional, could be shown but auto-login happens anyway) */}
          {devices.length > 0 && scanComplete && (
            <View style={styles.deviceList}>
              {devices.map((device, index) => (
                <View key={index} style={styles.deviceItem}>
                  <Ionicons name="hardware-chip-outline" size={24} color={COLORS.primary} />
                  <View style={styles.deviceInfo}>
                    <Text style={styles.deviceName}>{device.name}</Text>
                    <Text style={styles.deviceId}>ID: {device.deviceId}</Text>
                  </View>
                </View>
              ))}
            </View>
          )}
        </View>
      </SafeAreaView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.primary,
  },
  safeArea: {
    flex: 1,
  },
  content: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 40,
  },
  animationContainer: {
    width: 300,
    height: 300,
    justifyContent: 'center',
    alignItems: 'center',
    position: 'relative',
    marginBottom: 60,
  },
  circle: {
    position: 'absolute',
    borderRadius: 150,
    borderWidth: 2,
  },
  circle1: {
    width: 300,
    height: 300,
    borderColor: COLORS.white,
    backgroundColor: 'transparent',
  },
  circle2: {
    width: 300,
    height: 300,
    borderColor: COLORS.white,
    backgroundColor: 'transparent',
  },
  circle3: {
    width: 300,
    height: 300,
    borderColor: COLORS.white,
    backgroundColor: 'transparent',
  },
  beamContainer: {
    position: 'absolute',
    width: 300,
    height: 300,
    justifyContent: 'center',
    alignItems: 'center',
  },
  beam: {
    width: 2,
    height: 150,
    backgroundColor: COLORS.white,
    opacity: 0.3,
  },
  centerIcon: {
    width: 120,
    height: 120,
    borderRadius: 60,
    backgroundColor: COLORS.primary,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 4,
    borderColor: COLORS.white,
    ...Platform.select({
      ios: {
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.3,
        shadowRadius: 8,
      },
      android: {
        elevation: 8,
      },
    }),
  },
  statusContainer: {
    alignItems: 'center',
    marginBottom: 20,
  },
  statusText: {
    fontSize: 18,
    fontFamily: 'Poppins-SemiBold',
    color: COLORS.white,
    marginBottom: 8,
    textAlign: 'center',
  },
  deviceCount: {
    fontSize: 14,
    fontFamily: 'Poppins-Regular',
    color: 'rgba(255, 255, 255, 0.8)',
    textAlign: 'center',
  },
  deviceList: {
    width: '100%',
    maxWidth: 400,
    marginTop: 20,
  },
  deviceItem: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
  },
  deviceInfo: {
    marginLeft: 12,
    flex: 1,
  },
  deviceName: {
    fontSize: 16,
    fontFamily: 'Poppins-SemiBold',
    color: COLORS.white,
    marginBottom: 4,
  },
  deviceId: {
    fontSize: 12,
    fontFamily: 'Poppins-Regular',
    color: 'rgba(255, 255, 255, 0.7)',
  },
});

