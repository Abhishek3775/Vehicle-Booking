import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { colors } from '../../theme/colors';
import { typography } from '../../theme/typography';
import { Badge } from '../common/Badge';
import { formatCurrency, formatDateTime } from '../../utils/formatters';
import { BOOKING_STATUS_CONFIG } from '../../constants/appConstants';

export const BookingCard = ({ booking, onPress, style }) => {
  const serviceName =
    booking?.serviceSnapshot?.name ||
    booking?.packageSnapshot?.name ||
    (booking?.bookingType === 'EMERGENCY' ? 'Emergency Assistance' : 'Vehicle Service');

  const vehicleName = booking?.vehicleSnapshot
    ? `${booking.vehicleSnapshot.make} ${booking.vehicleSnapshot.model}`
    : 'Vehicle';

  const regNumber = booking?.vehicleSnapshot?.registrationNumber;

  const dateStr = booking?.scheduledAt || booking?.createdAt;
  const statusKey = booking?.status || 'PENDING';
  const statusConfig = BOOKING_STATUS_CONFIG[statusKey] || {
    label: statusKey,
    color: colors.textSecondary,
    bg: '#F1F5F9',
  };

  const amount =
    booking?.finalAmount ||
    booking?.serviceSnapshot?.basePrice ||
    booking?.packageSnapshot?.price;

  const isEmergency = booking?.bookingType === 'EMERGENCY';

  return (
    <TouchableOpacity
      style={[styles.card, style]}
      onPress={onPress}
      activeOpacity={0.8}
    >
      <View style={styles.topRow}>
        <View style={styles.referenceContainer}>
          <Text style={styles.referenceText}>
            #{booking?.bookingReference || (booking?._id || booking?.id || '').slice(-6).toUpperCase()}
          </Text>
          {isEmergency && (
            <Badge label="EMERGENCY" variant="danger" size="sm" />
          )}
        </View>

        <View
          style={[
            styles.statusBadge,
            { backgroundColor: statusConfig.bg },
          ]}
        >
          <Text style={[styles.statusText, { color: statusConfig.color }]}>
            {statusConfig.label}
          </Text>
        </View>
      </View>

      <Text style={styles.serviceTitle} numberOfLines={1}>
        {serviceName}
      </Text>

      <View style={styles.metaRow}>
        <Ionicons name="car-outline" size={14} color={colors.textSecondary} />
        <Text style={styles.metaText}>
          {vehicleName} {regNumber ? `• ${regNumber}` : ''}
        </Text>
      </View>

      <View style={styles.metaRow}>
        <Ionicons name="calendar-outline" size={14} color={colors.textSecondary} />
        <Text style={styles.metaText}>{formatDateTime(dateStr)}</Text>
      </View>

      <View style={styles.divider} />

      <View style={styles.bottomRow}>
        <View style={styles.amountGroup}>
          <Text style={styles.amountLabel}>Estimated</Text>
          <Text style={styles.amountValue}>
            {amount ? formatCurrency(amount) : 'Quote pending'}
          </Text>
        </View>

        <View style={styles.viewDetailsRow}>
          <Text style={styles.viewDetailsText}>View Details</Text>
          <Ionicons name="chevron-forward" size={16} color={colors.primary} />
        </View>
      </View>
    </TouchableOpacity>
  );
};

const styles = StyleSheet.create({
  card: {
    backgroundColor: colors.surface,
    borderRadius: 16,
    padding: 16,
    marginBottom: 12,
    borderWidth: 1.5,
    borderColor: colors.borderLight,
    shadowColor: '#0F172A',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.04,
    shadowRadius: 6,
    elevation: 2,
  },
  topRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 8,
  },
  referenceContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  referenceText: {
    ...typography.caption,
    fontWeight: '700',
    color: colors.textSecondary,
    letterSpacing: 0.5,
  },
  statusBadge: {
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 6,
  },
  statusText: {
    ...typography.caption,
    fontWeight: '700',
  },
  serviceTitle: {
    ...typography.h4,
    color: colors.text,
    marginBottom: 8,
  },
  metaRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginBottom: 4,
  },
  metaText: {
    ...typography.subtext,
    color: colors.textSecondary,
  },
  divider: {
    height: 1,
    backgroundColor: colors.borderLight,
    marginVertical: 12,
  },
  bottomRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  amountGroup: {},
  amountLabel: {
    ...typography.caption,
    color: colors.textMuted,
  },
  amountValue: {
    ...typography.bodyBold,
    color: colors.primary,
  },
  viewDetailsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  viewDetailsText: {
    ...typography.caption,
    fontWeight: '700',
    color: colors.primary,
  },
});

export default BookingCard;
