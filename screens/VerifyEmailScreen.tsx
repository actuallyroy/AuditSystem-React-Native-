import React, { useState, useEffect } from 'react';
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

export default function VerifyEmailScreen() {
  const [verificationCode, setVerificationCode] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [isResending, setIsResending] = useState(false);
  const [countdown, setCountdown] = useState(60);
  const navigation = useNavigation();
  const route = useRoute();

  // Get email from route params
  const email = route.params?.email || '';

  useEffect(() => {
    let interval: NodeJS.Timeout;
    if (countdown > 0) {
      interval = setInterval(() => {
        setCountdown(countdown - 1);
      }, 1000);
    }
    return () => clearInterval(interval);
  }, [countdown]);

  const handleVerifyEmail = async () => {
    if (!verificationCode) {
      Alert.alert('Error', 'Please enter the verification code');
      return;
    }

    if (verificationCode.length !== 6) {
      Alert.alert('Error', 'Verification code must be 6 digits');
      return;
    }

    setIsLoading(true);
    try {
      // TODO: Implement actual email verification logic here
      console.log('Email verification attempt:', { email, verificationCode });
      
      // Simulate API call
      await new Promise(resolve => setTimeout(resolve, 1000));
      
      Alert.alert(
        'Email Verified',
        'Your email has been successfully verified. You can now sign in to your account.',
        [
          {
            text: 'OK',
            onPress: () => navigation.navigate('Login' as never),
          },
        ]
      );
    } catch (error) {
      Alert.alert('Error', 'Failed to verify email. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

  const handleResendCode = async () => {
    if (countdown > 0) return;

    setIsResending(true);
    try {
      // TODO: Implement actual resend verification code logic here
      console.log('Resending verification code to:', email);
      
      // Simulate API call
      await new Promise(resolve => setTimeout(resolve, 1000));
      
      Alert.alert('Code Sent', 'A new verification code has been sent to your email.');
      setCountdown(60);
    } catch (error) {
      Alert.alert('Error', 'Failed to resend verification code. Please try again.');
    } finally {
      setIsResending(false);
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
              <Ionicons name="mail-open" size={80} color="#0066CC" />
              <Text style={styles.title}>Verify Your Email</Text>
              <Text style={styles.subtitle}>
                We've sent a verification code to
              </Text>
              <Text style={styles.emailText}>{email}</Text>
            </View>

            {/* Form Section */}
            <View style={styles.formSection}>
              <View style={styles.inputContainer}>
                <Ionicons name="keypad-outline" size={20} color="#6c757d" style={styles.inputIcon} />
                <TextInput
                  style={styles.input}
                  placeholder="6-digit code"
                  placeholderTextColor="#6c757d"
                  value={verificationCode}
                  onChangeText={setVerificationCode}
                  keyboardType="numeric"
                  maxLength={6}
                  autoCapitalize="none"
                />
              </View>

              <TouchableOpacity
                style={[styles.verifyButton, isLoading && styles.verifyButtonDisabled]}
                onPress={handleVerifyEmail}
                disabled={isLoading}
              >
                {isLoading ? (
                  <Text style={styles.verifyButtonText}>Verifying...</Text>
                ) : (
                  <Text style={styles.verifyButtonText}>Verify Email</Text>
                )}
              </TouchableOpacity>
            </View>

            {/* Resend Section */}
            <View style={styles.resendSection}>
              <Text style={styles.resendText}>Didn't receive the code?</Text>
              <TouchableOpacity
                style={[styles.resendButton, (countdown > 0 || isResending) && styles.resendButtonDisabled]}
                onPress={handleResendCode}
                disabled={countdown > 0 || isResending}
              >
                {isResending ? (
                  <Text style={styles.resendButtonText}>Sending...</Text>
                ) : countdown > 0 ? (
                  <Text style={styles.resendButtonText}>Resend in {countdown}s</Text>
                ) : (
                  <Text style={styles.resendButtonText}>Resend Code</Text>
                )}
              </TouchableOpacity>
            </View>

            {/* Additional Information */}
            <View style={styles.infoSection}>
              <Ionicons name="information-circle-outline" size={20} color="#6c757d" />
              <Text style={styles.infoText}>
                Please check your email inbox and spam folder for the verification code. The code will expire in 10 minutes.
              </Text>
            </View>

            {/* Back to Login Section */}
            <View style={styles.loginSection}>
              <Text style={styles.loginPrompt}>Already verified?</Text>
              <TouchableOpacity onPress={navigateToLogin}>
                <Text style={styles.loginLink}>Sign In</Text>
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
    marginBottom: 50,
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
  },
  emailText: {
    fontSize: 16,
    color: '#0066CC',
    fontWeight: '600',
    marginTop: 4,
    textAlign: 'center',
  },
  formSection: {
    marginBottom: 40,
  },
  inputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#ffffff',
    borderRadius: 12,
    paddingHorizontal: 16,
    paddingVertical: 4,
    marginBottom: 24,
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
    fontSize: 18,
    color: '#333333',
    paddingVertical: 14,
    textAlign: 'center',
    letterSpacing: 4,
  },
  verifyButton: {
    backgroundColor: '#0066CC',
    borderRadius: 12,
    paddingVertical: 16,
    alignItems: 'center',
    shadowColor: '#0066CC',
    shadowOffset: {
      width: 0,
      height: 4,
    },
    shadowOpacity: 0.3,
    shadowRadius: 6,
    elevation: 4,
  },
  verifyButtonDisabled: {
    backgroundColor: '#a0a0a0',
    shadowOpacity: 0.1,
  },
  verifyButtonText: {
    color: '#ffffff',
    fontSize: 18,
    fontWeight: 'bold',
  },
  resendSection: {
    alignItems: 'center',
    marginBottom: 40,
  },
  resendText: {
    color: '#6c757d',
    fontSize: 16,
    marginBottom: 12,
  },
  resendButton: {
    paddingHorizontal: 20,
    paddingVertical: 8,
  },
  resendButtonDisabled: {
    opacity: 0.6,
  },
  resendButtonText: {
    color: '#0066CC',
    fontSize: 16,
    fontWeight: '600',
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