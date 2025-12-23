import { useAuth } from '@/contexts/auth-context';
import { api, Alert, Device } from '@/lib/api';
import { OverallAnalytics } from '@/components/OverallAnalytics';
import { useWebSocket } from '@/hooks/useWebSocket';
import { Ionicons } from '@expo/vector-icons';
import React, { useCallback, useEffect, useState } from 'react';
import {
  ActivityIndicator,
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

  const fetchData = useCallback(async () => {
    try {
      const [alertsRes, devicesRes] = await Promise.all([
        api.getAllAlerts(100), // Get all alerts (up to 100)
        api.getDevices(),
      ]);

      if (alertsRes.data) {
        console.log('📊 Fetched alerts:', JSON.stringify(alertsRes.data.alerts, null, 2));
        setAlerts(alertsRes.data.alerts);
      }
      if (devicesRes.data) {
        setDevices(devicesRes.data.devices);
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
            <View style={styles.outletCard}>
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
            </View>

            <View style={styles.outletCard}>
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
            </View>
          </View>

          {/* Overall Analytics Section */}
          {devices.length > 0 && (
            <View style={styles.analyticsSection}>
              <OverallAnalytics deviceId={devices[0].deviceId} />
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

                        // Show limited alerts when collapsed, all when expanded
                        const alertsToShow = isAlertsCollapsed 
                          ? filteredAlerts.slice(0, 5) 
                          : filteredAlerts;
                        const hasMoreAlerts = filteredAlerts.length > 5;

                        return (
                          <>
                            {alertsToShow.map((alert) => {
                              const config = ALERT_CONFIG[alert.alertType] || { 
                                icon: 'warning', 
                                color: COLORS.warning, 
                                label: alert.alertType 
                              };
                              return (
                                <View key={alert.id} style={styles.alertItem}>
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
                                    {alert.value !== null && alert.value !== undefined && (
                                      <Text style={styles.alertValue}>
                                        Value: {typeof alert.value === 'number' ? alert.value.toFixed(2) : alert.value}
                                      </Text>
                                    )}
                                  </View>
                                  <Text style={styles.alertTime}>
                                    {new Date(alert.receivedAt).toLocaleTimeString([], { 
                                      hour: '2-digit', 
                                      minute: '2-digit' 
                                    })}
                                  </Text>
                                </View>
                              );
                            })}
                            {isAlertsCollapsed && hasMoreAlerts && (
                              <TouchableOpacity
                                style={styles.moreAlertsButton}
                                onPress={() => setIsAlertsCollapsed(false)}
                                activeOpacity={0.7}
                              >
                                <Text style={styles.moreAlerts}>
                                  +{filteredAlerts.length - 5} more alerts
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
        </ScrollView>
      </SafeAreaView>
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
});
