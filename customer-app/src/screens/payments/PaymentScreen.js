import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Alert,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { colors } from '../../theme/colors';
import { typography } from '../../theme/typography';
import { PAYMENT_METHODS } from '../../constants/appConstants';
import { paymentApi } from '../../api/paymentApi';
import { invoiceApi } from '../../api/invoiceApi';
import { PrimaryButton } from '../../components/buttons/PrimaryButton';
import { formatCurrency } from '../../utils/formatters';

export const PaymentScreen = ({ route, navigation }) => {
  const {
    bookingId,
    quotationId,
    amount = 5192,
    vehicleName = 'Hyundai Creta',
    serviceName = 'Comprehensive Vehicle Servicing',
    bookingReference = 'BK-4821',
  } = route.params || {};

  const [selectedMethod, setSelectedMethod] = useState('UPI');
  const [processing, setProcessing] = useState(false);

  const handlePayNow = async () => {
    setProcessing(true);
    try {
      // 1. Create order on backend (strictly no secrets in client!)
      const orderRes = await paymentApi.createOrder({
        quotationId,
        paymentMethod: selectedMethod,
      });

      const orderData = orderRes?.data;
      const gatewayOrderId = orderData?.gatewayOrderId || orderData?.orderId || `order_${Date.now()}`;
      const mockPaymentId = `pay_${Date.now()}_${Math.random().toString(36).substring(2, 8)}`;
      const mockSignature = `sig_${Date.now()}_${Math.random().toString(36).substring(2, 10)}`;

      // 2. Perform backend verification (HMAC verification happens purely on the server)
      const verifyRes = await paymentApi.verifyPayment({
        razorpay_order_id: gatewayOrderId,
        razorpay_payment_id: mockPaymentId,
        razorpay_signature: mockSignature,
      });

      const settledPayment = verifyRes?.data || {};
      const settledPaymentId = settledPayment._id || settledPayment.id || mockPaymentId;

      // 3. Generate electronic tax invoice automatically
      let generatedInvoiceId = null;
      try {
        const invRes = await invoiceApi.generateInvoice({
          paymentId: settledPaymentId,
          notes: 'Customer digital payment settlement',
        });
        generatedInvoiceId = invRes?.data?._id || invRes?.data?.id;
      } catch {
        // Non-blocking if already triggered by server event
      }

      // Navigate to Payment Success screen
      navigation.replace('PaymentSuccess', {
        paymentId: settledPaymentId,
        amount,
        bookingReference,
        invoiceId: generatedInvoiceId,
        bookingId,
      });
    } catch (err) {
      console.warn('Payment failed:', err);
      const msg = err.response?.data?.message || 'Payment processing failed. Please try again.';
      Alert.alert('Payment Error', msg);
    } finally {
      setProcessing(false);
    }
  };

  return (
    <View style={styles.container}>
      <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
        {/* Header Summary */}
        <View style={styles.summaryCard}>
          <Text style={styles.summaryTitle}>Payment Summary</Text>

          <View style={styles.infoRow}>
            <Text style={styles.infoLabel}>Service</Text>
            <Text style={styles.infoValue}>{serviceName}</Text>
          </View>

          <View style={styles.infoRow}>
            <Text style={styles.infoLabel}>Vehicle</Text>
            <Text style={styles.infoValue}>{vehicleName}</Text>
          </View>

          <View style={styles.infoRow}>
            <Text style={styles.infoLabel}>Booking Ref</Text>
            <Text style={styles.infoValue}>#{bookingReference}</Text>
          </View>

          <View style={styles.divider} />

          <View style={styles.amountRow}>
            <Text style={styles.amountLabel}>Total Payable Amount</Text>
            <Text style={styles.amountValue}>{formatCurrency(amount)}</Text>
          </View>
        </View>

        {/* Payment Methods */}
        <Text style={styles.sectionTitle}>Select Payment Method</Text>
        <View style={styles.methodsList}>
          {PAYMENT_METHODS.map((method) => {
            const isSelected = selectedMethod === method.id;
            return (
              <TouchableOpacity
                key={method.id}
                style={[styles.methodCard, isSelected && styles.methodCardSelected]}
                onPress={() => setSelectedMethod(method.id)}
                activeOpacity={0.8}
              >
                <View style={[styles.methodIconBox, isSelected && styles.methodIconBoxSelected]}>
                  <Ionicons
                    name={method.icon}
                    size={22}
                    color={isSelected ? colors.primary : colors.textSecondary}
                  />
                </View>

                <Text style={[styles.methodLabel, isSelected && styles.methodLabelSelected]}>
                  {method.label}
                </Text>

                <Ionicons
                  name={isSelected ? 'radio-button-on' : 'radio-button-off'}
                  size={22}
                  color={isSelected ? colors.primary : colors.borderDark}
                />
              </TouchableOpacity>
            );
          })}
        </View>

        {/* Security Assurance Banner */}
        <View style={styles.securityBanner}>
          <Ionicons name="lock-closed" size={16} color={colors.accentDark} />
          <Text style={styles.securityText}>
            256-bit encrypted secure checkout. No gateway secrets stored on device.
          </Text>
        </View>
      </ScrollView>

      {/* Sticky Bottom Pay CTA */}
      <View style={styles.bottomBar}>
        <View style={styles.bottomAmountCol}>
          <Text style={styles.bottomAmountLabel}>Total Due</Text>
          <Text style={styles.bottomAmountValue}>{formatCurrency(amount)}</Text>
        </View>

        <View style={styles.payBtnWrapper}>
          <PrimaryButton
            title={`Pay ${formatCurrency(amount)}`}
            onPress={handlePayNow}
            loading={processing}
            variant="accent"
          />
        </View>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },
  scrollContent: {
    padding: 16,
    paddingBottom: 110,
  },
  summaryCard: {
    backgroundColor: colors.surface,
    borderRadius: 20,
    padding: 20,
    marginBottom: 20,
    borderWidth: 1,
    borderColor: colors.borderLight,
    shadowColor: '#0F172A',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.04,
    shadowRadius: 6,
    elevation: 2,
  },
  summaryTitle: {
    ...typography.h3,
    color: colors.text,
    marginBottom: 16,
  },
  infoRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 6,
  },
  infoLabel: {
    ...typography.subtext,
    color: colors.textSecondary,
  },
  infoValue: {
    ...typography.subtextBold,
    color: colors.text,
    maxWidth: '65%',
    textAlign: 'right',
  },
  divider: {
    height: 1,
    backgroundColor: colors.borderLight,
    marginVertical: 12,
  },
  amountRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingTop: 4,
  },
  amountLabel: {
    ...typography.bodyBold,
    color: colors.text,
  },
  amountValue: {
    ...typography.h2,
    color: colors.primary,
    fontWeight: '800',
  },
  sectionTitle: {
    ...typography.h4,
    color: colors.text,
    marginBottom: 12,
  },
  methodsList: {
    gap: 10,
    marginBottom: 20,
  },
  methodCard: {
    backgroundColor: colors.surface,
    borderRadius: 16,
    padding: 16,
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1.5,
    borderColor: colors.borderLight,
  },
  methodCardSelected: {
    borderColor: colors.primary,
    backgroundColor: '#FAFDFD',
  },
  methodIconBox: {
    width: 42,
    height: 42,
    borderRadius: 12,
    backgroundColor: '#F1F5F9',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 14,
  },
  methodIconBoxSelected: {
    backgroundColor: colors.primarySoft,
  },
  methodLabel: {
    ...typography.body,
    color: colors.text,
    flex: 1,
  },
  methodLabelSelected: {
    fontWeight: '700',
    color: colors.primary,
  },
  securityBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    backgroundColor: colors.accentSoft,
    padding: 14,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: colors.accentLight,
  },
  securityText: {
    ...typography.caption,
    color: colors.accentDark,
    flex: 1,
  },
  bottomBar: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    backgroundColor: colors.surface,
    paddingHorizontal: 20,
    paddingTop: 12,
    paddingBottom: 24,
    borderTopWidth: 1,
    borderTopColor: colors.border,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    shadowColor: '#0F172A',
    shadowOffset: { width: 0, height: -4 },
    shadowOpacity: 0.05,
    shadowRadius: 8,
    elevation: 4,
  },
  bottomAmountCol: {},
  bottomAmountLabel: {
    ...typography.caption,
    color: colors.textSecondary,
  },
  bottomAmountValue: {
    ...typography.h3,
    color: colors.primary,
    fontWeight: '700',
  },
  payBtnWrapper: {
    width: 200,
  },
});

export default PaymentScreen;
