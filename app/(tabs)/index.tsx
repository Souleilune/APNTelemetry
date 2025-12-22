import { useAuth } from '@/contexts/auth-context';
import { Ionicons } from '@expo/vector-icons';
import React from 'react';
import {
  Platform,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

const COLORS = {
  primary: '#FF8C42',
  white: '#FFFFFF',
  cardBg: '#FFFFFF',
  shadow: '#000000',
};

export default function HomeScreen() {
  const { user } = useAuth();

  return (
    <View style={styles.container}>
      <SafeAreaView style={styles.safeArea} edges={['top']}>
        {/* Header */}
        <View style={styles.header}>
          <Text style={styles.greeting}>Hi, {user?.fullName || user?.email?.split('@')[0] || 'User'}!</Text>
          <View style={styles.avatarPlaceholder}>
            <Ionicons name="person" size={24} color={COLORS.primary} />
          </View>
        </View>

        <ScrollView 
          style={styles.scrollView}
          showsVerticalScrollIndicator={false}
          contentContainerStyle={styles.scrollContent}
        >
          {/* Outlet Cards Section */}
          <View style={styles.outletsSection}>
            <View style={styles.outletCard}>
              <Text style={styles.outletLabel}>Outlet 1</Text>
              <View style={styles.outletIconPlaceholder}>
                {/* Outlet Face Placeholder */}
                <View style={styles.outletFace}>
                  <View style={styles.eyesRow}>
                    <View style={styles.eye} />
                    <View style={styles.eye} />
                  </View>
                  <View style={styles.mouth} />
                </View>
              </View>
            </View>

            <View style={styles.outletCard}>
              <Text style={styles.outletLabel}>Outlet 2</Text>
              <View style={styles.outletIconPlaceholder}>
                {/* Outlet Face Placeholder */}
                <View style={styles.outletFace}>
                  <View style={styles.eyesRow}>
                    <View style={styles.eye} />
                    <View style={styles.eye} />
                  </View>
                  <View style={styles.mouth} />
                </View>
              </View>
            </View>
          </View>

          {/* Current Status Section */}
          <View style={styles.statusSection}>
            <Text style={styles.sectionTitle}>Current Status:</Text>
            <View style={styles.statusCard}>
              <View style={styles.statusRow}>
                <View style={styles.statusItem}>
                  <Ionicons name="checkmark-circle-outline" size={24} color="#4CAF50" />
                  <Text style={styles.statusText}>Connected</Text>
                </View>
                <View style={styles.statusItem}>
                  <Ionicons name="warning-outline" size={24} color="#FFC107" />
                  <Text style={styles.statusText}>No Warning</Text>
                </View>
              </View>
            </View>
          </View>

          {/* Actionable Insights Section */}
          <View style={styles.insightsSection}>
            <Text style={styles.sectionTitle}>Actionable Insights:</Text>
            <View style={styles.insightsGrid}>
              <View style={styles.insightCard} />
              <View style={styles.insightCard} />
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
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 24,
    paddingVertical: 16,
    backgroundColor: COLORS.primary,
    borderBottomLeftRadius: 24,
    borderBottomRightRadius: 24,
    marginBottom: 24,
  },
  greeting: {
    fontSize: 24,
    fontWeight: '700',
    color: COLORS.white,
  },
  avatarPlaceholder: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: COLORS.white,
    justifyContent: 'center',
    alignItems: 'center',
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    paddingHorizontal: 24,
    paddingBottom: 100,
  },
  outletsSection: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 24,
  },
  outletCard: {
    width: '48%',
    backgroundColor: COLORS.cardBg,
    borderRadius: 20,
    padding: 16,
    alignItems: 'center',
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
  outletLabel: {
    fontSize: 14,
    fontWeight: '600',
    color: COLORS.primary,
    marginBottom: 12,
  },
  outletIconPlaceholder: {
    width: 100,
    height: 100,
    backgroundColor: COLORS.primary,
    borderRadius: 16,
    justifyContent: 'center',
    alignItems: 'center',
  },
  outletFace: {
    justifyContent: 'center',
    alignItems: 'center',
  },
  eyesRow: {
    flexDirection: 'row',
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
  statusSection: {
    marginBottom: 24,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: COLORS.primary,
    marginBottom: 12,
  },
  statusCard: {
    backgroundColor: COLORS.cardBg,
    borderRadius: 16,
    padding: 20,
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
  statusRow: {
    flexDirection: 'row',
    justifyContent: 'space-around',
  },
  statusItem: {
    alignItems: 'center',
  },
  statusText: {
    fontSize: 14,
    fontWeight: '500',
    color: '#333333',
    marginTop: 8,
  },
  insightsSection: {
    marginBottom: 24,
  },
  insightsGrid: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  insightCard: {
    width: '48%',
    height: 120,
    backgroundColor: COLORS.cardBg,
    borderRadius: 16,
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
});