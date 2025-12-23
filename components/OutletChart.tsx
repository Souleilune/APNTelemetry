import { SensorReading } from '@/lib/api';
import { Ionicons } from '@expo/vector-icons';
import React, { useState } from 'react';
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

interface OutletChartProps {
  outletNumber: 1 | 2;
  deviceId: string;
  readings: SensorReading[];
  loading?: boolean;
}

export function OutletChart({ outletNumber, deviceId, readings, loading }: OutletChartProps) {
  const [selectedChart, setSelectedChart] = useState<'water' | 'temperature'>('water');

  if (loading) {
    return (
      <View style={styles.chartContainer}>
        <ActivityIndicator size="small" color="#FF8C42" />
        <Text style={styles.loadingText}>Loading chart data...</Text>
      </View>
    );
  }

  if (!readings || readings.length === 0) {
    return (
      <View style={styles.chartContainer}>
        <Ionicons name="bar-chart-outline" size={32} color="#999" />
        <Text style={styles.noDataText}>No chart data available</Text>
      </View>
    );
  }

  // Format labels helper
  const formatLabels = (labels: string[]): string[] => {
    if (labels.length <= 6) return labels;
    const step = Math.ceil(labels.length / 6);
    return labels.filter((_, i) => i % step === 0);
  };

  // Prepare data for charts
  const prepareWaterData = () => {
    const recentReadings = readings.slice(0, 30).reverse();
    const labels: string[] = [];
    const sensor1Data: number[] = [];
    const sensor2Data: number[] = [];

    recentReadings.forEach((reading, index) => {
      const date = new Date(reading.receivedAt);
      const isToday = date.toDateString() === new Date().toDateString();
      const label = isToday
        ? `${date.getHours()}:${date.getMinutes().toString().padStart(2, '0')}`
        : `${date.getMonth() + 1}/${date.getDate()}`;
      labels.push(label);

      if (outletNumber === 1) {
        sensor1Data.push(reading.water[0] || 0);
        sensor2Data.push(reading.water[1] || 0);
      } else {
        sensor1Data.push(reading.water[2] || 0);
        sensor2Data.push(reading.water[3] || 0);
      }
    });

    return {
      labels: formatLabels(labels),
      datasets: [
        {
          data: sensor1Data,
          color: (opacity = 1) => `rgba(33, 150, 243, ${opacity})`, // Blue for sensor 1
          strokeWidth: 2,
        },
        {
          data: sensor2Data,
          color: (opacity = 1) => `rgba(21, 101, 192, ${opacity})`, // Darker blue for sensor 2
          strokeWidth: 2,
        },
      ],
    };
  };

  const prepareTemperatureData = () => {
    const recentReadings = readings.slice(0, 30).reverse();
    const labels: string[] = [];
    const tempData: number[] = [];

    recentReadings.forEach((reading, index) => {
      const date = new Date(reading.receivedAt);
      const isToday = date.toDateString() === new Date().toDateString();
      const label = isToday
        ? `${date.getHours()}:${date.getMinutes().toString().padStart(2, '0')}`
        : `${date.getMonth() + 1}/${date.getDate()}`;
      labels.push(label);

      const temp = outletNumber === 1 
        ? reading.temperature.temp1 
        : reading.temperature.temp2;
      tempData.push(temp || 0);
    });

    return {
      labels: formatLabels(labels),
      datasets: [
        {
          data: tempData,
          color: (opacity = 1) => `rgba(244, 67, 54, ${opacity})`, // Red for temperature
          strokeWidth: 2,
        },
      ],
    };
  };

  const getChartData = () => {
    switch (selectedChart) {
      case 'water':
        return prepareWaterData();
      case 'temperature':
        return prepareTemperatureData();
      default:
        return prepareWaterData();
    }
  };

  const getChartTitle = () => {
    switch (selectedChart) {
      case 'water':
        return `Water Sensors ${outletNumber === 1 ? '1 & 2' : '3 & 4'}`;
      case 'temperature':
        return `Temperature (Sensor ${outletNumber})`;
      default:
        return 'Chart';
    }
  };

  const getYAxisSuffix = () => {
    switch (selectedChart) {
      case 'water':
        return '';
      case 'temperature':
        return '°C';
      default:
        return '';
    }
  };

  const chartData = getChartData();

  const chartConfig = {
    backgroundColor: '#FFFFFF',
    backgroundGradientFrom: '#FFFFFF',
    backgroundGradientTo: '#FFFFFF',
    decimalPlaces: 1,
    color: (opacity = 1) => `rgba(0, 0, 0, ${opacity})`,
    labelColor: (opacity = 1) => `rgba(102, 102, 102, ${opacity})`,
    style: {
      borderRadius: 16,
    },
    propsForDots: {
      r: '4',
      strokeWidth: '2',
      stroke: '#FF8C42',
    },
  };

  return (
    <View style={styles.chartContainer}>
      {/* Chart Type Selector */}
      <View style={styles.chartSelector}>
        <Text style={styles.chartTitle}>{getChartTitle()}</Text>
        <View style={styles.selectorButtons}>
          <TouchableOpacity
            style={[
              styles.selectorButton,
              selectedChart === 'water' && styles.selectorButtonActive,
            ]}
            onPress={() => setSelectedChart('water')}
          >
            <Ionicons
              name="water"
              size={16}
              color={selectedChart === 'water' ? '#FF8C42' : '#666'}
            />
          </TouchableOpacity>
          <TouchableOpacity
            style={[
              styles.selectorButton,
              selectedChart === 'temperature' && styles.selectorButtonActive,
            ]}
            onPress={() => setSelectedChart('temperature')}
          >
            <Ionicons
              name="thermometer"
              size={16}
              color={selectedChart === 'temperature' ? '#FF8C42' : '#666'}
            />
          </TouchableOpacity>
        </View>
      </View>

      {/* Chart */}
      <ScrollView horizontal showsHorizontalScrollIndicator={false}>
        <LineChart
          key={selectedChart + readings.length}
          data={chartData}
          width={Math.max(CHART_WIDTH, readings.length * 40)}
          height={220}
          chartConfig={chartConfig}
          bezier
          style={styles.chart}
          withVerticalLabels={true}
          withHorizontalLabels={true}
          withInnerLines={true}
          withOuterLines={true}
          withDots={true}
          withShadow={false}
          segments={4}
          yAxisSuffix={getYAxisSuffix()}
          withVerticalLines={false}
          fromZero={false}
        />
      </ScrollView>

      {/* Legend for Water Chart */}
      {selectedChart === 'water' && (
        <View style={styles.legend}>
          <View style={styles.legendItem}>
            <View style={[styles.legendDot, { backgroundColor: '#2196F3' }]} />
            <Text style={styles.legendText}>Sensor {outletNumber === 1 ? '1' : '3'}</Text>
          </View>
          <View style={styles.legendItem}>
            <View style={[styles.legendDot, { backgroundColor: '#1565C0' }]} />
            <Text style={styles.legendText}>Sensor {outletNumber === 1 ? '2' : '4'}</Text>
          </View>
        </View>
      )}

      {/* Chart Type Buttons */}
      <View style={styles.chartTypeButtons}>
        <TouchableOpacity
          style={[
            styles.chartTypeButton,
            selectedChart === 'water' && styles.chartTypeButtonActive,
          ]}
          onPress={() => setSelectedChart('water')}
        >
          <Text
            style={[
              styles.chartTypeButtonText,
              selectedChart === 'water' && styles.chartTypeButtonTextActive,
            ]}
          >
            Water
          </Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[
            styles.chartTypeButton,
            selectedChart === 'temperature' && styles.chartTypeButtonActive,
          ]}
          onPress={() => setSelectedChart('temperature')}
        >
          <Text
            style={[
              styles.chartTypeButtonText,
              selectedChart === 'temperature' && styles.chartTypeButtonTextActive,
            ]}
          >
            Temperature
          </Text>
        </TouchableOpacity>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  chartContainer: {
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    padding: 16,
    marginTop: 24,
    marginBottom: 24,
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
  chartSelector: {
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
  selectorButtons: {
    flexDirection: 'row',
    gap: 8,
  },
  selectorButton: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: '#F5F5F5',
    justifyContent: 'center',
    alignItems: 'center',
  },
  selectorButtonActive: {
    backgroundColor: '#FFF4E6',
  },
  chart: {
    marginVertical: 8,
    borderRadius: 16,
  },
  legend: {
    flexDirection: 'row',
    justifyContent: 'center',
    marginTop: 12,
    gap: 16,
  },
  legendItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  legendDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
  },
  legendText: {
    fontSize: 11,
    color: '#666',
  },
  chartTypeButtons: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    marginTop: 12,
    gap: 8,
  },
  chartTypeButton: {
    flex: 1,
    paddingVertical: 8,
    paddingHorizontal: 12,
    borderRadius: 8,
    backgroundColor: '#F5F5F5',
    alignItems: 'center',
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
});
