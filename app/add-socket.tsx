import { api } from '@/lib/api';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import React, { useState } from 'react';
import {
  Alert,
  ActivityIndicator,
  Platform,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

const COLORS = {
  primary: '#FF8C42',
  white: '#FFFFFF',
  inputBg: '#F5F5F5',
  textGray: '#999999',
  textDark: '#333333',
  shadow: '#000000',
  success: '#4CAF50',
  danger: '#F44336',
};

interface FoundSensor {
  id: string;
  deviceId: string;
  name?: string;
  type?: string;
}

export default function AddSocketScreen() {
  const router = useRouter();
  const [socketName, setSocketName] = useState('');
  const [location, setLocation] = useState('');
  const [scanning, setScanning] = useState(false);
  const [foundSensors, setFoundSensors] = useState<FoundSensor[]>([]);
  const [saving, setSaving] = useState(false);

  const handleScan = async () => {
    if (!socketName.trim()) {
      Alert.alert('Error', 'Please enter a socket name first');
      return;
    }

    setScanning(true);
    setFoundSensors([]);

    try {
      const response = await api.scanForSensors(socketName.trim());

      if (response.error) {
        Alert.alert('Scan Failed', response.message || 'Failed to scan for sensors');
        return;
      }

      if (response.data?.sensors) {
        setFoundSensors(response.data.sensors);
        if (response.data.sensors.length === 0) {
          Alert.alert('No ESP32 Found', 'No ESP32 were detected in this socket. Please check the connection and try again.');
        }
      }
    } catch (error) {
      console.error('Error scanning for sensors:', error);
      Alert.alert('Error', 'An unexpected error occurred while scanning');
    } finally {
      setScanning(false);
    }
  };

  const handleSave = async () => {
    if (!socketName.trim()) {
      Alert.alert('Error', 'Please enter a socket name');
      return;
    }

    setSaving(true);

    try {
      const sensorIds = foundSensors.map(sensor => sensor.id);
      const response = await api.createSocket(socketName.trim(), location.trim() || undefined, sensorIds);

      if (response.error) {
        Alert.alert('Save Failed', response.message || 'Failed to save socket');
        return;
      }

      Alert.alert(
        'Success',
        'Socket added successfully',
        [
          {
            text: 'OK',
            onPress: () => router.back(),
          },
        ]
      );
    } catch (error) {
      console.error('Error saving socket:', error);
      Alert.alert('Error', 'An unexpected error occurred while saving');
    } finally {
      setSaving(false);
    }
  };

  const handleCancel = () => {
    router.back();
  };

  return (
    <View style={styles.container}>
      <SafeAreaView style={styles.safeArea} edges={['top']}>
        {/* Header */}
        <View style={styles.header}>
          <TouchableOpacity
            onPress={handleCancel}
            style={styles.backButton}
            activeOpacity={0.7}
          >
            <Ionicons name="arrow-back" size={24} color={COLORS.white} />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>Add ESP32</Text>
          <View style={styles.backButton} />
        </View>

        <ScrollView
          style={styles.scrollView}
          contentContainerStyle={styles.scrollContent}
          showsVerticalScrollIndicator={false}
          keyboardShouldPersistTaps="handled"
        >
          {/* Socket Name Input */}
          <View style={styles.section}>
            <View style={styles.sectionHeader}>
              <Text style={styles.sectionTitle}>Socket Name</Text>
              <TouchableOpacity
                style={[styles.scanButton, (scanning || saving || !socketName.trim()) && styles.buttonDisabled]}
                onPress={handleScan}
                activeOpacity={0.7}
                disabled={scanning || saving || !socketName.trim()}
              >
                {scanning ? (
                  <>
                    <ActivityIndicator size="small" color={COLORS.primary} style={{ marginRight: 8 }} />
                    <Text style={styles.scanButtonText}>Scanning...</Text>
                  </>
                ) : (
                  <>
                    <Ionicons name="search" size={20} color={COLORS.primary} style={{ marginRight: 8 }} />
                    <Text style={styles.scanButtonText}>Scan for ESP32</Text>
                  </>
                )}
              </TouchableOpacity>
            </View>
            <View style={styles.inputContainer}>
              <Ionicons
                name="cube-outline"
                size={20}
                color={COLORS.primary}
                style={styles.inputIcon}
              />
              <TextInput
                style={styles.input}
                placeholder="Enter socket name"
                placeholderTextColor={COLORS.textGray}
                value={socketName}
                onChangeText={setSocketName}
                autoCapitalize="words"
                editable={!scanning && !saving}
              />
            </View>
          </View>

          {/* Location Input */}
          {/* <View style={styles.section}>
            <Text style={styles.sectionTitle}>Location</Text>
            <View style={styles.inputContainer}>
              <Ionicons
                name="location-outline"
                size={20}
                color={COLORS.primary}
                style={styles.inputIcon}
              />
              <TextInput
                style={styles.input}
                placeholder="Where is this socket located?"
                placeholderTextColor={COLORS.textGray}
                value={location}
                onChangeText={setLocation}
                autoCapitalize="words"
                editable={!scanning && !saving}
              />
            </View>
          </View> */}

           {/* Found Sensors List */}
          {foundSensors.length > 0 && (
            <View style={styles.section}>
              <Text style={styles.sectionTitle}>Found Sensors ({foundSensors.length})</Text>
              <View style={styles.sensorsCard}>
                {foundSensors.map((sensor, index) => (
                  <View key={sensor.id || index} style={styles.sensorItem}>
                    <View style={styles.sensorIconBg}>
                      <Ionicons name="hardware-chip" size={20} color={COLORS.primary} />
                    </View>
                    <View style={styles.sensorInfo}>
                      <Text style={styles.sensorName}>
                        {sensor.name || sensor.deviceId || `Sensor ${index + 1}`}
                      </Text>
                      {sensor.type && (
                        <Text style={styles.sensorType}>{sensor.type}</Text>
                      )}
                      {sensor.deviceId && (
                        <Text style={styles.sensorId}>ID: {sensor.deviceId}</Text>
                      )}
                    </View>
                    <Ionicons name="checkmark-circle" size={24} color={COLORS.success} />
                  </View>
                ))}
              </View>
            </View>
          )}

          {/* Save and Cancel Buttons */}
          <View style={styles.buttonRowContainer}>
            <View style={styles.buttonRow}>
              <TouchableOpacity
                style={[styles.saveButton, (saving || !socketName.trim()) && styles.buttonDisabled]}
                onPress={handleSave}
                activeOpacity={0.9}
                disabled={saving || !socketName.trim()}
              >
                {saving ? (
                  <>
                    <ActivityIndicator size="small" color={COLORS.white} style={{ marginRight: 8 }} />
                    <Text style={styles.saveButtonText}>Saving...</Text>
                  </>
                ) : (
                  <Text style={styles.saveButtonText}>Save ESP32</Text>
                )}
              </TouchableOpacity>
              
              <TouchableOpacity
                style={[styles.cancelButton, saving && styles.buttonDisabled]}
                onPress={handleCancel}
                activeOpacity={0.7}
                disabled={saving}
              >
                <Text style={styles.cancelButtonText}>Cancel</Text>
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
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 24,
    paddingVertical: 16,
    backgroundColor: COLORS.primary,
    borderBottomLeftRadius: 24,
    borderBottomRightRadius: 24,
  },
  backButton: {
    width: 40,
    height: 40,
    justifyContent: 'center',
    alignItems: 'center',
  },
  headerTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: COLORS.white,
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    paddingHorizontal: 24,
    paddingTop: 24,
    paddingBottom: 120,
  },
  section: {
    marginBottom: 24,
  },
   sectionHeader: {
     flexDirection: 'row',
     justifyContent: 'space-between',
     alignItems: 'center',
     marginBottom: 12,
   },
   sectionTitle: {
     fontSize: 16,
     fontWeight: '600',
     color: COLORS.textDark,
   },
  inputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: COLORS.inputBg,
    borderRadius: 12,
    paddingHorizontal: 16,
    height: 56,
  },
  inputIcon: {
    marginRight: 12,
  },
  input: {
    flex: 1,
    fontSize: 15,
    color: COLORS.textDark,
    height: 56,
  },
   scanButton: {
     flexDirection: 'row',
     alignItems: 'center',
     justifyContent: 'center',
     paddingVertical: 4,
     paddingHorizontal: 4,
   },
   scanButtonText: {
     color: COLORS.primary,
     fontSize: 16,
     fontWeight: '600',
   },
  sensorsCard: {
    backgroundColor: COLORS.white,
    borderRadius: 16,
    padding: 16,
    borderWidth: 1,
    borderColor: '#E0E0E0',
  },
  sensorItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#F0F0F0',
  },
  sensorIconBg: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: COLORS.primary + '20',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  sensorInfo: {
    flex: 1,
  },
  sensorName: {
    fontSize: 15,
    fontWeight: '600',
    color: COLORS.textDark,
    marginBottom: 4,
  },
  sensorType: {
    fontSize: 13,
    color: COLORS.textGray,
    marginBottom: 2,
  },
  sensorId: {
    fontSize: 12,
    color: COLORS.textGray,
  },
   buttonRowContainer: {
     marginTop: 16,
     marginBottom: 16,
   },
   buttonRow: {
     flexDirection: 'row',
     gap: 4,
   },
  saveButton: {
    flex: 1,
    backgroundColor: COLORS.primary,
    paddingVertical: 16,
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
    flexDirection: 'row',
    ...Platform.select({
      ios: {
        shadowColor: COLORS.shadow,
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.15,
        shadowRadius: 8,
      },
      android: {
        elevation: 6,
      },
    }),
  },
  saveButtonText: {
    color: COLORS.white,
    fontSize: 17,
    fontWeight: '600',
  },
  cancelButton: {
    flex: 1,
    backgroundColor: COLORS.white,
    borderWidth: 2,
    borderColor: COLORS.primary,
    paddingVertical: 16,
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
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
  cancelButtonText: {
    fontSize: 17,
    color: COLORS.primary,
    fontWeight: '600',
  },
  buttonDisabled: {
    opacity: 0.6,
  },
});

