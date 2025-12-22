import { Ionicons } from '@expo/vector-icons';
import React, { useState } from 'react';
import {
    Platform,
    ScrollView,
    StyleSheet,
    Text,
    TouchableOpacity,
    View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

const COLORS = {
  primary: '#FF8C42',
  white: '#FFFFFF',
  shadow: '#000000',
  text: '#333333',
  textLight: '#666666',
};

interface FAQItem {
  id: string;
  question: string;
  answer: string;
}

const faqData: FAQItem[] = [
  {
    id: '1',
    question: 'Installation Setup',
    answer: 'Follow the setup guide to install your APN outlet. Ensure the device is connected to a power source and your WiFi network is available.',
  },
  {
    id: '2',
    question: 'Connection',
    answer: 'Connect your outlet to the app via Bluetooth or WiFi. Make sure your mobile device has the necessary permissions enabled.',
  },
  {
    id: '3',
    question: 'Setting up Account',
    answer: 'Create an account using your email address. Verify your email to activate all features and start monitoring your outlets.',
  },
  {
    id: '4',
    question: 'Changing Password',
    answer: 'Navigate to Settings > Change Password. Enter your current password and choose a new secure password.',
  },
  {
    id: '5',
    question: 'Cannot Login',
    answer: 'If you cannot login, verify your email and password. Use the "Forgot Password" option to reset your credentials if needed.',
  },
  {
    id: '6',
    question: 'Device not connecting',
    answer: 'Ensure your outlet is powered on and within range. Check your WiFi connection and restart both the outlet and your mobile device.',
  },
];

export default function MetricsScreen() {
  const [expandedId, setExpandedId] = useState<string | null>(null);

  const toggleExpand = (id: string) => {
    setExpandedId(expandedId === id ? null : id);
  };

  return (
    <View style={styles.container}>
      <SafeAreaView style={styles.safeArea} edges={['top']}>
        {/* Header */}
        <View style={styles.header}>
          <Text style={styles.headerTitle}>Got questions?</Text>
          <Text style={styles.headerSubtitle}>
            We&apos;ve got <Text style={styles.headerAccent}>answers</Text>
          </Text>
        </View>

        {/* FAQ List */}
        <ScrollView
          style={styles.scrollView}
          contentContainerStyle={styles.scrollContent}
          showsVerticalScrollIndicator={false}
        >
          {faqData.map((item, index) => (
            <View key={item.id} style={styles.faqItemContainer}>
              <TouchableOpacity
                style={styles.faqItem}
                onPress={() => toggleExpand(item.id)}
                activeOpacity={0.7}
              >
                <Text style={styles.faqQuestion}>{item.question}</Text>
                <Ionicons
                  name={expandedId === item.id ? 'remove' : 'add'}
                  size={24}
                  color={COLORS.primary}
                />
              </TouchableOpacity>

              {expandedId === item.id && (
                <View style={styles.faqAnswer}>
                  <Text style={styles.faqAnswerText}>{item.answer}</Text>
                </View>
              )}
            </View>
          ))}
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
    paddingHorizontal: 24,
    paddingTop: 16,
    paddingBottom: 24,
    backgroundColor: COLORS.primary,
    borderBottomLeftRadius: 24,
    borderBottomRightRadius: 24,
    marginBottom: 24,
    alignItems: 'center',
  },
  headerTitle: {
    fontSize: 28,
    fontWeight: '700',
    color: COLORS.white,
  },
  headerSubtitle: {
    fontSize: 28,
    fontWeight: '700',
    color: COLORS.white,
  },
  headerAccent: {
    fontStyle: 'italic',
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    paddingHorizontal: 24,
    paddingBottom: 100,
  },
  faqItemContainer: {
    marginBottom: 12,
  },
  faqItem: {
    backgroundColor: COLORS.white,
    borderRadius: 16,
    paddingVertical: 20,
    paddingHorizontal: 20,
    flexDirection: 'row',
    justifyContent: 'space-between',
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
  faqQuestion: {
    flex: 1,
    fontSize: 16,
    fontWeight: '600',
    color: COLORS.text,
    marginRight: 12,
  },
  faqAnswer: {
    backgroundColor: COLORS.white,
    borderBottomLeftRadius: 16,
    borderBottomRightRadius: 16,
    paddingHorizontal: 20,
    paddingTop: 0,
    paddingBottom: 20,
    marginTop: -8,
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
  faqAnswerText: {
    fontSize: 14,
    color: COLORS.textLight,
    lineHeight: 20,
  },
});