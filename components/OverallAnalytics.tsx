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

interface OverallAnalyticsProps {
  deviceId?: string;
}

export function OverallAnalytics({ deviceId }: OverallAnalyticsProps) {
  const [readings, setReadings] = useState<SensorReading[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedChart, setSelectedChart] = useState<'movement' | 'gas' | 'voltage'>('movement');

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

  // Calculate statistics
  const calculateStats = () => {
    const movementValues: number[] = [];
    const gasDetections: number[] = [];
    const voltageValues: number[] = []; // Placeholder data

    readings.forEach((reading) => {
      movementValues.push(reading.gyro?.movement || 0);
      
      // Gas detection (1 for detected, 0 for not detected)
      gasDetections.push(reading.gas ? 1 : 0);
      
      // Voltage placeholder (simulated data)
      voltageValues.push(120 + Math.random() * 10); // 120-130V range
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
    const now = new Date();

    // Generate placeholder data for last 30 readings
    for (let i = 29; i >= 0; i--) {
      const date = new Date(now.getTime() - i * 60000); // 1 minute intervals
      const isToday = date.toDateString() === now.toDateString();
      const label = isToday
        ? `${date.getHours()}:${date.getMinutes().toString().padStart(2, '0')}`
        : `${date.getMonth() + 1}/${date.getDate()}`;
      labels.push(label);
      
      // Simulated voltage data (placeholder)
      voltageData.push(120 + Math.random() * 10); // 120-130V range
    }

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
          <Text style={styles.statLabel}>Voltage (Placeholder)</Text>
          <Text style={styles.statRange}>
            {stats.voltage.min.toFixed(1)} - {stats.voltage.max.toFixed(1)}V
          </Text>
        </View>
      </View>

      {/* Chart */}
      <View style={styles.chartSection}>
        <View style={styles.chartHeader}>
          <Text style={styles.chartTitle}>
            {selectedChart === 'movement' ? 'Movement' : 
             selectedChart === 'gas' ? 'Gas Detection' : 'Voltage Sensor'}
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
              Movement
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
