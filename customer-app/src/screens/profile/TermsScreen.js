import React from 'react';
import { View, Text, StyleSheet, ScrollView } from 'react-native';
import { colors } from '../../theme/colors';
import { typography } from '../../theme/typography';

export const TermsScreen = () => {
  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>
      <Text style={styles.heading}>Terms of Service</Text>
      <Text style={styles.effectiveDate}>Effective Date: September 2026</Text>

      <Text style={styles.sectionHeader}>1. Service Agreement</Text>
      <Text style={styles.paragraph}>
        By scheduling service appointments or requesting roadside assistance through AutoCare, you agree to allow authorized mechanics to inspect and service your vehicle in accordance with approved estimates.
      </Text>

      <Text style={styles.sectionHeader}>2. Quotations & Billing Approval</Text>
      <Text style={styles.paragraph}>
        No repair operation exceeding the initial diagnosis will be executed without your explicit in-app quotation approval. Once approved, the customer agrees to settle the electronic invoice upon service completion.
      </Text>

      <Text style={styles.sectionHeader}>3. Service Warranty</Text>
      <Text style={styles.paragraph}>
        Scheduled services and replaced parts are backed by a standard 30-day or 1,000 km warranty against workmanship defects. Wear-and-tear items are subject to manufacturer terms.
      </Text>

      <Text style={styles.sectionHeader}>4. Cancellation Policy</Text>
      <Text style={styles.paragraph}>
        Bookings may be cancelled without penalty prior to mechanic dispatch. Once a technician is en route, minimal dispatch costs may apply.
      </Text>
    </ScrollView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },
  content: {
    padding: 20,
    paddingBottom: 40,
  },
  heading: {
    ...typography.h2,
    color: colors.text,
    marginBottom: 4,
  },
  effectiveDate: {
    ...typography.caption,
    color: colors.textMuted,
    marginBottom: 20,
  },
  sectionHeader: {
    ...typography.h4,
    color: colors.primary,
    marginTop: 14,
    marginBottom: 6,
  },
  paragraph: {
    ...typography.body,
    color: colors.textSecondary,
    lineHeight: 22,
    marginBottom: 8,
  },
});

export default TermsScreen;
