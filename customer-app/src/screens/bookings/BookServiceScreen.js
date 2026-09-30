import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Alert,
  ActivityIndicator,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { colors } from '../../theme/colors';
import { typography } from '../../theme/typography';
import { vehicleApi } from '../../api/vehicleApi';
import { serviceApi } from '../../api/serviceApi';
import { packageApi } from '../../api/packageApi';
import { addressApi } from '../../api/addressApi';
import { bookingApi } from '../../api/bookingApi';
import { StepIndicator } from '../../components/booking/StepIndicator';
import { TimeSlotPicker } from '../../components/booking/TimeSlotPicker';
import { VehicleCard } from '../../components/cards/VehicleCard';
import { ServiceCard } from '../../components/cards/ServiceCard';
import { PackageCard } from '../../components/cards/PackageCard';
import { AddressCard } from '../../components/cards/AddressCard';
import { PrimaryButton } from '../../components/buttons/PrimaryButton';
import { SecondaryButton } from '../../components/buttons/SecondaryButton';
import { InputField } from '../../components/forms/InputField';
import { formatCurrency, formatRegistrationNumber } from '../../utils/formatters';

export const BookServiceScreen = ({ route, navigation }) => {
  const { preselectedService, preselectedPackage } = route.params || {};

  const [step, setStep] = useState(1); // 1 to 6
  const [vehicles, setVehicles] = useState([]);
  const [services, setServices] = useState([]);
  const [packages, setPackages] = useState([]);
  const [addresses, setAddresses] = useState([]);

  const [selectedVehicle, setSelectedVehicle] = useState(null);
  const [selectedItemType, setSelectedItemType] = useState(preselectedPackage ? 'PACKAGE' : 'SERVICE');
  const [selectedService, setSelectedService] = useState(preselectedService || null);
  const [selectedPackage, setSelectedPackage] = useState(preselectedPackage || null);
  const [selectedAddress, setSelectedAddress] = useState(null);
  const [selectedDateTime, setSelectedDateTime] = useState(null);
  const [customerNotes, setCustomerNotes] = useState('');

  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);

  // Load initial required data
  useEffect(() => {
    const loadBookingData = async () => {
      try {
        const [vehRes, srvRes, pkgRes, addrRes] = await Promise.all([
          vehicleApi.getVehicles(),
          serviceApi.getServices(),
          packageApi.getPackages(),
          addressApi.getAddresses(),
        ]);

        const vList = vehRes?.data || [];
        setVehicles(vList);
        const defVeh = vList.find((v) => v.isDefault) || vList[0] || null;
        setSelectedVehicle(defVeh);

        setServices(srvRes?.data || []);
        setPackages(pkgRes?.data || []);

        const aList = addrRes?.data || [];
        setAddresses(aList);
        const defAddr = aList.find((a) => a.isDefault) || aList[0] || null;
        setSelectedAddress(defAddr);
      } catch (err) {
        console.warn('Error loading booking data:', err);
      } finally {
        setLoading(false);
      }
    };

    loadBookingData();
  }, []);

  const handleNext = () => {
    if (step === 1) {
      if (!selectedVehicle) {
        Alert.alert('Vehicle Required', 'Please select a vehicle from your garage to proceed.');
        return;
      }
      setStep(2);
    } else if (step === 2) {
      if (selectedItemType === 'SERVICE' && !selectedService) {
        Alert.alert('Service Required', 'Please select a service to book.');
        return;
      }
      if (selectedItemType === 'PACKAGE' && !selectedPackage) {
        Alert.alert('Package Required', 'Please select a service package to book.');
        return;
      }
      setStep(3);
    } else if (step === 3) {
      if (!selectedAddress) {
        Alert.alert('Address Required', 'Please select a service location address.');
        return;
      }
      setStep(4);
    } else if (step === 4) {
      if (!selectedDateTime) {
        Alert.alert('Schedule Required', 'Please choose an appointment date and time slot.');
        return;
      }
      setStep(5);
    } else if (step === 5) {
      setStep(6);
    }
  };

  const handleBack = () => {
    if (step > 1) {
      setStep((prev) => prev - 1);
    } else {
      navigation.goBack();
    }
  };

  const handleConfirmBooking = async () => {
    setSubmitting(true);
    try {
      const payload = {
        vehicleId: selectedVehicle._id || selectedVehicle.id,
        bookingType: 'SCHEDULED',
        scheduledAt: selectedDateTime.isoString,
        addressId: selectedAddress._id || selectedAddress.id,
        customerNotes: customerNotes.trim() || undefined,
      };

      if (selectedItemType === 'PACKAGE' && selectedPackage) {
        payload.servicePackageId = selectedPackage._id || selectedPackage.id;
      } else if (selectedService) {
        payload.serviceId = selectedService._id || selectedService.id;
      }

      const res = await bookingApi.createBooking(payload);
      const createdBooking = res.data;

      Alert.alert(
        'Booking Confirmed!',
        'Your service appointment has been scheduled successfully.',
        [
          {
            text: 'View Booking',
            onPress: () => {
              navigation.replace('BookingDetail', {
                bookingId: createdBooking._id || createdBooking.id,
              });
            },
          },
        ]
      );
    } catch (err) {
      const msg = err.response?.data?.message || 'Failed to create booking. Please try again.';
      Alert.alert('Booking Error', msg);
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) {
    return (
      <View style={styles.centerContainer}>
        <ActivityIndicator size="large" color={colors.primary} />
      </View>
    );
  }

  const selectedItemName =
    selectedItemType === 'PACKAGE'
      ? selectedPackage?.name
      : selectedService?.name;

  const estimatedAmount =
    selectedItemType === 'PACKAGE'
      ? selectedPackage?.discountedPrice || selectedPackage?.price
      : selectedService?.basePrice;

  return (
    <View style={styles.container}>
      <StepIndicator currentStep={step} totalSteps={6} />

      <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
        {/* STEP 1: SELECT VEHICLE */}
        {step === 1 && (
          <View style={styles.stepSection}>
            <Text style={styles.stepTitle}>Select Your Vehicle</Text>
            <Text style={styles.stepSubtitle}>
              Choose the vehicle requiring service or maintenance
            </Text>

            {vehicles.map((v) => {
              const isSelected = (v._id || v.id) === (selectedVehicle?._id || selectedVehicle?.id);
              return (
                <VehicleCard
                  key={v._id || v.id}
                  vehicle={v}
                  selectable={true}
                  selected={isSelected}
                  onPress={() => setSelectedVehicle(v)}
                />
              );
            })}

            <TouchableOpacity
              style={styles.addNewCard}
              onPress={() => navigation.navigate('AddVehicle')}
            >
              <Ionicons name="add-circle-outline" size={20} color={colors.primary} />
              <Text style={styles.addNewText}>Add Another Vehicle</Text>
            </TouchableOpacity>
          </View>
        )}

        {/* STEP 2: SELECT SERVICE OR PACKAGE */}
        {step === 2 && (
          <View style={styles.stepSection}>
            <Text style={styles.stepTitle}>Select Service</Text>
            <Text style={styles.stepSubtitle}>
              Choose an individual service or a bundled maintenance package
            </Text>

            <View style={styles.pillToggle}>
              <TouchableOpacity
                style={[styles.pillBtn, selectedItemType === 'SERVICE' && styles.pillBtnActive]}
                onPress={() => setSelectedItemType('SERVICE')}
              >
                <Text style={[styles.pillBtnText, selectedItemType === 'SERVICE' && styles.pillBtnTextActive]}>
                  Individual Service
                </Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={[styles.pillBtn, selectedItemType === 'PACKAGE' && styles.pillBtnActive]}
                onPress={() => setSelectedItemType('PACKAGE')}
              >
                <Text style={[styles.pillBtnText, selectedItemType === 'PACKAGE' && styles.pillBtnTextActive]}>
                  Service Package
                </Text>
              </TouchableOpacity>
            </View>

            {selectedItemType === 'SERVICE' ? (
              services.map((s) => {
                const isSelected = (s._id || s.id) === (selectedService?._id || selectedService?.id);
                return (
                  <ServiceCard
                    key={s._id || s.id}
                    service={s}
                    selectable={true}
                    selected={isSelected}
                    onPress={() => setSelectedService(s)}
                  />
                );
              })
            ) : (
              packages.map((p) => {
                const isSelected = (p._id || p.id) === (selectedPackage?._id || selectedPackage?.id);
                return (
                  <PackageCard
                    key={p._id || p.id}
                    servicePackage={p}
                    selectable={true}
                    selected={isSelected}
                    onPress={() => setSelectedPackage(p)}
                  />
                );
              })
            )}
          </View>
        )}

        {/* STEP 3: SELECT ADDRESS */}
        {step === 3 && (
          <View style={styles.stepSection}>
            <Text style={styles.stepTitle}>Select Service Location</Text>
            <Text style={styles.stepSubtitle}>
              Where should our certified mechanic arrive for doorstep service?
            </Text>

            {addresses.map((a) => {
              const isSelected = (a._id || a.id) === (selectedAddress?._id || selectedAddress?.id);
              return (
                <AddressCard
                  key={a._id || a.id}
                  address={a}
                  selectable={true}
                  selected={isSelected}
                  onPress={() => setSelectedAddress(a)}
                />
              );
            })}

            <TouchableOpacity
              style={styles.addNewCard}
              onPress={() => navigation.navigate('AddAddress')}
            >
              <Ionicons name="add-circle-outline" size={20} color={colors.primary} />
              <Text style={styles.addNewText}>Add New Address</Text>
            </TouchableOpacity>
          </View>
        )}

        {/* STEP 4: SELECT DATE & TIME */}
        {step === 4 && (
          <View style={styles.stepSection}>
            <Text style={styles.stepTitle}>Select Date & Time</Text>
            <Text style={styles.stepSubtitle}>
              Choose a convenient appointment schedule for your service
            </Text>

            <TimeSlotPicker
              onSelectDateTime={setSelectedDateTime}
              selectedDateTime={selectedDateTime}
            />

            {selectedDateTime && (
              <View style={styles.selectedScheduleBanner}>
                <Ionicons name="calendar" size={18} color={colors.primary} />
                <Text style={styles.selectedScheduleText}>
                  Scheduled for: <Text style={{ fontWeight: '700' }}>{selectedDateTime.displayString}</Text>
                </Text>
              </View>
            )}
          </View>
        )}

        {/* STEP 5: REVIEW */}
        {step === 5 && (
          <View style={styles.stepSection}>
            <Text style={styles.stepTitle}>Review Booking Summary</Text>
            <Text style={styles.stepSubtitle}>
              Please verify all appointment details before finalizing
            </Text>

            <View style={styles.summaryCard}>
              <View style={styles.summarySection}>
                <Text style={styles.summarySectionHeader}>Vehicle</Text>
                <Text style={styles.summaryItemTitle}>
                  {selectedVehicle?.make} {selectedVehicle?.model} ({selectedVehicle?.registrationYear})
                </Text>
                <Text style={styles.summaryItemSub}>
                  {formatRegistrationNumber(selectedVehicle?.registrationNumber)} • {selectedVehicle?.fuelType}
                </Text>
              </View>

              <View style={styles.summaryDivider} />

              <View style={styles.summarySection}>
                <Text style={styles.summarySectionHeader}>Service</Text>
                <Text style={styles.summaryItemTitle}>{selectedItemName}</Text>
                <Text style={styles.summaryItemSub}>
                  Starting Estimate: {formatCurrency(estimatedAmount)}
                </Text>
              </View>

              <View style={styles.summaryDivider} />

              <View style={styles.summarySection}>
                <Text style={styles.summarySectionHeader}>Service Address</Text>
                <Text style={styles.summaryItemTitle}>
                  {selectedAddress?.label}: {selectedAddress?.fullName}
                </Text>
                <Text style={styles.summaryItemSub}>
                  {selectedAddress?.addressLine1}, {selectedAddress?.city} ({selectedAddress?.postalCode})
                </Text>
              </View>

              <View style={styles.summaryDivider} />

              <View style={styles.summarySection}>
                <Text style={styles.summarySectionHeader}>Appointment Slot</Text>
                <Text style={styles.summaryItemTitle}>{selectedDateTime?.displayString}</Text>
              </View>
            </View>

            <InputField
              label="Special Instructions / Symptoms (Optional)"
              value={customerNotes}
              onChangeText={setCustomerNotes}
              placeholder="e.g. Squeaking noise when braking, oil leak check"
              multiline={true}
              numberOfLines={3}
            />
          </View>
        )}

        {/* STEP 6: CONFIRM */}
        {step === 6 && (
          <View style={styles.confirmSection}>
            <View style={styles.confirmIconCircle}>
              <Ionicons name="shield-checkmark" size={48} color={colors.primary} />
            </View>
            <Text style={styles.confirmTitle}>Ready to confirm?</Text>
            <Text style={styles.confirmSub}>
              We will assign a certified mechanic who will arrive at your scheduled time.
            </Text>

            <View style={styles.confirmPriceBanner}>
              <Text style={styles.confirmPriceLabel}>Estimated Payable</Text>
              <Text style={styles.confirmPriceValue}>{formatCurrency(estimatedAmount)}</Text>
              <Text style={styles.confirmPriceNote}>
                Inspection and final quote will be presented for your approval before work begins.
              </Text>
            </View>

            <PrimaryButton
              title="Confirm & Book Service"
              onPress={handleConfirmBooking}
              loading={submitting}
              style={{ width: '100%', marginBottom: 12 }}
            />

            <SecondaryButton
              title="Review Details Again"
              onPress={() => setStep(5)}
              style={{ width: '100%' }}
            />
          </View>
        )}
      </ScrollView>

      {/* Bottom Navigation Buttons for Steps 1 through 5 */}
      {step < 6 && (
        <View style={styles.bottomNav}>
          <SecondaryButton
            title={step === 1 ? 'Cancel' : 'Previous'}
            onPress={handleBack}
            style={styles.navBackBtn}
          />
          <PrimaryButton
            title={step === 5 ? 'Proceed to Confirm' : 'Continue'}
            onPress={handleNext}
            style={styles.navNextBtn}
          />
        </View>
      )}
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
    paddingBottom: 110,
  },
  stepSection: {
    marginBottom: 16,
  },
  stepTitle: {
    ...typography.h3,
    color: colors.text,
    marginBottom: 4,
  },
  stepSubtitle: {
    ...typography.subtext,
    color: colors.textSecondary,
    marginBottom: 16,
  },
  addNewCard: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    paddingVertical: 14,
    borderRadius: 14,
    backgroundColor: colors.surface,
    borderWidth: 1.5,
    borderColor: colors.border,
    borderStyle: 'dashed',
    marginTop: 4,
    marginBottom: 16,
  },
  addNewText: {
    ...typography.subtextBold,
    color: colors.primary,
  },
  pillToggle: {
    flexDirection: 'row',
    backgroundColor: '#F1F5F9',
    borderRadius: 12,
    padding: 4,
    marginBottom: 16,
  },
  pillBtn: {
    flex: 1,
    paddingVertical: 10,
    alignItems: 'center',
    borderRadius: 9,
  },
  pillBtnActive: {
    backgroundColor: colors.surface,
    shadowColor: '#0F172A',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.06,
    shadowRadius: 3,
    elevation: 1,
  },
  pillBtnText: {
    ...typography.subtextBold,
    color: colors.textSecondary,
  },
  pillBtnTextActive: {
    color: colors.primary,
  },
  selectedScheduleBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    backgroundColor: colors.primarySoft,
    padding: 14,
    borderRadius: 12,
    marginTop: 16,
  },
  selectedScheduleText: {
    ...typography.subtext,
    color: colors.primary,
  },
  summaryCard: {
    backgroundColor: colors.surface,
    borderRadius: 18,
    padding: 20,
    borderWidth: 1,
    borderColor: colors.borderLight,
    marginBottom: 16,
    shadowColor: '#0F172A',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.04,
    shadowRadius: 6,
    elevation: 2,
  },
  summarySection: {
    paddingVertical: 4,
  },
  summarySectionHeader: {
    ...typography.caption,
    fontWeight: '700',
    color: colors.primary,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    marginBottom: 4,
  },
  summaryItemTitle: {
    ...typography.bodyBold,
    color: colors.text,
  },
  summaryItemSub: {
    ...typography.subtext,
    color: colors.textSecondary,
    marginTop: 2,
  },
  summaryDivider: {
    height: 1,
    backgroundColor: colors.borderLight,
    marginVertical: 12,
  },
  confirmSection: {
    alignItems: 'center',
    paddingVertical: 20,
  },
  confirmIconCircle: {
    width: 90,
    height: 90,
    borderRadius: 45,
    backgroundColor: colors.primarySoft,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 16,
  },
  confirmTitle: {
    ...typography.h2,
    color: colors.text,
    marginBottom: 6,
  },
  confirmSub: {
    ...typography.body,
    color: colors.textSecondary,
    textAlign: 'center',
    lineHeight: 22,
    paddingHorizontal: 20,
    marginBottom: 20,
  },
  confirmPriceBanner: {
    backgroundColor: colors.surface,
    borderRadius: 16,
    padding: 20,
    width: '100%',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: colors.borderLight,
    marginBottom: 24,
  },
  confirmPriceLabel: {
    ...typography.caption,
    color: colors.textSecondary,
  },
  confirmPriceValue: {
    ...typography.h1,
    color: colors.primary,
    fontWeight: '800',
    marginVertical: 4,
  },
  confirmPriceNote: {
    ...typography.caption,
    color: colors.textMuted,
    textAlign: 'center',
    marginTop: 4,
  },
  bottomNav: {
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
    flexDirection: 'row',
    gap: 12,
  },
  navBackBtn: {
    flex: 1,
  },
  navNextBtn: {
    flex: 1.5,
  },
});

export default BookServiceScreen;
