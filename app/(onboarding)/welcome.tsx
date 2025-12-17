import {
  Poppins_400Regular,
  Poppins_600SemiBold,
  Poppins_700Bold,
  useFonts,
} from '@expo-google-fonts/poppins';
import { useRouter } from 'expo-router';
import * as SplashScreen from 'expo-splash-screen';
import React, { useCallback } from 'react';
import {
  Dimensions,
  Platform,
  StatusBar,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

const { height } = Dimensions.get('window');

// Color palette - using single orange color for consistency
const COLORS = {
  primary: '#FF8C42',
  primaryLight: '#FFA660',
  primaryLighter: '#FFC08A',
  white: '#FFFFFF',
  shadow: '#000000',
} as const;

// Prevent splash screen from auto-hiding
SplashScreen.preventAutoHideAsync();

export default function WelcomeScreen() {
  const router = useRouter(); // ADD THIS LINE
  
  const [fontsLoaded, fontError] = useFonts({
    'Poppins-Regular': Poppins_400Regular,
    'Poppins-SemiBold': Poppins_600SemiBold,
    'Poppins-Bold': Poppins_700Bold,
  });

  const onLayoutRootView = useCallback(async () => {
    if (fontsLoaded || fontError) {
      await SplashScreen.hideAsync();
    }
  }, [fontsLoaded, fontError]);

  if (!fontsLoaded && !fontError) {
    return null;
  }

  // Navigate to register screen
  const handleContinue = (): void => {
    router.replace('/(auth)/register' as any);
  };

  return (
    <View style={styles.rootContainer} onLayout={onLayoutRootView}>
      <StatusBar
        barStyle="dark-content"
        backgroundColor={COLORS.white}
        translucent={false}
      />

      {/* Top White Section - Full Width & Expanded */}
      <View style={styles.topSection}>
        <SafeAreaView edges={['top']} style={styles.topSafeArea}>
          {/* Stacked Squares Illustration */}
          <View style={styles.illustrationContainer}>
            {/* Back Square (most rotated, lightest) */}
            <View style={[styles.square, styles.backSquare]} />

            {/* Middle Square */}
            <View style={[styles.square, styles.middleSquare]} />

            {/* Front Square with Outlet Face */}
            <View style={[styles.square, styles.frontSquare]}>
              <View style={styles.outletFace}>
                {/* Eyes Container */}
                <View style={styles.eyesContainer}>
                  <View style={styles.eye} />
                  
                  <View style={styles.eye} />
                </View>
                {/* Mouth */}
                <View style={styles.mouth} />
              </View>
            </View>
          </View>
        </SafeAreaView>
      </View>

      {/* Bottom Orange Section */}
      <View style={styles.bottomSection}>
        <SafeAreaView edges={['bottom']} style={styles.bottomSafeArea}>
          {/* Page Indicator Dots */}
          <View style={styles.dotsContainer}>
            <View style={[styles.dot, styles.activeDot]} />
            <View style={[styles.dot, styles.inactiveDot]} />
            <View style={[styles.dot, styles.inactiveDot]} />
          </View>

          {/* Text Content Section */}
          <View style={styles.textSection}>
            <Text style={styles.title}>Welcome to APN!</Text>
            <Text style={styles.subtitle}>
              Monitor your APN outlets,{'\n'}
              switch it off remotely while you enjoy your vacation.
            </Text>
          </View>

          {/* Button Section */}
          <View style={styles.buttonSection}>
            <TouchableOpacity
              style={styles.continueButton}
              onPress={handleContinue}
              activeOpacity={0.9}
            >
              <Text style={styles.continueButtonText}>Continue</Text>
            </TouchableOpacity>
          </View>
        </SafeAreaView>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  // Root Container - Same orange as bottom section
  rootContainer: {
    flex: 1,
    backgroundColor: '#FF8C42', // Exact same color
  },

  // Top White Section - Expanded
  topSection: {
    width: '100%',
    height: height * 0.55, // Increased from 0.48 to 0.55
    backgroundColor: COLORS.white,
    borderBottomLeftRadius: 50,
    borderBottomRightRadius: 50,
    zIndex: 2,
    ...Platform.select({
      ios: {
        shadowColor: COLORS.shadow,
        shadowOffset: {
          width: 0,
          height: 10,
        },
        shadowOpacity: 0.1,
        shadowRadius: 20,
      },
      android: {
        elevation: 15,
      },
    }),
  },
  topSafeArea: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },

  // Illustration Styles
  illustrationContainer: {
    width: 220,
    height: 220,
    justifyContent: 'center',
    alignItems: 'center',
    position: 'relative',
  },
  square: {
    position: 'absolute',
    width: 252,
    height: 252,
    borderRadius: 20,
  },
  backSquare: {
    backgroundColor: COLORS.primaryLighter,
    transform: [{ rotate: '-18deg' }],
    zIndex: 1,
    top: -36,
    left: -36,
    opacity: 0.9,
  },
  middleSquare: {
    backgroundColor: COLORS.primaryLight,
    transform: [{ rotate: '-9deg' }],
    zIndex: 2,
    top: -26,
    left:-26,
    ...Platform.select({
      ios: {
        shadowColor: COLORS.shadow,
        shadowOffset: {
          width: 0,
          height: 4,
        },
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
    top: -16,
    left: -16,
    justifyContent: 'center',
    alignItems: 'center',
    ...Platform.select({
      ios: {
        shadowColor: COLORS.shadow,
        shadowOffset: {
          width: 0,
          height: 10,
        },
        shadowOpacity: 0.2,
        shadowRadius: 15,
      },
      android: {
        elevation: 10,
      },
    }),
  },

  // Outlet Face Styles
  outletFace: {
    justifyContent: 'center',
    alignItems: 'center',
    paddingBottom: 5,
  },
  eyesContainer: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 24,
  },
  eye: {
    width: 18,
    height: 40,
    backgroundColor: COLORS.white,
    borderRadius: 3,
    overflow: 'hidden',
    marginHorizontal: 17,
    position: 'relative',
  },
  eyeInnerShadow: {
  position: 'absolute',
  top: 0,
  left: 0,
  right: 0,
  bottom: 0,
  borderRadius: 3,
  borderWidth: 1.5,
  borderColor: 'rgba(0, 0, 0, 0.15)',
  backgroundColor: 'rgba(0, 0, 0, 0.08)',
},
  mouth: {
    width: 44,
    height: 18,
    backgroundColor: COLORS.white,
    overflow: 'hidden',
    borderRadius: 3,
    position: 'relative',
  },

  mouthInnerShadow: {
  position: 'absolute',
  top: 0,
  left: 0,
  right: 0,
  bottom: 0,
  borderRadius: 3,
  borderWidth: 1.5,
  borderColor: 'rgba(0, 0, 0, 0.15)',
  backgroundColor: 'rgba(0, 0, 0, 0.08)',
},

  // Bottom Orange Section - Same color as root
  bottomSection: {
    flex: 1,
    backgroundColor: '#FF8C42', // Exact same color as rootContainer
  },
  bottomSafeArea: {
    flex: 1,
    justifyContent: 'space-between',
    paddingTop: 25,
  },

  // Page Indicator Dots Styles
  dotsContainer: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
  },
  dot: {
    marginHorizontal: 5,
  },
  activeDot: {
    width: 32,
    height: 10,
    borderRadius: 5,
    backgroundColor: COLORS.white,
  },
  inactiveDot: {
    width: 10,
    height: 10,
    borderRadius: 5,
    backgroundColor: 'rgba(255, 255, 255, 0.4)',
  },

  // Text Section Styles
  textSection: {
    alignItems: 'center',
    paddingHorizontal: 40,
  },
  title: {
    fontSize: 34,
    fontFamily: 'Poppins-Bold',
    color: COLORS.white,
    marginBottom: 14,
    textAlign: 'center',
    includeFontPadding: false,
  },
  subtitle: {
    fontSize: 19,
    fontFamily: 'Poppins-Regular',
    color: 'rgba(255, 255, 255, 0.8)',
    textAlign: 'center',
    lineHeight: 24,
    includeFontPadding: false,
  },

  // Button Section Styles
  buttonSection: {
    paddingHorizontal: 28,
    paddingBottom: Platform.OS === 'ios' ? 20 : 28,
  },
  continueButton: {
    backgroundColor: COLORS.white,
    paddingVertical: 18,
    borderRadius: 50,
    alignItems: 'center',
    justifyContent: 'center',
    ...Platform.select({
      ios: {
        shadowColor: COLORS.shadow,
        shadowOffset: {
          width: 0,
          height: 8,
        },
        shadowOpacity: 0.12,
        shadowRadius: 12,
      },
      android: {
        elevation: 10,
      },
    }),
  },
  continueButtonText: {
    color: COLORS.primary,
    fontSize: 19,
    fontFamily: 'Poppins-SemiBold',
    includeFontPadding: false,
  },
});