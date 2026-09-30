import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TouchableOpacity,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { colors } from '../../theme/colors';
import { typography } from '../../theme/typography';
import { invoiceApi } from '../../api/invoiceApi';
import { Badge } from '../../components/common/Badge';
import { EmptyState } from '../../components/common/EmptyState';
import { LoadingSkeleton } from '../../components/common/LoadingSkeleton';
import { formatCurrency, formatDateOnly } from '../../utils/formatters';

export const InvoicesListScreen = ({ navigation }) => {
  const [invoices, setInvoices] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const fetchInvoices = useCallback(async () => {
    try {
      const res = await invoiceApi.getInvoices({ limit: 50 });
      setInvoices(res?.data || []);
    } catch (err) {
      console.warn('Failed to fetch invoices:', err);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => {
    const unsubscribe = navigation.addListener('focus', () => {
      fetchInvoices();
    });
    return unsubscribe;
  }, [navigation, fetchInvoices]);

  const onRefresh = () => {
    setRefreshing(true);
    fetchInvoices();
  };

  return (
    <View style={styles.container}>
      {loading ? (
        <LoadingSkeleton count={3} />
      ) : (
        <FlatList
          data={invoices}
          keyExtractor={(item) => item._id || item.id}
          renderItem={({ item }) => {
            const isPaid = item.paymentStatus === 'PAID' || item.status === 'PAID';
            const amount = item.totalAmount || item.amount || 0;
            const vehicle = item.vehicleSnapshot
              ? `${item.vehicleSnapshot.make} ${item.vehicleSnapshot.model}`
              : 'Vehicle';
            const service = item.items?.[0]?.name || 'Vehicle Service';

            return (
              <TouchableOpacity
                style={styles.card}
                onPress={() =>
                  navigation.navigate('InvoiceDetail', {
                    invoiceId: item._id || item.id,
                  })
                }
                activeOpacity={0.8}
              >
                <View style={styles.cardHeader}>
                  <View>
                    <Text style={styles.invoiceNumber}>
                      {item.invoiceNumber || item.invoiceReference || 'INV-2026-001'}
                    </Text>
                    <Text style={styles.dateText}>
                      {formatDateOnly(item.issuedAt || item.createdAt)}
                    </Text>
                  </View>

                  <Badge
                    label={isPaid ? 'PAID' : 'PENDING'}
                    variant={isPaid ? 'success' : 'warning'}
                    size="sm"
                  />
                </View>

                <View style={styles.divider} />

                <Text style={styles.serviceText} numberOfLines={1}>
                  {service}
                </Text>

                <View style={styles.metaRow}>
                  <Ionicons name="car-outline" size={14} color={colors.textSecondary} />
                  <Text style={styles.metaText}>{vehicle}</Text>
                </View>

                <View style={styles.cardFooter}>
                  <View>
                    <Text style={styles.amountLabel}>Total Amount</Text>
                    <Text style={styles.amountValue}>{formatCurrency(amount)}</Text>
                  </View>

                  <View style={styles.viewRow}>
                    <Text style={styles.viewText}>View Invoice</Text>
                    <Ionicons name="chevron-forward" size={16} color={colors.primary} />
                  </View>
                </View>
              </TouchableOpacity>
            );
          }}
          contentContainerStyle={styles.listContent}
          showsVerticalScrollIndicator={false}
          refreshing={refreshing}
          onRefresh={onRefresh}
          ListEmptyComponent={
            <EmptyState
              icon="receipt-outline"
              title="No invoices yet"
              description="Invoices generated after completed service payments will be available here for download and records."
            />
          }
        />
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },
  listContent: {
    padding: 16,
    paddingBottom: 40,
  },
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
  cardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  invoiceNumber: {
    ...typography.subtextBold,
    color: colors.text,
  },
  dateText: {
    ...typography.caption,
    color: colors.textMuted,
    marginTop: 2,
  },
  divider: {
    height: 1,
    backgroundColor: colors.borderLight,
    marginVertical: 10,
  },
  serviceText: {
    ...typography.h4,
    color: colors.text,
    marginBottom: 4,
  },
  metaRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginBottom: 10,
  },
  metaText: {
    ...typography.subtext,
    color: colors.textSecondary,
  },
  cardFooter: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingTop: 8,
    borderTopWidth: 1,
    borderTopColor: colors.borderLight,
  },
  amountLabel: {
    ...typography.caption,
    color: colors.textSecondary,
  },
  amountValue: {
    ...typography.h4,
    color: colors.primary,
    fontWeight: '700',
  },
  viewRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  viewText: {
    ...typography.caption,
    fontWeight: '700',
    color: colors.primary,
  },
});

export default InvoicesListScreen;
