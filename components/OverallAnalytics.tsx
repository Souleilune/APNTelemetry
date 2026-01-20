import { api, SensorReading } from '@/lib/api';
import { useWebSocket } from '@/hooks/useWebSocket';
import { Ionicons } from '@expo/vector-icons';
import React, { useEffect, useState, useCallback } from 'react';
import {
  ActivityIndicator,
  Dimensions,
  Platform,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import { LineChart } from 'react-native-chart-kit';

const { width } = Dimensions.get('window');
const CHART_WIDTH = width - 80;

interface OverallAnalyticsProps {
  deviceId?: string;
  isPowerTripped?: boolean;
}

export function OverallAnalytics({ deviceId, isPowerTripped = false }: OverallAnalyticsProps) {
  const [readings, setReadings] = useState<SensorReading[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedChart, setSelectedChart] = useState<'movement' | 'gas' | 'voltage' | 'current'>('movement');

  // Transform WebSocket telemetry message to SensorReading format
  const transformTelemetryToReading = useCallback((telemetryData: {
    deviceId: string;
    messageType: string;
    payload: any;
    receivedAt: string;
  }): SensorReading | null => {
    // Handle both sensor_reading and power_status messages (power_status contains full sensor data)
    if (telemetryData.messageType !== 'sensor_reading' && 
        telemetryData.messageType !== 'power_status') {
      return null;
    }

    const payload = telemetryData.payload;
    console.log(`🔍 Analytics: Transforming ${telemetryData.messageType} payload:`, {
      water: payload.water,
      gas: payload.gas,
      temperature: payload.temperature,
      gyro: payload.gyro,
      power: payload.power ? 'object' : payload.power_status,
    });
    
    // Convert water array: handle both boolean arrays and number arrays
    let waterArray: [number | null, number | null, number | null, number | null] = [null, null, null, null];
    if (Array.isArray(payload.water)) {
      waterArray = payload.water.map((w: any) => {
        if (typeof w === 'boolean') {
          return w ? 1 : 0;
        }
        if (typeof w === 'number') {
          return w;
        }
        return null;
      }) as [number | null, number | null, number | null, number | null];
    }
    
    // Handle power object - extract voltage and current if available
    // The power field in SensorReading is a string, but we'll store the power object as JSON string
    // or extract a summary. For now, store as JSON string if it's an object.
    let powerValue: string | null = null;
    if (payload.power) {
      if (typeof payload.power === 'object') {
        // Store power object as JSON string, or create a summary
        // For voltage/current, we'll extract them separately if needed
        powerValue = JSON.stringify(payload.power);
      } else {
        powerValue = payload.power;
      }
    } else if (payload.power_status) {
      powerValue = payload.power_status;
    }
    
    return {
      id: `${telemetryData.deviceId}_${Date.now()}_${Math.random()}`,
      deviceId: telemetryData.deviceId,
      water: waterArray,
      gas: payload.gas !== undefined ? Boolean(payload.gas) : false,
      temperature: {
        temp1: payload.temperature?.temp1 ?? payload.temp_1 ?? null,
        temp2: payload.temperature?.temp2 ?? payload.temp_2 ?? null,
      },
      gyro: {
        movement: payload.gyro?.movement ?? payload.movement ?? null,
      },
      power: powerValue,
      receivedAt: telemetryData.receivedAt || new Date().toISOString(),
    };
  }, []);

  // Handle real-time WebSocket telemetry messages
  const handleTelemetry = useCallback((telemetryData: {
    deviceId: string;
    messageType: string;
    payload: any;
    receivedAt: string;
  }) => {
    // Process both sensor_reading and power_status messages for the current device
    // power_status messages contain full sensor data including voltage and current
    if ((telemetryData.messageType === 'sensor_reading' || 
         telemetryData.messageType === 'power_status') && 
        telemetryData.deviceId === deviceId) {
      
      console.log(`📊 Analytics: Received ${telemetryData.messageType} from ${telemetryData.deviceId}`);
      
      const newReading = transformTelemetryToReading(telemetryData);
      
      if (newReading) {
        console.log(`✅ Analytics: Transformed reading - movement: ${newReading.gyro?.movement}, gas: ${newReading.gas}, temp: ${newReading.temperature.temp1}/${newReading.temperature.temp2}`);
        
        setReadings((prevReadings) => {
          // Check if we already have a reading with the same timestamp (avoid duplicates)
          // Use a more lenient check - allow readings within 1 second to avoid exact timestamp duplicates
          const newTimestamp = new Date(newReading.receivedAt).getTime();
          const isDuplicate = prevReadings.some((r) => {
            const rTimestamp = new Date(r.receivedAt).getTime();
            return Math.abs(newTimestamp - rTimestamp) < 1000 && r.deviceId === newReading.deviceId;
          });
          
          if (isDuplicate) {
            console.log('⚠️ Analytics: Duplicate reading detected, skipping');
            return prevReadings;
          }
          
          // Prepend new reading (most recent first) and limit to last 100 readings
          const updated = [newReading, ...prevReadings];
          console.log(`📈 Analytics: Updated readings count: ${updated.length}`);
          return updated.slice(0, 100);
        });
      } else {
        console.warn('⚠️ Analytics: Failed to transform telemetry data');
      }
    }
  }, [deviceId, transformTelemetryToReading]);

  // Initialize WebSocket with telemetry callback
  useWebSocket({
    onTelemetry: handleTelemetry,
  });

  // Fetch initial historical data
  useEffect(() => {
    const fetchData = async () => {
      if (!deviceId) {
        setLoading(false);
        return;
      }

      try {
        const response = await api.getSensorReadings({ limit: 50, deviceId });
        if (response.data?.readings) {
          setReadings(response.data.readings);
        }
      } catch (error) {
        console.error('Error fetching analytics:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, [deviceId]);

  if (!deviceId) {
    return (
      <View style={styles.container}>
        <Text style={styles.noDataText}>No device connected</Text>
      </View>
    );
  }

  if (loading) {
    return (
      <View style={styles.container}>
        <ActivityIndicator size="small" color="#FF8C42" />
        <Text style={styles.loadingText}>Loading analytics...</Text>
      </View>
    );
  }

  if (!readings || readings.length === 0) {
    return (
      <View style={styles.container}>
        <Ionicons name="bar-chart-outline" size={32} color="#999" />
        <Text style={styles.noDataText}>No analytics data available</Text>
      </View>
    );
  }

  // Helper function to extract voltage and current from power object
  const extractPowerData = (power: string | null): { voltage: number | null; current: number | null } => {
    if (!power) return { voltage: null, current: null };
    
    try {
      // Power might be a JSON string or a plain string
      const powerObj = typeof power === 'string' ? JSON.parse(power) : power;
      
      if (typeof powerObj === 'object' && powerObj !== null) {
        // Extract voltage (average of voltage1 and voltage2, or use voltage1 if voltage2 is 0)
        const v1 = powerObj.voltage1 ?? 0;
        const v2 = powerObj.voltage2 ?? 0;
        const voltage = v1 > 0 || v2 > 0 ? (v1 + v2) / 2 : null;
        
        // Extract current (average of current1 and current2)
        const c1 = powerObj.current1 ?? 0;
        const c2 = powerObj.current2 ?? 0;
        const current = c1 > 0 || c2 > 0 ? (c1 + c2) / 2 : null;
        
        return { voltage, current };
      }
    } catch (e) {
      // If parsing fails, power is likely a plain string
      console.debug('Power data is not JSON:', e);
    }
    
    return { voltage: null, current: null };
  };

  // Calculate statistics
  const calculateStats = () => {
    const movementValues: number[] = [];
    const gasDetections: number[] = [];
    const voltageValues: number[] = [];
    const currentValues: number[] = [];

    readings.forEach((reading) => {
      movementValues.push(reading.gyro?.movement || 0);
      
      // Gas detection (1 for detected, 0 for not detected)
      gasDetections.push(reading.gas ? 1 : 0);
      
      // Extract real voltage and current from power object
      const { voltage, current } = extractPowerData(reading.power);
      
      // Use real voltage data, or 0 if power is tripped
      if (isPowerTripped) {
        voltageValues.push(0);
      } else if (voltage !== null) {
        voltageValues.push(voltage);
      }
      // If no voltage data, don't add to array (will be excluded from stats)
      
      // Use real current data, or 0 if power is tripped
      if (isPowerTripped) {
        currentValues.push(0);
      } else if (current !== null) {
        currentValues.push(current);
      }
      // If no current data, don't add to array (will be excluded from stats)
    });

    const avg = (arr: number[]) => arr.length > 0 ? arr.reduce((a, b) => a + b, 0) / arr.length : 0;
    const max = (arr: number[]) => arr.length > 0 ? Math.max(...arr) : 0;
    const min = (arr: number[]) => arr.length > 0 ? Math.min(...arr) : 0;

    return {
      movement: {
        avg: avg(movementValues),
        max: max(movementValues),
        min: min(movementValues),
      },
      gas: {
        detections: gasDetections.filter(v => v === 1).length,
        total: gasDetections.length,
      },
      voltage: {
        avg: voltageValues.length > 0 ? avg(voltageValues) : 0,
        max: voltageValues.length > 0 ? max(voltageValues) : 0,
        min: voltageValues.length > 0 ? min(voltageValues) : 0,
      },
      current: {
        avg: currentValues.length > 0 ? avg(currentValues) : 0,
        max: currentValues.length > 0 ? max(currentValues) : 0,
        min: currentValues.length > 0 ? min(currentValues) : 0,
      },
    };
  };

  const stats = calculateStats();

  // Prepare chart data
  const prepareGasData = () => {
    const labels: string[] = [];
    const gasData: number[] = [];

    const recentReadings = readings.slice(0, 30).reverse();

    recentReadings.forEach((reading, index) => {
      const date = new Date(reading.receivedAt);
      const isToday = date.toDateString() === new Date().toDateString();
      const label = isToday
        ? `${date.getHours()}:${date.getMinutes().toString().padStart(2, '0')}`
        : `${date.getMonth() + 1}/${date.getDate()}`;
      labels.push(label);

      // Represent gas detection as 100 (detected) or 0 (not detected)
      gasData.push(reading.gas ? 100 : 0);
    });

    // Format labels to show max 6 evenly spaced
    const formatLabels = (labels: string[]): string[] => {
      if (labels.length <= 6) return labels;
      const step = Math.ceil(labels.length / 6);
      return labels.filter((_, i) => i % step === 0);
    };

    return {
      labels: formatLabels(labels),
      datasets: [
        {
          data: gasData.length > 0 ? gasData : [0],
          color: (opacity = 1) => `rgba(156, 39, 176, ${opacity})`, // Purple for gas
          strokeWidth: 2,
        },
      ],
    };
  };

  const prepareVoltageData = () => {
    const labels: string[] = [];
    const voltageData: number[] = [];

    const recentReadings = readings.slice(0, 30).reverse();

    recentReadings.forEach((reading) => {
      const date = new Date(reading.receivedAt);
      const isToday = date.toDateString() === new Date().toDateString();
      const label = isToday
        ? `${date.getHours()}:${date.getMinutes().toString().padStart(2, '0')}`
        : `${date.getMonth() + 1}/${date.getDate()}`;
      labels.push(label);
      
      // Extract real voltage data from power object
      const { voltage } = extractPowerData(reading.power);
      if (isPowerTripped) {
        voltageData.push(0);
      } else if (voltage !== null) {
        voltageData.push(voltage);
      } else {
        voltageData.push(0); // No data available
      }
    });

    // Format labels to show max 6 evenly spaced
    const formatLabels = (labels: string[]): string[] => {
      if (labels.length <= 6) return labels;
      const step = Math.ceil(labels.length / 6);
      return labels.filter((_, i) => i % step === 0);
    };

    return {
      labels: formatLabels(labels),
      datasets: [
        {
          data: voltageData,
          color: (opacity = 1) => `rgba(76, 175, 80, ${opacity})`, // Green for voltage
          strokeWidth: 2,
        },
      ],
    };
  };

  const prepareCurrentData = () => {
    const labels: string[] = [];
    const currentData: number[] = [];

    const recentReadings = readings.slice(0, 30).reverse();

    recentReadings.forEach((reading) => {
      const date = new Date(reading.receivedAt);
      const isToday = date.toDateString() === new Date().toDateString();
      const label = isToday
        ? `${date.getHours()}:${date.getMinutes().toString().padStart(2, '0')}`
        : `${date.getMonth() + 1}/${date.getDate()}`;
      labels.push(label);
      
      // Extract real current data from power object
      const { current } = extractPowerData(reading.power);
      if (isPowerTripped) {
        currentData.push(0);
      } else if (current !== null) {
        currentData.push(current);
      } else {
        currentData.push(0); // No data available
      }
    });

    // Format labels to show max 6 evenly spaced
    const formatLabels = (labels: string[]): string[] => {
      if (labels.length <= 6) return labels;
      const step = Math.ceil(labels.length / 6);
      return labels.filter((_, i) => i % step === 0);
    };

    return {
      labels: formatLabels(labels),
      datasets: [
        {
          data: currentData,
          color: (opacity = 1) => `rgba(255, 193, 7, ${opacity})`, // Amber for current
          strokeWidth: 2,
        },
      ],
    };
  };

  const prepareMovementData = () => {
    const labels: string[] = [];
    const movementData: number[] = [];

    const recentReadings = readings.slice(0, 20).reverse();
    const now = new Date();

    recentReadings.forEach((reading) => {
      const date = new Date(reading.receivedAt);
      const isToday = date.toDateString() === now.toDateString();
      const label = isToday
        ? `${date.getHours()}:${date.getMinutes().toString().padStart(2, '0')}`
        : `${date.getMonth() + 1}/${date.getDate()}`;
      labels.push(label);

      movementData.push(reading.gyro.movement || 0);
    });

    return {
      labels: labels.length > 0 ? labels : ['No Data'],
      datasets: [
        {
          data: movementData.length > 0 ? movementData : [0],
          color: (opacity = 1) => `rgba(255, 152, 0, ${opacity})`,
          strokeWidth: 2,
        },
      ],
    };
  };

  const chartConfig = {
    backgroundColor: '#FFFFFF',
    backgroundGradientFrom: '#FFFFFF',
    backgroundGradientTo: '#FFFFFF',
    decimalPlaces: 1,
    color: (opacity = 1) => `rgba(0, 0, 0, ${opacity})`,
    labelColor: (opacity = 1) => `rgba(0, 0, 0, ${opacity})`,
    style: {
      borderRadius: 16,
    },
    propsForDots: {
      r: '4',
      strokeWidth: '2',
      stroke: '#FF8C42',
    },
  };

  const getChartData = () => {
    switch (selectedChart) {
      case 'movement':
        return prepareMovementData();
      case 'gas':
        return prepareGasData();
      case 'voltage':
        return prepareVoltageData();
      case 'current':
        return prepareCurrentData();
      default:
        return prepareMovementData();
    }
  };

  const getYAxisSuffix = () => {
    switch (selectedChart) {
      case 'movement':
        return '';
      case 'gas':
        return '%';
      case 'voltage':
        return 'V';
      case 'current':
        return 'A';
      default:
        return '';
    }
  };

  const chartData = getChartData();

  return (
    <View style={styles.container}>
      <Text style={styles.title}>Overall Analytics</Text>

      {/* Statistics Cards */}
      <View style={styles.statsGrid}>
        <View style={styles.statCard}>
          <Ionicons name="pulse" size={24} color="#FF9800" />
          <Text style={styles.statValue}>{stats.movement.avg.toFixed(2)}</Text>
          <Text style={styles.statLabel}>Avg Movement</Text>
          <Text style={styles.statRange}>
            {stats.movement.min.toFixed(2)} - {stats.movement.max.toFixed(2)}
          </Text>
        </View>

        <View style={styles.statCard}>
          <Ionicons name="cloud" size={24} color="#9C27B0" />
          <Text style={styles.statValue}>{stats.gas.detections}</Text>
          <Text style={styles.statLabel}>Gas Detections</Text>
          <Text style={styles.statRange}>
            {stats.gas.total} total readings
          </Text>
        </View>

        <View style={styles.statCard}>
          <Ionicons name="flash" size={24} color="#4CAF50" />
          <Text style={styles.statValue}>{stats.voltage.avg.toFixed(1)}V</Text>
          <Text style={styles.statLabel}>Voltage</Text>
          <Text style={styles.statRange}>
            {stats.voltage.min.toFixed(1)} - {stats.voltage.max.toFixed(1)}V
          </Text>
        </View>

        <View style={styles.statCard}>
          <Ionicons name="radio" size={24} color="#FFC107" />
          <Text style={styles.statValue}>{stats.current.avg.toFixed(1)}A</Text>
          <Text style={styles.statLabel}>Current</Text>
          <Text style={styles.statRange}>
            {stats.current.min.toFixed(1)} - {stats.current.max.toFixed(1)}A
          </Text>
        </View>
      </View>

      {/* Chart */}
      <View style={styles.chartSection}>
        <View style={styles.chartHeader}>
          <Text style={styles.chartTitle}>
            {selectedChart === 'movement' ? 'Movement' : 
             selectedChart === 'gas' ? 'Gas Detection' : 
             selectedChart === 'voltage' ? 'Voltage Sensor' : 'Current Sensor'}
          </Text>
          <View style={styles.chartSelector}>
            <View
              style={[
                styles.selectorDot,
                selectedChart === 'movement' && styles.selectorDotActive,
              ]}
            />
            <View
              style={[
                styles.selectorDot,
                selectedChart === 'gas' && styles.selectorDotActive,
              ]}
            />
            <View
              style={[
                styles.selectorDot,
                selectedChart === 'voltage' && styles.selectorDotActive,
              ]}
            />
            <View
              style={[
                styles.selectorDot,
                selectedChart === 'current' && styles.selectorDotActive,
              ]}
            />
          </View>
        </View>

        <ScrollView horizontal showsHorizontalScrollIndicator={false}>
          <LineChart
            key={selectedChart + readings.length}
            data={chartData}
            width={Math.max(CHART_WIDTH, readings.length * 40)}
            height={200}
            chartConfig={chartConfig}
            bezier={selectedChart !== 'gas'}
            style={styles.chart}
            withVerticalLabels={true}
            withHorizontalLabels={true}
            withInnerLines={selectedChart !== 'gas'}
            withOuterLines={true}
            withDots={true}
            withShadow={false}
            segments={selectedChart === 'gas' ? 2 : 4}
            yAxisSuffix={getYAxisSuffix()}
            fromZero={selectedChart === 'gas'}
          />
        </ScrollView>

        {/* Legend for Gas Chart */}
        {selectedChart === 'gas' && (
          <View style={styles.legend}>
            <View style={styles.legendItem}>
              <View style={[styles.legendDot, { backgroundColor: '#9C27B0' }]} />
              <Text style={styles.legendText}>Detected (100%)</Text>
            </View>
            <View style={styles.legendItem}>
              <View style={[styles.legendDot, { backgroundColor: '#E0E0E0' }]} />
              <Text style={styles.legendText}>Not Detected (0%)</Text>
            </View>
          </View>
        )}

        {/* Chart Type Buttons */}
        <View style={styles.chartTypeButtons}>
          <TouchableOpacity
            style={[
              styles.chartTypeButton,
              selectedChart === 'movement' && styles.chartTypeButtonActive,
            ]}
            onPress={() => setSelectedChart('movement')}
          >
            <Ionicons
              name="pulse"
              size={16}
              color={selectedChart === 'movement' ? '#FFFFFF' : '#666'}
            />
            <Text
              style={[
                styles.chartTypeButtonText,
                selectedChart === 'movement' && styles.chartTypeButtonTextActive,
              ]}
            >
              Mov't
            </Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[
              styles.chartTypeButton,
              selectedChart === 'gas' && styles.chartTypeButtonActive,
            ]}
            onPress={() => setSelectedChart('gas')}
          >
            <Ionicons
              name="cloud"
              size={16}
              color={selectedChart === 'gas' ? '#FFFFFF' : '#666'}
            />
            <Text
              style={[
                styles.chartTypeButtonText,
                selectedChart === 'gas' && styles.chartTypeButtonTextActive,
              ]}
            >
              Gas
            </Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[
              styles.chartTypeButton,
              selectedChart === 'voltage' && styles.chartTypeButtonActive,
            ]}
            onPress={() => setSelectedChart('voltage')}
          >
            <Ionicons
              name="flash"
              size={16}
              color={selectedChart === 'voltage' ? '#FFFFFF' : '#666'}
            />
            <Text
              style={[
                styles.chartTypeButtonText,
                selectedChart === 'voltage' && styles.chartTypeButtonTextActive,
              ]}
            >
              Voltage
            </Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[
              styles.chartTypeButton,
              selectedChart === 'current' && styles.chartTypeButtonActive,
            ]}
            onPress={() => setSelectedChart('current')}
          >
            <Ionicons
              name="radio"
              size={16}
              color={selectedChart === 'current' ? '#FFFFFF' : '#666'}
            />
            <Text
              style={[
                styles.chartTypeButtonText,
                selectedChart === 'current' && styles.chartTypeButtonTextActive,
              ]}
            >
              Current
            </Text>
          </TouchableOpacity>
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    padding: 16,
    marginBottom: 16,
    ...Platform.select({
      ios: {
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.1,
        shadowRadius: 8,
      },
      android: {
        elevation: 4,
      },
    }),
  },
  title: {
    fontSize: 18,
    fontWeight: '700',
    color: '#333',
    marginBottom: 16,
  },
  statsGrid: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 20,
    gap: 12,
  },
  statCard: {
    flex: 1,
    backgroundColor: '#F8F8F8',
    borderRadius: 12,
    padding: 12,
    alignItems: 'center',
  },
  statValue: {
    fontSize: 20,
    fontWeight: '700',
    color: '#333',
    marginTop: 8,
  },
  statLabel: {
    fontSize: 11,
    color: '#666',
    marginTop: 4,
  },
  statRange: {
    fontSize: 9,
    color: '#999',
    marginTop: 2,
  },
  chartSection: {
    marginTop: 8,
  },
  chartHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  chartTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: '#333',
  },
  chartSelector: {
    flexDirection: 'row',
    gap: 6,
  },
  selectorDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: '#E0E0E0',
  },
  selectorDotActive: {
    backgroundColor: '#FF8C42',
    width: 20,
  },
  chart: {
    marginVertical: 8,
    borderRadius: 16,
  },
  chartTypeButtons: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    marginTop: 12,
    gap: 8,
  },
  chartTypeButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    paddingVertical: 8,
    paddingHorizontal: 12,
    borderRadius: 8,
    backgroundColor: '#F5F5F5',
  },
  chartTypeButtonActive: {
    backgroundColor: '#FF8C42',
  },
  chartTypeButtonText: {
    fontSize: 12,
    fontWeight: '500',
    color: '#666',
  },
  chartTypeButtonTextActive: {
    color: '#FFFFFF',
  },
  loadingText: {
    marginTop: 8,
    fontSize: 12,
    color: '#999',
    textAlign: 'center',
  },
  noDataText: {
    marginTop: 8,
    fontSize: 12,
    color: '#999',
    textAlign: 'center',
  },
  legend: {
    flexDirection: 'row',
    justifyContent: 'center',
    marginTop: 12,
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: '#E0E0E0',
    gap: 16,
  },
  legendItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  legendDot: {
    width: 12,
    height: 12,
    borderRadius: 6,
  },
  legendText: {
    fontSize: 12,
    color: '#666',
  },
});
