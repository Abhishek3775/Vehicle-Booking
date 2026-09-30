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
import { serviceApi } from '../../api/serviceApi';
import { formatCurrency, formatDuration } from '../../utils/formatters';
import { PrimaryButton } from '../../components/buttons/PrimaryButton';
import { Badge } from '../../components/common/Badge';

export const ServiceDetailScreen = ({ route, navigation }) => {
  const { serviceId } = route.params || {};
  const [service, setService] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchService = async () => {
      try {
        const res = await serviceApi.getServiceById(serviceId);
        setService(res?.data || null);
      } catch (err) {
        console.warn('Failed to load service detail:', err);
      } finally {
        setLoading(false);
      }
    };

    if (serviceId) {
      fetchService();
    }
  }, [serviceId]);

  if (loading) {
    return (
      <View style={styles.centerContainer}>
        <ActivityIndicator size="large" color={colors.primary} />
      </View>
    );
  }

  if (!service) {
    return (
      <View style={styles.centerContainer}>
        <Text style={styles.errorText}>Service not found.</Text>
      </View>
    );
  }

  const features = service?.features || [
    'Comprehensive multi-point visual inspection',
    'High-grade OEM/OES replacement parts & fluids',
    'Road test & electronic fault scanning',
    '30-day or 1,000 km service warranty coverage',
  ];

  return (
    <View style={styles.container}>
      <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
        {/* Service Title & Category */}
        <View style={styles.cardHeader}>
          <Badge label={service.category || 'Maintenance'} variant="primary" size="sm" />
          <Text style={styles.title}>{service.name}</Text>
          {service.shortDescription ? (
            <Text style={styles.shortDesc}>{service.shortDescription}</Text>
          ) : null}
        </View>

        {/* Pricing & Duration Banner */}
        <View style={styles.metricsBanner}>
          <View style={styles.metricItem}>
            <Text style={styles.metricLabel}>Starting Price</Text>
            <Text style={styles.metricValue}>{formatCurrency(service.basePrice)}</Text>
          </View>

          <View style={styles.metricDivider} />

          <View style={styles.metricItem}>
            <Text style={styles.metricLabel}>Estimated Duration</Text>
            <View style={styles.durationRow}>
              <Ionicons name="time-outline" size={16} color={colors.textSecondary} />
              <Text style={styles.metricValueSub}>
                {formatDuration(service.estimatedDuration) || 'Approx 60 min'}
              </Text>
            </View>
          </View>
        </View>

        {/* Vehicle Compatibility */}
        <View style={styles.sectionCard}>
          <Text style={styles.sectionTitle}>Vehicle Compatibility</Text>
          <View style={styles.compatibilityRow}>
            <Ionicons name="car-sport-outline" size={20} color={colors.primary} />
            <Text style={styles.compatText}>
              Applicable for: {service.applicableVehicleTypes?.join(', ') || '4 Wheeler & 2 Wheeler'}
            </Text>
          </View>
        </View>

        {/* Detailed Description */}
        {service.description ? (
          <View style={styles.sectionCard}>
            <Text style={styles.sectionTitle}>About This Service</Text>
            <Text style={styles.bodyText}>{service.description}</Text>
          </View>
        ) : null}

        {/* What's Included */}
        <View style={styles.sectionCard}>
          <Text style={styles.sectionTitle}>What's Included</Text>
          {features.map((item, index) => (
            <View key={index} style={styles.includeItem}>
              <Ionicons name="checkmark-circle" size={18} color={colors.accent} />
              <Text style={styles.includeText}>{item}</Text>
            </View>
          ))}
        </View>
      </ScrollView>

      {/* Bottom Sticky CTA */}
      <View style={styles.bottomBar}>
        <View style={styles.bottomPriceCol}>
          <Text style={styles.bottomPriceLabel}>Starting from</Text>
          <Text style={styles.bottomPriceValue}>{formatCurrency(service.basePrice)}</Text>
        </View>

        <View style={styles.ctaWrapper}>
          <PrimaryButton
            title="Book This Service"
            onPress={() =>
              navigation.navigate('BookService', {
                preselectedService: service,
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
  cardHeader: {
    marginBottom: 16,
  },
  title: {
    ...typography.h2,
    color: colors.text,
    marginTop: 8,
    marginBottom: 6,
  },
  shortDesc: {
    ...typography.body,
    color: colors.textSecondary,
    lineHeight: 22,
  },
  metricsBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.surface,
    borderRadius: 16,
    padding: 16,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: colors.borderLight,
    shadowColor: '#0F172A',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.04,
    shadowRadius: 6,
    elevation: 2,
  },
  metricItem: {
    flex: 1,
    alignItems: 'center',
  },
  metricDivider: {
    width: 1,
    height: 36,
    backgroundColor: colors.border,
  },
  metricLabel: {
    ...typography.caption,
    color: colors.textSecondary,
    marginBottom: 4,
  },
  metricValue: {
    ...typography.h3,
    color: colors.primary,
    fontWeight: '700',
  },
  durationRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  metricValueSub: {
    ...typography.subtextBold,
    color: colors.text,
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
    marginBottom: 10,
  },
  compatibilityRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  compatText: {
    ...typography.subtext,
    color: colors.text,
    flex: 1,
  },
  bodyText: {
    ...typography.body,
    color: colors.textSecondary,
    lineHeight: 22,
  },
  includeItem: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 8,
    marginBottom: 10,
  },
  includeText: {
    ...typography.subtext,
    color: colors.text,
    flex: 1,
    lineHeight: 20,
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
    width: 190,
  },
  errorText: {
    ...typography.body,
    color: colors.danger,
  },
});

export default ServiceDetailScreen;
