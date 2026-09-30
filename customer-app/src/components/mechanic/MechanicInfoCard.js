import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Linking, Image } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { colors } from '../../theme/colors';
import { typography } from '../../theme/typography';
import { PrimaryButton } from '../buttons/PrimaryButton';

export const MechanicInfoCard = ({
  mechanic,
  distance,
  eta,
  status = 'On The Way',
  onCall,
  style,
}) => {
  const rating = mechanic?.ratingSummary?.averageRating || 4.8;
  const totalRatings = mechanic?.ratingSummary?.totalRatings || 42;

  const handleCall = () => {
    if (onCall) {
      onCall();
    } else if (mechanic?.phone) {
      Linking.openURL(`tel:${mechanic.phone}`);
    }
  };

  return (
    <View style={[styles.card, style]}>
      <View style={styles.topRow}>
        <View style={styles.avatarContainer}>
          {mechanic?.profileImage ? (
            <Image source={{ uri: mechanic.profileImage }} style={styles.avatarImage} />
          ) : (
            <View style={styles.avatarFallback}>
              <Ionicons name="person" size={24} color={colors.primary} />
            </View>
          )}
          <View style={styles.onlineBadge} />
        </View>

        <View style={styles.infoCol}>
          <Text style={styles.name}>{mechanic?.displayName || 'Assigned Mechanic'}</Text>
          <Text style={styles.specialization}>
            {mechanic?.specialization || 'Certified Auto Technician'}
          </Text>

          <View style={styles.ratingRow}>
            <Ionicons name="star" size={14} color="#F59E0B" />
            <Text style={styles.ratingText}>
              {rating.toFixed(1)} <Text style={styles.reviewsCount}>({totalRatings})</Text>
            </Text>
            {mechanic?.experienceYears ? (
              <Text style={styles.expText}>• {mechanic.experienceYears} yrs exp</Text>
            ) : null}
          </View>
        </View>
      </View>

      <View style={styles.metaBanner}>
        <View style={styles.metaItem}>
          <Text style={styles.metaLabel}>Status</Text>
          <Text style={styles.metaValue}>{status}</Text>
        </View>

        <View style={styles.metaDivider} />

        <View style={styles.metaItem}>
          <Text style={styles.metaLabel}>Distance</Text>
          <Text style={styles.metaValue}>{distance || '2.4 km'}</Text>
        </View>

        <View style={styles.metaDivider} />

        <View style={styles.metaItem}>
          <Text style={styles.metaLabel}>ETA</Text>
          <Text style={styles.metaValueAccent}>{eta || '12 mins'}</Text>
        </View>
      </View>

      <PrimaryButton
        title="Call Mechanic"
        onPress={handleCall}
        icon={
          <Ionicons
            name="call"
            size={18}
            color="#FFFFFF"
            style={{ marginRight: 8 }}
          />
        }
      />
    </View>
  );
};

const styles = StyleSheet.create({
  card: {
    backgroundColor: colors.surface,
    borderRadius: 20,
    padding: 20,
    shadowColor: '#0F172A',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.08,
    shadowRadius: 12,
    elevation: 4,
    borderWidth: 1,
    borderColor: colors.borderLight,
  },
  topRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 16,
  },
  avatarContainer: {
    position: 'relative',
    marginRight: 14,
  },
  avatarImage: {
    width: 52,
    height: 52,
    borderRadius: 26,
  },
  avatarFallback: {
    width: 52,
    height: 52,
    borderRadius: 26,
    backgroundColor: colors.primarySoft,
    alignItems: 'center',
    justifyContent: 'center',
  },
  onlineBadge: {
    position: 'absolute',
    bottom: 2,
    right: 2,
    width: 14,
    height: 14,
    borderRadius: 7,
    backgroundColor: colors.accent,
    borderWidth: 2,
    borderColor: '#FFFFFF',
  },
  infoCol: {
    flex: 1,
  },
  name: {
    ...typography.h3,
    color: colors.text,
  },
  specialization: {
    ...typography.subtext,
    color: colors.textSecondary,
    marginTop: 1,
  },
  ratingRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    marginTop: 4,
  },
  ratingText: {
    ...typography.caption,
    fontWeight: '700',
    color: colors.text,
  },
  reviewsCount: {
    fontWeight: '400',
    color: colors.textMuted,
  },
  expText: {
    ...typography.caption,
    color: colors.textSecondary,
    marginLeft: 4,
  },
  metaBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: '#F8FAFC',
    borderRadius: 14,
    paddingVertical: 12,
    paddingHorizontal: 16,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: colors.borderLight,
  },
  metaItem: {
    alignItems: 'center',
    flex: 1,
  },
  metaDivider: {
    width: 1,
    height: 24,
    backgroundColor: colors.border,
  },
  metaLabel: {
    ...typography.caption,
    color: colors.textSecondary,
    marginBottom: 2,
  },
  metaValue: {
    ...typography.subtextBold,
    color: colors.text,
  },
  metaValueAccent: {
    ...typography.subtextBold,
    color: colors.accentDark,
  },
});

export default MechanicInfoCard;
