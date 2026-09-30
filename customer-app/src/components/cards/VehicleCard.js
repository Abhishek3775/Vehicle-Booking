import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { colors } from '../../theme/colors';
import { typography } from '../../theme/typography';
import { Badge } from '../common/Badge';
import { formatRegistrationNumber } from '../../utils/formatters';

export const VehicleCard = ({
  vehicle,
  onPress,
  onEdit,
  onSetDefault,
  selectable = false,
  selected = false,
  style,
}) => {
  const isTwoWheeler = vehicle?.vehicleType === 'TWO_WHEELER';

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
      <View style={styles.headerRow}>
        <View style={styles.iconCircle}>
          <Ionicons
            name={isTwoWheeler ? 'bicycle' : 'car-sport'}
            size={24}
            color={colors.primary}
          />
        </View>

        <View style={styles.titleColumn}>
          <View style={styles.nameBadgeRow}>
            <Text style={styles.makeModel} numberOfLines={1}>
              {vehicle?.make} {vehicle?.model}
            </Text>
            {vehicle?.isDefault ? (
              <Badge label="Default" variant="primary" size="sm" />
            ) : null}
          </View>

          {vehicle?.variant ? (
            <Text style={styles.variant}>{vehicle?.variant}</Text>
          ) : null}
        </View>

        {selectable ? (
          <Ionicons
            name={selected ? 'checkmark-circle' : 'ellipse-outline'}
            size={24}
            color={selected ? colors.accent : colors.borderDark}
          />
        ) : (
          <Ionicons name="chevron-forward" size={18} color={colors.textSecondary} />
        )}
      </View>

      <View style={styles.divider} />

      <View style={styles.footerRow}>
        <View style={styles.metaRow}>
          <Text style={styles.metaText}>
            {vehicle?.registrationYear} • {vehicle?.fuelType}
          </Text>
          <View style={styles.regBadge}>
            <Text style={styles.regText}>
              {formatRegistrationNumber(vehicle?.registrationNumber)}
            </Text>
          </View>
        </View>

        {!selectable && onEdit && (
          <TouchableOpacity
            style={styles.editBtn}
            onPress={(e) => {
              e.stopPropagation();
              onEdit(vehicle);
            }}
            hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
          >
            <Ionicons name="create-outline" size={16} color={colors.primary} />
            <Text style={styles.editText}>Edit</Text>
          </TouchableOpacity>
        )}
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
  headerRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  iconCircle: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: colors.primarySoft,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },
  titleColumn: {
    flex: 1,
  },
  nameBadgeRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'flex-start',
    gap: 8,
  },
  makeModel: {
    ...typography.h4,
    color: colors.text,
  },
  variant: {
    ...typography.subtext,
    color: colors.textSecondary,
    marginTop: 2,
  },
  divider: {
    height: 1,
    backgroundColor: colors.borderLight,
    marginVertical: 12,
  },
  footerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  metaRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    flexWrap: 'wrap',
  },
  metaText: {
    ...typography.subtext,
    color: colors.textSecondary,
  },
  regBadge: {
    backgroundColor: '#F1F5F9',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 6,
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  regText: {
    ...typography.caption,
    fontWeight: '700',
    color: colors.text,
    letterSpacing: 0.5,
  },
  editBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 8,
    paddingVertical: 4,
  },
  editText: {
    ...typography.caption,
    color: colors.primary,
    fontWeight: '600',
  },
});

export default VehicleCard;
