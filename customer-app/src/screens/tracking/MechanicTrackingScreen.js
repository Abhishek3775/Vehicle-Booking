import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ActivityIndicator,
  Linking,
  Platform,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { colors } from '../../theme/colors';
import { typography } from '../../theme/typography';
import { mechanicApi } from '../../api/mechanicApi';
import { bookingApi } from '../../api/bookingApi';
import { MechanicInfoCard } from '../../components/mechanic/MechanicInfoCard';

export const MechanicTrackingScreen = ({ route, navigation }) => {
  const { bookingId } = route.params || {};

  const [booking, setBooking] = useState(null);
  const [dispatch, setDispatch] = useState(null);
  const [mechanic, setMechanic] = useState(null);
  const [loading, setLoading] = useState(true);

  // Live simulation coordinates
  const [mechanicCoords, setMechanicCoords] = useState({
    latitude: 26.225,
    longitude: 78.192,
  });

  const [customerCoords, setCustomerCoords] = useState({
    latitude: 26.2183,
    longitude: 78.1828,
  });

  const loadTrackingData = useCallback(async () => {
    try {
      if (bookingId) {
        const bRes = await bookingApi.getBookingById(bookingId);
        setBooking(bRes?.data || null);

        if (bRes?.data?.locationSnapshot?.latitude) {
          setCustomerCoords({
            latitude: bRes.data.locationSnapshot.latitude,
            longitude: bRes.data.locationSnapshot.longitude,
          });
        }

        try {
          const dRes = await mechanicApi.getDispatchByBookingId(bookingId);
          setDispatch(dRes?.data || null);

          if (dRes?.data?.mechanicId) {
            const mRes = await mechanicApi.getMechanicById(dRes.data.mechanicId);
            setMechanic(mRes?.data || null);
          }
        } catch {
          // If no dispatch assigned yet
        }
      }
    } catch (err) {
      console.warn('Tracking fetch failed:', err);
    } finally {
      setLoading(false);
    }
  }, [bookingId]);

  useEffect(() => {
    loadTrackingData();
    const interval = setInterval(loadTrackingData, 12000);
    return () => clearInterval(interval);
  }, [loadTrackingData]);

  if (loading) {
    return (
      <View style={styles.centerContainer}>
        <ActivityIndicator size="large" color={colors.primary} />
      </View>
    );
  }

  const statusText =
    booking?.status === 'ARRIVED'
      ? 'Mechanic Arrived'
      : booking?.status === 'ON_THE_WAY'
      ? 'On The Way'
      : 'Dispatched';

  return (
    <View style={styles.container}>
      {/* Top Floating Header */}
      <View style={styles.topHeader}>
        <TouchableOpacity
          style={styles.backBtn}
          onPress={() => navigation.goBack()}
          hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
        >
          <Ionicons name="arrow-back" size={22} color={colors.text} />
        </TouchableOpacity>

        <View style={styles.headerTitleBox}>
          <Text style={styles.headerTitle}>Your mechanic is on the way</Text>
          <Text style={styles.headerSubtitle}>Live GPS Tracking</Text>
        </View>

        <TouchableOpacity
          style={styles.detailsBtn}
          onPress={() =>
            navigation.navigate('BookingDetail', {
              bookingId,
            })
          }
        >
          <Ionicons name="information-circle-outline" size={24} color={colors.primary} />
        </TouchableOpacity>
      </View>

      {/* Map View Simulation */}
      <View style={styles.mapArea}>
        <View style={styles.mapCanvas}>
          {/* Simulated route road */}
          <View style={styles.routeLine} />

          {/* Mechanic Marker */}
          <View style={styles.mechanicPinContainer}>
            <View style={styles.mechanicPinHalo} />
            <View style={styles.mechanicPin}>
              <Ionicons name="construct" size={16} color="#FFFFFF" />
            </View>
            <View style={styles.pinTag}>
              <Text style={styles.pinTagText}>Mechanic (2.4 km away)</Text>
            </View>
          </View>

          {/* Customer Destination Marker */}
          <View style={styles.customerPinContainer}>
            <View style={styles.customerPin}>
              <Ionicons name="car" size={18} color="#FFFFFF" />
            </View>
            <View style={styles.pinTag}>
              <Text style={styles.pinTagText}>Your Breakdown Location</Text>
            </View>
          </View>

          {/* Map Controls */}
          <View style={styles.mapControls}>
            <TouchableOpacity style={styles.controlBtn} activeOpacity={0.8}>
              <Ionicons name="locate" size={20} color={colors.primary} />
            </TouchableOpacity>
            <TouchableOpacity style={styles.controlBtn} activeOpacity={0.8}>
              <Ionicons name="layers-outline" size={20} color={colors.textSecondary} />
            </TouchableOpacity>
          </View>
        </View>
      </View>

      {/* Bottom Floating Mechanic Info Sheet */}
      <View style={styles.bottomSheetContainer}>
        <MechanicInfoCard
          mechanic={
            mechanic || {
              displayName: 'Rajesh Sharma',
              specialization: 'Master Automotive Technician',
              experienceYears: 8,
              phone: '+919876543210',
              ratingSummary: { averageRating: 4.9, totalRatings: 56 },
            }
          }
          distance="2.4 km"
          eta="12 mins"
          status={statusText}
          onCall={() => {
            const phone = mechanic?.phone || '+919876543210';
            Linking.openURL(`tel:${phone}`);
          }}
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
    backgroundColor: colors.background,
  },
  topHeader: {
    position: 'absolute',
    top: Platform.OS === 'ios' ? 44 : 16,
    left: 16,
    right: 16,
    zIndex: 10,
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.surface,
    borderRadius: 16,
    paddingHorizontal: 12,
    paddingVertical: 10,
    shadowColor: '#0F172A',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.1,
    shadowRadius: 10,
    elevation: 5,
    borderWidth: 1,
    borderColor: colors.borderLight,
  },
  backBtn: {
    width: 36,
    height: 36,
    borderRadius: 18,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.background,
  },
  headerTitleBox: {
    flex: 1,
    paddingHorizontal: 12,
  },
  headerTitle: {
    ...typography.subtextBold,
    color: colors.text,
  },
  headerSubtitle: {
    ...typography.caption,
    color: colors.accentDark,
    fontWeight: '600',
  },
  detailsBtn: {
    width: 36,
    height: 36,
    alignItems: 'center',
    justifyContent: 'center',
  },
  mapArea: {
    flex: 1,
  },
  mapCanvas: {
    flex: 1,
    backgroundColor: '#E2E8F0',
    position: 'relative',
    alignItems: 'center',
    justifyContent: 'center',
  },
  routeLine: {
    position: 'absolute',
    width: 4,
    height: '45%',
    backgroundColor: colors.primaryLight,
    borderRadius: 2,
    transform: [{ rotate: '35deg' }],
  },
  mechanicPinContainer: {
    position: 'absolute',
    top: '32%',
    left: '35%',
    alignItems: 'center',
  },
  mechanicPinHalo: {
    position: 'absolute',
    width: 52,
    height: 52,
    borderRadius: 26,
    backgroundColor: 'rgba(11, 79, 92, 0.2)',
  },
  mechanicPin: {
    width: 38,
    height: 38,
    borderRadius: 19,
    backgroundColor: colors.primary,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 3,
    borderColor: '#FFFFFF',
    shadowColor: '#000000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 4,
    elevation: 4,
  },
  customerPinContainer: {
    position: 'absolute',
    bottom: '38%',
    right: '32%',
    alignItems: 'center',
  },
  customerPin: {
    width: 38,
    height: 38,
    borderRadius: 19,
    backgroundColor: colors.danger,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 3,
    borderColor: '#FFFFFF',
    shadowColor: '#000000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 4,
    elevation: 4,
  },
  pinTag: {
    backgroundColor: colors.surface,
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 6,
    marginTop: 4,
    borderWidth: 1,
    borderColor: colors.border,
    shadowColor: '#0F172A',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.08,
    shadowRadius: 3,
    elevation: 2,
  },
  pinTagText: {
    ...typography.caption,
    fontWeight: '700',
    color: colors.text,
  },
  mapControls: {
    position: 'absolute',
    right: 16,
    top: 100,
    gap: 8,
  },
  controlBtn: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: colors.surface,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#0F172A',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  bottomSheetContainer: {
    position: 'absolute',
    bottom: 20,
    left: 16,
    right: 16,
  },
});

export default MechanicTrackingScreen;
