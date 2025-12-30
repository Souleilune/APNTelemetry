import React, { useEffect, useState } from 'react';
import { View, Text, StyleSheet } from 'react-native';
import Svg, { Circle } from 'react-native-svg';
import Animated, {
  useSharedValue,
  useAnimatedProps,
  withTiming,
} from 'react-native-reanimated';

const AnimatedCircle = Animated.createAnimatedComponent(Circle);

interface AnimatedGaugeProps {
  value: number | null;
  min: number;
  max: number;
  label: string;
  unit?: string;
  size?: number;
  strokeWidth?: number;
  colors?: {
    low: string;
    medium: string;
    high: string;
  };
}

const COLORS = {
  primary: '#FF8C42',
  success: '#4CAF50',
  warning: '#FFC107',
  danger: '#F44336',
  text: '#333333',
  textLight: '#666666',
  gaugeBg: '#F5F5F5',
};

export function AnimatedGauge({
  value,
  min,
  max,
  label,
  unit = '',
  size = 120,
  strokeWidth = 12,
  colors = {
    low: COLORS.success,
    medium: COLORS.warning,
    high: COLORS.danger,
  },
}: AnimatedGaugeProps) {
  const progress = useSharedValue(0);
  const displayValue = useSharedValue(value ?? 0);

  useEffect(() => {
    if (value === null || value === undefined) {
      progress.value = withTiming(0, { duration: 300 });
      displayValue.value = withTiming(0, { duration: 300 });
    } else {
      // Clamp value between min and max
      const clampedValue = Math.max(min, Math.min(max, value));
      // Normalize to 0-1 range
      const normalized = (clampedValue - min) / (max - min);
      progress.value = withTiming(normalized, { duration: 500 });
      displayValue.value = withTiming(clampedValue, { duration: 500 });
    }
  }, [value, min, max]);

  const radius = (size - strokeWidth) / 2;
  const circumference = 2 * Math.PI * radius;
  const center = size / 2;

  // Calculate color based on progress
  const animatedColor = useAnimatedProps(() => {
    const p = progress.value;
    if (p < 0.5) {
      return { stroke: colors.low };
    } else if (p < 0.8) {
      return { stroke: colors.medium };
    } else {
      return { stroke: colors.high };
    }
  });

  // Animated circle props
  const animatedCircleProps = useAnimatedProps(() => {
    const strokeDashoffset = circumference * (1 - progress.value);
    return {
      strokeDashoffset,
    };
  });

  const [displayValueText, setDisplayValueText] = useState(
    value !== null && value !== undefined ? value.toFixed(1) : '0.0'
  );

  useEffect(() => {
    if (value !== null && value !== undefined) {
      const clampedValue = Math.max(min, Math.min(max, value));
      setDisplayValueText(clampedValue.toFixed(1));
    } else {
      setDisplayValueText('0.0');
    }
  }, [value, min, max]);

  if (value === null || value === undefined) {
    return (
      <View style={[styles.container, { width: size, height: size }]}>
        <View style={styles.gaugeContainer}>
          <Svg width={size} height={size} viewBox={`0 0 ${size} ${size}`}>
            <Circle
              cx={center}
              cy={center}
              r={radius}
              stroke={COLORS.gaugeBg}
              strokeWidth={strokeWidth}
              fill="none"
            />
          </Svg>
          <View style={styles.valueContainer}>
            <Text style={styles.naText}>N/A</Text>
          </View>
        </View>
        <Text style={styles.label}>{label}</Text>
      </View>
    );
  }

  return (
    <View style={[styles.container, { width: size, height: size + 30 }]}>
      <View style={styles.gaugeContainer}>
        <Svg width={size} height={size} viewBox={`0 0 ${size} ${size}`}>
          {/* Background circle */}
          <Circle
            cx={center}
            cy={center}
            r={radius}
            stroke={COLORS.gaugeBg}
            strokeWidth={strokeWidth}
            fill="none"
            strokeDasharray={circumference}
            strokeDashoffset={circumference}
            transform={`rotate(-90 ${center} ${center})`}
          />
          {/* Animated progress circle */}
          <AnimatedCircle
            cx={center}
            cy={center}
            r={radius}
            strokeWidth={strokeWidth}
            fill="none"
            strokeDasharray={circumference}
            transform={`rotate(-90 ${center} ${center})`}
            strokeLinecap="round"
            animatedProps={animatedCircleProps}
            style={animatedColor}
          />
        </Svg>
        {/* Value display */}
        <View style={styles.valueContainer}>
          <Text style={styles.valueText}>{displayValueText}</Text>
          {unit && <Text style={styles.unitText}>{unit}</Text>}
        </View>
      </View>
      <Text style={styles.label}>{label}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  gaugeContainer: {
    position: 'relative',
    alignItems: 'center',
    justifyContent: 'center',
  },
  valueContainer: {
    position: 'absolute',
    alignItems: 'center',
    justifyContent: 'center',
  },
  valueText: {
    fontSize: 20,
    fontWeight: '700',
    color: COLORS.text,
  },
  unitText: {
    fontSize: 12,
    color: COLORS.textLight,
    marginTop: 2,
  },
  naText: {
    fontSize: 16,
    fontWeight: '600',
    color: COLORS.textLight,
  },
  label: {
    fontSize: 12,
    color: COLORS.textLight,
    marginTop: 8,
    textAlign: 'center',
    fontWeight: '500',
  },
});

