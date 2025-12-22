import { useAuth } from '@/contexts/auth-context';
import {
    Poppins_400Regular,
    Poppins_600SemiBold,
    Poppins_700Bold,
    useFonts,
} from '@expo-google-fonts/poppins';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import * as SplashScreen from 'expo-splash-screen';
import React, { useCallback, useState } from 'react';
import {
    ActivityIndicator,
    Alert,
    Platform,
    StatusBar,
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
} as const;

SplashScreen.preventAutoHideAsync();

export default function RegisterScreen() {
  const router = useRouter();
  const { signUp } = useAuth();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [loading, setLoading] = useState(false);

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

  const handleRegister = async (): Promise<void> => {
    // Validation
    if (!email || !password || !confirmPassword) {
      Alert.alert('Error', 'Please fill in all fields');
      return;
    }

    if (password !== confirmPassword) {
      Alert.alert('Error', 'Passwords do not match');
      return;
    }

    if (password.length < 6) {
      Alert.alert('Error', 'Password must be at least 6 characters');
      return;
    }

    setLoading(true);

    try {
      const result = await signUp(email, password);

      if (result.error) {
        Alert.alert('Registration Failed', result.message || 'Please try again');
      } else {
        Alert.alert(
          'Success!',
          'Registration successful! Please sign in.',
          [
            {
              text: 'OK',
              onPress: () => router.push('/(auth)/sign-in' as any),
            },
          ]
        );
      }
    } catch (error) {
      Alert.alert('Error', 'An unexpected error occurred');
    } finally {
      setLoading(false);
    }
  };

  const handleSignInNavigation = (): void => {
    router.push('/(auth)/sign-in' as any);
  };

  const handleBackPress = (): void => {
    if (router.canGoBack()) {
      router.back();
    } else {
      router.replace('/(onboarding)/welcome');
    }
  };

  return (
    <View style={styles.container} onLayout={onLayoutRootView}>
      <StatusBar
        barStyle="dark-content"
        backgroundColor={COLORS.white}
        translucent={false}
      />
      <SafeAreaView style={styles.safeArea} edges={['top', 'bottom']}>
        {/* Back Button */}
        <TouchableOpacity 
          style={styles.backButton} 
          onPress={handleBackPress}
          activeOpacity={0.7}
        >
          <Ionicons name="chevron-back" size={24} color={COLORS.primary} />
        </TouchableOpacity>

        {/* Content Container */}
        <View style={styles.content}>
          {/* Header */}
          <View style={styles.header}>
            <Text style={styles.title}>Register Now</Text>
            <Text style={styles.subtitle}>
              Sign up with your email and password to{'\n'}continue
            </Text>
          </View>

          {/* Form */}
          <View style={styles.form}>
            {/* Email Input */}
            <View style={styles.inputContainer}>
              <Ionicons 
                name="mail-outline" 
                size={20} 
                color={COLORS.primary} 
                style={styles.inputIcon}
              />
              <TextInput
                style={styles.input}
                placeholder="Email"
                placeholderTextColor={COLORS.textGray}
                value={email}
                onChangeText={(text) => setEmail(text)}
                keyboardType="email-address"
                autoCapitalize="none"
              />
            </View>

            {/* Password Input */}
            <View style={styles.inputContainer}>
              <Ionicons 
                name="lock-closed-outline" 
                size={20} 
                color={COLORS.primary} 
                style={styles.inputIcon}
              />
              <TextInput
                style={styles.input}
                placeholder="Password"
                placeholderTextColor={COLORS.textGray}
                value={password}
                onChangeText={(text) => setPassword(text)}
                secureTextEntry={!showPassword}
                autoCapitalize="none"
              />
              <TouchableOpacity
                onPress={() => setShowPassword(!showPassword)}
                style={styles.eyeIcon}
                activeOpacity={0.7}
              >
                <Ionicons 
                  name={showPassword ? "eye-outline" : "eye-off-outline"} 
                  size={20} 
                  color={COLORS.primary}
                />
              </TouchableOpacity>
            </View>

            {/* Confirm Password Input */}
            <View style={styles.inputContainer}>
              <Ionicons 
                name="lock-closed-outline" 
                size={20} 
                color={COLORS.primary} 
                style={styles.inputIcon}
              />
              <TextInput
                style={styles.input}
                placeholder="Confirm Password"
                placeholderTextColor={COLORS.textGray}
                value={confirmPassword}
                onChangeText={(text) => setConfirmPassword(text)}
                secureTextEntry={!showConfirmPassword}
                autoCapitalize="none"
              />
              <TouchableOpacity
                onPress={() => setShowConfirmPassword(!showConfirmPassword)}
                style={styles.eyeIcon}
                activeOpacity={0.7}
              >
                <Ionicons 
                  name={showConfirmPassword ? "eye-outline" : "eye-off-outline"} 
                  size={20} 
                  color={COLORS.primary}
                />
              </TouchableOpacity>
            </View>

            {/* Sign In Button */}
            <TouchableOpacity
              style={[styles.signInButton, loading && styles.signInButtonDisabled]}
              onPress={handleRegister}
              activeOpacity={0.9}
              disabled={loading}
            >
              {loading ? (
                <ActivityIndicator color={COLORS.white} />
              ) : (
                <Text style={styles.signInButtonText}>Register</Text>
              )}
            </TouchableOpacity>

            {/* Already have account */}
            <View style={styles.footer}>
              <Text style={styles.footerText}>Already have an account? </Text>
              <TouchableOpacity 
                onPress={handleSignInNavigation}
                activeOpacity={0.7}
              >
                <Text style={styles.footerLink}>Sign In</Text>
              </TouchableOpacity>
            </View>
          </View>

          {/* Logo */}
          
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
  backButton: {
    paddingLeft: 20,
    paddingTop: 10,
    paddingBottom: 10,
  },
  content: {
    flex: 1,
    paddingHorizontal: 28,
    paddingTop: 60,
  },
  header: {
    marginTop: 40,
    marginBottom: 40,
  },
  title: {
    fontSize: 28,
    fontFamily: 'Poppins-Bold',
    color: COLORS.primary,
    marginBottom: 8,
  },
  subtitle: {
    fontSize: 15,
    fontFamily: 'Poppins-Regular',
    color: COLORS.textGray,
    lineHeight: 22,
  },
  form: {
    marginTop: 20,
  },
  inputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: COLORS.inputBg,
    borderRadius: 12,
    paddingHorizontal: 16,
    marginBottom: 16,
    height: 56,
  },
  inputIcon: {
    marginRight: 12,
  },
  input: {
    flex: 1,
    fontFamily: 'Poppins-Regular',
    fontSize: 15,
    color: COLORS.textDark,
  },
  eyeIcon: {
    padding: 4,
  },
  signInButton: {
    backgroundColor: COLORS.primary,
    paddingVertical: 16,
    borderRadius: 50,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 8,
    ...Platform.select({
      ios: {
        shadowColor: '#000',
        shadowOffset: {
          width: 0,
          height: 4,
        },
        shadowOpacity: 0.15,
        shadowRadius: 8,
      },
      android: {
        elevation: 6,
      },
    }),
  },
  signInButtonText: {
    color: COLORS.white,
    fontSize: 17,
    fontFamily: 'Poppins-SemiBold',
  },
  signInButtonDisabled: {
    opacity: 0.6,
  },
  footer: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    marginTop: 24,
  },
  footerText: {
    fontFamily: 'Poppins-Regular',
    fontSize: 14,
    color: COLORS.textGray,
  },
  footerLink: {
    fontFamily: 'Poppins-SemiBold',
    fontSize: 14,
    color: COLORS.primary,
  },
});