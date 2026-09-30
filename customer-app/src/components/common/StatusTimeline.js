import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { colors } from '../../theme/colors';
import { typography } from '../../theme/typography';

const TIMELINE_STEPS = [
  { key: 'CREATED', label: 'Booking Created', icon: 'receipt-outline' },
  { key: 'ASSIGNED', label: 'Mechanic Assigned', icon: 'person-add-outline' },
  { key: 'ON_THE_WAY', label: 'On The Way', icon: 'navigate-outline' },
  { key: 'ARRIVED', label: 'Arrived at Location', icon: 'location-outline' },
  { key: 'INSPECTION', label: 'Vehicle Inspection', icon: 'clipboard-outline' },
  { key: 'QUOTATION', label: 'Quotation Approved', icon: 'calculator-outline' },
  { key: 'SERVICE', label: 'Service In Progress', icon: 'construct-outline' },
  { key: 'COMPLETED', label: 'Service Completed', icon: 'checkmark-circle-outline' },
  { key: 'PAID', label: 'Payment Done', icon: 'cash-outline' },
];

const getActiveIndex = (status) => {
  switch (status) {
    case 'PENDING':
      return 0;
    case 'ASSIGNED':
    case 'ACCEPTED':
      return 1;
    case 'ON_THE_WAY':
      return 2;
    case 'ARRIVED':
      return 3;
    case 'INSPECTION':
      return 4;
    case 'QUOTE_PENDING':
    case 'QUOTE_APPROVED':
      return 5;
    case 'IN_PROGRESS':
      return 6;
    case 'COMPLETED':
    case 'PAYMENT_PENDING':
      return 7;
    case 'PAID':
    case 'CLOSED':
      return 8;
    case 'CANCELLED':
      return -1;
    default:
      return 0;
  }
};

export const StatusTimeline = ({ currentStatus, style }) => {
  const isCancelled = currentStatus === 'CANCELLED';
  const activeIndex = getActiveIndex(currentStatus);

  if (isCancelled) {
    return (
      <View style={[styles.cancelledContainer, style]}>
        <Ionicons name="close-circle-outline" size={28} color={colors.danger} />
        <View style={styles.cancelledTextGroup}>
          <Text style={styles.cancelledTitle}>Booking Cancelled</Text>
          <Text style={styles.cancelledSub}>This booking has been cancelled.</Text>
        </View>
      </View>
    );
  }

  return (
    <View style={[styles.container, style]}>
      {TIMELINE_STEPS.map((step, index) => {
        const isCompleted = index < activeIndex;
        const isCurrent = index === activeIndex;
        const isUpcoming = index > activeIndex;

        return (
          <View key={step.key} style={styles.stepRow}>
            {/* Left connector column */}
            <View style={styles.connectorColumn}>
              <View
                style={[
                  styles.node,
                  isCompleted && styles.nodeCompleted,
                  isCurrent && styles.nodeCurrent,
                  isUpcoming && styles.nodeUpcoming,
                ]}
              >
                {isCompleted ? (
                  <Ionicons name="checkmark" size={13} color="#FFFFFF" />
                ) : isCurrent ? (
                  <View style={styles.currentInnerDot} />
                ) : (
                  <View style={styles.upcomingInnerDot} />
                )}
              </View>

              {index < TIMELINE_STEPS.length - 1 && (
                <View
                  style={[
                    styles.line,
                    isCompleted ? styles.lineCompleted : styles.lineUpcoming,
                  ]}
                />
              )}
            </View>

            {/* Right text description */}
            <View style={styles.labelColumn}>
              <Text
                style={[
                  styles.stepLabel,
                  isCompleted && styles.stepLabelCompleted,
                  isCurrent && styles.stepLabelCurrent,
                  isUpcoming && styles.stepLabelUpcoming,
                ]}
              >
                {step.label}
              </Text>
              {isCurrent && (
                <Text style={styles.currentIndicatorText}>Currently active</Text>
              )}
            </View>
          </View>
        );
      })}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    paddingVertical: 8,
  },
  stepRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    minHeight: 44,
  },
  connectorColumn: {
    alignItems: 'center',
    width: 28,
  },
  node: {
    width: 20,
    height: 20,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 2,
  },
  nodeCompleted: {
    backgroundColor: colors.accent,
  },
  nodeCurrent: {
    backgroundColor: colors.primary,
    borderWidth: 2,
    borderColor: colors.primarySoft,
  },
  nodeUpcoming: {
    backgroundColor: '#E2E8F0',
  },
  currentInnerDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: '#FFFFFF',
  },
  upcomingInnerDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: '#CBD5E1',
  },
  line: {
    width: 2,
    flex: 1,
    marginVertical: 2,
    minHeight: 24,
  },
  lineCompleted: {
    backgroundColor: colors.accent,
  },
  lineUpcoming: {
    backgroundColor: '#E2E8F0',
  },
  labelColumn: {
    flex: 1,
    paddingLeft: 12,
    paddingTop: 1,
    paddingBottom: 14,
  },
  stepLabel: {
    ...typography.subtextBold,
  },
  stepLabelCompleted: {
    color: colors.text,
  },
  stepLabelCurrent: {
    color: colors.primary,
    fontWeight: '700',
    fontSize: 14,
  },
  stepLabelUpcoming: {
    color: colors.textMuted,
    fontWeight: '500',
  },
  currentIndicatorText: {
    ...typography.caption,
    color: colors.primaryLight,
    marginTop: 2,
  },
  cancelledContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 16,
    backgroundColor: colors.dangerSoft,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: colors.dangerBorder,
  },
  cancelledTextGroup: {
    marginLeft: 12,
  },
  cancelledTitle: {
    ...typography.bodyBold,
    color: colors.danger,
  },
  cancelledSub: {
    ...typography.subtext,
    color: colors.danger,
    marginTop: 2,
  },
});

export default StatusTimeline;
