import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { colors } from '../../theme/colors';
import { typography } from '../../theme/typography';
import { Badge } from '../common/Badge';

const getAddressIcon = (label) => {
  switch (label) {
    case 'HOME':
      return 'home-outline';
    case 'WORK':
      return 'briefcase-outline';
    case 'OFFICE':
      return 'business-outline';
    default:
      return 'location-outline';
  }
};

export const AddressCard = ({
  address,
  onPress,
  onEdit,
  onDelete,
  onSetDefault,
  selectable = false,
  selected = false,
  style,
}) => {
  const icon = getAddressIcon(address?.label);

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
          <Ionicons name={icon} size={20} color={colors.primary} />
        </View>

        <View style={styles.labelGroup}>
          <View style={styles.labelBadgeRow}>
            <Text style={styles.label}>{address?.label || 'Address'}</Text>
            {address?.isDefault ? (
              <Badge label="Default" variant="primary" size="sm" />
            ) : null}
          </View>
          <Text style={styles.name}>{address?.fullName}</Text>
        </View>

        {selectable ? (
          <Ionicons
            name={selected ? 'checkmark-circle' : 'ellipse-outline'}
            size={24}
            color={selected ? colors.accent : colors.borderDark}
          />
        ) : null}
      </View>

      <Text style={styles.addressText} numberOfLines={2}>
        {address?.addressLine1}
        {address?.addressLine2 ? `, ${address.addressLine2}` : ''}
      </Text>

      <Text style={styles.cityPostal}>
        {address?.city}, {address?.state} - {address?.postalCode}
      </Text>

      {address?.phone ? (
        <Text style={styles.phoneText}>Phone: {address.phone}</Text>
      ) : null}

      {!selectable && (
        <View style={styles.actionRow}>
          {!address?.isDefault && onSetDefault && (
            <TouchableOpacity
              style={styles.actionBtn}
              onPress={() => onSetDefault(address)}
            >
              <Text style={styles.actionBtnText}>Set Default</Text>
            </TouchableOpacity>
          )}

          <View style={styles.rightActions}>
            {onEdit && (
              <TouchableOpacity
                style={styles.iconAction}
                onPress={() => onEdit(address)}
                hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
              >
                <Ionicons name="create-outline" size={18} color={colors.primary} />
              </TouchableOpacity>
            )}

            {onDelete && (
              <TouchableOpacity
                style={styles.iconAction}
                onPress={() => onDelete(address)}
                hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
              >
                <Ionicons name="trash-outline" size={18} color={colors.danger} />
              </TouchableOpacity>
            )}
          </View>
        </View>
      )}
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
    alignItems: 'center',
    marginBottom: 10,
  },
  iconCircle: {
    width: 38,
    height: 38,
    borderRadius: 19,
    backgroundColor: colors.primarySoft,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 10,
  },
  labelGroup: {
    flex: 1,
  },
  labelBadgeRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  label: {
    ...typography.caption,
    fontWeight: '700',
    color: colors.primary,
    letterSpacing: 0.5,
  },
  name: {
    ...typography.h4,
    color: colors.text,
    marginTop: 1,
  },
  addressText: {
    ...typography.body,
    color: colors.textSecondary,
    lineHeight: 20,
    marginBottom: 4,
  },
  cityPostal: {
    ...typography.subtext,
    color: colors.textSecondary,
    marginBottom: 4,
  },
  phoneText: {
    ...typography.caption,
    color: colors.textMuted,
  },
  actionRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginTop: 12,
    paddingTop: 10,
    borderTopWidth: 1,
    borderTopColor: colors.borderLight,
  },
  actionBtn: {
    paddingVertical: 4,
    paddingHorizontal: 8,
  },
  actionBtnText: {
    ...typography.caption,
    fontWeight: '600',
    color: colors.primary,
  },
  rightActions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    marginLeft: 'auto',
  },
  iconAction: {
    padding: 4,
  },
});

export default AddressCard;
