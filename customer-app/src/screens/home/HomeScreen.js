import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  RefreshControl,
  Image,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { colors } from '../../theme/colors';
import { typography } from '../../theme/typography';
import { useAuth } from '../../hooks/useAuth';
import { useNotifications } from '../../hooks/useNotifications';
import { vehicleApi } from '../../api/vehicleApi';
import { bookingApi } from '../../api/bookingApi';
import { formatDateTime, formatRegistrationNumber } from '../../utils/formatters';
import { BOOKING_STATUS_CONFIG } from '../../constants/appConstants';
import { Badge } from '../../components/common/Badge';

export const HomeScreen = ({ navigation }) => {
  const { user } = useAuth();
  const { unreadCount } = useNotifications();

  const [defaultVehicle, setDefaultVehicle] = useState(null);
  const [upcomingBooking, setUpcomingBooking] = useState(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const firstName = user?.firstName || 'Valued Customer';

  const loadHomeData = useCallback(async () => {
    try {
      // 1. Fetch vehicles to find default
      const vehicleRes = await vehicleApi.getVehicles();
      const vehicles = vehicleRes?.data || [];
      const def = vehicles.find((v) => v.isDefault) || vehicles[0] || null;
      setDefaultVehicle(def);

      // 2. Fetch bookings to find next upcoming/active booking
      const bookingRes = await bookingApi.getUserBookings({ limit: 10 });
      const bookings = bookingRes?.data || [];
      const upcoming = bookings.find(
        (b) =>
          b.status !== 'COMPLETED' &&
          b.status !== 'PAID' &&
          b.status !== 'CLOSED' &&
          b.status !== 'CANCELLED'
      );
      setUpcomingBooking(upcoming || null);
    } catch (err) {
      console.warn('Failed to load home data:', err);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => {
    loadHomeData();
  }, [loadHomeData]);

  const onRefresh = () => {
    setRefreshing(true);
    loadHomeData();
  };

  const statusConfig = upcomingBooking?.status
    ? BOOKING_STATUS_CONFIG[upcomingBooking.status] || {
        label: upcomingBooking.status,
        color: colors.primary,
        bg: colors.primarySoft,
      }
    : null;

  return (
    <View style={styles.container}>
      {/* Top Header */}
      <View style={styles.header}>
        <View style={styles.greetingCol}>
          <Text style={styles.greetingSub}>Welcome back,</Text>
          <Text style={styles.greetingName}>Hello, {firstName}</Text>
        </View>

        <View style={styles.headerIconsRow}>
          <TouchableOpacity
            style={styles.headerIconBtn}
            onPress={() => navigation.navigate('Notifications')}
            activeOpacity={0.7}
          >
            <Ionicons name="notifications-outline" size={22} color={colors.text} />
            {unreadCount > 0 && (
              <View style={styles.badge}>
                <Text style={styles.badgeText}>{unreadCount > 9 ? '9+' : unreadCount}</Text>
              </View>
            )}
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.avatarBtn}
            onPress={() => navigation.navigate('ProfileTab')}
            activeOpacity={0.8}
          >
            {user?.profileImage ? (
              <Image source={{ uri: user.profileImage }} style={styles.avatarImage} />
            ) : (
              <Ionicons name="person" size={18} color={colors.primary} />
            )}
          </TouchableOpacity>
        </View>
      </View>

      <ScrollView
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={onRefresh}
            colors={[colors.primary]}
            tintColor={colors.primary}
          />
        }
      >
        {/* Emergency Assistance Banner */}
        <View style={styles.emergencyCard}>
          <View style={styles.emergencyIconCircle}>
            <Ionicons name="alert" size={24} color="#FFFFFF" />
          </View>

          <View style={styles.emergencyTextCol}>
            <Text style={styles.emergencyTitle}>Need roadside assistance?</Text>
            <Text style={styles.emergencySub}>Get prompt help when you need it.</Text>
          </View>

          <TouchableOpacity
            style={styles.emergencyActionBtn}
            onPress={() => navigation.navigate('EmergencyAssistance')}
            activeOpacity={0.85}
          >
            <Text style={styles.emergencyActionText}>Get Emergency Help</Text>
            <Ionicons name="arrow-forward" size={16} color="#FFFFFF" />
          </TouchableOpacity>
        </View>

        {/* My Vehicle Section */}
        <View style={styles.sectionHeaderRow}>
          <Text style={styles.sectionTitle}>My Vehicle</Text>
          <TouchableOpacity onPress={() => navigation.navigate('GarageTab')}>
            <Text style={styles.sectionLink}>View Garage</Text>
          </TouchableOpacity>
        </View>

        {defaultVehicle ? (
          <TouchableOpacity
            style={styles.vehicleCard}
            onPress={() => navigation.navigate('GarageTab')}
            activeOpacity={0.8}
          >
            <View style={styles.vehicleIconCircle}>
              <Ionicons
                name={defaultVehicle.vehicleType === 'TWO_WHEELER' ? 'bicycle' : 'car-sport'}
                size={26}
                color={colors.primary}
              />
            </View>

            <View style={styles.vehicleInfo}>
              <View style={styles.vehicleTitleRow}>
                <Text style={styles.vehicleName}>
                  {defaultVehicle.make} {defaultVehicle.model}
                </Text>
                {defaultVehicle.isDefault && (
                  <Badge label="Default" variant="primary" size="sm" />
                )}
              </View>

              <Text style={styles.vehicleSpecs}>
                {defaultVehicle.variant ? `${defaultVehicle.variant} • ` : ''}
                {defaultVehicle.fuelType || 'Petrol'}
              </Text>

              <View style={styles.plateBadge}>
                <Text style={styles.plateText}>
                  {formatRegistrationNumber(defaultVehicle.registrationNumber)}
                </Text>
              </View>
            </View>

            <Ionicons name="chevron-forward" size={18} color={colors.textSecondary} />
          </TouchableOpacity>
        ) : (
          <View style={styles.emptyVehicleCard}>
            <Ionicons name="car-outline" size={32} color={colors.textSecondary} />
            <Text style={styles.emptyVehicleText}>No vehicles added to your garage yet</Text>
            <TouchableOpacity
              style={styles.addVehicleBtn}
              onPress={() => navigation.navigate('AddVehicle')}
            >
              <Text style={styles.addVehicleText}>+ Add Vehicle</Text>
            </TouchableOpacity>
          </View>
        )}

        {/* Quick Actions (Only 4 distinct actions) */}
        <Text style={[styles.sectionTitle, { marginTop: 22, marginBottom: 12 }]}>
          Quick Actions
        </Text>
        <View style={styles.quickActionsGrid}>
          <TouchableOpacity
            style={styles.actionTile}
            onPress={() => navigation.navigate('BookService')}
            activeOpacity={0.7}
          >
            <View style={[styles.actionIconBox, { backgroundColor: colors.primarySoft }]}>
              <Ionicons name="calendar" size={22} color={colors.primary} />
            </View>
            <Text style={styles.actionLabel}>Book Service</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.actionTile}
            onPress={() => navigation.navigate('BookingsTab')}
            activeOpacity={0.7}
          >
            <View style={[styles.actionIconBox, { backgroundColor: '#EFF6FF' }]}>
              <Ionicons name="time" size={22} color="#3B82F6" />
            </View>
            <Text style={styles.actionLabel}>My Bookings</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.actionTile}
            onPress={() => navigation.navigate('GarageTab')}
            activeOpacity={0.7}
          >
            <View style={[styles.actionIconBox, { backgroundColor: '#F0FDF4' }]}>
              <Ionicons name="car" size={22} color={colors.accent} />
            </View>
            <Text style={styles.actionLabel}>Garage</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.actionTile}
            onPress={() => navigation.navigate('ServicesTab')}
            activeOpacity={0.7}
          >
            <View style={[styles.actionIconBox, { backgroundColor: '#F5F3FF' }]}>
              <Ionicons name="grid" size={22} color="#8B5CF6" />
            </View>
            <Text style={styles.actionLabel}>Services</Text>
          </TouchableOpacity>
        </View>

        {/* Upcoming Booking Section */}
        <View style={[styles.sectionHeaderRow, { marginTop: 24 }]}>
          <Text style={styles.sectionTitle}>Upcoming Booking</Text>
          {upcomingBooking && (
            <TouchableOpacity onPress={() => navigation.navigate('BookingsTab')}>
              <Text style={styles.sectionLink}>View All</Text>
            </TouchableOpacity>
          )}
        </View>

        {upcomingBooking ? (
          <View style={styles.upcomingCard}>
            <View style={styles.upcomingHeader}>
              <View style={styles.upcomingTitleCol}>
                <Text style={styles.upcomingService}>
                  {upcomingBooking.serviceSnapshot?.name ||
                    upcomingBooking.packageSnapshot?.name ||
                    'Vehicle Servicing'}
                </Text>
                <Text style={styles.upcomingVehicle}>
                  {upcomingBooking.vehicleSnapshot?.make}{' '}
                  {upcomingBooking.vehicleSnapshot?.model}
                </Text>
              </View>

              {statusConfig && (
                <View style={[styles.statusTag, { backgroundColor: statusConfig.bg }]}>
                  <Text style={[styles.statusTagText, { color: statusConfig.color }]}>
                    {statusConfig.label}
                  </Text>
                </View>
              )}
            </View>

            <View style={styles.upcomingMetaRow}>
              <Ionicons name="calendar-outline" size={16} color={colors.textSecondary} />
              <Text style={styles.upcomingDate}>
                {formatDateTime(upcomingBooking.scheduledAt || upcomingBooking.createdAt)}
              </Text>
            </View>

            <TouchableOpacity
              style={styles.viewBookingBtn}
              onPress={() =>
                navigation.navigate('BookingDetail', {
                  bookingId: upcomingBooking._id || upcomingBooking.id,
                })
              }
              activeOpacity={0.8}
            >
              <Text style={styles.viewBookingText}>View Booking</Text>
              <Ionicons name="arrow-forward" size={14} color={colors.primary} />
            </TouchableOpacity>
          </View>
        ) : (
          <View style={styles.emptyBookingCard}>
            <Ionicons name="calendar-clear-outline" size={32} color={colors.textSecondary} />
            <Text style={styles.emptyBookingTitle}>No active or upcoming bookings</Text>
            <Text style={styles.emptyBookingSub}>
              Keep your vehicle running smoothly with our scheduled service
            </Text>
            <TouchableOpacity
              style={styles.bookNowBtn}
              onPress={() => navigation.navigate('BookService')}
            >
              <Text style={styles.bookNowText}>Book a Service</Text>
            </TouchableOpacity>
          </View>
        )}
      </ScrollView>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },
  header: {
    paddingHorizontal: 20,
    paddingTop: 16,
    paddingBottom: 14,
    backgroundColor: colors.surface,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    borderBottomWidth: 1,
    borderBottomColor: colors.borderLight,
  },
  greetingCol: {
    justifyContent: 'center',
  },
  greetingSub: {
    ...typography.caption,
    color: colors.textSecondary,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  greetingName: {
    ...typography.h3,
    color: colors.text,
    marginTop: 1,
  },
  headerIconsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  headerIconBtn: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: colors.background,
    borderWidth: 1,
    borderColor: colors.border,
    alignItems: 'center',
    justifyContent: 'center',
    position: 'relative',
  },
  badge: {
    position: 'absolute',
    top: 4,
    right: 4,
    backgroundColor: colors.danger,
    minWidth: 16,
    height: 16,
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 3,
  },
  badgeText: {
    color: '#FFFFFF',
    fontSize: 9,
    fontWeight: '700',
  },
  avatarBtn: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: colors.primarySoft,
    borderWidth: 1,
    borderColor: colors.borderLight,
    alignItems: 'center',
    justifyContent: 'center',
    overflow: 'hidden',
  },
  avatarImage: {
    width: 40,
    height: 40,
    borderRadius: 20,
  },
  scrollContent: {
    padding: 20,
    paddingBottom: 36,
  },
  emergencyCard: {
    backgroundColor: colors.primary,
    borderRadius: 20,
    padding: 18,
    shadowColor: colors.primary,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.15,
    shadowRadius: 10,
    elevation: 4,
    marginBottom: 24,
  },
  emergencyIconCircle: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 10,
  },
  emergencyTextCol: {
    marginBottom: 14,
  },
  emergencyTitle: {
    ...typography.h3,
    color: '#FFFFFF',
    marginBottom: 2,
  },
  emergencySub: {
    ...typography.subtext,
    color: '#E0F2F1',
  },
  emergencyActionBtn: {
    backgroundColor: colors.accent,
    height: 44,
    borderRadius: 12,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
  },
  emergencyActionText: {
    ...typography.subtextBold,
    color: '#FFFFFF',
  },
  sectionHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 10,
  },
  sectionTitle: {
    ...typography.h3,
    color: colors.text,
  },
  sectionLink: {
    ...typography.subtextBold,
    color: colors.primary,
  },
  vehicleCard: {
    backgroundColor: colors.surface,
    borderRadius: 16,
    padding: 16,
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1.5,
    borderColor: colors.borderLight,
    shadowColor: '#0F172A',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.04,
    shadowRadius: 6,
    elevation: 2,
  },
  vehicleIconCircle: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: colors.primarySoft,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 14,
  },
  vehicleInfo: {
    flex: 1,
  },
  vehicleTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  vehicleName: {
    ...typography.h4,
    color: colors.text,
  },
  vehicleSpecs: {
    ...typography.subtext,
    color: colors.textSecondary,
    marginVertical: 2,
  },
  plateBadge: {
    backgroundColor: '#F1F5F9',
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 6,
    alignSelf: 'flex-start',
    marginTop: 2,
  },
  plateText: {
    ...typography.caption,
    fontWeight: '700',
    color: colors.text,
  },
  emptyVehicleCard: {
    backgroundColor: colors.surface,
    borderRadius: 16,
    padding: 24,
    alignItems: 'center',
    borderWidth: 1.5,
    borderColor: colors.borderLight,
    borderStyle: 'dashed',
  },
  emptyVehicleText: {
    ...typography.body,
    color: colors.textSecondary,
    marginTop: 8,
    marginBottom: 14,
  },
  addVehicleBtn: {
    backgroundColor: colors.primarySoft,
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 10,
  },
  addVehicleText: {
    ...typography.subtextBold,
    color: colors.primary,
  },
  quickActionsGrid: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    gap: 10,
  },
  actionTile: {
    flex: 1,
    backgroundColor: colors.surface,
    borderRadius: 16,
    paddingVertical: 14,
    paddingHorizontal: 6,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: colors.borderLight,
    shadowColor: '#0F172A',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.03,
    shadowRadius: 4,
    elevation: 1,
  },
  actionIconBox: {
    width: 44,
    height: 44,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 8,
  },
  actionLabel: {
    ...typography.caption,
    fontWeight: '600',
    color: colors.text,
    textAlign: 'center',
  },
  upcomingCard: {
    backgroundColor: colors.surface,
    borderRadius: 16,
    padding: 18,
    borderWidth: 1.5,
    borderColor: colors.borderLight,
    shadowColor: '#0F172A',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.04,
    shadowRadius: 6,
    elevation: 2,
  },
  upcomingHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 10,
  },
  upcomingTitleCol: {
    flex: 1,
    paddingRight: 8,
  },
  upcomingService: {
    ...typography.h4,
    color: colors.text,
  },
  upcomingVehicle: {
    ...typography.subtext,
    color: colors.textSecondary,
    marginTop: 2,
  },
  statusTag: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
  },
  statusTagText: {
    ...typography.caption,
    fontWeight: '700',
  },
  upcomingMetaRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginBottom: 14,
  },
  upcomingDate: {
    ...typography.subtext,
    color: colors.textSecondary,
  },
  viewBookingBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    backgroundColor: colors.primarySoft,
    paddingVertical: 10,
    borderRadius: 10,
  },
  viewBookingText: {
    ...typography.subtextBold,
    color: colors.primary,
  },
  emptyBookingCard: {
    backgroundColor: colors.surface,
    borderRadius: 16,
    padding: 24,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: colors.borderLight,
  },
  emptyBookingTitle: {
    ...typography.h4,
    color: colors.text,
    marginTop: 8,
    marginBottom: 4,
  },
  emptyBookingSub: {
    ...typography.subtext,
    color: colors.textSecondary,
    textAlign: 'center',
    marginBottom: 14,
  },
  bookNowBtn: {
    backgroundColor: colors.primary,
    paddingHorizontal: 20,
    paddingVertical: 10,
    borderRadius: 10,
  },
  bookNowText: {
    ...typography.subtextBold,
    color: '#FFFFFF',
  },
});

export default HomeScreen;
