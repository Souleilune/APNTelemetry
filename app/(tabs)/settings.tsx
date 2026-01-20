import { useAuth } from '@/contexts/auth-context';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import React, { useState } from 'react';
import {
    Alert,
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
};

export default function SettingsScreen() {
  const router = useRouter();
  const { user, signOut, updateProfile, changePassword } = useAuth();
  
  // Edit profile state
  const [isEditingProfile, setIsEditingProfile] = useState(false);
  const [editFullName, setEditFullName] = useState(user?.fullName || '');
  const [profileLoading, setProfileLoading] = useState(false);
  
  // Password state
  const [showOldPassword, setShowOldPassword] = useState(false);
  const [showNewPassword, setShowNewPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [oldPassword, setOldPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [passwordLoading, setPasswordLoading] = useState(false);

  // Update editFullName when user changes
  React.useEffect(() => {
    if (user?.fullName) {
      setEditFullName(user.fullName);
    }
  }, [user?.fullName]);

  const handleUpdateProfile = async () => {
    if (!editFullName.trim()) {
      Alert.alert('Error', 'Please enter your name');
      return;
    }

    setProfileLoading(true);
    try {
      const result = await updateProfile(editFullName.trim());
      
      if (result.error) {
        Alert.alert('Error', result.message || 'Failed to update profile');
      } else {
        Alert.alert('Success', 'Profile updated successfully');
        setIsEditingProfile(false);
      }
    } finally {
      setProfileLoading(false);
    }
  };

  const handleChangePassword = async () => {
    // Validation
    if (!oldPassword || !newPassword || !confirmPassword) {
      Alert.alert('Error', 'Please fill in all password fields');
      return;
    }

    if (newPassword.length < 6) {
      Alert.alert('Error', 'New password must be at least 6 characters');
      return;
    }

    if (newPassword !== confirmPassword) {
      Alert.alert('Error', 'New passwords do not match');
      return;
    }

    setPasswordLoading(true);
    try {
      const result = await changePassword(oldPassword, newPassword);
      
      if (result.error) {
        Alert.alert('Error', result.message || 'Failed to change password');
      } else {
        Alert.alert('Success', 'Password changed successfully');
        // Clear form
        setOldPassword('');
        setNewPassword('');
        setConfirmPassword('');
      }
    } finally {
      setPasswordLoading(false);
    }
  };

  const handleLogout = () => {
    Alert.alert(
      'Logout',
      'Are you sure you want to logout?',
      [
        { text: 'Cancel', style: 'cancel' },
        { 
          text: 'Logout', 
          style: 'destructive',
          onPress: async () => {
            await signOut();
            router.replace('/(auth)/sign-in' as any);
          }
        },
      ]
    );
  };

  return (
    <View style={styles.container}>
      <SafeAreaView style={styles.safeArea} edges={['top']}>
        <ScrollView
          style={styles.scrollView}
          contentContainerStyle={styles.scrollContent}
          showsVerticalScrollIndicator={false}
          keyboardShouldPersistTaps="handled"
        >
          {/* Header with Avatar */}
          <View style={styles.header}>
            <View style={styles.avatarContainer}>
              <View style={styles.avatar}>
                <Ionicons name="person" size={32} color={COLORS.primary} />
              </View>
            </View>
            <Text style={styles.headerTitle}>Hi, {user?.fullName || user?.email?.split('@')[0] || 'User'}!</Text>
          </View>

          {/* User Information Section */}
          <View style={styles.section}>
            <View style={styles.sectionHeader}>
              <Text style={styles.sectionTitle}>Your Information</Text>
              {!isEditingProfile && (
                <TouchableOpacity
                  onPress={() => {
                    setEditFullName(user?.fullName || '');
                    setIsEditingProfile(true);
                  }}
                  activeOpacity={0.7}
                >
                  <Ionicons name="pencil" size={20} color={COLORS.primary} />
                </TouchableOpacity>
              )}
            </View>

            <View style={styles.infoCard}>
              {isEditingProfile ? (
                <>
                  <View style={styles.editInputContainer}>
                    <Ionicons name="person-outline" size={20} color={COLORS.primary} />
                    <TextInput
                      style={styles.editInput}
                      placeholder="Full Name"
                      placeholderTextColor={COLORS.textGray}
                      value={editFullName}
                      onChangeText={(text) => setEditFullName(text)}
                      autoCapitalize="words"
                    />
                  </View>

                  <View style={styles.divider} />

                  <View style={styles.infoItem}>
                    <Ionicons name="mail-outline" size={20} color={COLORS.primary} />
                    <Text style={styles.infoText}>{user?.email || 'Not available'}</Text>
                  </View>

                  <View style={styles.editButtonsRow}>
                    <TouchableOpacity
                      style={styles.cancelButton}
                      onPress={() => {
                        setIsEditingProfile(false);
                        setEditFullName(user?.fullName || '');
                      }}
                      activeOpacity={0.7}
                    >
                      <Text style={styles.cancelButtonText}>Cancel</Text>
                    </TouchableOpacity>
                    <TouchableOpacity
                      style={[styles.updateButton, profileLoading && styles.buttonDisabled]}
                      onPress={handleUpdateProfile}
                      activeOpacity={0.9}
                      disabled={profileLoading}
                    >
                      <Text style={styles.updateButtonText}>
                        {profileLoading ? 'Updating...' : 'Update'}
                      </Text>
                    </TouchableOpacity>
                  </View>
                </>
              ) : (
                <>
                  <View style={styles.infoItem}>
                    <Ionicons name="person-outline" size={20} color={COLORS.primary} />
                    <Text style={styles.infoText}>{user?.fullName || 'Not provided'}</Text>
                  </View>

                  <View style={styles.divider} />

                  <View style={styles.infoItem}>
                    <Ionicons name="mail-outline" size={20} color={COLORS.primary} />
                    <Text style={styles.infoText}>{user?.email || 'Not available'}</Text>
                  </View>
                </>
              )}
            </View>
          </View>

          {/* Add Socket Section */}
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>ESP32</Text>
            <TouchableOpacity
              style={styles.addSocketButton}
              onPress={() => router.push('/add-socket' as any)}
              activeOpacity={0.7}
            >
              <Ionicons name="add-circle-outline" size={24} color={COLORS.primary} />
              <Text style={styles.addSocketText}>Pair ESP32</Text>
            </TouchableOpacity>
          </View>

          {/* Reset Password Section */}
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Reset Password</Text>

            {/* Old Password */}
            <View style={styles.inputContainer}>
              <Ionicons 
                name="lock-closed-outline" 
                size={20} 
                color={COLORS.primary} 
                style={styles.inputIcon}
              />
              <TextInput
                style={styles.input}
                placeholder="Old Password"
                placeholderTextColor={COLORS.textGray}
                value={oldPassword}
                onChangeText={(text) => setOldPassword(text)}
                secureTextEntry={!showOldPassword}
                autoCapitalize="none"
              />
              <TouchableOpacity
                onPress={() => setShowOldPassword(!showOldPassword)}
                style={styles.eyeIcon}
                activeOpacity={0.7}
              >
                <Ionicons 
                  name={showOldPassword ? "eye-outline" : "eye-off-outline"} 
                  size={20} 
                  color={COLORS.primary}
                />
              </TouchableOpacity>
            </View>

            {/* New Password */}
            <View style={styles.inputContainer}>
              <Ionicons 
                name="lock-closed-outline" 
                size={20} 
                color={COLORS.primary} 
                style={styles.inputIcon}
              />
              <TextInput
                style={styles.input}
                placeholder="New Password"
                placeholderTextColor={COLORS.textGray}
                value={newPassword}
                onChangeText={(text) => setNewPassword(text)}
                secureTextEntry={!showNewPassword}
                autoCapitalize="none"
              />
              <TouchableOpacity
                onPress={() => setShowNewPassword(!showNewPassword)}
                style={styles.eyeIcon}
                activeOpacity={0.7}
              >
                <Ionicons 
                  name={showNewPassword ? "eye-outline" : "eye-off-outline"} 
                  size={20} 
                  color={COLORS.primary}
                />
              </TouchableOpacity>
            </View>

            {/* Confirm Password */}
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
          </View>

          {/* Change Password Button */}
          <TouchableOpacity
            style={[styles.saveButton, passwordLoading && styles.buttonDisabled]}
            onPress={handleChangePassword}
            activeOpacity={0.9}
            disabled={passwordLoading}
          >
            <Text style={styles.saveButtonText}>
              {passwordLoading ? 'Changing Password...' : 'Change Password'}
            </Text>
          </TouchableOpacity>

          {/* Logout Link */}
          <TouchableOpacity
            style={styles.logoutContainer}
            onPress={handleLogout}
            activeOpacity={0.7}
          >
            <Text style={styles.logoutText}>Logout on this device?</Text>
          </TouchableOpacity>
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
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    paddingHorizontal: 24,
    paddingBottom: 120,
  },
  header: {
    alignItems: 'center',
    paddingVertical: 24,
  },
  avatarContainer: {
    marginBottom: 16,
  },
  avatar: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: COLORS.white,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 3,
    borderColor: COLORS.primary,
  },
  headerTitle: {
    fontSize: 24,
    fontWeight: '700',
    color: COLORS.primary,
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
  infoCard: {
    backgroundColor: COLORS.white,
    borderRadius: 16,
    padding: 16,
    borderWidth: 1,
    borderColor: '#E0E0E0',
  },
  infoItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 12,
  },
  infoText: {
    fontSize: 15,
    color: COLORS.textDark,
    marginLeft: 12,
  },
  divider: {
    height: 1,
    backgroundColor: '#E0E0E0',
    marginVertical: 4,
  },
  editInputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: COLORS.inputBg,
    borderRadius: 8,
    paddingHorizontal: 12,
    height: 52,
  },
  editInput: {
    flex: 1,
    fontSize: 15,
    color: COLORS.textDark,
    marginLeft: 12,
    height: 52,
  },
  editButtonsRow: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    marginTop: 16,
    gap: 12,
  },
  cancelButton: {
    paddingVertical: 10,
    paddingHorizontal: 20,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: COLORS.primary,
  },
  cancelButtonText: {
    color: COLORS.primary,
    fontSize: 14,
    fontWeight: '600',
  },
  updateButton: {
    backgroundColor: COLORS.primary,
    paddingVertical: 10,
    paddingHorizontal: 20,
    borderRadius: 20,
  },
  updateButtonText: {
    color: COLORS.white,
    fontSize: 14,
    fontWeight: '600',
  },
  buttonDisabled: {
    opacity: 0.6,
  },
  addSocketButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: COLORS.white,
    borderRadius: 16,
    padding: 20,
    borderWidth: 2,
    borderColor: COLORS.primary,
    borderStyle: 'dashed',
  },
  addSocketText: {
    fontSize: 16,
    fontWeight: '600',
    color: COLORS.primary,
    marginLeft: 8,
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
    fontSize: 15,
    color: COLORS.textDark,
    height: 56,
  },
  eyeIcon: {
    padding: 4,
  },
  saveButton: {
    backgroundColor: COLORS.primary,
    paddingVertical: 16,
    borderRadius: 50,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 8,
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
  logoutContainer: {
    alignItems: 'center',
    marginTop: 24,
  },
  logoutText: {
    fontSize: 14,
    color: COLORS.textGray,
    textDecorationLine: 'underline',
  },
});