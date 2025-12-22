import { useAuth } from '@/contexts/auth-context';
import { Redirect } from 'expo-router';
import { ActivityIndicator, StyleSheet, View } from 'react-native';

const COLORS = {
  primary: '#FF8C42',
  white: '#FFFFFF',
};

export default function Index() {
  const { user, loading } = useAuth();

  // Show loading spinner while checking auth
  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color={COLORS.primary} />
      </View>
    );
  }

  // If user is authenticated, redirect to Home (tabs)
  if (user) {
    return <Redirect href="/(tabs)" />;
  }

  // If not authenticated, redirect to onboarding/welcome
  return <Redirect href="/(onboarding)/welcome" />;
}

const styles = StyleSheet.create({
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: COLORS.white,
  },
});