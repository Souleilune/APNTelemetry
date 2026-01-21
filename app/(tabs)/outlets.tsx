import { api, SensorReading, Socket } from '@/lib/api';
import { 
  OutletData, 
  splitSensorDataByOutlet, 
  getWaterStatus, 
  getTempStatus, 
  getMovementStatus,
  getOutletName 
} from '@/lib/outlet-utils';
import { OutletChart } from '@/components/OutletChart';
import { useWebSocket } from '@/hooks/useWebSocket';
import { Ionicons } from '@expo/vector-icons';
import React, { useCallback, useEffect, useRef, useState } from 'react';
import {
  ActivityIndicator,
  Animated,
  Dimensions,
  LayoutChangeEvent,
  NativeScrollEvent,
  NativeSyntheticEvent,
  Platform,
  RefreshControl,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

const { width } = Dimensions.get('window');

const COLORS = {
  primary: '#FF8C42',
  primaryLight: '#FFA660',
  primaryLighter: '#FFC08A',
  white: '#FFFFFF',
  shadow: '#000000',
  success: '#4CAF50',
  warning: '#FFC107',
  danger: '#F44336',
  text: '#333333',
  textLight: '#666666',
};

interface SocketWithData {
  socket: Socket;
  outletData: OutletData | null;
  sensorReading: SensorReading | null;
}

export default function OutletsScreen() {
  const [currentPage, setCurrentPage] = useState(0);
  const [sockets, setSockets] = useState<Socket[]>([]);
  const [socketsWithData, setSocketsWithData] = useState<SocketWithData[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [expandedAccordions, setExpandedAccordions] = useState<{ [key: string]: boolean }>({});
  const [historicalReadings, setHistoricalReadings] = useState<SensorReading[]>([]);
  const [loadingHistory, setLoadingHistory] = useState(false);
  const [commandLoading, setCommandLoading] = useState<string | null>(null);
  const horizontalScrollRef = useRef<ScrollView>(null);
  const { sendCommand: wsSendCommand, isConnected: wsConnected } = useWebSocket();

  const fetchSocketsAndData = useCallback(async () => {
    try {
      // Fetch sockets from database
      const socketsResponse = await api.getSockets();
      if (socketsResponse.data?.sockets) {
        setSockets(socketsResponse.data.sockets);
        
        // For each socket, get sensor data from associated devices
        const socketsData: SocketWithData[] = [];
        
        for (const socket of socketsResponse.data.sockets) {
          // Get sensor readings for devices associated with this socket
          let latestReading: SensorReading | null = null;
          let outletData: OutletData | null = null;
          
          if (socket.devices && socket.devices.length > 0) {
            // Get latest reading from the first device (or you could aggregate from all devices)
            const deviceId = socket.devices[0]?.deviceId;
            if (deviceId) {
              const readingResponse = await api.getLatestSensorReading();
              if (readingResponse.data?.reading && readingResponse.data.reading.deviceId === deviceId) {
                latestReading = readingResponse.data.reading;
                // Split data by outlet (assuming breakers are both ON by default)
                const splitData = splitSensorDataByOutlet(latestReading, true, true);
                // Use outlet 1 data for this socket (you could map sockets to outlets differently)
                outletData = splitData[0];
                outletData.outletNumber = socketsData.length + 1 as 1 | 2;
              }
            }
          }
          
          socketsData.push({
            socket,
            outletData,
            sensorReading: latestReading,
          });
        }
        
        setSocketsWithData(socketsData);
      } else {
        setSockets([]);
        setSocketsWithData([]);
      }
    } catch (error) {
      console.error('Error fetching sockets and sensor data:', error);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  const fetchHistoricalData = useCallback(async () => {
    const currentSocket = socketsWithData[currentPage];
    if (!currentSocket?.sensorReading?.deviceId) return;
    
    setLoadingHistory(true);
    try {
      const response = await api.getSensorReadings({ 
        limit: 50, 
        deviceId: currentSocket.sensorReading.deviceId 
      });
      if (response.data?.readings) {
        setHistoricalReadings(response.data.readings);
      }
    } catch (error) {
      console.error('Error fetching historical data:', error);
    } finally {
      setLoadingHistory(false);
    }
  }, [socketsWithData, currentPage]);

  useEffect(() => {
    fetchSocketsAndData();
    // Refresh every 30 seconds
    const interval = setInterval(fetchSocketsAndData, 30000);
    return () => clearInterval(interval);
  }, [fetchSocketsAndData]);

  useEffect(() => {
    if (socketsWithData.length > 0 && socketsWithData[currentPage]) {
      fetchHistoricalData();
    }
  }, [socketsWithData, currentPage, fetchHistoricalData]);

  const onRefresh = useCallback(() => {
    setRefreshing(true);
    fetchSocketsAndData();
  }, [fetchSocketsAndData]);

  const sendCommand = useCallback(async (command: string) => {
    const currentSocket = socketsWithData[currentPage];
    if (!currentSocket?.sensorReading?.deviceId) {
      console.log('No device available');
      return;
    }

    setCommandLoading(command);
    try {
      const success = wsSendCommand(currentSocket.sensorReading.deviceId, command);
      if (success) {
        console.log(`✅ Command sent: ${command} to device: ${currentSocket.sensorReading.deviceId}`);
        // Refresh data after a short delay to get updated breaker state
        setTimeout(() => {
          fetchSocketsAndData();
        }, 1000);
      } else {
        console.error(`❌ Failed to send command: ${command}`);
      }
    } catch (error) {
      console.error('Error sending command:', error);
    } finally {
      setCommandLoading(null);
    }
  }, [socketsWithData, currentPage, wsSendCommand, fetchSocketsAndData]);

  const handleScroll = (event: NativeSyntheticEvent<NativeScrollEvent>) => {
    const offsetX = event.nativeEvent.contentOffset.x;
    const page = Math.round(offsetX / width);
    setCurrentPage(page);
  };

  const toggleAccordion = (socketId: string) => {
    setExpandedAccordions(prev => ({
      ...prev,
      [socketId]: !prev[socketId],
    }));
  };

  const formatWaterValue = (value: number | null | undefined): string => {
    // Handle null/undefined
    if (value === null || value === undefined) {
      return 'N/A';
    }
    
    // Convert to number and check
    const numValue = typeof value === 'number' ? value : Number(value);
    
    // Check for NaN
    if (isNaN(numValue)) {
      return 'N/A';
    }
    
    // Return text based on value - use strict equality
    if (numValue === 1) {
      return 'Wet';
    }
    if (numValue === 0) {
      return 'Dry';
    }
    
    // Fallback for any other value
    return 'N/A';
  };

  const formatTime = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleString([], {
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  const renderOutletIllustration = (socketWithData: SocketWithData, index: number) => {
    // Different colors for different sockets (darker for later sockets)
    const isEven = index % 2 === 1;
    const primaryColor = isEven ? '#D6732A' : COLORS.primary;
    const primaryLightColor = isEven ? '#C85F1A' : COLORS.primaryLight;
    const primaryLighterColor = isEven ? '#B84D0A' : COLORS.primaryLighter;
    
    return (
      <View key={socketWithData.socket.id} style={styles.outletCardContainer}>
        <View style={styles.outletCard}>
          <Text style={styles.outletTitle}>
            {socketWithData.socket.name}
          </Text>
          
          {/* Large Outlet Illustration */}
          <View style={styles.illustrationContainer}>
            <View style={[styles.square, styles.backSquare, { backgroundColor: primaryLighterColor }]} />
            <View style={[styles.square, styles.middleSquare, { backgroundColor: primaryLightColor }]} />
            <View style={[styles.square, styles.frontSquare, { backgroundColor: primaryColor }]}>
              <View style={styles.outletFace}>
                <View style={styles.eyesContainer}>
                  <View style={styles.eye} />
                  <View style={styles.eye} />
                </View>
                <View style={styles.mouth} />
              </View>
            </View>
          </View>

          {socketWithData.socket.location && (
            <Text style={styles.outletLocation}>{socketWithData.socket.location}</Text>
          )}
        </View>
      </View>
    );
  };

  const renderOutletStatus = (socketWithData: SocketWithData) => {
    const outlet = socketWithData.outletData;
    const isExpanded = expandedAccordions[socketWithData.socket.id] || false;
    
    // Get default values when outletData is null
    const outletNumber = outlet?.outletNumber || 1;
    const deviceId = outlet?.deviceId || (socketWithData.socket.devices && socketWithData.socket.devices.length > 0 
      ? socketWithData.socket.devices[0].deviceId 
      : '');
    
    // Get status values or defaults
    const waterStatus = outlet ? getWaterStatus(outlet.waterSensors) : { status: 'N/A', color: '#666666' };
    const tempStatus = outlet ? getTempStatus(outlet.temperature) : { status: 'N/A', color: '#666666' };
    const movementStatus = outlet ? getMovementStatus(outlet.movement) : { status: 'N/A', color: '#666666' };

    return (
      <>
        {/* Analytics Chart - Always shown, even when no sensor data */}
        <OutletChart
          outletNumber={outletNumber}
          deviceId={deviceId}
          readings={outlet ? historicalReadings : []}
          loading={loadingHistory}
        />

        <View style={styles.statusCard}>
          <View style={styles.sensorGrid}>
            {/* Water Sensors - Accordion */}
            <TouchableOpacity
              style={styles.sensorRow}
              onPress={() => toggleAccordion(socketWithData.socket.id)}
              activeOpacity={0.7}
            >
              <View style={styles.sensorItem}>
                <View style={[styles.sensorIconBg, { backgroundColor: '#2196F320' }]}>
                  <Ionicons name="water" size={20} color="#2196F3" />
                </View>
                <View style={styles.sensorInfo}>
                  <Text style={styles.sensorLabel}>Water Detection - Zone {outletNumber}</Text>
                  {!isExpanded && (
                    <Text style={styles.sensorValue}>
                      {outlet ? formatWaterValue(outlet.waterSensors[0]) : 'Dry'}
                    </Text>
                  )}
                </View>
                <View style={[styles.statusBadge, { backgroundColor: waterStatus.color + '20' }]}>
                  <Text style={[styles.statusBadgeText, { color: waterStatus.color }]}>
                    {waterStatus.status}
                  </Text>
                </View>
                <Ionicons 
                  name={isExpanded ? "chevron-up" : "chevron-down"} 
                  size={20} 
                  color={COLORS.textLight} 
                  style={{ marginLeft: 8 }}
                />
              </View>
            </TouchableOpacity>

            {/* Expanded Water Sensor Details */}
            {isExpanded && (
              <View style={styles.accordionContent}>
                <View style={styles.subSensorRow}>
                  <Text style={styles.subSensorLabel}>Zone {outletNumber} Status:</Text>
                  <Text style={styles.subSensorValue}>
                    {outlet ? formatWaterValue(outlet.waterSensors[0]) : 'Dry'}
                  </Text>
                </View>
                <View style={styles.subSensorRow}>
                  <Text style={styles.subSensorLabel}>Sensors:</Text>
                  <Text style={styles.subSensorValue}>
                    {outletNumber === 1 ? '1 & 2' : '3 & 4'}
                  </Text>
                </View>
              </View>
            )}

            {/* Temperature */}
            <View style={styles.sensorRow}>
              <View style={styles.sensorItem}>
                <View style={[styles.sensorIconBg, { backgroundColor: '#F4433620' }]}>
                  <Ionicons name="thermometer" size={20} color="#F44336" />
                </View>
                <View style={styles.sensorInfo}>
                  <Text style={styles.sensorLabel}>Temperature</Text>
                  <Text style={styles.sensorValue}>
                    {outlet?.temperature?.toFixed(1) || '0.0'}°C
                  </Text>
                </View>
                <View style={[styles.statusBadge, { backgroundColor: tempStatus.color + '20' }]}>
                  <Text style={[styles.statusBadgeText, { color: tempStatus.color }]}>
                    {tempStatus.status}
                  </Text>
                </View>
              </View>
            </View>

            {/* Breaker */}
            <View style={styles.sensorRow}>
              <View style={styles.sensorItem}>
                <View style={[styles.sensorIconBg, { backgroundColor: '#FFC10720' }]}>
                  <Ionicons name="flash" size={20} color="#FFC107" />
                </View>
                <View style={styles.sensorInfo}>
                  <Text style={styles.sensorLabel}>Breaker {outletNumber}</Text>
                  <Text style={styles.sensorValue}>
                    {outlet ? (outlet.breakerState ? 'ON' : 'OFF') : 'ON'}
                  </Text>
                </View>
                <View style={[styles.statusBadge, { backgroundColor: (outlet?.breakerState ?? true) ? COLORS.success + '20' : COLORS.danger + '20' }]}>
                  <Text style={[styles.statusBadgeText, { color: (outlet?.breakerState ?? true) ? COLORS.success : COLORS.danger }]}>
                    {(outlet?.breakerState ?? true) ? 'Active' : 'Tripped'}
                  </Text>
                </View>
              </View>
            </View>

            {/* Shared Sensors Divider */}
            <View style={styles.sharedDivider}>
              <View style={styles.dividerLine} />
              <Text style={styles.dividerText}>Shared (Device-Level)</Text>
              <View style={styles.dividerLine} />
            </View>

            {/* Gas Detection - Shared */}
            <View style={styles.sensorRow}>
              <View style={styles.sensorItem}>
                <View style={[styles.sensorIconBg, { backgroundColor: '#9C27B020' }]}>
                  <Ionicons name="cloud" size={20} color="#9C27B0" />
                </View>
                <View style={styles.sensorInfo}>
                  <Text style={styles.sensorLabel}>Gas Detection</Text>
                  <Text style={styles.sensorValue}>
                    {outlet ? (outlet.gas ? 'Detected!' : 'Not Detected') : 'Not Detected'}
                  </Text>
                </View>
                <View style={[styles.statusBadge, { backgroundColor: (outlet?.gas ?? false) ? COLORS.danger + '20' : COLORS.success + '20' }]}>
                  <Text style={[styles.statusBadgeText, { color: (outlet?.gas ?? false) ? COLORS.danger : COLORS.success }]}>
                    {(outlet?.gas ?? false) ? 'Alert!' : 'Safe'}
                  </Text>
                </View>
              </View>
            </View>

            {/* Movement - Shared */}
            <View style={styles.sensorRow}>
              <View style={styles.sensorItem}>
                <View style={[styles.sensorIconBg, { backgroundColor: '#FF980020' }]}>
                  <Ionicons name="pulse" size={20} color="#FF9800" />
                </View>
                <View style={styles.sensorInfo}>
                  <Text style={styles.sensorLabel}>Movement</Text>
                  <Text style={styles.sensorValue}>
                    {outlet?.movement?.toFixed(2) || '0.00'}
                  </Text>
                </View>
                <View style={[styles.statusBadge, { backgroundColor: movementStatus.color + '20' }]}>
                  <Text style={[styles.statusBadgeText, { color: movementStatus.color }]}>
                    {movementStatus.status}
                  </Text>
                </View>
              </View>
            </View>

            {/* Power Status - Shared */}
            {outlet?.power && (
              <View style={styles.sensorRow}>
                <View style={styles.sensorItem}>
                  <View style={[styles.sensorIconBg, { backgroundColor: '#4CAF5020' }]}>
                    <Ionicons name="battery-charging" size={20} color="#4CAF50" />
                  </View>
                  <View style={styles.sensorInfo}>
                    <Text style={styles.sensorLabel}>Power Source</Text>
                    <Text style={styles.sensorValue}>{outlet.power}</Text>
                  </View>
                  <View style={[styles.statusBadge, { backgroundColor: outlet.power === 'MAIN' ? COLORS.success + '20' : COLORS.warning + '20' }]}>
                    <Text style={[styles.statusBadgeText, { color: outlet.power === 'MAIN' ? COLORS.success : COLORS.warning }]}>
                      {outlet.power === 'MAIN' ? 'OK' : 'Backup'}
                    </Text>
                  </View>
                </View>
              </View>
            )}

            {/* Last Updated */}
            {outlet && (
              <View style={styles.lastUpdated}>
                <Ionicons name="time-outline" size={12} color={COLORS.textLight} />
                <Text style={styles.lastUpdatedText}>
                  Last updated: {formatTime(outlet.receivedAt)}
                </Text>
              </View>
            )}
          </View>
          </View>
          
          {/* Note when sensors are not detected */}
          {!outlet && (
            <View style={styles.sensorNoteContainer}>
              <Text style={styles.sensorNoteText}>
                Sensors are not detected or not set correctly.
              </Text>
            </View>
          )}
      </>
    );
  };

  return (
    <View style={styles.container}>
      <SafeAreaView style={styles.safeArea} edges={['top']}>
        {/* Header */}
        <View style={styles.header}>
          <Text style={styles.headerTitle}>Outlets</Text>
        </View>

        {loading ? (
          <View style={styles.loadingContainer}>
            <ActivityIndicator size="large" color={COLORS.primary} />
            <Text style={styles.loadingText}>Loading outlets...</Text>
          </View>
        ) : socketsWithData.length === 0 ? (
          <View style={styles.noDataContainer}>
            <Ionicons name="cloud-offline" size={64} color={COLORS.textLight} />
            <Text style={styles.noDataText}>No outlets available</Text>
            <Text style={styles.noDataSubtext}>Pull down to refresh</Text>
          </View>
        ) : (
          <ScrollView
            style={styles.scrollView}
            contentContainerStyle={styles.scrollContent}
            showsVerticalScrollIndicator={false}
            refreshControl={
              <RefreshControl
                refreshing={refreshing}
                onRefresh={onRefresh}
                colors={[COLORS.primary]}
                tintColor={COLORS.primary}
              />
            }
          >
            {/* Swipeable Outlet Cards Container */}
            <View style={styles.outletsCarouselContainer}>
              <ScrollView
                ref={horizontalScrollRef}
                horizontal
                pagingEnabled
                showsHorizontalScrollIndicator={false}
                onScroll={handleScroll}
                scrollEventThrottle={16}
                style={styles.horizontalScrollView}
                contentContainerStyle={styles.horizontalScrollContent}
              >
                {socketsWithData.map((socketWithData, index) => 
                  renderOutletIllustration(socketWithData, index)
                )}
              </ScrollView>

              {/* Pagination Dots */}
              <View style={styles.paginationContainer}>
                {socketsWithData.map((_, index) => (
                  <TouchableOpacity
                    key={index}
                    onPress={() => {
                      horizontalScrollRef.current?.scrollTo({ x: index * width, animated: true });
                      setCurrentPage(index);
                    }}
                  >
                    <View
                      style={[
                        styles.paginationDot,
                        index === currentPage ? styles.activeDot : styles.inactiveDot,
                      ]}
                    />
                  </TouchableOpacity>
                ))}
              </View>
            </View>

            {/* Outlet Status Section - Shows current outlet's status */}
            {socketsWithData[currentPage] && (
              <>
                <View style={styles.statusSection}>
                  <Text style={styles.statusTitle}>
                    {socketsWithData[currentPage].socket.name} Status
                  </Text>
                  {renderOutletStatus(socketsWithData[currentPage])}
                </View>

                {/* Power Control Button - Always shown for current socket */}
                <View style={styles.powerControlSection}>
                  <Text style={styles.sectionTitle}>Power Control</Text>
                  <View style={styles.insightsGrid}>
                    <TouchableOpacity
                      style={[
                        styles.insightCard,
                        (socketsWithData[currentPage].outletData?.outletNumber || 1) === 1 ? styles.outlet1Card : styles.outlet2Card,
                        (!wsConnected || commandLoading !== null) && styles.powerButtonDisabled,
                      ]}
                      onPress={() => {
                        const currentSocket = socketsWithData[currentPage];
                        const outletNumber = currentSocket.outletData?.outletNumber || 1;
                        const breakerState = currentSocket.outletData?.breakerState ?? true; // Default to ON if unknown
                        const command = breakerState 
                          ? (outletNumber === 1 ? 'BREAKER1_OFF' : 'BREAKER2_OFF')
                          : (outletNumber === 1 ? 'BREAKER1_ON' : 'BREAKER2_ON');
                        sendCommand(command);
                      }}
                      disabled={!wsConnected || commandLoading !== null}
                      activeOpacity={0.7}
                    >
                      {(commandLoading === 'BREAKER1_ON' || commandLoading === 'BREAKER1_OFF' || 
                        commandLoading === 'BREAKER2_ON' || commandLoading === 'BREAKER2_OFF') ? (
                        <ActivityIndicator 
                          size="large" 
                          color={(socketsWithData[currentPage].outletData?.outletNumber || 1) === 1 ? '#2196F3' : '#9C27B0'} 
                        />
                      ) : (
                        <>
                          <View style={styles.insightIconBg}>
                            <Ionicons
                              name="power"
                              size={32}
                              color={(socketsWithData[currentPage].outletData?.outletNumber || 1) === 1 ? '#2196F3' : '#9C27B0'}
                            />
                          </View>
                          <Text style={styles.insightTitle}>Power</Text>
                          <Text style={styles.insightSubtitle}>
                            {socketsWithData[currentPage].outletData 
                              ? `Outlet ${socketsWithData[currentPage].outletData.outletNumber} ${socketsWithData[currentPage].outletData.breakerState ? 'ON' : 'OFF'}`
                              : 'Socket Control'}
                          </Text>
                        </>
                      )}
                    </TouchableOpacity>
                  </View>
                </View>
              </>
            )}
          </ScrollView>
        )}
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
    paddingHorizontal: 24,
    paddingVertical: 16,
    backgroundColor: COLORS.primary,
    borderBottomLeftRadius: 24,
    borderBottomRightRadius: 24,
    marginBottom: 24,
  },
  headerTitle: {
    fontSize: 24,
    fontWeight: '700',
    color: COLORS.white,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingText: {
    marginTop: 12,
    fontSize: 14,
    color: COLORS.textLight,
  },
  noDataContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 32,
  },
  noDataText: {
    marginTop: 16,
    fontSize: 18,
    fontWeight: '600',
    color: COLORS.text,
  },
  noDataSubtext: {
    marginTop: 8,
    fontSize: 14,
    color: COLORS.textLight,
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    paddingBottom: 100,
  },
  outletsCarouselContainer: {
    marginBottom: 24,
  },
  horizontalScrollView: {
    flexGrow: 0,
  },
  horizontalScrollContent: {
    paddingHorizontal: 16,
  },
  outletCardContainer: {
    width: width - 32, // Account for outer padding
    paddingHorizontal: 12, // Add spacing between cards
  },
  outletCard: {
    backgroundColor: COLORS.white,
    borderRadius: 24,
    padding: 28,
    marginBottom: 24,
    alignItems: 'center',
    ...Platform.select({
      ios: {
        shadowColor: COLORS.shadow,
        shadowOffset: { width: 0, height: 8 },
        shadowOpacity: 0.15,
        shadowRadius: 16,
      },
      android: {
        elevation: 8,
      },
    }),
  },
  outletTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: '#333333',
    marginBottom: 24,
  },
  outletLocation: {
    fontSize: 14,
    color: COLORS.textLight,
    marginTop: 16,
    textAlign: 'center',
  },
  illustrationContainer: {
    width: 180,
    height: 180,
    justifyContent: 'center',
    alignItems: 'center',
    position: 'relative',
    marginTop: 16,
    marginBottom: 20,
  },
  square: {
    position: 'absolute',
    width: 140,
    height: 140,
    borderRadius: 16,
  },
  backSquare: {
    backgroundColor: COLORS.primaryLighter,
    transform: [{ rotate: '-18deg' }],
    zIndex: 1,
    top: -16,
    left: -16,
    opacity: 0.9,
  },
  middleSquare: {
    backgroundColor: COLORS.primaryLight,
    transform: [{ rotate: '-9deg' }],
    zIndex: 2,
    top: -10,
    left: -10,
    ...Platform.select({
      ios: {
        shadowColor: COLORS.shadow,
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.08,
        shadowRadius: 8,
      },
      android: {
        elevation: 4,
      },
    }),
  },
  frontSquare: {
    backgroundColor: COLORS.primary,
    transform: [{ rotate: '0deg' }],
    zIndex: 3,
    justifyContent: 'center',
    alignItems: 'center',
    ...Platform.select({
      ios: {
        shadowColor: COLORS.shadow,
        shadowOffset: { width: 0, height: 10 },
        shadowOpacity: 0.2,
        shadowRadius: 15,
      },
      android: {
        elevation: 10,
      },
    }),
  },
  outletFace: {
    justifyContent: 'center',
    alignItems: 'center',
  },
  eyesContainer: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
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
  paginationContainer: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    paddingVertical: 16,
  },
  paginationDot: {
    marginHorizontal: 4,
  },
  activeDot: {
    width: 28,
    height: 8,
    borderRadius: 4,
    backgroundColor: COLORS.primary,
  },
  inactiveDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: 'rgba(255, 140, 66, 0.3)',
  },
  statusSection: {
    paddingHorizontal: 24,
    marginBottom: 24,
  },
  statusTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: COLORS.primary,
    marginBottom: 16,
  },
  statusCard: {
    backgroundColor: COLORS.white,
    borderRadius: 24,
    padding: 16,
    ...Platform.select({
      ios: {
        shadowColor: COLORS.shadow,
        shadowOffset: { width: 0, height: 8 },
        shadowOpacity: 0.15,
        shadowRadius: 16,
      },
      android: {
        elevation: 8,
      },
    }),
  },
  sensorGrid: {
    flex: 1,
  },
  sensorRow: {
    marginBottom: 10,
  },
  sensorItem: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F8F8F8',
    borderRadius: 12,
    padding: 10,
  },
  sensorIconBg: {
    width: 36,
    height: 36,
    borderRadius: 18,
    justifyContent: 'center',
    alignItems: 'center',
  },
  sensorInfo: {
    flex: 1,
    marginLeft: 10,
  },
  sensorLabel: {
    fontSize: 11,
    color: COLORS.textLight,
    marginBottom: 2,
  },
  sensorValue: {
    fontSize: 13,
    fontWeight: '600',
    color: COLORS.text,
  },
  statusBadge: {
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 10,
  },
  statusBadgeText: {
    fontSize: 10,
    fontWeight: '600',
  },
  accordionContent: {
    backgroundColor: '#F0F0F0',
    borderRadius: 12,
    padding: 12,
    marginTop: -6,
    marginBottom: 10,
    marginLeft: 8,
    marginRight: 8,
  },
  subSensorRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingVertical: 6,
  },
  subSensorLabel: {
    fontSize: 12,
    color: COLORS.textLight,
  },
  subSensorValue: {
    fontSize: 13,
    fontWeight: '600',
    color: COLORS.text,
  },
  sharedDivider: {
    flexDirection: 'row',
    alignItems: 'center',
    marginVertical: 12,
  },
  dividerLine: {
    flex: 1,
    height: 1,
    backgroundColor: '#E0E0E0',
  },
  dividerText: {
    marginHorizontal: 12,
    fontSize: 11,
    fontWeight: '600',
    color: COLORS.textLight,
    textTransform: 'uppercase',
  },
  lastUpdated: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 12,
    paddingTop: 10,
    borderTopWidth: 1,
    borderTopColor: '#E0E0E0',
  },
  lastUpdatedText: {
    marginLeft: 4,
    fontSize: 10,
    color: COLORS.textLight,
  },
  powerControlSection: {
    marginTop: 24,
    marginBottom: 32,
    paddingHorizontal: 24,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: COLORS.text,
    marginBottom: 16,
  },
  insightsGrid: {
    flexDirection: 'row',
    justifyContent: 'center',
  },
  insightCard: {
    width: '48%',
    height: 140,
    backgroundColor: COLORS.white,
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
  outlet1Card: {
    borderWidth: 2,
    borderColor: '#2196F330', // Blue for outlet 1
  },
  outlet2Card: {
    borderWidth: 2,
    borderColor: '#9C27B030', // Purple for outlet 2
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
  powerButtonDisabled: {
    opacity: 0.5,
  },
  sensorNoteContainer: {
    marginTop: 12,
    paddingHorizontal: 16,
    paddingVertical: 8,
    alignItems: 'center',
  },
  sensorNoteText: {
    fontSize: 12,
    color: COLORS.textLight,
    fontStyle: 'italic',
    textAlign: 'center',
  },
});
