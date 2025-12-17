import { Redirect } from 'expo-router';

export default function Index() {
  // TODO: Add logic to check if onboarding is complete
  const hasCompletedOnboarding = false;

  if (hasCompletedOnboarding) {
    return <Redirect href="/(tabs)" />;
  }

  return <Redirect href="/(onboarding)/welcome" />;
}