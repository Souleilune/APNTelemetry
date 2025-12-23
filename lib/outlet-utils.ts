import { SensorReading } from './api';

export interface OutletData {
  outletNumber: 1 | 2;
  deviceId: string;
  waterSensors: [number | null, number | null];
  temperature: number | null;
  movement: number | null;
  gas: boolean;
  breakerState: boolean;
  power?: string | null;
  receivedAt: string;
}

interface StatusResult {
  status: string;
  color: string;
}

/**
 * Splits sensor data into two outlet-specific data objects
 * @param reading - The sensor reading from the API
 * @param breaker1State - State of breaker 1 (true = ON, false = OFF)
 * @param breaker2State - State of breaker 2 (true = ON, false = OFF)
 * @returns Tuple of [Outlet1Data, Outlet2Data]
 */
export function splitSensorDataByOutlet(
  reading: SensorReading | null,
  breaker1State: boolean = true,
  breaker2State: boolean = true
): [OutletData, OutletData] {
  if (!reading) {
    // Return empty data if no reading
    const emptyOutlet = (outletNumber: 1 | 2): OutletData => ({
      outletNumber,
      deviceId: '',
      waterSensors: [null, null],
      temperature: null,
      movement: null,
      gas: false,
      breakerState: outletNumber === 1 ? breaker1State : breaker2State,
      receivedAt: new Date().toISOString(),
    });

    return [emptyOutlet(1), emptyOutlet(2)];
  }

  const outlet1: OutletData = {
    outletNumber: 1,
    deviceId: reading.deviceId,
    waterSensors: [reading.water[0] ?? null, reading.water[1] ?? null],
    temperature: reading.temperature.temp1 ?? null,
    movement: reading.gyro.movement ?? null,
    gas: reading.gas,
    breakerState: breaker1State,
    power: reading.power,
    receivedAt: reading.receivedAt,
  };

  const outlet2: OutletData = {
    outletNumber: 2,
    deviceId: reading.deviceId,
    waterSensors: [reading.water[2] ?? null, reading.water[3] ?? null],
    temperature: reading.temperature.temp2 ?? null,
    movement: reading.gyro.movement ?? null,
    gas: reading.gas,
    breakerState: breaker2State,
    power: reading.power,
    receivedAt: reading.receivedAt,
  };

  return [outlet1, outlet2];
}

/**
 * Gets the status of water sensors
 * @param waterSensors - Array of 2 water sensor values
 * @returns Status object with status text and color
 */
export function getWaterStatus(waterSensors: [number | null, number | null]): StatusResult {
  const hasWater = waterSensors.some(val => val !== null && val > 0);
  
  if (hasWater) {
    return {
      status: 'Detected',
      color: '#2196F3', // Blue
    };
  }

  const hasReadings = waterSensors.some(val => val !== null);
  if (hasReadings) {
    return {
      status: 'Dry',
      color: '#4CAF50', // Green
    };
  }

  return {
    status: 'N/A',
    color: '#666666', // Gray
  };
}

/**
 * Gets the temperature status
 * @param temperature - Temperature value in Celsius
 * @returns Status object with status text and color
 */
export function getTempStatus(temperature: number | null): StatusResult {
  if (temperature === null || temperature === undefined) {
    return {
      status: 'N/A',
      color: '#666666', // Gray
    };
  }

  // Define temperature thresholds
  const HIGH_TEMP_THRESHOLD = 40; // °C
  const NORMAL_MAX = 30; // °C

  if (temperature >= HIGH_TEMP_THRESHOLD) {
    return {
      status: 'High',
      color: '#F44336', // Red
    };
  } else if (temperature > NORMAL_MAX) {
    return {
      status: 'Warm',
      color: '#FF9800', // Orange
    };
  } else {
    return {
      status: 'Normal',
      color: '#4CAF50', // Green
    };
  }
}

/**
 * Gets the movement status
 * @param movement - Movement/gyro value
 * @returns Status object with status text and color
 */
export function getMovementStatus(movement: number | null): StatusResult {
  if (movement === null || movement === undefined) {
    return {
      status: 'N/A',
      color: '#666666', // Gray
    };
  }

  // Define movement thresholds
  const HIGH_MOVEMENT_THRESHOLD = 1.0;
  const MODERATE_MOVEMENT_THRESHOLD = 0.5;

  if (Math.abs(movement) >= HIGH_MOVEMENT_THRESHOLD) {
    return {
      status: 'High',
      color: '#F44336', // Red
    };
  } else if (Math.abs(movement) >= MODERATE_MOVEMENT_THRESHOLD) {
    return {
      status: 'Moderate',
      color: '#FF9800', // Orange
    };
  } else {
    return {
      status: 'Normal',
      color: '#4CAF50', // Green
    };
  }
}

/**
 * Gets the display name for an outlet
 * @param outletNumber - The outlet number (1 or 2)
 * @returns Display name for the outlet
 */
export function getOutletName(outletNumber: 1 | 2): string {
  return outletNumber === 1 ? 'Primary' : 'Secondary';
}
