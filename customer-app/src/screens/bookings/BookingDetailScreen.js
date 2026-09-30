import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Alert,
  ActivityIndicator,
  Modal,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { colors } from '../../theme/colors';
import { typography } from '../../theme/typography';
import { bookingApi } from '../../api/bookingApi';
import { quotationApi } from '../../api/quotationApi';
import { mechanicApi } from '../../api/mechanicApi';
import { StatusTimeline } from '../../components/common/StatusTimeline';
import { Badge } from '../../components/common/Badge';
import { PrimaryButton } from '../../components/buttons/PrimaryButton';
import { SecondaryButton } from '../../components/buttons/SecondaryButton';
import { InputField } from '../../components/forms/InputField';
import { formatCurrency, formatDateTime, formatRegistrationNumber } from '../../utils/formatters';
import { BOOKING_STATUS_CONFIG } from '../../constants/appConstants';

export const BookingDetailScreen = ({ route, navigation }) => {
  const { bookingId } = route.params || {};

  const [booking, setBooking] = useState(null);
  const [quotation, setQuotation] = useState(null);
  const [mechanic, setMechanic] = useState(null);
  const [loading, setLoading] = useState(true);

  // Cancellation modal state
  const [cancelModalVisible, setCancelModalVisible] = useState(false);
  const [cancellationReason, setCancellationReason] = useState('');
  const [cancelling, setCancelling] = useState(false);

  const fetchDetails = useCallback(async () => {
    try {
      if (bookingId) {
        const res = await bookingApi.getBookingById(bookingId);
        const b = res?.data;
        setBooking(b);

        // Fetch quotation if available
        try {
          const qRes = await quotationApi.getQuotationsByBookingId(bookingId);
          const qList = qRes?.data || [];
          if (qList.length > 0) {
            setQuotation(qList[0]);
          }
        } catch {
          // Quotation not yet generated
        }

        // Fetch mechanic if assigned
        try {
          const dRes = await mechanicApi.getDispatchByBookingId(bookingId);
          if (dRes?.data?.mechanicId) {
            const mRes = await mechanicApi.getMechanicById(dRes.data.mechanicId);
            setMechanic(mRes?.data);
          }
        } catch {
          // Dispatch not yet created
        }
      }
    } catch (err) {
      console.warn('Failed to load booking details:', err);
    } finally {
      setLoading(false);
    }
  }, [bookingId]);

  useEffect(() => {
    fetchDetails();
  }, [fetchDetails]);

  const handleCancelBooking = async () => {
    if (!cancellationReason.trim()) {
      Alert.alert('Reason Required', 'Please provide a reason for cancelling this booking.');
      return;
    }

    setCancelling(true);
    try {
      await bookingApi.cancelBooking(bookingId, cancellationReason.trim());
      setCancelModalVisible(false);
      Alert.alert('Booking Cancelled', 'Your booking has been cancelled successfully.');
      fetchDetails();
    } catch (err) {
      Alert.alert('Cancellation Error', err.response?.data?.message || 'Unable to cancel booking.');
    } finally {
      setCancelling(false);
    }
  };

  if (loading) {
    return (
      <View style={styles.centerContainer}>
        <ActivityIndicator size="large" color={colors.primary} />
      </View>
    );
  }

  if (!booking) {
    return (
      <View style={styles.centerContainer}>
        <Text style={styles.errorText}>Booking details not found.</Text>
      </View>
    );
  }

  const statusKey = booking.status || 'PENDING';
  const statusCfg = BOOKING_STATUS_CONFIG[statusKey] || {
    label: statusKey,
    color: colors.primary,
    bg: colors.primarySoft,
  };

  const isCancellable =
    statusKey === 'PENDING' || statusKey === 'ASSIGNED' || statusKey === 'ACCEPTED';

  const isTrackable =
    statusKey === 'ASSIGNED' ||
    statusKey === 'ACCEPTED' ||
    statusKey === 'ON_THE_WAY' ||
    statusKey === 'ARRIVED';

  const hasInspection =
    statusKey === 'INSPECTION' ||
    statusKey === 'QUOTE_PENDING' ||
    statusKey === 'QUOTE_APPROVED' ||
    statusKey === 'IN_PROGRESS' ||
    statusKey === 'COMPLETED' ||
    statusKey === 'PAYMENT_PENDING' ||
    statusKey === 'PAID';

  const isPayable =
    statusKey === 'QUOTE_APPROVED' || statusKey === 'PAYMENT_PENDING';

  const isPaid = statusKey === 'PAID' || statusKey === 'CLOSED';

  const serviceName =
    booking.serviceSnapshot?.name ||
    booking.packageSnapshot?.name ||
    (booking.bookingType === 'EMERGENCY' ? 'Emergency Roadside Assistance' : 'Vehicle Service');

  return (
    <View style={styles.container}>
      <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
        {/* Header Summary Card */}
        <View style={styles.headerCard}>
          <View style={styles.refRow}>
            <View>
              <Text style={styles.refLabel}>Booking Reference</Text>
              <Text style={styles.refNumber}>
                #{booking.bookingReference || bookingId.slice(-8).toUpperCase()}
              </Text>
            </View>

            <View style={[styles.statusTag, { backgroundColor: statusCfg.bg }]}>
              <Text style={[styles.statusTagText, { color: statusCfg.color }]}>
                {statusCfg.label}
              </Text>
            </View>
          </View>

          <View style={styles.divider} />

          <Text style={styles.serviceName}>{serviceName}</Text>

          <View style={styles.metaRow}>
            <Ionicons name="car-outline" size={16} color={colors.textSecondary} />
            <Text style={styles.metaText}>
              {booking.vehicleSnapshot?.make} {booking.vehicleSnapshot?.model} (
              {formatRegistrationNumber(booking.vehicleSnapshot?.registrationNumber)})
            </Text>
          </View>

          <View style={styles.metaRow}>
            <Ionicons name="calendar-outline" size={16} color={colors.textSecondary} />
            <Text style={styles.metaText}>
              {formatDateTime(booking.scheduledAt || booking.createdAt)}
            </Text>
          </View>

          {booking.addressSnapshot?.addressLine1 ? (
            <View style={styles.metaRow}>
              <Ionicons name="location-outline" size={16} color={colors.textSecondary} />
              <Text style={styles.metaText} numberOfLines={2}>
                {booking.addressSnapshot.addressLine1}, {booking.addressSnapshot.city}
              </Text>
            </View>
          ) : null}
        </View>

        {/* Assigned Mechanic Banner */}
        {mechanic && (
          <View style={styles.mechanicBanner}>
            <View style={styles.mechanicAvatar}>
              <Ionicons name="person" size={20} color={colors.primary} />
            </View>
            <View style={styles.mechanicInfo}>
              <Text style={styles.mechanicName}>{mechanic.displayName}</Text>
              <Text style={styles.mechanicSub}>
                {mechanic.specialization || 'Certified Mechanic'}
              </Text>
            </View>

            {isTrackable && (
              <TouchableOpacity
                style={styles.trackBtn}
                onPress={() =>
                  navigation.navigate('MechanicTracking', {
                    bookingId,
                  })
                }
              >
                <Ionicons name="navigate" size={16} color="#FFFFFF" />
                <Text style={styles.trackBtnText}>Live Track</Text>
              </TouchableOpacity>
            )}
          </View>
        )}

        {/* Progress Timeline */}
        <View style={styles.sectionCard}>
          <Text style={styles.sectionTitle}>Service Status Timeline</Text>
          <StatusTimeline currentStatus={statusKey} />
        </View>

        {/* Quick Contextual Actions */}
        <View style={styles.contextActionsContainer}>
          {/* Inspection Report Button */}
          {hasInspection && (
            <SecondaryButton
              title="View Inspection Report"
              onPress={() =>
                navigation.navigate('InspectionReport', {
                  bookingId,
                })
              }
              variant="soft"
              icon={
                <Ionicons
                  name="clipboard-outline"
                  size={18}
                  color={colors.primary}
                  style={{ marginRight: 8 }}
                />
              }
              style={{ marginBottom: 12 }}
            />
          )}

          {/* Quotation Button */}
          {quotation && (
            <SecondaryButton
              title="View Quotation & Estimate"
              onPress={() =>
                navigation.navigate('QuotationDetail', {
                  bookingId,
                  quotationId: quotation._id || quotation.id,
                })
              }
              variant="soft"
              icon={
                <Ionicons
                  name="calculator-outline"
                  size={18}
                  color={colors.primary}
                  style={{ marginRight: 8 }}
                />
              }
              style={{ marginBottom: 12 }}
            />
          )}

          {/* Payment CTA if quote is approved or payment pending */}
          {isPayable && quotation && (
            <PrimaryButton
              title={`Complete Payment (${formatCurrency(quotation.totalAmount || quotation.finalAmount)})`}
              onPress={() =>
                navigation.navigate('Payment', {
                  bookingId,
                  quotationId: quotation._id || quotation.id,
                  amount: quotation.totalAmount || quotation.finalAmount,
                  vehicleName: `${booking.vehicleSnapshot?.make} ${booking.vehicleSnapshot?.model}`,
                  serviceName,
                })
              }
              icon={
                <Ionicons
                  name="card-outline"
                  size={18}
                  color="#FFFFFF"
                  style={{ marginRight: 8 }}
                />
              }
              style={{ marginBottom: 12 }}
            />
          )}

          {/* Invoice CTA if paid */}
          {isPaid && (
            <PrimaryButton
              title="View Tax Invoice"
              onPress={() =>
                navigation.navigate('InvoiceDetail', {
                  bookingId,
                })
              }
              variant="accent"
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
          )}

          {/* Cancel button if booking is in early stage */}
          {isCancellable && (
            <SecondaryButton
              title="Cancel This Booking"
              onPress={() => setCancelModalVisible(true)}
              textStyle={{ color: colors.danger }}
              style={{ borderColor: colors.dangerBorder, marginTop: 4 }}
            />
          )}
        </View>
      </ScrollView>

      {/* Cancellation Reason Modal */}
      <Modal
        visible={cancelModalVisible}
        transparent={true}
        animationType="fade"
        onRequestClose={() => setCancelModalVisible(false)}
      >
        <View style={styles.modalBackdrop}>
          <View style={styles.modalCard}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Cancel Booking</Text>
              <TouchableOpacity onPress={() => setCancelModalVisible(false)}>
                <Ionicons name="close" size={22} color={colors.textSecondary} />
              </TouchableOpacity>
            </View>

            <Text style={styles.modalSubtitle}>
              Please tell us why you need to cancel this appointment.
            </Text>

            <InputField
              label="Cancellation Reason"
              value={cancellationReason}
              onChangeText={setCancellationReason}
              placeholder="e.g. Schedule conflict, problem resolved, etc."
              multiline={true}
              numberOfLines={3}
            />

            <PrimaryButton
              title="Confirm Cancellation"
              onPress={handleCancelBooking}
              loading={cancelling}
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
    backgroundColor: colors.background,
  },
  scrollContent: {
    padding: 16,
    paddingBottom: 40,
  },
  headerCard: {
    backgroundColor: colors.surface,
    borderRadius: 20,
    padding: 20,
    borderWidth: 1,
    borderColor: colors.borderLight,
    marginBottom: 16,
    shadowColor: '#0F172A',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.04,
    shadowRadius: 6,
    elevation: 2,
  },
  refRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  refLabel: {
    ...typography.caption,
    color: colors.textSecondary,
  },
  refNumber: {
    ...typography.h3,
    color: colors.text,
    letterSpacing: 0.5,
  },
  statusTag: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 8,
  },
  statusTagText: {
    ...typography.caption,
    fontWeight: '700',
  },
  divider: {
    height: 1,
    backgroundColor: colors.borderLight,
    marginVertical: 14,
  },
  serviceName: {
    ...typography.h3,
    color: colors.text,
    marginBottom: 10,
  },
  metaRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 6,
  },
  metaText: {
    ...typography.subtext,
    color: colors.textSecondary,
    flex: 1,
  },
  mechanicBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.surface,
    borderRadius: 16,
    padding: 14,
    borderWidth: 1,
    borderColor: colors.borderLight,
    marginBottom: 16,
  },
  mechanicAvatar: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: colors.primarySoft,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },
  mechanicInfo: {
    flex: 1,
  },
  mechanicName: {
    ...typography.bodyBold,
    color: colors.text,
  },
  mechanicSub: {
    ...typography.caption,
    color: colors.textSecondary,
    marginTop: 2,
  },
  trackBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: colors.primary,
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 10,
  },
  trackBtnText: {
    ...typography.caption,
    fontWeight: '700',
    color: '#FFFFFF',
  },
  sectionCard: {
    backgroundColor: colors.surface,
    borderRadius: 18,
    padding: 18,
    borderWidth: 1,
    borderColor: colors.borderLight,
    marginBottom: 16,
  },
  sectionTitle: {
    ...typography.h4,
    color: colors.text,
    marginBottom: 14,
  },
  contextActionsContainer: {
    marginTop: 8,
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
  modalSubtitle: {
    ...typography.subtext,
    color: colors.textSecondary,
    marginBottom: 16,
  },
  errorText: {
    ...typography.body,
    color: colors.danger,
  },
});

export default BookingDetailScreen;
