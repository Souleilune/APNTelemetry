import React, { useState } from 'react';
import {
    Dimensions,
    Platform,
    StyleSheet,
    Text,
    View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

const { width } = Dimensions.get('window');

const COLORS = {
  primary: '#FF8C42',
  primaryLight: '#FFA660',
  primaryLighter: '#FFC08A',
  white: '#FFFFFF',
  shadow: '#000000',
};

export default function OutletsScreen() {
  const [currentPage] = useState(0);
  const totalPages = 3;

  return (
    <View style={styles.container}>
      <SafeAreaView style={styles.safeArea} edges={['top']}>
        {/* Header */}
        <View style={styles.header}>
          <Text style={styles.headerTitle}>Outlets</Text>
        </View>

        {/* Main Content Area */}
        <View style={styles.content}>
          {/* Outlet Card */}
          <View style={styles.outletCard}>
            <Text style={styles.outletTitle}>Outlet 1 (Bedroom)</Text>
            
            {/* Large Outlet Illustration */}
            <View style={styles.illustrationContainer}>
              {/* Back Square */}
              <View style={[styles.square, styles.backSquare]} />
              
              {/* Middle Square */}
              <View style={[styles.square, styles.middleSquare]} />
              
              {/* Front Square with Face */}
              <View style={[styles.square, styles.frontSquare]}>
                <View style={styles.outletFace}>
                  <View style={styles.eyesContainer}>
                    <View style={styles.eye} />
                    <View style={styles.eye} />
                  </View>
                  <View style={styles.mouth} />
                </View>
              </View>
            </View>

            {/* Pagination Dots */}
            <View style={styles.paginationContainer}>
              {[...Array(totalPages)].map((_, index) => (
                <View
                  key={index}
                  style={[
                    styles.paginationDot,
                    index === currentPage ? styles.activeDot : styles.inactiveDot,
                  ]}
                />
              ))}
            </View>
          </View>

          {/* Outlet Status Section */}
          <View style={styles.statusSection}>
            <Text style={styles.statusTitle}>Outlet Status</Text>
            <View style={styles.statusCard} />
          </View>
        </View>
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
    paddingHorizontal: 24,
    paddingVertical: 16,
    backgroundColor: COLORS.primary,
    borderBottomLeftRadius: 24,
    borderBottomRightRadius: 24,
    marginBottom: 24,
  },
  headerTitle: {
    fontSize: 28,
    fontWeight: '700',
    color: COLORS.white,
  },
  content: {
    flex: 1,
    paddingHorizontal: 24,
    paddingBottom: 100,
  },
  outletCard: {
    backgroundColor: COLORS.white,
    borderRadius: 24,
    padding: 24,
    marginBottom: 24,
    alignItems: 'center',
    ...Platform.select({
      ios: {
        shadowColor: COLORS.shadow,
        shadowOffset: { width: 0, height: 8 },
        shadowOpacity: 0.15,
        shadowRadius: 16,
      },
      android: {
        elevation: 8,
      },
    }),
  },
  outletTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: '#333333',
    marginBottom: 32,
  },
  illustrationContainer: {
    width: 200,
    height: 200,
    justifyContent: 'center',
    alignItems: 'center',
    position: 'relative',
    marginBottom: 32,
  },
  square: {
    position: 'absolute',
    width: 180,
    height: 180,
    borderRadius: 20,
  },
  backSquare: {
    backgroundColor: COLORS.primaryLighter,
    transform: [{ rotate: '-18deg' }],
    zIndex: 1,
    top: -20,
    left: -20,
    opacity: 0.9,
  },
  middleSquare: {
    backgroundColor: COLORS.primaryLight,
    transform: [{ rotate: '-9deg' }],
    zIndex: 2,
    top: -12,
    left: -12,
    ...Platform.select({
      ios: {
        shadowColor: COLORS.shadow,
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.08,
        shadowRadius: 8,
      },
      android: {
        elevation: 4,
      },
    }),
  },
  frontSquare: {
    backgroundColor: COLORS.primary,
    transform: [{ rotate: '0deg' }],
    zIndex: 3,
    justifyContent: 'center',
    alignItems: 'center',
    ...Platform.select({
      ios: {
        shadowColor: COLORS.shadow,
        shadowOffset: { width: 0, height: 10 },
        shadowOpacity: 0.2,
        shadowRadius: 15,
      },
      android: {
        elevation: 10,
      },
    }),
  },
  outletFace: {
    justifyContent: 'center',
    alignItems: 'center',
  },
  eyesContainer: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 20,
  },
  eye: {
    width: 16,
    height: 36,
    backgroundColor: COLORS.white,
    borderRadius: 3,
    marginHorizontal: 14,
  },
  mouth: {
    width: 40,
    height: 16,
    backgroundColor: COLORS.white,
    borderRadius: 3,
  },
  paginationContainer: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
  },
  paginationDot: {
    marginHorizontal: 4,
  },
  activeDot: {
    width: 28,
    height: 8,
    borderRadius: 4,
    backgroundColor: COLORS.primary,
  },
  inactiveDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: 'rgba(255, 140, 66, 0.3)',
  },
  statusSection: {
    flex: 1,
  },
  statusTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: COLORS.primary,
    marginBottom: 16,
  },
  statusCard: {
    flex: 1,
    backgroundColor: COLORS.white,
    borderRadius: 24,
    ...Platform.select({
      ios: {
        shadowColor: COLORS.shadow,
        shadowOffset: { width: 0, height: 8 },
        shadowOpacity: 0.15,
        shadowRadius: 16,
      },
      android: {
        elevation: 8,
      },
    }),
  },
});