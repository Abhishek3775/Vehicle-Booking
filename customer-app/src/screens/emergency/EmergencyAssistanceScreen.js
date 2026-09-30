import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Alert,
  ActivityIndicator,
  Platform,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import * as Location from 'expo-location';
import { colors } from '../../theme/colors';
import { typography } from '../../theme/typography';
import { EMERGENCY_ISSUES } from '../../constants/appConstants';
import { vehicleApi } from '../../api/vehicleApi';
import { bookingApi } from '../../api/bookingApi';
import { locationApi } from '../../api/locationApi';
import { VehiclePickerSheet } from '../../components/vehicle/VehiclePickerSheet';
import { PrimaryButton } from '../../components/buttons/PrimaryButton';
import { InputField } from '../../components/forms/InputField';
import { formatRegistrationNumber } from '../../utils/formatters';

export const EmergencyAssistanceScreen = ({ navigation }) => {
  const [selectedIssue, setSelectedIssue] = useState(EMERGENCY_ISSUES[0].id);
  const [vehicles, setVehicles] = useState([]);
  const [selectedVehicle, setSelectedVehicle] = useState(null);
  const [vehiclePickerVisible, setVehiclePickerVisible] = useState(false);

  const [location, setLocation] = useState({
    latitude: 26.2183,
    longitude: 78.1828,
    addressText: 'Detecting your current location...',
  });
  const [locating, setLocating] = useState(false);
  const [locationAcquired, setLocationAcquired] = useState(false);
  const [notes, setNotes] = useState('');
  const [submitting, setSubmitting] = useState(false);

  // Fetch garage vehicles
  useEffect(() => {
    const fetchVehicles = async () => {
      try {
        const res = await vehicleApi.getVehicles();
        const vList = res?.data || [];
        setVehicles(vList);
        const def = vList.find((v) => v.isDefault) || vList[0] || null;
        setSelectedVehicle(def);
      } catch (err) {
        console.warn('Failed to load vehicles for emergency:', err);
      }
    };
    fetchVehicles();
  }, []);

  // Request location when customer is on this screen
  const requestLocation = async () => {
    setLocating(true);
    try {
      const { status } = await Location.requestForegroundPermissionsAsync();
      if (status !== 'granted') {
        Alert.alert(
          'Location Permission Denied',
          'We need your current location to dispatch the nearest emergency mechanic. Default approximate location will be used.'
        );
        setLocation({
          latitude: 26.2183,
          longitude: 78.1828,
          addressText: 'Current Area (GPS approximated)',
        });
        setLocationAcquired(true);
        return;
      }

      const position = await Location.getCurrentPositionAsync({
        accuracy: Location.Accuracy.Balanced,
      });

      const { latitude, longitude } = position.coords;

      // Reverse geocode
      let addressString = `${latitude.toFixed(4)}, ${longitude.toFixed(4)}`;
      try {
        const reverse = await Location.reverseGeocodeAsync({ latitude, longitude });
        if (reverse && reverse.length > 0) {
          const r = reverse[0];
          addressString = [r.name, r.street, r.subregion, r.city, r.postalCode]
            .filter(Boolean)
            .join(', ');
        }
      } catch {
        // Fallback to coordinates
      }

      setLocation({
        latitude,
        longitude,
        addressText: addressString,
      });
      setLocationAcquired(true);

      // Inform backend of customer's active location
      locationApi
        .updateCurrentLocation({
          latitude,
          longitude,
          addressText: addressString,
        })
        .catch(() => {});
    } catch (err) {
      console.warn('Location detection failed:', err);
      setLocation({
        latitude: 26.2183,
        longitude: 78.1828,
        addressText: 'Highway Breakdown Point',
      });
      setLocationAcquired(true);
    } finally {
      setLocating(false);
    }
  };

  useEffect(() => {
    requestLocation();
  }, []);

  const handleRequestAssistance = async () => {
    if (!selectedVehicle) {
      Alert.alert('Vehicle Required', 'Please select the vehicle that broke down.');
      return;
    }

    setSubmitting(true);
    try {
      const issueObj = EMERGENCY_ISSUES.find((i) => i.id === selectedIssue);
      const combinedNotes = `[EMERGENCY: ${issueObj?.label || selectedIssue}] ${notes}`.trim();

      const payload = {
        vehicleId: selectedVehicle._id || selectedVehicle.id,
        bookingType: 'EMERGENCY',
        location: {
          latitude: location.latitude,
          longitude: location.longitude,
          addressText: location.addressText,
        },
        customerNotes: combinedNotes,
      };

      const res = await bookingApi.createBooking(payload);
      const booking = res.data;

      Alert.alert(
        'Emergency Request Dispatched!',
        'Our dispatch system is alerting the closest mechanics to your coordinates.',
        [
          {
            text: 'Track Assistance',
            onPress: () => {
              navigation.replace('MechanicTracking', {
                bookingId: booking._id || booking.id,
              });
            },
          },
        ]
      );
    } catch (err) {
      const msg = err.response?.data?.message || 'Emergency request failed. Please call our hotline.';
      Alert.alert('Dispatch Error', msg);
    } finally {
      setSubmitting(false);
    }
  };

  const selectedIssueObj = EMERGENCY_ISSUES.find((i) => i.id === selectedIssue);

  return (
    <View style={styles.container}>
      <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
        {/* Banner Alert */}
        <View style={styles.emergencyHeader}>
          <View style={styles.alertCircle}>
            <Ionicons name="warning" size={28} color="#FFFFFF" />
          </View>
          <Text style={styles.headerTitle}>Need Emergency Assistance?</Text>
          <Text style={styles.headerSub}>Tell us what happened with your vehicle.</Text>
        </View>

        {/* Issue Options Grid */}
        <Text style={styles.sectionTitle}>What is the problem?</Text>
        <View style={styles.issuesGrid}>
          {EMERGENCY_ISSUES.map((item) => {
            const isSelected = selectedIssue === item.id;
            return (
              <TouchableOpacity
                key={item.id}
                style={[styles.issueCard, isSelected && styles.issueCardSelected]}
                onPress={() => setSelectedIssue(item.id)}
                activeOpacity={0.8}
              >
                <View style={[styles.issueIconCircle, isSelected && styles.issueIconCircleSelected]}>
                  <Ionicons
                    name={item.icon}
                    size={22}
                    color={isSelected ? '#FFFFFF' : colors.primary}
                  />
                </View>
                <Text style={[styles.issueLabel, isSelected && styles.issueLabelSelected]}>
                  {item.label}
                </Text>
              </TouchableOpacity>
            );
          })}
        </View>

        {/* Selected Vehicle */}
        <Text style={[styles.sectionTitle, { marginTop: 22 }]}>Affected Vehicle</Text>
        {selectedVehicle ? (
          <TouchableOpacity
            style={styles.vehicleCard}
            onPress={() => setVehiclePickerVisible(true)}
            activeOpacity={0.8}
          >
            <View style={styles.vehicleIconCircle}>
              <Ionicons
                name={selectedVehicle.vehicleType === 'TWO_WHEELER' ? 'bicycle' : 'car-sport'}
                size={22}
                color={colors.primary}
              />
            </View>

            <View style={styles.vehicleInfo}>
              <Text style={styles.vehicleName}>
                {selectedVehicle.make} {selectedVehicle.model}
              </Text>
              <Text style={styles.vehicleSub}>
                {formatRegistrationNumber(selectedVehicle.registrationNumber)} • {selectedVehicle.fuelType}
              </Text>
            </View>

            <Text style={styles.changeLink}>Change</Text>
          </TouchableOpacity>
        ) : (
          <TouchableOpacity
            style={styles.selectVehiclePrompt}
            onPress={() => setVehiclePickerVisible(true)}
          >
            <Ionicons name="car-outline" size={20} color={colors.primary} />
            <Text style={styles.selectVehiclePromptText}>Select Vehicle From Garage</Text>
          </TouchableOpacity>
        )}

        {/* Location Section */}
        <Text style={[styles.sectionTitle, { marginTop: 22 }]}>Breakdown Location</Text>
        <View style={styles.locationCard}>
          {/* Map placeholder simulation */}
          <View style={styles.mapSimulation}>
            <View style={styles.pinCircle}>
              <Ionicons name="location" size={24} color={colors.danger} />
            </View>
            <Text style={styles.coordinatesText}>
              GPS: {location.latitude.toFixed(4)}, {location.longitude.toFixed(4)}
            </Text>
          </View>

          <View style={styles.addressRow}>
            <Ionicons name="navigate" size={18} color={colors.primary} style={{ marginTop: 2 }} />
            <View style={styles.addressTextCol}>
              <Text style={styles.addressLabel}>Current Address</Text>
              <Text style={styles.addressValue}>{location.addressText}</Text>
            </View>

            <TouchableOpacity
              style={styles.refreshLocBtn}
              onPress={requestLocation}
              disabled={locating}
            >
              {locating ? (
                <ActivityIndicator size="small" color={colors.primary} />
              ) : (
                <Ionicons name="refresh" size={18} color={colors.primary} />
              )}
            </TouchableOpacity>
          </View>
        </View>

        {/* Additional Notes */}
        <InputField
          label="Additional Details (Optional)"
          value={notes}
          onChangeText={setNotes}
          placeholder="e.g. Near highway km 42, battery dead after leaving lights on"
          multiline={true}
          numberOfLines={2}
          style={{ marginTop: 14 }}
        />
      </ScrollView>

      {/* Sticky Bottom Action */}
      <View style={styles.bottomBar}>
        <PrimaryButton
          title={`Request Assistance for ${selectedIssueObj?.label || 'Emergency'}`}
          onPress={handleRequestAssistance}
          loading={submitting}
          variant="danger"
          icon={<Ionicons name="flash" size={18} color="#FFFFFF" style={{ marginRight: 8 }} />}
        />
      </View>

      <VehiclePickerSheet
        visible={vehiclePickerVisible}
        onClose={() => setVehiclePickerVisible(false)}
        vehicles={vehicles}
        selectedVehicleId={selectedVehicle?._id || selectedVehicle?.id}
        onSelectVehicle={setSelectedVehicle}
        onAddNew={() => navigation.navigate('AddVehicle')}
      />
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },
  scrollContent: {
    padding: 16,
    paddingBottom: 110,
  },
  emergencyHeader: {
    backgroundColor: colors.danger,
    borderRadius: 20,
    padding: 20,
    alignItems: 'center',
    marginBottom: 20,
    shadowColor: colors.danger,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.2,
    shadowRadius: 10,
    elevation: 4,
  },
  alertCircle: {
    width: 52,
    height: 52,
    borderRadius: 26,
    backgroundColor: 'rgba(255, 255, 255, 0.25)',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 10,
  },
  headerTitle: {
    ...typography.h2,
    color: '#FFFFFF',
    textAlign: 'center',
    marginBottom: 4,
  },
  headerSub: {
    ...typography.subtext,
    color: '#FEE2E2',
    textAlign: 'center',
  },
  sectionTitle: {
    ...typography.h4,
    color: colors.text,
    marginBottom: 10,
  },
  issuesGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 10,
  },
  issueCard: {
    width: '48%',
    backgroundColor: colors.surface,
    borderRadius: 14,
    padding: 14,
    alignItems: 'center',
    borderWidth: 1.5,
    borderColor: colors.borderLight,
  },
  issueCardSelected: {
    borderColor: colors.danger,
    backgroundColor: colors.dangerSoft,
  },
  issueIconCircle: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: colors.primarySoft,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 8,
  },
  issueIconCircleSelected: {
    backgroundColor: colors.danger,
  },
  issueLabel: {
    ...typography.subtextBold,
    color: colors.text,
    textAlign: 'center',
  },
  issueLabelSelected: {
    color: colors.danger,
  },
  vehicleCard: {
    backgroundColor: colors.surface,
    borderRadius: 14,
    padding: 14,
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1.5,
    borderColor: colors.borderLight,
  },
  vehicleIconCircle: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: colors.primarySoft,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },
  vehicleInfo: {
    flex: 1,
  },
  vehicleName: {
    ...typography.bodyBold,
    color: colors.text,
  },
  vehicleSub: {
    ...typography.caption,
    color: colors.textSecondary,
    marginTop: 2,
  },
  changeLink: {
    ...typography.subtextBold,
    color: colors.primary,
  },
  selectVehiclePrompt: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    backgroundColor: colors.surface,
    borderRadius: 14,
    padding: 16,
    borderWidth: 1.5,
    borderColor: colors.border,
    borderStyle: 'dashed',
  },
  selectVehiclePromptText: {
    ...typography.subtextBold,
    color: colors.primary,
  },
  locationCard: {
    backgroundColor: colors.surface,
    borderRadius: 16,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: colors.borderLight,
  },
  mapSimulation: {
    height: 130,
    backgroundColor: '#E2E8F0',
    alignItems: 'center',
    justifyContent: 'center',
    position: 'relative',
  },
  pinCircle: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: '#FFFFFF',
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#000000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.15,
    shadowRadius: 4,
    elevation: 3,
  },
  coordinatesText: {
    ...typography.caption,
    color: colors.textSecondary,
    backgroundColor: 'rgba(255, 255, 255, 0.85)',
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 6,
    marginTop: 6,
  },
  addressRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    padding: 14,
    gap: 10,
  },
  addressTextCol: {
    flex: 1,
  },
  addressLabel: {
    ...typography.caption,
    color: colors.textSecondary,
  },
  addressValue: {
    ...typography.subtextBold,
    color: colors.text,
    marginTop: 2,
  },
  refreshLocBtn: {
    padding: 6,
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

export default EmergencyAssistanceScreen;
