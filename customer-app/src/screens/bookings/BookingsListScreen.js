import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  ScrollView,
} from 'react-native';
import { colors } from '../../theme/colors';
import { typography } from '../../theme/typography';
import { bookingApi } from '../../api/bookingApi';
import { BookingCard } from '../../components/cards/BookingCard';
import { EmptyState } from '../../components/common/EmptyState';
import { LoadingSkeleton } from '../../components/common/LoadingSkeleton';

const BOOKING_TABS = [
  { id: 'UPCOMING', label: 'Upcoming' },
  { id: 'ACTIVE', label: 'Active / In Progress' },
  { id: 'COMPLETED', label: 'Completed' },
  { id: 'CANCELLED', label: 'Cancelled' },
];

export const BookingsListScreen = ({ navigation }) => {
  const [activeTab, setActiveTab] = useState('UPCOMING');
  const [bookings, setBookings] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const fetchBookings = useCallback(async () => {
    try {
      const res = await bookingApi.getUserBookings({ limit: 50 });
      setBookings(res?.data || []);
    } catch (err) {
      console.warn('Failed to load bookings:', err);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => {
    const unsubscribe = navigation.addListener('focus', () => {
      fetchBookings();
    });
    return unsubscribe;
  }, [navigation, fetchBookings]);

  const onRefresh = () => {
    setRefreshing(true);
    fetchBookings();
  };

  // Filter bookings according to active tab
  const filteredBookings = bookings.filter((b) => {
    const s = b.status;
    if (activeTab === 'UPCOMING') {
      return s === 'PENDING' || s === 'ASSIGNED' || s === 'ACCEPTED';
    }
    if (activeTab === 'ACTIVE') {
      return (
        s === 'ON_THE_WAY' ||
        s === 'ARRIVED' ||
        s === 'INSPECTION' ||
        s === 'QUOTE_PENDING' ||
        s === 'QUOTE_APPROVED' ||
        s === 'IN_PROGRESS' ||
        s === 'PAYMENT_PENDING'
      );
    }
    if (activeTab === 'COMPLETED') {
      return s === 'COMPLETED' || s === 'PAID' || s === 'CLOSED';
    }
    if (activeTab === 'CANCELLED') {
      return s === 'CANCELLED';
    }
    return true;
  });

  return (
    <View style={styles.container}>
      {/* Top Tabs */}
      <View style={styles.tabContainer}>
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.tabScroll}
        >
          {BOOKING_TABS.map((tab) => {
            const isSelected = activeTab === tab.id;
            return (
              <TouchableOpacity
                key={tab.id}
                style={[styles.tabChip, isSelected && styles.tabChipSelected]}
                onPress={() => setActiveTab(tab.id)}
                activeOpacity={0.8}
              >
                <Text
                  style={[
                    styles.tabChipText,
                    isSelected && styles.tabChipTextSelected,
                  ]}
                >
                  {tab.label}
                </Text>
              </TouchableOpacity>
            );
          })}
        </ScrollView>
      </View>

      {/* Bookings List */}
      {loading ? (
        <LoadingSkeleton count={3} />
      ) : (
        <FlatList
          data={filteredBookings}
          keyExtractor={(item) => item._id || item.id}
          renderItem={({ item }) => (
            <BookingCard
              booking={item}
              onPress={() =>
                navigation.navigate('BookingDetail', {
                  bookingId: item._id || item.id,
                })
              }
            />
          )}
          contentContainerStyle={styles.listContent}
          showsVerticalScrollIndicator={false}
          refreshing={refreshing}
          onRefresh={onRefresh}
          ListEmptyComponent={
            <EmptyState
              icon="calendar-outline"
              title={`No ${activeTab.toLowerCase()} bookings`}
              description="Your scheduled appointments, roadside breakdown calls, and history will appear here."
              buttonTitle="Book a Service"
              onButtonPress={() => navigation.navigate('BookService')}
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
  tabContainer: {
    backgroundColor: colors.surface,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: colors.borderLight,
  },
  tabScroll: {
    paddingHorizontal: 16,
    gap: 8,
  },
  tabChip: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
    backgroundColor: '#F1F5F9',
  },
  tabChipSelected: {
    backgroundColor: colors.primary,
  },
  tabChipText: {
    ...typography.subtextBold,
    color: colors.textSecondary,
  },
  tabChipTextSelected: {
    color: '#FFFFFF',
  },
  listContent: {
    padding: 16,
    paddingBottom: 40,
  },
});

export default BookingsListScreen;
