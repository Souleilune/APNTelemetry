import { api, SensorReading } from '@/lib/api';
import { Ionicons } from '@expo/vector-icons';
import React, { useEffect, useState } from 'react';
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

interface PowerData {
  voltage1?: number;
  voltage2?: number;
  current1?: number;
  current2?: number;
  v1_raw?: number;
  v2_raw?: number;
  [key: string]: unknown;
}

interface OverallAnalyticsProps {
  deviceId?: string;
  isPowerTripped?: boolean;
  latestReading?: SensorReading | null;
}

// Helper function to parse power data from JSON string
const parsePowerData = (power: string | null | object): PowerData | null => {
  if (!power) return null;
  
  try {
    // If power is already an object, return it
    if (typeof power === 'object' && !Array.isArray(power)) {
      return power as PowerData;
    }
    
    // If it's a string, try to parse as JSON
    if (typeof power === 'string') {
      // Handle empty string
      if (power.trim() === '') return null;
      
      const parsed = JSON.parse(power);
      return parsed as PowerData;
    }
    
    return null;
  } catch (error) {
    console.warn('Failed to parse power data:', error, 'Raw value:', power);
    return null;
  }
};

// Helper function to extract voltage from power data
const getVoltage = (powerData: PowerData | null): number => {
  if (!powerData) return 0;
  
  // Use voltage2 if available and > 0, otherwise voltage1, fallback to 0
  if (powerData.voltage2 !== undefined && powerData.voltage2 > 0) {
    return powerData.voltage2;
  }
  if (powerData.voltage1 !== undefined && powerData.voltage1 > 0) {
    return powerData.voltage1;
  }
  // Handle case where values might be 0 (valid reading)
  if (powerData.voltage2 !== undefined) return powerData.voltage2;
  if (powerData.voltage1 !== undefined) return powerData.voltage1;
  return 0;
};

// Helper function to extract current from power data
const getCurrent = (powerData: PowerData | null): number => {
  if (!powerData) return 0;
  
  // Use current2 if available and > 0, otherwise current1, fallback to 0
  if (powerData.current2 !== undefined && powerData.current2 > 0) {
    return powerData.current2;
  }
  if (powerData.current1 !== undefined && powerData.current1 > 0) {
    return powerData.current1;
  }
  // Handle case where values might be 0 (valid reading)
  if (powerData.current2 !== undefined) return powerData.current2;
  if (powerData.current1 !== undefined) return powerData.current1;
  return 0;
};

export function OverallAnalytics({ deviceId, isPowerTripped = false, latestReading }: OverallAnalyticsProps) {
  const [readings, setReadings] = useState<SensorReading[]>([]);
  const [latestReadingLocal, setLatestReadingLocal] = useState<SensorReading | null>(null);
  const [loading, setLoading] = useState(true);
  const [selectedChart, setSelectedChart] = useState<'movement' | 'gas' | 'voltage' | 'current'>('movement');

  useEffect(() => {
    const fetchData = async () => {
      if (!deviceId) {
        setLoading(false);
        return;
      }

      try {
        // Fetch both readings array and latest reading
        const [readingsResponse, latestResponse] = await Promise.all([
          api.getSensorReadings({ limit: 50, deviceId }),
          api.getLatestSensorReading(deviceId)
        ]);
        
        if (readingsResponse.data?.readings) {
          setReadings(readingsResponse.data.readings);
        }
        
        if (latestResponse.data?.reading) {
          setLatestReadingLocal(latestResponse.data.reading);
        }
      } catch (error) {
        console.error('Error fetching analytics:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchData();
    
    // Auto-refresh every 5 seconds to get latest data (matching real-time updates)
    const interval = setInterval(fetchData, 5000);
    
    return () => clearInterval(interval);
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
      
      // Extract voltage from power data
      const powerData = parsePowerData(reading.power);
      voltageValues.push(getVoltage(powerData));
      
      // Extract current from power data
      currentValues.push(getCurrent(powerData));
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
        avg: avg(voltageValues),
        max: max(voltageValues),
        min: min(voltageValues),
      },
      current: {
        avg: avg(currentValues),
        max: max(currentValues),
        min: min(currentValues),
      },
    };
  };

  const stats = calculateStats();

  // Get latest reading values for statistics cards from sensor_readings table
  // Use the reading with the most recent timestamp among: prop, local fetch, or first from array
  const getMostRecentReading = (): SensorReading | null => {
    const candidates: (SensorReading | null | undefined)[] = [latestReading, latestReadingLocal, readings[0]];
    const validReadings = candidates.filter((r): r is SensorReading => r !== null && r !== undefined);
    
    if (validReadings.length === 0) return null;
    
    // Sort by receivedAt timestamp (most recent first)
    validReadings.sort((a, b) => {
      const timeA = new Date(a.receivedAt).getTime();
      const timeB = new Date(b.receivedAt).getTime();
      return timeB - timeA;
    });
    
    return validReadings[0];
  };
  
  const currentLatestReading = getMostRecentReading();
  
  // Parse power data from the latest reading
  const latestPowerData = currentLatestReading ? parsePowerData(currentLatestReading.power) : null;
  
  // Extract latest values for statistics cards
  const latestMovement = currentLatestReading?.gyro?.movement ?? 0;
  const latestVoltage = latestPowerData ? getVoltage(latestPowerData) : 0;
  const latestCurrent = latestPowerData ? getCurrent(latestPowerData) : 0;
  
  // Debug: Log latest values to help troubleshoot
  if (__DEV__) {
    console.log('OverallAnalytics - Latest values:', {
      latestMovement,
      latestVoltage,
      latestCurrent,
      hasLatestReadingProp: !!latestReading,
      readingsCount: readings.length,
      firstReadingPower: readings[0]?.power,
      firstReadingPowerType: typeof readings[0]?.power,
      firstReadingId: readings[0]?.id,
      firstReadingReceivedAt: readings[0]?.receivedAt,
      parsedPowerData: latestPowerData,
      currentLatestReadingPower: currentLatestReading?.power,
    });
    
    // Also log the raw power string if it exists
    if (readings[0]?.power) {
      console.log('Raw power string:', readings[0].power);
      try {
        const parsed = JSON.parse(readings[0].power);
        console.log('Parsed power object:', parsed);
      } catch (e) {
        console.warn('Failed to parse power as JSON:', e);
      }
    }
  }

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
    const now = new Date();

    recentReadings.forEach((reading) => {
      const date = new Date(reading.receivedAt);
      const isToday = date.toDateString() === now.toDateString();
      const label = isToday
        ? `${date.getHours()}:${date.getMinutes().toString().padStart(2, '0')}`
        : `${date.getMonth() + 1}/${date.getDate()}`;
      labels.push(label);

      // Extract voltage from power data
      const powerData = parsePowerData(reading.power);
      voltageData.push(getVoltage(powerData));
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
          data: voltageData.length > 0 ? voltageData : [0],
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
    const now = new Date();

    recentReadings.forEach((reading) => {
      const date = new Date(reading.receivedAt);
      const isToday = date.toDateString() === now.toDateString();
      const label = isToday
        ? `${date.getHours()}:${date.getMinutes().toString().padStart(2, '0')}`
        : `${date.getMonth() + 1}/${date.getDate()}`;
      labels.push(label);

      // Extract current from power data
      const powerData = parsePowerData(reading.power);
      currentData.push(getCurrent(powerData));
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
          data: currentData.length > 0 ? currentData : [0],
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
          <Text style={styles.statValue}>{latestMovement.toFixed(2)}</Text>
          <Text style={styles.statLabel}>Movement</Text>
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
          <Text style={styles.statValue}>{latestVoltage.toFixed(1)}V</Text>
          <Text style={styles.statLabel}>Voltage</Text>
          <Text style={styles.statRange}>
            {stats.voltage.min.toFixed(1)} - {stats.voltage.max.toFixed(1)}V
          </Text>
        </View>

        <View style={styles.statCard}>
          <Ionicons name="radio" size={24} color="#FFC107" />
          <Text style={styles.statValue}>{latestCurrent.toFixed(1)}A</Text>
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
