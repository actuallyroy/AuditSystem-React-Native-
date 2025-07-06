import React, { useState } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  SafeAreaView,
  StatusBar,
  Alert,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useNavigation, useRoute } from '@react-navigation/native';

export default function ResetPasswordScreen() {
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [resetToken, setResetToken] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const navigation = useNavigation();
  const route = useRoute();

  // Get email from route params if passed from forgot password screen
  const email = route.params?.email || '';

  const validateForm = () => {
    if (!resetToken) {
      Alert.alert('Error', 'Please enter the reset token from your email');
      return false;
    }

    if (!password || !confirmPassword) {
      Alert.alert('Error', 'Please fill in all password fields');
      return false;
    }

    if (password !== confirmPassword) {
      Alert.alert('Error', 'Passwords do not match');
      return false;
    }

    if (password.length < 6) {
      Alert.alert('Error', 'Password must be at least 6 characters long');
      return false;
    }

    return true;
  };

  const handleResetPassword = async () => {
    if (!validateForm()) return;

    setIsLoading(true);
    try {
      // TODO: Implement actual password reset logic here
      console.log('Password reset attempt:', { email, resetToken, password });
      
      // Simulate API call
      await new Promise(resolve => setTimeout(resolve, 1000));
      
      Alert.alert(
        'Password Reset Successful',
        'Your password has been successfully reset. You can now sign in with your new password.',
        [
          {
            text: 'OK',
            onPress: () => navigation.navigate('Login' as never),
          },
        ]
      );
    } catch (error) {
      Alert.alert('Error', 'Failed to reset password. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

  const navigateToLogin = () => {
    navigation.navigate('Login' as never);
  };

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar barStyle="dark-content" backgroundColor="#f5f7fa" />
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        style={styles.keyboardAvoidingView}
      >
        <ScrollView contentContainerStyle={styles.scrollContainer}>
          <View style={styles.content}>
            {/* Header Section */}
            <View style={styles.headerSection}>
              <TouchableOpacity 
                style={styles.backButton}
                onPress={() => navigation.goBack()}
              >
                <Ionicons name="arrow-back" size={24} color="#0066CC" />
              </TouchableOpacity>
              <Ionicons name="key" size={80} color="#0066CC" />
              <Text style={styles.title}>Reset Password</Text>
              <Text style={styles.subtitle}>
                Enter the reset token from your email and create a new password
              </Text>
            </View>

            {/* Form Section */}
            <View style={styles.formSection}>
              {email && (
                <View style={styles.emailDisplay}>
                  <Ionicons name="mail-outline" size={16} color="#6c757d" />
                  <Text style={styles.emailText}>{email}</Text>
                </View>
              )}

              <View style={styles.inputContainer}>
                <Ionicons name="receipt-outline" size={20} color="#6c757d" style={styles.inputIcon} />
                <TextInput
                  style={styles.input}
                  placeholder="Reset Token"
                  placeholderTextColor="#6c757d"
                  value={resetToken}
                  onChangeText={setResetToken}
                  autoCapitalize="none"
                />
              </View>

              <View style={styles.inputContainer}>
                <Ionicons name="lock-closed-outline" size={20} color="#6c757d" style={styles.inputIcon} />
                <TextInput
                  style={[styles.input, styles.passwordInput]}
                  placeholder="New Password"
                  placeholderTextColor="#6c757d"
                  value={password}
                  onChangeText={setPassword}
                  secureTextEntry={!showPassword}
                  autoComplete="password-new"
                />
                <TouchableOpacity
                  style={styles.passwordToggle}
                  onPress={() => setShowPassword(!showPassword)}
                >
                  <Ionicons
                    name={showPassword ? 'eye-off-outline' : 'eye-outline'}
                    size={20}
                    color="#6c757d"
                  />
                </TouchableOpacity>
              </View>

              <View style={styles.inputContainer}>
                <Ionicons name="lock-closed-outline" size={20} color="#6c757d" style={styles.inputIcon} />
                <TextInput
                  style={[styles.input, styles.passwordInput]}
                  placeholder="Confirm New Password"
                  placeholderTextColor="#6c757d"
                  value={confirmPassword}
                  onChangeText={setConfirmPassword}
                  secureTextEntry={!showConfirmPassword}
                  autoComplete="password-new"
                />
                <TouchableOpacity
                  style={styles.passwordToggle}
                  onPress={() => setShowConfirmPassword(!showConfirmPassword)}
                >
                  <Ionicons
                    name={showConfirmPassword ? 'eye-off-outline' : 'eye-outline'}
                    size={20}
                    color="#6c757d"
                  />
                </TouchableOpacity>
              </View>

              <TouchableOpacity
                style={[styles.resetButton, isLoading && styles.resetButtonDisabled]}
                onPress={handleResetPassword}
                disabled={isLoading}
              >
                {isLoading ? (
                  <Text style={styles.resetButtonText}>Resetting Password...</Text>
                ) : (
                  <Text style={styles.resetButtonText}>Reset Password</Text>
                )}
              </TouchableOpacity>
            </View>

            {/* Additional Information */}
            <View style={styles.infoSection}>
              <Ionicons name="information-circle-outline" size={20} color="#6c757d" />
              <Text style={styles.infoText}>
                The reset token was sent to your email. If you can't find it, check your spam folder or request a new one.
              </Text>
            </View>

            {/* Back to Login Section */}
            <View style={styles.loginSection}>
              <Text style={styles.loginPrompt}>Remember your password?</Text>
              <TouchableOpacity onPress={navigateToLogin}>
                <Text style={styles.loginLink}>Back to Sign In</Text>
              </TouchableOpacity>
            </View>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f5f7fa',
  },
  keyboardAvoidingView: {
    flex: 1,
  },
  scrollContainer: {
    flexGrow: 1,
  },
  content: {
    flex: 1,
    paddingHorizontal: 24,
    paddingTop: 20,
    paddingBottom: 20,
  },
  headerSection: {
    alignItems: 'center',
    marginBottom: 40,
    position: 'relative',
  },
  backButton: {
    position: 'absolute',
    left: 0,
    top: 0,
    padding: 8,
  },
  title: {
    fontSize: 28,
    fontWeight: 'bold',
    color: '#333333',
    marginTop: 20,
    textAlign: 'center',
  },
  subtitle: {
    fontSize: 16,
    color: '#6c757d',
    marginTop: 12,
    textAlign: 'center',
    lineHeight: 24,
    paddingHorizontal: 20,
  },
  formSection: {
    marginBottom: 40,
  },
  emailDisplay: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#e8f5e8',
    padding: 12,
    borderRadius: 8,
    marginBottom: 20,
  },
  emailText: {
    marginLeft: 8,
    color: '#4caf50',
    fontSize: 14,
    fontWeight: '600',
  },
  inputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#ffffff',
    borderRadius: 12,
    paddingHorizontal: 16,
    paddingVertical: 4,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: '#e0e0e0',
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.1,
    shadowRadius: 3,
    elevation: 2,
  },
  inputIcon: {
    marginRight: 12,
  },
  input: {
    flex: 1,
    fontSize: 16,
    color: '#333333',
    paddingVertical: 14,
  },
  passwordInput: {
    paddingRight: 40,
  },
  passwordToggle: {
    position: 'absolute',
    right: 16,
    padding: 4,
  },
  resetButton: {
    backgroundColor: '#0066CC',
    borderRadius: 12,
    paddingVertical: 16,
    alignItems: 'center',
    marginTop: 8,
    shadowColor: '#0066CC',
    shadowOffset: {
      width: 0,
      height: 4,
    },
    shadowOpacity: 0.3,
    shadowRadius: 6,
    elevation: 4,
  },
  resetButtonDisabled: {
    backgroundColor: '#a0a0a0',
    shadowOpacity: 0.1,
  },
  resetButtonText: {
    color: '#ffffff',
    fontSize: 18,
    fontWeight: 'bold',
  },
  infoSection: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    backgroundColor: '#e3f2fd',
    padding: 16,
    borderRadius: 12,
    marginBottom: 40,
  },
  infoText: {
    flex: 1,
    marginLeft: 12,
    color: '#1976d2',
    fontSize: 14,
    lineHeight: 20,
  },
  loginSection: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    marginTop: 'auto',
  },
  loginPrompt: {
    color: '#6c757d',
    fontSize: 16,
    marginRight: 8,
  },
  loginLink: {
    color: '#0066CC',
    fontSize: 16,
    fontWeight: '600',
  },
}); 