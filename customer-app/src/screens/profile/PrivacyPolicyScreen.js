import React from 'react';
import { View, Text, StyleSheet, ScrollView } from 'react-native';
import { colors } from '../../theme/colors';
import { typography } from '../../theme/typography';

export const PrivacyPolicyScreen = () => {
  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>
      <Text style={styles.heading}>Privacy Policy</Text>
      <Text style={styles.effectiveDate}>Effective Date: September 2026</Text>

      <Text style={styles.sectionHeader}>1. Information We Collect</Text>
      <Text style={styles.paragraph}>
        AutoCare collects your mobile phone number, name, vehicle identification details (make, model, registration plate), and service delivery addresses solely to facilitate roadside assistance dispatch and scheduled vehicular maintenance.
      </Text>

      <Text style={styles.sectionHeader}>2. Geolocation Privacy</Text>
      <Text style={styles.paragraph}>
        We only query your device GPS coordinates when you actively request Emergency Roadside Assistance. We do NOT continuously track your background location.
      </Text>

      <Text style={styles.sectionHeader}>3. Payment Security</Text>
      <Text style={styles.paragraph}>
        All monetary transactions are routed through RBI-compliant, encrypted payment gateways. AutoCare does not store card numbers, CVVs, or banking credentials on client devices or platform servers.
      </Text>

      <Text style={styles.sectionHeader}>4. Contact Us</Text>
      <Text style={styles.paragraph}>
        For privacy queries, data deletion requests, or grievances, please reach our Data Protection Officer at privacy@autocare.com.
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

export default PrivacyPolicyScreen;
