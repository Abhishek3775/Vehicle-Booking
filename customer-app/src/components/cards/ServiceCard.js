import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { colors } from '../../theme/colors';
import { typography } from '../../theme/typography';
import { formatCurrency, formatDuration } from '../../utils/formatters';

const getServiceIcon = (category) => {
  switch (category) {
    case 'PERIODIC_SERVICE':
      return 'construct-outline';
    case 'ENGINE':
      return 'cog-outline';
    case 'BRAKE':
      return 'disc-outline';
    case 'AC':
      return 'snow-outline';
    case 'BATTERY':
      return 'flash-outline';
    case 'TYRE':
      return 'car-sport-outline';
    case 'ELECTRICAL':
      return 'hardware-chip-outline';
    case 'WASHING':
      return 'water-outline';
    case 'DIAGNOSTICS':
      return 'analytics-outline';
    default:
      return 'speedometer-outline';
  }
};

export const ServiceCard = ({
  service,
  onPress,
  onBook,
  selectable = false,
  selected = false,
  style,
}) => {
  const icon = getServiceIcon(service?.category);

  return (
    <TouchableOpacity
      style={[
        styles.card,
        selectable && selected && styles.cardSelected,
        style,
      ]}
      onPress={onPress}
      activeOpacity={0.8}
    >
      <View style={styles.topRow}>
        <View style={styles.iconCircle}>
          <Ionicons name={icon} size={22} color={colors.primary} />
        </View>

        <View style={styles.textColumn}>
          <Text style={styles.name} numberOfLines={1}>
            {service?.name}
          </Text>
          {service?.shortDescription ? (
            <Text style={styles.shortDesc} numberOfLines={2}>
              {service.shortDescription}
            </Text>
          ) : null}
        </View>

        {selectable ? (
          <Ionicons
            name={selected ? 'checkmark-circle' : 'ellipse-outline'}
            size={24}
            color={selected ? colors.accent : colors.borderDark}
            style={styles.selectIcon}
          />
        ) : (
          <Ionicons name="chevron-forward" size={18} color={colors.textSecondary} />
        )}
      </View>

      <View style={styles.footerRow}>
        <View style={styles.priceContainer}>
          <Text style={styles.priceLabel}>Starting from</Text>
          <Text style={styles.price}>{formatCurrency(service?.basePrice)}</Text>
        </View>

        <View style={styles.durationBadge}>
          <Ionicons name="time-outline" size={14} color={colors.textSecondary} />
          <Text style={styles.durationText}>
            {formatDuration(service?.estimatedDuration)}
          </Text>
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
  cardSelected: {
    borderColor: colors.primary,
    backgroundColor: '#FAFDFD',
  },
  topRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
  },
  iconCircle: {
    width: 42,
    height: 42,
    borderRadius: 21,
    backgroundColor: colors.primarySoft,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },
  textColumn: {
    flex: 1,
    paddingRight: 8,
  },
  name: {
    ...typography.h4,
    color: colors.text,
    marginBottom: 4,
  },
  shortDesc: {
    ...typography.subtext,
    color: colors.textSecondary,
    lineHeight: 18,
  },
  selectIcon: {
    marginLeft: 6,
  },
  footerRow: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    justifyContent: 'space-between',
    marginTop: 14,
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: colors.borderLight,
  },
  priceContainer: {},
  priceLabel: {
    ...typography.caption,
    color: colors.textSecondary,
    marginBottom: 2,
  },
  price: {
    ...typography.h3,
    color: colors.primary,
    fontWeight: '700',
  },
  durationBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: '#F1F5F9',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 8,
  },
  durationText: {
    ...typography.caption,
    fontWeight: '600',
    color: colors.textSecondary,
  },
});

export default ServiceCard;
