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

export default function AddSocketFormScreen() {
  const router = useRouter();
  const [socketName, setSocketName] = useState('');
  const [location, setLocation] = useState('');
  const [saving, setSaving] = useState(false);

  const handleSave = async () => {
    if (!socketName.trim()) {
      Alert.alert('Error', 'Please enter a socket name');
      return;
    }

    setSaving(true);

    try {
      const response = await api.createSocket(socketName.trim(), location.trim() || undefined);

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
          <Text style={styles.headerTitle}>Add Socket</Text>
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
            <Text style={styles.sectionTitle}>Socket Name</Text>
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
                editable={!saving}
              />
            </View>
          </View>

          {/* Location Input */}
          <View style={styles.section}>
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
                editable={!saving}
              />
            </View>
          </View>

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
                  <Text style={styles.saveButtonText}>Save Socket</Text>
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
  sectionTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: COLORS.textDark,
    marginBottom: 12,
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
  buttonRowContainer: {
    marginTop: 16,
    marginBottom: 16,
  },
  buttonRow: {
    flexDirection: 'row',
    gap: 12,
  },
  saveButton: {
    flex: 1,
    backgroundColor: COLORS.primary,
    paddingVertical: 16,
    borderRadius: 12,
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
    borderRadius: 12,
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


