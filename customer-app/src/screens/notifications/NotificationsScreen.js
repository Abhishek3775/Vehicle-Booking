import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  ScrollView,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { colors } from '../../theme/colors';
import { typography } from '../../theme/typography';
import { useNotifications } from '../../hooks/useNotifications';
import { NotificationCard } from '../../components/cards/NotificationCard';
import { EmptyState } from '../../components/common/EmptyState';
import { LoadingSkeleton } from '../../components/common/LoadingSkeleton';

const CATEGORIES = [
  'ALL',
  'BOOKING',
  'DISPATCH',
  'INSPECTION',
  'QUOTATION',
  'PAYMENT',
  'INVOICE',
];

export const NotificationsScreen = ({ navigation }) => {
  const {
    notifications,
    isLoading,
    unreadCount,
    fetchNotifications,
    markAsRead,
    markAllAsRead,
    deleteNotification,
  } = useNotifications();

  const [selectedCat, setSelectedCat] = useState('ALL');
  const [refreshing, setRefreshing] = useState(false);

  const onRefresh = async () => {
    setRefreshing(true);
    await fetchNotifications();
    setRefreshing(false);
  };

  const handleNotificationPress = async (n) => {
    const id = n._id || n.id;
    if (!n.isRead) {
      await markAsRead(id);
    }

    // Smart contextual deep-linking based on notification category & payload
    if (n.category === 'BOOKING' && n.bookingId) {
      navigation.navigate('BookingDetail', { bookingId: n.bookingId });
    } else if (n.category === 'DISPATCH' && n.bookingId) {
      navigation.navigate('MechanicTracking', { bookingId: n.bookingId });
    } else if (n.category === 'INSPECTION' && n.bookingId) {
      navigation.navigate('InspectionReport', { bookingId: n.bookingId });
    } else if (n.category === 'QUOTATION' && n.bookingId) {
      navigation.navigate('QuotationDetail', {
        bookingId: n.bookingId,
        quotationId: n.quotationId,
      });
    } else if (n.category === 'PAYMENT' && n.bookingId) {
      navigation.navigate('BookingDetail', { bookingId: n.bookingId });
    } else if (n.category === 'INVOICE' && (n.invoiceId || n.bookingId)) {
      navigation.navigate('InvoiceDetail', {
        invoiceId: n.invoiceId,
        bookingId: n.bookingId,
      });
    }
  };

  const filteredNotifications = notifications.filter((n) => {
    if (selectedCat === 'ALL') return true;
    return n.category === selectedCat;
  });

  return (
    <View style={styles.container}>
      {/* Category Pills & Mark All Read Header */}
      <View style={styles.topControlBar}>
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.catScroll}
        >
          {CATEGORIES.map((cat) => {
            const isSelected = selectedCat === cat;
            return (
              <TouchableOpacity
                key={cat}
                style={[styles.pill, isSelected && styles.pillSelected]}
                onPress={() => setSelectedCat(cat)}
                activeOpacity={0.8}
              >
                <Text style={[styles.pillText, isSelected && styles.pillTextSelected]}>
                  {cat}
                </Text>
              </TouchableOpacity>
            );
          })}
        </ScrollView>

        {unreadCount > 0 && (
          <TouchableOpacity style={styles.markAllBtn} onPress={markAllAsRead}>
            <Ionicons name="checkmark-done" size={16} color={colors.primary} />
            <Text style={styles.markAllText}>Mark all read</Text>
          </TouchableOpacity>
        )}
      </View>

      {isLoading ? (
        <LoadingSkeleton count={4} />
      ) : (
        <FlatList
          data={filteredNotifications}
          keyExtractor={(item) => item._id || item.id}
          renderItem={({ item }) => (
            <NotificationCard
              notification={item}
              onPress={() => handleNotificationPress(item)}
              onDelete={() => deleteNotification(item._id || item.id)}
            />
          )}
          contentContainerStyle={styles.listContent}
          showsVerticalScrollIndicator={false}
          refreshing={refreshing}
          onRefresh={onRefresh}
          ListEmptyComponent={
            <EmptyState
              icon="notifications-off-outline"
              title="No notifications"
              description="You're all caught up! Real-time updates regarding service bookings, mechanic dispatches, and quotes will appear here."
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
  topControlBar: {
    backgroundColor: colors.surface,
    paddingVertical: 10,
    borderBottomWidth: 1,
    borderBottomColor: colors.borderLight,
  },
  catScroll: {
    paddingHorizontal: 16,
    gap: 8,
  },
  pill: {
    paddingHorizontal: 14,
    paddingVertical: 6,
    borderRadius: 16,
    backgroundColor: '#F1F5F9',
  },
  pillSelected: {
    backgroundColor: colors.primary,
  },
  pillText: {
    ...typography.caption,
    fontWeight: '600',
    color: colors.textSecondary,
  },
  pillTextSelected: {
    color: '#FFFFFF',
  },
  markAllBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'flex-end',
    gap: 4,
    paddingHorizontal: 16,
    paddingTop: 8,
  },
  markAllText: {
    ...typography.caption,
    color: colors.primary,
    fontWeight: '600',
  },
  listContent: {
    padding: 16,
    paddingBottom: 40,
  },
});

export default NotificationsScreen;
