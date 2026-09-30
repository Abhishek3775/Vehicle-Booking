import React, { useState, useEffect, useRef } from 'react';
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
import { OtpInput } from '../../components/forms/OtpInput';
import { PrimaryButton } from '../../components/buttons/PrimaryButton';
import { useAuth } from '../../hooks/useAuth';
import { formatPhone } from '../../utils/formatters';

const RESEND_COOLDOWN_SECONDS = 60;

export const OtpScreen = ({ route, navigation }) => {
  const { phone: routePhone, debugOtp: initialDebugOtp } = route.params || {};
  const { verifyOtp, sendOtp, phonePending } = useAuth();

  // Resolve target phone safely from route params or context
  const phone = routePhone || phonePending;

  const [otp, setOtp] = useState('');
  const [debugOtp, setDebugOtp] = useState(initialDebugOtp || '');
  const [loading, setLoading] = useState(false);
  const [resending, setResending] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');
  const [countdown, setCountdown] = useState(RESEND_COOLDOWN_SECONDS);

  const timerRef = useRef(null);

  // Auto-fill debugOtp in dev mode if provided by backend
  useEffect(() => {
    if (initialDebugOtp && typeof initialDebugOtp === 'string') {
      setDebugOtp(initialDebugOtp);
      setOtp(initialDebugOtp);
    }
  }, [initialDebugOtp]);

  // Start resend countdown timer
  useEffect(() => {
    timerRef.current = setInterval(() => {
      setCountdown((prev) => {
        if (prev <= 1) {
          clearInterval(timerRef.current);
          return 0;
        }
        return prev - 1;
      });
    }, 1000);

    return () => clearInterval(timerRef.current);
  }, []);

  const handleVerify = async () => {
    if (!phone) {
      setErrorMessage('Phone number missing. Please return to login.');
      return;
    }

    if (otp.length < 6) {
      setErrorMessage('Please enter the complete 6-digit code.');
      return;
    }

    setLoading(true);
    setErrorMessage('');

    try {
      await verifyOtp(phone, otp);
      // Navigation is automatically handled by AuthContext switching to CustomerNavigator
    } catch (err) {
      const serverMessage =
        err.response?.data?.message ||
        'Verification failed. Please check the code or request a new one.';
      setErrorMessage(serverMessage);
    } finally {
      setLoading(false);
    }
  };

  const handleResend = async (force = false) => {
    if (!force && countdown > 0) return;
    if (resending || !phone) return;

    setResending(true);
    setErrorMessage('');

    try {
      const res = await sendOtp(phone);
      setCountdown(RESEND_COOLDOWN_SECONDS);

      // Extract new debugOtp from backend
      const newOtp = res?.data?.debugOtp;
      if (newOtp) {
        setDebugOtp(newOtp);
        setOtp(newOtp);
      }
      Alert.alert('Code Sent', `A fresh verification code was sent to ${formatPhone(phone)}`);
    } catch (err) {
      const msg = err.response?.data?.message || 'Unable to request OTP right now. Please wait.';
      setErrorMessage(msg);
    } finally {
      setResending(false);
    }
  };

  const isNoActiveOtpError =
    errorMessage &&
    (errorMessage.toLowerCase().includes('no active otp') ||
      errorMessage.toLowerCase().includes('expired'));

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
        <TouchableOpacity
          style={styles.backButton}
          onPress={() => navigation.goBack()}
          hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
        >
          <Ionicons name="arrow-back" size={24} color={colors.text} />
        </TouchableOpacity>

        <View style={styles.formCard}>
          <Text style={styles.title}>Verify your number</Text>
          <Text style={styles.instruction}>
            Enter the 6-digit OTP sent to{' '}
            <Text style={styles.phoneHighlight}>
              {phone ? formatPhone(phone) : 'your mobile'}
            </Text>
          </Text>

          {/* Interactive Debug OTP Banner */}
          {debugOtp ? (
            <TouchableOpacity
              style={styles.devBanner}
              activeOpacity={0.8}
              onPress={() => {
                setOtp(debugOtp);
                setErrorMessage('');
              }}
            >
              <View style={styles.devBannerLeft}>
                <Ionicons name="flash" size={16} color={colors.primary} />
                <Text style={styles.devBannerText}>
                  Demo Code: <Text style={{ fontWeight: '700' }}>{debugOtp}</Text>
                </Text>
              </View>
              <View style={styles.tapBadge}>
                <Text style={styles.tapBadgeText}>Tap to Fill</Text>
              </View>
            </TouchableOpacity>
          ) : null}

          <OtpInput
            length={6}
            value={otp}
            onChange={(val) => {
              setOtp(val);
              if (errorMessage) setErrorMessage('');
            }}
            error={Boolean(errorMessage)}
          />

          {errorMessage ? (
            <View style={styles.errorBox}>
              <Ionicons name="alert-circle-outline" size={16} color={colors.danger} />
              <Text style={styles.errorText}>{errorMessage}</Text>
            </View>
          ) : null}

          {/* If OTP expired or inactive, offer instant one-tap refresh */}
          {isNoActiveOtpError ? (
            <TouchableOpacity
              style={styles.requestNewOtpBtn}
              onPress={() => handleResend(true)}
              disabled={resending}
            >
              <Ionicons name="refresh" size={16} color={colors.primary} />
              <Text style={styles.requestNewOtpText}>
                {resending ? 'Requesting Fresh Code...' : 'Request Fresh OTP Now'}
              </Text>
            </TouchableOpacity>
          ) : null}

          <PrimaryButton
            title="Verify Code"
            onPress={handleVerify}
            loading={loading}
            disabled={otp.length < 6}
            style={styles.verifyBtn}
          />

          <View style={styles.resendRow}>
            <Text style={styles.resendLabel}>Didn't receive the code? </Text>
            {countdown > 0 ? (
              <Text style={styles.countdownText}>Resend in {countdown}s</Text>
            ) : (
              <TouchableOpacity onPress={() => handleResend(false)} disabled={resending}>
                <Text style={styles.resendButton}>
                  {resending ? 'Sending...' : 'Resend OTP'}
                </Text>
              </TouchableOpacity>
            )}
          </View>

          <TouchableOpacity
            style={styles.changePhoneBtn}
            onPress={() => navigation.goBack()}
          >
            <Text style={styles.changePhoneText}>Change Mobile Number</Text>
          </TouchableOpacity>
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
  backButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: colors.surface,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 24,
    borderWidth: 1,
    borderColor: colors.borderLight,
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
  title: {
    ...typography.h2,
    color: colors.text,
    marginBottom: 8,
  },
  instruction: {
    ...typography.body,
    color: colors.textSecondary,
    marginBottom: 8,
    lineHeight: 22,
  },
  phoneHighlight: {
    fontWeight: '700',
    color: colors.text,
  },
  devBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: colors.primarySoft,
    paddingHorizontal: 12,
    paddingVertical: 10,
    borderRadius: 12,
    marginTop: 8,
    borderWidth: 1,
    borderColor: colors.borderLight,
  },
  devBannerLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  devBannerText: {
    ...typography.caption,
    color: colors.primary,
  },
  tapBadge: {
    backgroundColor: colors.primary,
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
  },
  tapBadgeText: {
    ...typography.caption,
    color: '#FFFFFF',
    fontWeight: '700',
    fontSize: 11,
  },
  errorBox: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    backgroundColor: colors.dangerSoft,
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 8,
    marginBottom: 12,
  },
  errorText: {
    ...typography.caption,
    color: colors.danger,
    textAlign: 'center',
    flexShrink: 1,
  },
  requestNewOtpBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    paddingVertical: 10,
    paddingHorizontal: 14,
    borderRadius: 10,
    backgroundColor: colors.primarySoft,
    marginBottom: 12,
    alignSelf: 'center',
  },
  requestNewOtpText: {
    ...typography.subtextBold,
    color: colors.primary,
  },
  verifyBtn: {
    marginTop: 4,
    marginBottom: 16,
  },
  resendRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
  },
  resendLabel: {
    ...typography.subtext,
    color: colors.textSecondary,
  },
  countdownText: {
    ...typography.subtext,
    color: colors.textMuted,
    fontWeight: '600',
  },
  resendButton: {
    ...typography.subtextBold,
    color: colors.primary,
  },
  changePhoneBtn: {
    marginTop: 18,
    alignSelf: 'center',
  },
  changePhoneText: {
    ...typography.caption,
    color: colors.textSecondary,
    textDecorationLine: 'underline',
  },
});

export default OtpScreen;
