import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { colors } from '../../theme/colors';
import { typography } from '../../theme/typography';
import { formatCurrency } from '../../utils/formatters';

export const QuotationBreakdown = ({ quotation, style }) => {
  const labor = quotation?.laborTotal || quotation?.laborCharges || 0;
  const parts = quotation?.partsTotal || quotation?.partsCharges || 0;
  const discount = quotation?.discountAmount || 0;
  const tax = quotation?.taxAmount || quotation?.gstAmount || 0;
  const total = quotation?.totalAmount || quotation?.finalAmount || 0;

  const partsItems = quotation?.parts || quotation?.items || [];
  const laborItems = quotation?.laborItems || [];

  return (
    <View style={[styles.container, style]}>
      <View style={styles.headerRow}>
        <Text style={styles.title}>Cost Breakdown</Text>
        {quotation?.quotationReference ? (
          <Text style={styles.quoteRef}>Ref: {quotation.quotationReference}</Text>
        ) : null}
      </View>

      {/* Itemized Parts if available */}
      {partsItems.length > 0 && (
        <View style={styles.section}>
          <Text style={styles.sectionHeader}>Parts & Materials</Text>
          {partsItems.map((item, idx) => (
            <View key={idx} style={styles.lineItem}>
              <View style={styles.lineDesc}>
                <Text style={styles.itemName}>{item.name || item.partName}</Text>
                <Text style={styles.itemQty}>
                  Qty: {item.quantity || 1} x {formatCurrency(item.unitPrice || item.price)}
                </Text>
              </View>
              <Text style={styles.itemTotal}>
                {formatCurrency((item.quantity || 1) * (item.unitPrice || item.price || 0))}
              </Text>
            </View>
          ))}
        </View>
      )}

      {/* Itemized Labor if available */}
      {laborItems.length > 0 && (
        <View style={styles.section}>
          <Text style={styles.sectionHeader}>Labor Operations</Text>
          {laborItems.map((item, idx) => (
            <View key={idx} style={styles.lineItem}>
              <Text style={styles.itemName}>{item.description || item.name}</Text>
              <Text style={styles.itemTotal}>{formatCurrency(item.amount || item.rate)}</Text>
            </View>
          ))}
        </View>
      )}

      <View style={styles.summaryBox}>
        <View style={styles.summaryRow}>
          <Text style={styles.summaryLabel}>Labor Charges</Text>
          <Text style={styles.summaryValue}>{formatCurrency(labor)}</Text>
        </View>

        <View style={styles.summaryRow}>
          <Text style={styles.summaryLabel}>Parts & Consumables</Text>
          <Text style={styles.summaryValue}>{formatCurrency(parts)}</Text>
        </View>

        {discount > 0 && (
          <View style={styles.summaryRow}>
            <Text style={[styles.summaryLabel, styles.discountText]}>Discount</Text>
            <Text style={[styles.summaryValue, styles.discountText]}>
              -{formatCurrency(discount)}
            </Text>
          </View>
        )}

        <View style={styles.summaryRow}>
          <Text style={styles.summaryLabel}>GST & Applicable Taxes</Text>
          <Text style={styles.summaryValue}>{formatCurrency(tax)}</Text>
        </View>

        <View style={styles.divider} />

        <View style={styles.totalRow}>
          <Text style={styles.totalLabel}>Total Estimate</Text>
          <Text style={styles.totalValue}>{formatCurrency(total)}</Text>
        </View>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    backgroundColor: colors.surface,
    borderRadius: 16,
    padding: 18,
    borderWidth: 1,
    borderColor: colors.borderLight,
    shadowColor: '#0F172A',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.04,
    shadowRadius: 6,
    elevation: 2,
    marginBottom: 16,
  },
  headerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 16,
  },
  title: {
    ...typography.h3,
    color: colors.text,
  },
  quoteRef: {
    ...typography.caption,
    color: colors.textSecondary,
    fontWeight: '600',
  },
  section: {
    marginBottom: 14,
    paddingBottom: 10,
    borderBottomWidth: 1,
    borderBottomColor: colors.borderLight,
  },
  sectionHeader: {
    ...typography.caption,
    fontWeight: '700',
    color: colors.primary,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    marginBottom: 8,
  },
  lineItem: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 4,
  },
  lineDesc: {
    flex: 1,
    paddingRight: 8,
  },
  itemName: {
    ...typography.subtextBold,
    color: colors.text,
  },
  itemQty: {
    ...typography.caption,
    color: colors.textMuted,
    marginTop: 2,
  },
  itemTotal: {
    ...typography.subtextBold,
    color: colors.text,
  },
  summaryBox: {
    marginTop: 8,
  },
  summaryRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 5,
  },
  summaryLabel: {
    ...typography.subtext,
    color: colors.textSecondary,
  },
  summaryValue: {
    ...typography.subtextBold,
    color: colors.text,
  },
  discountText: {
    color: colors.accentDark,
    fontWeight: '600',
  },
  divider: {
    height: 1,
    backgroundColor: colors.border,
    marginVertical: 10,
  },
  totalRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingTop: 4,
  },
  totalLabel: {
    ...typography.h4,
    color: colors.text,
  },
  totalValue: {
    ...typography.h2,
    color: colors.primary,
    fontWeight: '700',
  },
});

export default QuotationBreakdown;
