import React, { useEffect, useState, useCallback } from 'react';
import {
  Modal,
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  ActivityIndicator,
  Platform,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withTiming,
  withSpring,
  withRepeat,
  interpolate,
  Extrapolate,
} from 'react-native-reanimated';
import { OutletData, getWaterStatus, getTempStatus, getMovementStatus, getOutletName } from '@/lib/outlet-utils';
import { AnimatedGauge } from './AnimatedGauge';
import { api } from '@/lib/api';
import { splitSensorDataByOutlet } from '@/lib/outlet-utils';


const COLORS = {
  primary: '#FF8C42',
  white: '#FFFFFF',
  cardBg: '#FFFFFF',
  shadow: '#000000',
  success: '#4CAF50',
  warning: '#FFC107',
  danger: '#F44336',
  text: '#333333',
  textLight: '#666666',
  overlay: 'rgba(0, 0, 0, 0.5)',
};

interface OutletModalProps {
  visible: boolean;
  outletNumber: 1 | 2;
  onClose: () => void;
  initialOutletData?: OutletData | null;
}

export function OutletModal({
  visible,
  outletNumber,
  onClose,
  initialOutletData,
}: OutletModalProps) {
  const [outletData, setOutletData] = useState<OutletData | null>(initialOutletData || null);
  const [loading, setLoading] = useState(false);

  const translateY = useSharedValue(1000);
  const opacity = useSharedValue(0);
  // Electric energy animations
  const glowIntensity = useSharedValue(0.5);
  const shimmerPosition = useSharedValue(-100);

  useEffect(() => {
    if (visible) {
      translateY.value = withSpring(0, { damping: 20, stiffness: 90 });
      opacity.value = withTiming(1, { duration: 300 });
      
      // Start electric energy animations
      // Glowing border effect
      glowIntensity.value = withRepeat(
        withTiming(1, { duration: 1500 }),
        -1,
        true
      );
      
      // Shimmer effect (electric current flowing)
      shimmerPosition.value = withRepeat(
        withTiming(400, { duration: 2000 }),
        -1,
        false
      );
      
      fetchLatestData();
    } else {
      translateY.value = withTiming(1000, { duration: 300 });
      opacity.value = withTiming(0, { duration: 300 });
      // Reset all animations
      glowIntensity.value = 0.5;
      shimmerPosition.value = -100;
    }
  }, [visible]);

  const fetchLatestData = useCallback(async () => {
    setLoading(true);
    try {
      const response = await api.getLatestSensorReading();
      if (response.data?.reading) {
        const [outlet1, outlet2] = splitSensorDataByOutlet(response.data.reading, true, true);
        const data = outletNumber === 1 ? outlet1 : outlet2;
        setOutletData(data);
      }
    } catch (error) {
      console.error('Error fetching outlet data:', error);
    } finally {
      setLoading(false);
    }
  }, [outletNumber]);

  const animatedModalStyle = useAnimatedStyle(() => {
    return {
      transform: [{ translateY: translateY.value }],
    };
  });

  const animatedOverlayStyle = useAnimatedStyle(() => {
    return {
      opacity: opacity.value,
    };
  });

  // Glowing border effect
  const glowStyle = useAnimatedStyle(() => {
    const glow = interpolate(
      glowIntensity.value,
      [0, 0.5, 1],
      [0.3, 0.7, 1],
      Extrapolate.CLAMP
    );
    return {
      borderWidth: 3,
      borderColor: `rgba(100, 181, 246, ${glow})`, // Electric blue
      shadowColor: '#64B5F6',
      shadowOffset: { width: 0, height: 0 },
      shadowOpacity: glow,
      shadowRadius: 15,
    };
  });

  // Shimmer effect (electric current)
  const shimmerStyle = useAnimatedStyle(() => {
    return {
      transform: [{ translateX: shimmerPosition.value }],
    };
  });

  if (!visible) return null;

  const waterStatus = outletData ? getWaterStatus(outletData.waterSensors) : { status: 'N/A', color: COLORS.textLight };
  const tempStatus = outletData ? getTempStatus(outletData.temperature) : { status: 'N/A', color: COLORS.textLight };
  const movementStatus = outletData ? getMovementStatus(outletData.movement) : { status: 'N/A', color: COLORS.textLight };

  return (
    <Modal
      visible={visible}
      transparent
      animationType="none"
      onRequestClose={onClose}
    >
      <Animated.View style={[styles.overlay, animatedOverlayStyle]}>
        <TouchableOpacity
          style={styles.overlayTouchable}
          activeOpacity={1}
          onPress={onClose}
        />
        <Animated.View style={[styles.modalContainer, animatedModalStyle]}>
          {/* Header */}
          <View style={styles.header}>
            <View style={styles.headerContent}>
              <Text style={styles.headerTitle}>
                {getOutletName(outletNumber)} Outlet
              </Text>
              <Text style={styles.headerSubtitle}>Outlet {outletNumber}</Text>
            </View>
            <TouchableOpacity
              onPress={onClose}
              style={styles.closeButton}
              activeOpacity={0.7}
            >
              <Ionicons name="close" size={24} color={COLORS.text} />
            </TouchableOpacity>
          </View>

          <ScrollView
            style={styles.content}
            contentContainerStyle={styles.contentContainer}
            showsVerticalScrollIndicator={false}
          >
            {/* Centered Outlet Visual */}
            <View style={styles.outletVisualContainer}>
              <Animated.View style={[
                styles.outletIconPlaceholder,
                (!outletData || !outletData.breakerState) && styles.outletDisabled,
                glowStyle
              ]}>
                {/* Shimmer effect overlay */}
                <Animated.View style={[styles.shimmerOverlay, shimmerStyle]} />
                
                <View style={styles.outletFace}>
                  <View style={styles.eyesRow}>
                    <View style={styles.eye} />
                    <View style={styles.eye} />
                  </View>
                  <View style={styles.mouth} />
                </View>
              </Animated.View>
              <Text style={styles.outletVisualLabel}>
                {getOutletName(outletNumber)} Outlet
              </Text>
              {outletData && (
                <View style={styles.outletStatusRow}>
                  <View style={styles.outletStatusItem}>
                    <Ionicons
                      name={outletData.breakerState ? 'power' : 'power-outline'}
                      size={20}
                      color={outletData.breakerState ? COLORS.success : COLORS.textLight}
                    />
                    <Text style={styles.outletStatusText}>
                      {outletData.breakerState ? 'ON' : 'OFF'}
                    </Text>
                  </View>
                  {outletData.power && (
                    <View style={styles.outletStatusItem}>
                      <Ionicons
                        name="flash"
                        size={20}
                        color={COLORS.primary}
                      />
                      <Text style={styles.outletStatusText}>
                        {outletData.power === 'MAIN' ? 'Main' : 'Backup'}
                      </Text>
                    </View>
                  )}
                </View>
              )}
            </View>

            {/* Sensors Grid - Distributed Around */}
            {loading ? (
              <View style={styles.loadingContainer}>
                <ActivityIndicator size="large" color={COLORS.primary} />
                <Text style={styles.loadingText}>Loading sensors...</Text>
              </View>
            ) : outletData ? (
              <>
                <View style={styles.sensorsGrid}>
                  {/* Temperature Gauge - Top Left */}
                  <View style={styles.sensorGaugeCard}>
                    <AnimatedGauge
                      value={outletData.temperature}
                      min={0}
                      max={50}
                      label="Temperature"
                      unit="°C"
                      size={110}
                      colors={{
                        low: COLORS.success,
                        medium: COLORS.warning,
                        high: COLORS.danger,
                      }}
                    />
                  </View>

                  {/* Movement Gauge - Top Right */}
                  <View style={styles.sensorGaugeCard}>
                    <AnimatedGauge
                      value={outletData.movement !== null ? Math.abs(outletData.movement) : null}
                      min={0}
                      max={2}
                      label="Movement"
                      unit=""
                      size={110}
                      colors={{
                        low: COLORS.success,
                        medium: COLORS.warning,
                        high: COLORS.danger,
                      }}
                    />
                  </View>

                  {/* Water Detection - Bottom Left */}
                  <View style={styles.sensorStatusCard}>
                    <View style={[styles.sensorIconBg, { backgroundColor: waterStatus.color + '20' }]}>
                      <Ionicons name="water" size={24} color={waterStatus.color} />
                    </View>
                    <View style={styles.sensorInfo}>
                      <Text style={styles.sensorLabel}>Water</Text>
                      <Text style={[styles.sensorStatus, { color: waterStatus.color }]}>
                        {waterStatus.status}
                      </Text>
                    </View>
                  </View>

                  {/* Gas Detection - Bottom Right */}
                  <View style={styles.sensorStatusCard}>
                    <View style={[styles.sensorIconBg, { backgroundColor: (outletData.gas ? COLORS.danger : COLORS.success) + '20' }]}>
                      <Ionicons
                        name={outletData.gas ? 'cloud' : 'cloud-outline'}
                        size={24}
                        color={outletData.gas ? COLORS.danger : COLORS.success}
                      />
                    </View>
                    <View style={styles.sensorInfo}>
                      <Text style={styles.sensorLabel}>Gas</Text>
                      <Text style={[styles.sensorStatus, { color: outletData.gas ? COLORS.danger : COLORS.success }]}>
                        {outletData.gas ? 'Detected' : 'None'}
                      </Text>
                    </View>
                  </View>
                </View>

                {/* Last Updated */}
                <View style={styles.footer}>
                  <Text style={styles.footerText}>
                    Last updated: {new Date(outletData.receivedAt).toLocaleString()}
                  </Text>
                </View>
              </>
            ) : (
              <View style={styles.emptyContainer}>
                <Ionicons name="alert-circle-outline" size={48} color={COLORS.textLight} />
                <Text style={styles.emptyText}>No sensor data</Text>
                <Text style={styles.emptySubtext}>
                  Connect your device to see sensor readings
                </Text>
              </View>
            )}
          </ScrollView>
        </Animated.View>
      </Animated.View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: COLORS.overlay,
    justifyContent: 'flex-end',
  },
  overlayTouchable: {
    flex: 1,
  },
  modalContainer: {
    backgroundColor: COLORS.white,
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    maxHeight: '95%',
    minHeight: '60%',
    ...Platform.select({
      ios: {
        shadowColor: COLORS.shadow,
        shadowOffset: { width: 0, height: -4 },
        shadowOpacity: 0.1,
        shadowRadius: 8,
      },
      android: {
        elevation: 8,
      },
    }),
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 24,
    paddingVertical: 20,
    borderBottomWidth: 1,
    borderBottomColor: '#E0E0E0',
  },
  headerContent: {
    flex: 1,
  },
  headerTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: COLORS.text,
  },
  headerSubtitle: {
    fontSize: 14,
    color: COLORS.textLight,
    marginTop: 4,
  },
  closeButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#F5F5F5',
    justifyContent: 'center',
    alignItems: 'center',
  },
  content: {
    flex: 1,
  },
  contentContainer: {
    padding: 20,
    paddingBottom: 40,
  },
  loadingContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 60,
  },
  loadingText: {
    marginTop: 16,
    fontSize: 14,
    color: COLORS.textLight,
  },
  outletVisualContainer: {
    alignItems: 'center',
    width: '100%',
    marginBottom: 32,
  },
  outletIconPlaceholder: {
    width: 180,
    height: 180,
    backgroundColor: COLORS.primary,
    borderRadius: 24,
    justifyContent: 'center',
    alignItems: 'center',
    overflow: 'hidden',
    ...Platform.select({
      ios: {
        shadowOffset: { width: 0, height: 4 },
        shadowRadius: 8,
      },
      android: {
        elevation: 4,
      },
    }),
  },
  shimmerOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    width: 60,
    height: '100%',
    backgroundColor: 'rgba(255, 255, 255, 0.3)',
    transform: [{ skewX: '-20deg' }],
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
    marginBottom: 24,
  },
  eye: {
    width: 20,
    height: 48,
    backgroundColor: COLORS.white,
    borderRadius: 4,
    marginHorizontal: 18,
  },
  mouth: {
    width: 52,
    height: 20,
    backgroundColor: COLORS.white,
    borderRadius: 4,
  },
  outletVisualLabel: {
    fontSize: 18,
    fontWeight: '700',
    color: COLORS.text,
    marginBottom: 12,
  },
  outletStatusRow: {
    flexDirection: 'row',
    gap: 16,
    alignItems: 'center',
  },
  outletStatusItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  outletStatusText: {
    fontSize: 14,
    fontWeight: '600',
    color: COLORS.text,
  },
  sensorsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
    width: '100%',
    marginBottom: 24,
  },
  sensorGaugeCard: {
    backgroundColor: COLORS.cardBg,
    borderRadius: 16,
    padding: 12,
    alignItems: 'center',
    width: '48%',
    ...Platform.select({
      ios: {
        shadowColor: COLORS.shadow,
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.1,
        shadowRadius: 4,
      },
      android: {
        elevation: 2,
      },
    }),
  },
  sensorStatusCard: {
    backgroundColor: COLORS.cardBg,
    borderRadius: 16,
    padding: 16,
    flexDirection: 'row',
    alignItems: 'center',
    width: '48%',
    ...Platform.select({
      ios: {
        shadowColor: COLORS.shadow,
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.1,
        shadowRadius: 4,
      },
      android: {
        elevation: 2,
      },
    }),
  },
  sensorIconBg: {
    width: 56,
    height: 56,
    borderRadius: 28,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 16,
  },
  sensorInfo: {
    flex: 1,
  },
  sensorLabel: {
    fontSize: 14,
    fontWeight: '600',
    color: COLORS.text,
    marginBottom: 4,
  },
  sensorStatus: {
    fontSize: 18,
    fontWeight: '700',
  },
  footer: {
    alignItems: 'center',
    paddingTop: 16,
    borderTopWidth: 1,
    borderTopColor: '#E0E0E0',
    marginTop: 8,
  },
  footerText: {
    fontSize: 12,
    color: COLORS.textLight,
  },
  emptyContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 60,
  },
  emptyText: {
    fontSize: 16,
    fontWeight: '600',
    color: COLORS.text,
    marginTop: 16,
  },
  emptySubtext: {
    fontSize: 14,
    color: COLORS.textLight,
    marginTop: 8,
    textAlign: 'center',
  },
});

