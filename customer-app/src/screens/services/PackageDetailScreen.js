import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  ActivityIndicator,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { colors } from '../../theme/colors';
import { typography } from '../../theme/typography';
import { packageApi } from '../../api/packageApi';
import { formatCurrency } from '../../utils/formatters';
import { PrimaryButton } from '../../components/buttons/PrimaryButton';
import { Badge } from '../../components/common/Badge';

export const PackageDetailScreen = ({ route, navigation }) => {
  const { packageId } = route.params || {};
  const [pkg, setPkg] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchPackage = async () => {
      try {
        const res = await packageApi.getPackageById(packageId);
        setPkg(res?.data || null);
      } catch (err) {
        console.warn('Failed to load package detail:', err);
      } finally {
        setLoading(false);
      }
    };

    if (packageId) {
      fetchPackage();
    }
  }, [packageId]);

  if (loading) {
    return (
      <View style={styles.centerContainer}>
        <ActivityIndicator size="large" color={colors.primary} />
      </View>
    );
  }

  if (!pkg) {
    return (
      <View style={styles.centerContainer}>
        <Text style={styles.errorText}>Package not found.</Text>
      </View>
    );
  }

  const originalPrice = pkg.originalPrice || pkg.basePrice;
  const discountedPrice = pkg.discountedPrice || pkg.price;
  const hasDiscount = originalPrice && discountedPrice && originalPrice > discountedPrice;
  const services = pkg.services || pkg.includedServices || [];

  return (
    <View style={styles.container}>
      <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
        <View style={styles.header}>
          <View style={styles.badgeRow}>
            <Badge label="Service Package" variant="primary" size="sm" />
            {hasDiscount && (
              <Badge
                label={`${Math.round(((originalPrice - discountedPrice) / originalPrice) * 100)}% SAVINGS`}
                variant="success"
                size="sm"
              />
            )}
          </View>
          <Text style={styles.title}>{pkg.name}</Text>
          {pkg.shortDescription ? (
            <Text style={styles.shortDesc}>{pkg.shortDescription}</Text>
          ) : null}
        </View>

        {/* Pricing Banner */}
        <View style={styles.pricingBanner}>
          <View style={styles.priceRow}>
            <Text style={styles.discountedPrice}>{formatCurrency(discountedPrice || originalPrice)}</Text>
            {hasDiscount && (
              <Text style={styles.originalPrice}>{formatCurrency(originalPrice)}</Text>
            )}
          </View>
          <Text style={styles.pricingNote}>All-inclusive price (Parts + Labor + Inspection)</Text>
        </View>

        {/* Included Services List */}
        <View style={styles.sectionCard}>
          <Text style={styles.sectionTitle}>
            Included Services ({services.length})
          </Text>
          {services.map((item, index) => {
            const name = typeof item === 'object' ? item.name : item;
            const desc = typeof item === 'object' ? item.shortDescription || item.description : null;
            return (
              <View key={index} style={styles.serviceItem}>
                <Ionicons name="checkmark-circle" size={20} color={colors.accent} style={styles.checkIcon} />
                <View style={styles.serviceItemTextCol}>
                  <Text style={styles.serviceItemName}>{name}</Text>
                  {desc ? <Text style={styles.serviceItemDesc}>{desc}</Text> : null}
                </View>
              </View>
            );
          })}
        </View>

        {/* Package Highlights */}
        <View style={styles.sectionCard}>
          <Text style={styles.sectionTitle}>Package Guarantee</Text>
          <View style={styles.guaranteeRow}>
            <Ionicons name="shield-checkmark-outline" size={20} color={colors.primary} />
            <Text style={styles.guaranteeText}>100% Genuine OEM / OES Approved Parts</Text>
          </View>
          <View style={styles.guaranteeRow}>
            <Ionicons name="ribbon-outline" size={20} color={colors.primary} />
            <Text style={styles.guaranteeText}>6-Month / 5,000 km Complete Warranty</Text>
          </View>
          <View style={styles.guaranteeRow}>
            <Ionicons name="car-outline" size={20} color={colors.primary} />
            <Text style={styles.guaranteeText}>Complimentary Multi-Point Vehicle Health Scan</Text>
          </View>
        </View>
      </ScrollView>

      {/* Bottom Sticky CTA */}
      <View style={styles.bottomBar}>
        <View style={styles.bottomPriceCol}>
          <Text style={styles.bottomPriceLabel}>Package Total</Text>
          <Text style={styles.bottomPriceValue}>
            {formatCurrency(discountedPrice || originalPrice)}
          </Text>
        </View>

        <View style={styles.ctaWrapper}>
          <PrimaryButton
            title="Book This Package"
            onPress={() =>
              navigation.navigate('BookService', {
                preselectedPackage: pkg,
              })
            }
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
  centerContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.background,
  },
  scrollContent: {
    padding: 20,
    paddingBottom: 110,
  },
  header: {
    marginBottom: 16,
  },
  badgeRow: {
    flexDirection: 'row',
    gap: 8,
    marginBottom: 8,
  },
  title: {
    ...typography.h2,
    color: colors.text,
    marginBottom: 6,
  },
  shortDesc: {
    ...typography.body,
    color: colors.textSecondary,
    lineHeight: 22,
  },
  pricingBanner: {
    backgroundColor: colors.surface,
    borderRadius: 16,
    padding: 18,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: colors.borderLight,
    shadowColor: '#0F172A',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.04,
    shadowRadius: 6,
    elevation: 2,
  },
  priceRow: {
    flexDirection: 'row',
    alignItems: 'baseline',
    gap: 10,
    marginBottom: 4,
  },
  discountedPrice: {
    ...typography.h1,
    color: colors.primary,
    fontWeight: '800',
  },
  originalPrice: {
    ...typography.h3,
    color: colors.textMuted,
    textDecorationLine: 'line-through',
  },
  pricingNote: {
    ...typography.caption,
    color: colors.textSecondary,
  },
  sectionCard: {
    backgroundColor: colors.surface,
    borderRadius: 16,
    padding: 18,
    marginBottom: 14,
    borderWidth: 1,
    borderColor: colors.borderLight,
  },
  sectionTitle: {
    ...typography.h4,
    color: colors.text,
    marginBottom: 12,
  },
  serviceItem: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    marginBottom: 12,
  },
  checkIcon: {
    marginRight: 10,
    marginTop: 2,
  },
  serviceItemTextCol: {
    flex: 1,
  },
  serviceItemName: {
    ...typography.bodyBold,
    color: colors.text,
  },
  serviceItemDesc: {
    ...typography.subtext,
    color: colors.textSecondary,
    marginTop: 2,
    lineHeight: 18,
  },
  guaranteeRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    marginBottom: 10,
  },
  guaranteeText: {
    ...typography.subtext,
    color: colors.text,
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
  bottomPriceCol: {},
  bottomPriceLabel: {
    ...typography.caption,
    color: colors.textSecondary,
  },
  bottomPriceValue: {
    ...typography.h3,
    color: colors.primary,
    fontWeight: '700',
  },
  ctaWrapper: {
    width: 200,
  },
  errorText: {
    ...typography.body,
    color: colors.danger,
  },
});

export default PackageDetailScreen;
