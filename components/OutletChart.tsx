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

  // Prepare data for charts - now zone-based detection (boolean: 0 or 1)
  const prepareWaterData = () => {
    const recentReadings = readings.slice(0, 30).reverse();
    const labels: string[] = [];
    const zoneData: number[] = []; // Single dataset for zone detection (0 or 1)

    recentReadings.forEach((reading, index) => {
      const date = new Date(reading.receivedAt);
      const isToday = date.toDateString() === new Date().toDateString();
      const label = isToday
        ? `${date.getHours()}:${date.getMinutes().toString().padStart(2, '0')}`
        : `${date.getMonth() + 1}/${date.getDate()}`;
      labels.push(label);

      // Water detection is zone-based: both sensors in a zone have the same value (0 or 1)
      // Zone 1: water[0] and water[1], Zone 2: water[2] and water[3]
      if (outletNumber === 1) {
        // Zone 1 detection (use first value, both are the same)
        zoneData.push(reading.water[0] === 1 ? 1 : 0);
      } else {
        // Zone 2 detection (use first value of zone 2, both are the same)
        zoneData.push(reading.water[2] === 1 ? 1 : 0);
      }
    });

    return {
      labels: formatLabels(labels),
      datasets: [
        {
          data: zoneData,
          color: (opacity = 1) => `rgba(33, 150, 243, ${opacity})`, // Blue for water detection
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
        return `Water Detection - Zone ${outletNumber}`;
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
    decimalPlaces: selectedChart === 'water' ? 0 : 1, // Water is boolean (0 or 1), temperature has decimals
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
            <Text style={styles.legendText}>Zone {outletNumber} Detection</Text>
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
