import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  ActivityIndicator,
  Alert,
  Modal,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { colors } from '../../theme/colors';
import { typography } from '../../theme/typography';
import { quotationApi } from '../../api/quotationApi';
import { QuotationBreakdown } from '../../components/quotation/QuotationBreakdown';
import { PrimaryButton } from '../../components/buttons/PrimaryButton';
import { SecondaryButton } from '../../components/buttons/SecondaryButton';
import { InputField } from '../../components/forms/InputField';
import { Badge } from '../../components/common/Badge';

export const QuotationDetailScreen = ({ route, navigation }) => {
  const { bookingId, quotationId } = route.params || {};

  const [quotation, setQuotation] = useState(null);
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState(false);

  // Rejection modal
  const [rejectModalVisible, setRejectModalVisible] = useState(false);
  const [rejectionReason, setRejectionReason] = useState('');

  const fetchQuotation = useCallback(async () => {
    try {
      if (quotationId) {
        const res = await quotationApi.getQuotationById(quotationId);
        setQuotation(res?.data || null);
      } else if (bookingId) {
        const res = await quotationApi.getQuotationsByBookingId(bookingId);
        const list = res?.data || [];
        setQuotation(list[0] || null);
      }
    } catch (err) {
      console.warn('Failed to load quotation:', err);
    } finally {
      setLoading(false);
    }
  }, [quotationId, bookingId]);

  useEffect(() => {
    fetchQuotation();
  }, [fetchQuotation]);

  const handleApprove = async () => {
    const id = quotation?._id || quotation?.id || quotationId;
    setActionLoading(true);
    try {
      await quotationApi.approveQuotation(id);
      Alert.alert(
        'Quotation Approved',
        'Thank you! The mechanic has been notified to proceed with the service.',
        [
          {
            text: 'Proceed to Payment',
            onPress: () => {
              navigation.navigate('Payment', {
                bookingId,
                quotationId: id,
                amount: quotation?.totalAmount || quotation?.finalAmount,
              });
            },
          },
        ]
      );
      fetchQuotation();
    } catch (err) {
      Alert.alert('Approval Failed', err.response?.data?.message || 'Unable to approve quote.');
    } finally {
      setActionLoading(false);
    }
  };

  const handleReject = async () => {
    if (!rejectionReason.trim()) {
      Alert.alert('Reason Required', 'Please provide a reason for rejecting this quotation.');
      return;
    }

    const id = quotation?._id || quotation?.id || quotationId;
    setActionLoading(true);
    try {
      await quotationApi.rejectQuotation(id, rejectionReason.trim());
      setRejectModalVisible(false);
      Alert.alert('Quotation Rejected', 'Your feedback was submitted. Our team will review and contact you.');
      fetchQuotation();
    } catch (err) {
      Alert.alert('Rejection Error', err.response?.data?.message || 'Unable to reject quote.');
    } finally {
      setActionLoading(false);
    }
  };

  if (loading) {
    return (
      <View style={styles.centerContainer}>
        <ActivityIndicator size="large" color={colors.primary} />
      </View>
    );
  }

  // Fallback demo data if quotation is pending generation
  const activeQuote = quotation || {
    quotationReference: 'QT-20260927-4821',
    status: 'SUBMITTED',
    laborTotal: 1200,
    partsTotal: 3450,
    discountAmount: 250,
    taxAmount: 792,
    totalAmount: 5192,
    parts: [
      { name: 'Fully Synthetic Engine Oil (4L)', quantity: 1, unitPrice: 2200 },
      { name: 'OEM Oil Filter Cartridge', quantity: 1, unitPrice: 450 },
      { name: 'Front Ceramic Brake Pads (Set)', quantity: 1, unitPrice: 800 },
    ],
    laborItems: [
      { description: 'Engine oil & filter replacement operation', amount: 400 },
      { description: 'Front brake pad installation & bleeding', amount: 800 },
    ],
  };

  const isPendingApproval =
    activeQuote.status === 'SUBMITTED' ||
    activeQuote.status === 'PENDING' ||
    activeQuote.status === 'QUOTE_PENDING';

  const isApproved = activeQuote.status === 'APPROVED';

  return (
    <View style={styles.container}>
      <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
        {/* Header Hero */}
        <View style={styles.heroCard}>
          <View style={styles.heroTop}>
            <View>
              <Text style={styles.heroSub}>Official Service Estimate</Text>
              <Text style={styles.heroTitle}>Quotation Details</Text>
            </View>

            <Badge
              label={activeQuote.status || 'SUBMITTED'}
              variant={isApproved ? 'success' : isPendingApproval ? 'warning' : 'neutral'}
            />
          </View>

          <Text style={styles.heroDesc}>
            Transparent, itemized pricing breakdown verified by our technical inspection team.
          </Text>
        </View>

        {/* Detailed Breakdown Component */}
        <QuotationBreakdown quotation={activeQuote} />

        {/* Action Controls for Customer */}
        {isPendingApproval ? (
          <View style={styles.actionContainer}>
            <PrimaryButton
              title="Approve Quote"
              onPress={handleApprove}
              loading={actionLoading}
              icon={
                <Ionicons
                  name="checkmark-circle-outline"
                  size={20}
                  color="#FFFFFF"
                  style={{ marginRight: 8 }}
                />
              }
              style={{ marginBottom: 12 }}
            />

            <SecondaryButton
              title="Reject Quote"
              onPress={() => setRejectModalVisible(true)}
              textStyle={{ color: colors.danger }}
              style={{ borderColor: colors.dangerBorder }}
            />
          </View>
        ) : isApproved ? (
          <View style={styles.approvedCard}>
            <Ionicons name="checkmark-done-circle" size={28} color={colors.accent} />
            <View style={styles.approvedTextCol}>
              <Text style={styles.approvedTitle}>Quotation Approved</Text>
              <Text style={styles.approvedSub}>
                Work is authorized. You may complete payment now or upon delivery.
              </Text>
            </View>
          </View>
        ) : null}
      </ScrollView>

      {/* Rejection Reason Modal */}
      <Modal
        visible={rejectModalVisible}
        transparent={true}
        animationType="fade"
        onRequestClose={() => setRejectModalVisible(false)}
      >
        <View style={styles.modalBackdrop}>
          <View style={styles.modalCard}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Reject Quotation</Text>
              <TouchableOpacity onPress={() => setRejectModalVisible(false)}>
                <Ionicons name="close" size={22} color={colors.textSecondary} />
              </TouchableOpacity>
            </View>

            <Text style={styles.modalSub}>
              Please tell us why you are declining this estimate so we can revise it or adjust parts.
            </Text>

            <InputField
              label="Reason for Rejection"
              value={rejectionReason}
              onChangeText={setRejectionReason}
              placeholder="e.g. Estimate higher than expected, parts unnecessary..."
              multiline={true}
              numberOfLines={3}
            />

            <PrimaryButton
              title="Confirm Rejection"
              onPress={handleReject}
              loading={actionLoading}
              variant="danger"
              style={{ marginTop: 8 }}
            />
          </View>
        </View>
      </Modal>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },
  centerContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  scrollContent: {
    padding: 16,
    paddingBottom: 40,
  },
  heroCard: {
    backgroundColor: colors.surface,
    borderRadius: 20,
    padding: 20,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: colors.borderLight,
    shadowColor: '#0F172A',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.04,
    shadowRadius: 6,
    elevation: 2,
  },
  heroTop: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 6,
  },
  heroSub: {
    ...typography.caption,
    color: colors.textSecondary,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  heroTitle: {
    ...typography.h2,
    color: colors.text,
    marginTop: 2,
  },
  heroDesc: {
    ...typography.subtext,
    color: colors.textSecondary,
    lineHeight: 18,
    marginTop: 4,
  },
  actionContainer: {
    marginTop: 8,
  },
  approvedCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.accentSoft,
    padding: 16,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: colors.accentLight,
    gap: 12,
  },
  approvedTextCol: {
    flex: 1,
  },
  approvedTitle: {
    ...typography.bodyBold,
    color: colors.accentDark,
  },
  approvedSub: {
    ...typography.caption,
    color: colors.textSecondary,
    marginTop: 2,
  },
  modalBackdrop: {
    flex: 1,
    backgroundColor: 'rgba(15, 23, 42, 0.5)',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 24,
  },
  modalCard: {
    width: '100%',
    backgroundColor: colors.surface,
    borderRadius: 20,
    padding: 20,
  },
  modalHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 8,
  },
  modalTitle: {
    ...typography.h3,
    color: colors.text,
  },
  modalSub: {
    ...typography.subtext,
    color: colors.textSecondary,
    marginBottom: 16,
    lineHeight: 18,
  },
});

export default QuotationDetailScreen;
