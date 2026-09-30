import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { colors } from '../../theme/colors';
import { typography } from '../../theme/typography';
import { formatCurrency } from '../../utils/formatters';
import { Badge } from '../common/Badge';

export const PackageCard = ({
  servicePackage,
  onPress,
  selectable = false,
  selected = false,
  style,
}) => {
  const originalPrice = servicePackage?.originalPrice || servicePackage?.basePrice;
  const discountedPrice = servicePackage?.discountedPrice || servicePackage?.price;
  const hasDiscount = originalPrice && discountedPrice && originalPrice > discountedPrice;
  const discountPercent = hasDiscount
    ? Math.round(((originalPrice - discountedPrice) / originalPrice) * 100)
    : 0;

  const services = servicePackage?.services || servicePackage?.includedServices || [];

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
      <View style={styles.header}>
        <View style={styles.titleColumn}>
          <Text style={styles.name}>{servicePackage?.name}</Text>
          {servicePackage?.shortDescription ? (
            <Text style={styles.description} numberOfLines={2}>
              {servicePackage.shortDescription}
            </Text>
          ) : null}
        </View>

        {hasDiscount && (
          <Badge label={`${discountPercent}% OFF`} variant="success" size="sm" />
        )}
      </View>

      {/* Included Services preview */}
      {services.length > 0 && (
        <View style={styles.servicesContainer}>
          <Text style={styles.includedHeader}>Includes {services.length} services:</Text>
          {services.slice(0, 3).map((item, idx) => {
            const serviceName = typeof item === 'object' ? item.name : `Service item ${idx + 1}`;
            return (
              <View key={idx} style={styles.serviceItem}>
                <Ionicons name="checkmark-circle" size={14} color={colors.accent} />
                <Text style={styles.serviceName} numberOfLines={1}>
                  {serviceName}
                </Text>
              </View>
            );
          })}
          {services.length > 3 && (
            <Text style={styles.moreText}>+{services.length - 3} more services included</Text>
          )}
        </View>
      )}

      <View style={styles.footer}>
        <View style={styles.priceRow}>
          <Text style={styles.price}>{formatCurrency(discountedPrice || originalPrice)}</Text>
          {hasDiscount && (
            <Text style={styles.originalPrice}>{formatCurrency(originalPrice)}</Text>
          )}
        </View>

        <View style={styles.actionBtn}>
          <Text style={styles.actionBtnText}>View Package</Text>
          <Ionicons name="arrow-forward" size={14} color={colors.primary} />
        </View>
      </View>
    </TouchableOpacity>
  );
};

const styles = StyleSheet.create({
  card: {
    backgroundColor: colors.surface,
    borderRadius: 18,
    padding: 20,
    marginBottom: 16,
    borderWidth: 1.5,
    borderColor: colors.borderLight,
    shadowColor: '#0F172A',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.05,
    shadowRadius: 8,
    elevation: 3,
  },
  cardSelected: {
    borderColor: colors.primary,
    backgroundColor: '#FAFDFD',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    justifyContent: 'space-between',
    marginBottom: 12,
  },
  titleColumn: {
    flex: 1,
    paddingRight: 10,
  },
  name: {
    ...typography.h3,
    color: colors.text,
    marginBottom: 4,
  },
  description: {
    ...typography.subtext,
    color: colors.textSecondary,
    lineHeight: 18,
  },
  servicesContainer: {
    backgroundColor: '#F8FAFC',
    borderRadius: 12,
    padding: 12,
    marginVertical: 10,
    borderWidth: 1,
    borderColor: colors.borderLight,
  },
  includedHeader: {
    ...typography.caption,
    fontWeight: '700',
    color: colors.textSecondary,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    marginBottom: 8,
  },
  serviceItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginBottom: 4,
  },
  serviceName: {
    ...typography.subtext,
    color: colors.text,
    flex: 1,
  },
  moreText: {
    ...typography.caption,
    color: colors.primaryLight,
    fontWeight: '600',
    marginTop: 4,
  },
  footer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginTop: 12,
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: colors.borderLight,
  },
  priceRow: {
    flexDirection: 'row',
    alignItems: 'baseline',
    gap: 8,
  },
  price: {
    ...typography.h3,
    color: colors.primary,
    fontWeight: '700',
  },
  originalPrice: {
    ...typography.subtext,
    color: colors.textMuted,
    textDecorationLine: 'line-through',
  },
  actionBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: colors.primarySoft,
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 10,
  },
  actionBtnText: {
    ...typography.caption,
    color: colors.primary,
    fontWeight: '700',
  },
});

export default PackageCard;
