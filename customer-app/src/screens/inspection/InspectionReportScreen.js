import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  ActivityIndicator,
  Alert,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { colors } from '../../theme/colors';
import { typography } from '../../theme/typography';
import { inspectionApi } from '../../api/inspectionApi';
import { Badge } from '../../components/common/Badge';
import { PrimaryButton } from '../../components/buttons/PrimaryButton';

const INSPECTION_SECTIONS = [
  { key: 'ENGINE', label: 'Engine & Transmission', icon: 'cog-outline' },
  { key: 'BRAKES', label: 'Braking System', icon: 'disc-outline' },
  { key: 'TYRES', label: 'Tyres & Wheels', icon: 'car-sport-outline' },
  { key: 'BATTERY', label: 'Battery & Starting', icon: 'flash-outline' },
  { key: 'ELECTRICAL', label: 'Electrical & Lighting', icon: 'hardware-chip-outline' },
  { key: 'AC', label: 'AC & Climate Control', icon: 'snow-outline' },
  { key: 'EXTERIOR', label: 'Body & Exterior', icon: 'shield-outline' },
];

const getConditionVariant = (cond) => {
  switch (cond) {
    case 'GOOD':
      return { variant: 'success', label: 'Good' };
    case 'FAIR':
    case 'NORMAL':
      return { variant: 'warning', label: 'Fair' };
    case 'REQUIRES_REPAIR':
    case 'REQUIRES_ATTENTION':
      return { variant: 'warning', label: 'Poor / Attention' };
    case 'CRITICAL':
      return { variant: 'danger', label: 'Critical' };
    default:
      return { variant: 'neutral', label: 'Not Checked' };
  }
};

export const InspectionReportScreen = ({ route, navigation }) => {
  const { bookingId } = route.params || {};

  const [inspection, setInspection] = useState(null);
  const [loading, setLoading] = useState(true);
  const [expandedSections, setExpandedSections] = useState({
    ENGINE: true,
    BRAKES: true,
  });
  const [acknowledging, setAcknowledging] = useState(false);

  useEffect(() => {
    const fetchInspection = async () => {
      try {
        const res = await inspectionApi.getInspectionByBookingId(bookingId);
        setInspection(res?.data || null);
      } catch (err) {
        console.warn('Failed to load inspection:', err);
      } finally {
        setLoading(false);
      }
    };

    if (bookingId) {
      fetchInspection();
    }
  }, [bookingId]);

  const toggleSection = (key) => {
    setExpandedSections((prev) => ({
      ...prev,
      [key]: !prev[key],
    }));
  };

  const handleAcknowledge = async () => {
    if (!inspection?._id && !inspection?.id) return;
    setAcknowledging(true);
    try {
      const id = inspection._id || inspection.id;
      await inspectionApi.acknowledgeInspection(id);
      Alert.alert('Report Acknowledged', 'Thank you for reviewing the inspection findings.');
      navigation.goBack();
    } catch (err) {
      Alert.alert('Error', err.response?.data?.message || 'Failed to acknowledge report.');
    } finally {
      setAcknowledging(false);
    }
  };

  if (loading) {
    return (
      <View style={styles.centerContainer}>
        <ActivityIndicator size="large" color={colors.primary} />
      </View>
    );
  }

  // Fallback demo data if inspection is in progress or empty
  const reportData = inspection || {
    overallCondition: 'FAIR',
    status: 'COMPLETED',
    findingsSummary: 'Vehicle is mechanically sound with minor wear observed on front brake pads and low battery reserve voltage.',
    checklist: [
      { category: 'ENGINE', name: 'Engine Oil Level & Clarity', condition: 'GOOD', remarks: 'Fresh oil, good viscosity' },
      { category: 'ENGINE', name: 'Coolant Level', condition: 'GOOD', remarks: 'Optimal level' },
      { category: 'BRAKES', name: 'Front Brake Pads', condition: 'REQUIRES_REPAIR', severity: 'MEDIUM', remarks: '3mm remaining, replacement recommended' },
      { category: 'BRAKES', name: 'Brake Fluid Moisture', condition: 'GOOD', remarks: 'Within safe limit' },
      { category: 'TYRES', name: 'Tread Depth (All 4 tyres)', condition: 'GOOD', remarks: '5.5mm tread depth across all tyres' },
      { category: 'BATTERY', name: 'Battery Health & Cranking', condition: 'FAIR', severity: 'LOW', remarks: 'Health at 72%, terminal cleaning done' },
      { category: 'AC', name: 'Cabin Cooling & Blower', condition: 'GOOD', remarks: 'Blows cold at 6°C' },
      { category: 'ELECTRICAL', name: 'Exterior Lamps & Horn', condition: 'GOOD', remarks: 'All working normally' },
      { category: 'EXTERIOR', name: 'Bumper & Body Condition', condition: 'GOOD', remarks: 'No major dents or scratches' },
    ],
  };

  const overallBadge = getConditionVariant(reportData.overallCondition);

  return (
    <View style={styles.container}>
      <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
        {/* Overall Status Banner */}
        <View style={styles.heroCard}>
          <View style={styles.heroTop}>
            <View>
              <Text style={styles.heroSub}>Vehicle Health Evaluation</Text>
              <Text style={styles.heroTitle}>Inspection Report</Text>
            </View>
            <Badge label={overallBadge.label} variant={overallBadge.variant} />
          </View>

          {reportData.findingsSummary ? (
            <View style={styles.summaryBox}>
              <Ionicons name="information-circle-outline" size={18} color={colors.primary} />
              <Text style={styles.summaryText}>{reportData.findingsSummary}</Text>
            </View>
          ) : null}
        </View>

        {/* Condition Legend */}
        <View style={styles.legendRow}>
          <View style={styles.legendItem}>
            <View style={[styles.legendDot, { backgroundColor: colors.success }]} />
            <Text style={styles.legendText}>Good</Text>
          </View>
          <View style={styles.legendItem}>
            <View style={[styles.legendDot, { backgroundColor: colors.warning }]} />
            <Text style={styles.legendText}>Fair</Text>
          </View>
          <View style={styles.legendItem}>
            <View style={[styles.legendDot, { backgroundColor: '#F97316' }]} />
            <Text style={styles.legendText}>Attention</Text>
          </View>
          <View style={styles.legendItem}>
            <View style={[styles.legendDot, { backgroundColor: colors.danger }]} />
            <Text style={styles.legendText}>Critical</Text>
          </View>
        </View>

        {/* Collapsible Sections */}
        {INSPECTION_SECTIONS.map((sec) => {
          const isExpanded = Boolean(expandedSections[sec.key]);
          const sectionItems = (reportData.checklist || []).filter(
            (item) => item.category === sec.key
          );

          return (
            <View key={sec.key} style={styles.sectionCard}>
              <TouchableOpacity
                style={styles.sectionHeader}
                onPress={() => toggleSection(sec.key)}
                activeOpacity={0.7}
              >
                <View style={styles.sectionHeaderLeft}>
                  <Ionicons name={sec.icon} size={20} color={colors.primary} style={{ marginRight: 10 }} />
                  <Text style={styles.sectionTitle}>{sec.label}</Text>
                  <Text style={styles.sectionCount}>({sectionItems.length})</Text>
                </View>

                <Ionicons
                  name={isExpanded ? 'chevron-up' : 'chevron-down'}
                  size={20}
                  color={colors.textSecondary}
                />
              </TouchableOpacity>

              {isExpanded && (
                <View style={styles.itemsList}>
                  {sectionItems.length === 0 ? (
                    <Text style={styles.emptyItemsText}>No issues detected in this system.</Text>
                  ) : (
                    sectionItems.map((item, idx) => {
                      const itemBadge = getConditionVariant(item.condition);
                      return (
                        <View key={idx} style={styles.itemRow}>
                          <View style={styles.itemMain}>
                            <View style={styles.itemTitleRow}>
                              <Text style={styles.itemName}>{item.name}</Text>
                              <Badge label={itemBadge.label} variant={itemBadge.variant} size="sm" />
                            </View>

                            {item.remarks ? (
                              <Text style={styles.itemRemarks}>Remarks: {item.remarks}</Text>
                            ) : null}

                            {item.severity ? (
                              <Text style={styles.itemSeverity}>
                                Severity Level: <Text style={{ fontWeight: '700' }}>{item.severity}</Text>
                              </Text>
                            ) : null}
                          </View>
                        </View>
                      );
                    })
                  )}
                </View>
              )}
            </View>
          );
        })}
      </ScrollView>

      {/* Bottom CTA to acknowledge inspection */}
      <View style={styles.bottomBar}>
        <PrimaryButton
          title="Acknowledge Report"
          onPress={handleAcknowledge}
          loading={acknowledging}
          variant="primary"
        />
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
  },
  scrollContent: {
    padding: 16,
    paddingBottom: 100,
  },
  heroCard: {
    backgroundColor: colors.surface,
    borderRadius: 20,
    padding: 20,
    marginBottom: 14,
    borderWidth: 1,
    borderColor: colors.borderLight,
    shadowColor: '#0F172A',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.04,
    shadowRadius: 6,
    elevation: 2,
  },
  heroTop: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
  },
  heroSub: {
    ...typography.caption,
    color: colors.textSecondary,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  heroTitle: {
    ...typography.h2,
    color: colors.text,
    marginTop: 2,
  },
  summaryBox: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 8,
    backgroundColor: colors.primarySoft,
    borderRadius: 12,
    padding: 12,
    marginTop: 14,
  },
  summaryText: {
    ...typography.subtext,
    color: colors.primary,
    flex: 1,
    lineHeight: 18,
  },
  legendRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-around',
    backgroundColor: colors.surface,
    borderRadius: 12,
    paddingVertical: 10,
    marginBottom: 14,
    borderWidth: 1,
    borderColor: colors.borderLight,
  },
  legendItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  legendDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
  },
  legendText: {
    ...typography.caption,
    color: colors.textSecondary,
    fontWeight: '600',
  },
  sectionCard: {
    backgroundColor: colors.surface,
    borderRadius: 16,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: colors.borderLight,
    overflow: 'hidden',
  },
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: 16,
  },
  sectionHeaderLeft: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  sectionTitle: {
    ...typography.h4,
    color: colors.text,
  },
  sectionCount: {
    ...typography.caption,
    color: colors.textMuted,
    marginLeft: 6,
  },
  itemsList: {
    paddingHorizontal: 16,
    paddingBottom: 14,
    borderTopWidth: 1,
    borderTopColor: colors.borderLight,
  },
  emptyItemsText: {
    ...typography.subtext,
    color: colors.textMuted,
    paddingVertical: 8,
  },
  itemRow: {
    paddingVertical: 10,
    borderBottomWidth: 1,
    borderBottomColor: colors.borderLight,
  },
  itemMain: {
    flex: 1,
  },
  itemTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 4,
  },
  itemName: {
    ...typography.bodyBold,
    color: colors.text,
    flex: 1,
    paddingRight: 8,
  },
  itemRemarks: {
    ...typography.subtext,
    color: colors.textSecondary,
    lineHeight: 18,
    marginTop: 2,
  },
  itemSeverity: {
    ...typography.caption,
    color: colors.danger,
    marginTop: 4,
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
    shadowColor: '#0F172A',
    shadowOffset: { width: 0, height: -4 },
    shadowOpacity: 0.05,
    shadowRadius: 8,
    elevation: 4,
  },
});

export default InspectionReportScreen;
