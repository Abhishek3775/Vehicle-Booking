import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  Alert,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { colors } from '../../theme/colors';
import { typography } from '../../theme/typography';
import { InputField } from '../../components/forms/InputField';
import { PrimaryButton } from '../../components/buttons/PrimaryButton';
import { useAuth } from '../../hooks/useAuth';

export const LoginScreen = ({ navigation }) => {
  const { sendOtp } = useAuth();
  const [phone, setPhone] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handlePhoneChange = (text) => {
    // Keep only numbers, max 10 digits
    const cleaned = text.replace(/[^0-9]/g, '').slice(0, 10);
    setPhone(cleaned);
    if (error) setError('');
  };

  const handleContinue = async () => {
    if (phone.length < 10) {
      setError('Please enter a valid 10-digit mobile number.');
      return;
    }

    setLoading(true);
    setError('');

    try {
      const res = await sendOtp(phone);
      // In development mode, backend returns debugOtp
      const debugOtp = res?.data?.debugOtp;
      navigation.navigate('Otp', { phone, debugOtp });
    } catch (err) {
      const msg = err.response?.data?.message || 'Unable to send OTP. Please check your network and try again.';
      setError(msg);
      Alert.alert('Verification Failed', msg);
    } finally {
      setLoading(false);
    }
  };

  return (
    <KeyboardAvoidingView
      style={styles.container}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
    >
      <ScrollView
        contentContainerStyle={styles.scrollContent}
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}
      >
        <View style={styles.topSection}>
          <View style={styles.logoContainer}>
            <Ionicons name="car-sport" size={36} color={colors.primary} />
          </View>
          <Text style={styles.brandTitle}>AutoCare</Text>
          <Text style={styles.tagline}>Premium Vehicle Servicing & Roadside Help</Text>
        </View>

        <View style={styles.formCard}>
          <Text style={styles.welcomeText}>Welcome</Text>
          <Text style={styles.instructionText}>
            Enter your mobile number to sign in or create an account
          </Text>

          <InputField
            label="Mobile Number"
            value={phone}
            onChangeText={handlePhoneChange}
            placeholder="98765 43210"
            keyboardType="phone-pad"
            maxLength={10}
            error={error}
            leftIcon={
              <View style={styles.countryCode}>
                <Text style={styles.countryCodeText}>+91</Text>
                <View style={styles.codeDivider} />
              </View>
            }
          />

          <TouchableOpacity
            style={styles.demoChip}
            activeOpacity={0.7}
            onPress={() => {
              setPhone('9876543210');
              if (error) setError('');
            }}
          >
            <Ionicons name="flash-outline" size={14} color={colors.primary} />
            <Text style={styles.demoChipText}>Quick Demo Phone: 98765 43210</Text>
          </TouchableOpacity>

          <PrimaryButton
            title="Continue"
            onPress={handleContinue}
            loading={loading}
            disabled={phone.length < 10}
            style={styles.continueBtn}
          />

          <View style={styles.termsContainer}>
            <Text style={styles.termsText}>
              By continuing, you agree to our{' '}
              <Text
                style={styles.linkText}
                onPress={() => navigation.navigate('Terms')}
              >
                Terms of Service
              </Text>{' '}
              and{' '}
              <Text
                style={styles.linkText}
                onPress={() => navigation.navigate('PrivacyPolicy')}
              >
                Privacy Policy
              </Text>
              .
            </Text>
          </View>
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },
  scrollContent: {
    flexGrow: 1,
    paddingHorizontal: 24,
    paddingVertical: 36,
    justifyContent: 'center',
  },
  topSection: {
    alignItems: 'center',
    marginBottom: 36,
  },
  logoContainer: {
    width: 72,
    height: 72,
    borderRadius: 24,
    backgroundColor: colors.primarySoft,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 16,
    borderWidth: 1,
    borderColor: colors.borderLight,
  },
  brandTitle: {
    ...typography.h1,
    color: colors.primary,
    fontWeight: '800',
    letterSpacing: -0.5,
  },
  tagline: {
    ...typography.subtext,
    color: colors.textSecondary,
    marginTop: 4,
    textAlign: 'center',
  },
  formCard: {
    backgroundColor: colors.surface,
    borderRadius: 24,
    padding: 24,
    borderWidth: 1,
    borderColor: colors.borderLight,
    shadowColor: '#0F172A',
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.05,
    shadowRadius: 14,
    elevation: 3,
  },
  welcomeText: {
    ...typography.h2,
    color: colors.text,
    marginBottom: 6,
  },
  instructionText: {
    ...typography.body,
    color: colors.textSecondary,
    marginBottom: 24,
    lineHeight: 22,
  },
  countryCode: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  countryCodeText: {
    ...typography.bodyBold,
    color: colors.text,
  },
  codeDivider: {
    width: 1,
    height: 20,
    backgroundColor: colors.border,
    marginHorizontal: 10,
  },
  demoChip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    alignSelf: 'flex-start',
    backgroundColor: colors.primarySoft,
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 8,
    marginTop: -8,
    marginBottom: 16,
  },
  demoChipText: {
    ...typography.caption,
    color: colors.primary,
    fontWeight: '600',
  },
  continueBtn: {
    marginTop: 8,
  },
  termsContainer: {
    marginTop: 20,
    alignItems: 'center',
  },
  termsText: {
    ...typography.caption,
    color: colors.textMuted,
    textAlign: 'center',
    lineHeight: 18,
  },
  linkText: {
    color: colors.primary,
    fontWeight: '600',
  },
});

export default LoginScreen;
