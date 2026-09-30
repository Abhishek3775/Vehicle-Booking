import React from 'react';
import { View, Text, StyleSheet, SafeAreaView } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { colors } from '../../theme/colors';
import { typography } from '../../theme/typography';
import { PrimaryButton } from '../../components/buttons/PrimaryButton';
import { SecondaryButton } from '../../components/buttons/SecondaryButton';
import { formatCurrency } from '../../utils/formatters';

export const PaymentSuccessScreen = ({ route, navigation }) => {
  const {
    paymentId = 'pay_demo_12345',
    amount = 5192,
    bookingReference = 'BK-4821',
    invoiceId,
    bookingId,
  } = route.params || {};

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.content}>
        {/* Animated-styled Success Badge */}
        <View style={styles.successHalo}>
          <View style={styles.successCircle}>
            <Ionicons name="checkmark" size={48} color="#FFFFFF" />
          </View>
        </View>

        <Text style={styles.title}>Payment Successful</Text>
        <Text style={styles.subtitle}>
          Your payment has been received and verified securely.
        </Text>

        {/* Amount Display */}
        <Text style={styles.amount}>{formatCurrency(amount)}</Text>

        {/* Transaction Details Box */}
        <View style={styles.detailsCard}>
          <View style={styles.detailRow}>
            <Text style={styles.detailLabel}>Payment ID</Text>
            <Text style={styles.detailValue} numberOfLines={1}>
              {paymentId}
            </Text>
          </View>

          <View style={styles.divider} />

          <View style={styles.detailRow}>
            <Text style={styles.detailLabel}>Booking Reference</Text>
            <Text style={styles.detailValue}>#{bookingReference}</Text>
          </View>

          <View style={styles.divider} />

          <View style={styles.detailRow}>
            <Text style={styles.detailLabel}>Payment Method</Text>
            <Text style={styles.detailValue}>Online Settlement</Text>
          </View>
        </View>

        {/* Bottom Actions */}
        <View style={styles.actionsContainer}>
          <PrimaryButton
            title="View Invoice"
            onPress={() =>
              navigation.replace('InvoiceDetail', {
                invoiceId,
                bookingId,
              })
            }
            icon={
              <Ionicons
                name="receipt-outline"
                size={18}
                color="#FFFFFF"
                style={{ marginRight: 8 }}
              />
            }
            style={{ marginBottom: 12 }}
          />

          <SecondaryButton
            title="Back to Home"
            onPress={() => navigation.navigate('HomeTab')}
          />
        </View>
      </View>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },
  content: {
    flex: 1,
    paddingHorizontal: 24,
    paddingVertical: 36,
    alignItems: 'center',
    justifyContent: 'center',
  },
  successHalo: {
    width: 100,
    height: 100,
    borderRadius: 50,
    backgroundColor: colors.accentSoft,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 20,
  },
  successCircle: {
    width: 76,
    height: 76,
    borderRadius: 38,
    backgroundColor: colors.accent,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: colors.accent,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 10,
    elevation: 6,
  },
  title: {
    ...typography.h1,
    color: colors.text,
    textAlign: 'center',
    marginBottom: 8,
  },
  subtitle: {
    ...typography.body,
    color: colors.textSecondary,
    textAlign: 'center',
    lineHeight: 22,
    marginBottom: 20,
  },
  amount: {
    fontSize: 34,
    fontWeight: '800',
    color: colors.primary,
    marginBottom: 24,
  },
  detailsCard: {
    backgroundColor: colors.surface,
    borderRadius: 18,
    padding: 20,
    width: '100%',
    borderWidth: 1,
    borderColor: colors.borderLight,
    marginBottom: 32,
    shadowColor: '#0F172A',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.04,
    shadowRadius: 6,
    elevation: 2,
  },
  detailRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 4,
  },
  detailLabel: {
    ...typography.subtext,
    color: colors.textSecondary,
  },
  detailValue: {
    ...typography.subtextBold,
    color: colors.text,
    maxWidth: '60%',
  },
  divider: {
    height: 1,
    backgroundColor: colors.borderLight,
    marginVertical: 10,
  },
  actionsContainer: {
    width: '100%',
  },
});

export default PaymentSuccessScreen;
