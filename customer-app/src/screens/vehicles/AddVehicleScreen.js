import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  KeyboardAvoidingView,
  Platform,
  Switch,
  Alert,
} from 'react-native';
import { colors } from '../../theme/colors';
import { typography } from '../../theme/typography';
import { VEHICLE_TYPES, FUEL_TYPES } from '../../constants/appConstants';
import { vehicleApi } from '../../api/vehicleApi';
import { InputField } from '../../components/forms/InputField';
import { SelectDropdown } from '../../components/forms/SelectDropdown';
import { PrimaryButton } from '../../components/buttons/PrimaryButton';

export const AddVehicleScreen = ({ route, navigation }) => {
  const { vehicleToEdit } = route.params || {};
  const isEditing = Boolean(vehicleToEdit);

  const [vehicleType, setVehicleType] = useState(vehicleToEdit?.vehicleType || 'FOUR_WHEELER');
  const [make, setMake] = useState(vehicleToEdit?.make || '');
  const [model, setModel] = useState(vehicleToEdit?.model || '');
  const [variant, setVariant] = useState(vehicleToEdit?.variant || '');
  const [registrationYear, setRegistrationYear] = useState(
    vehicleToEdit?.registrationYear ? String(vehicleToEdit.registrationYear) : String(new Date().getFullYear())
  );
  const [fuelType, setFuelType] = useState(vehicleToEdit?.fuelType || 'PETROL');
  const [registrationNumber, setRegistrationNumber] = useState(
    vehicleToEdit?.registrationNumber || ''
  );
  const [isDefault, setIsDefault] = useState(Boolean(vehicleToEdit?.isDefault));

  const [loading, setLoading] = useState(false);
  const [errors, setErrors] = useState({});

  const validateForm = () => {
    const newErrors = {};
    if (!make.trim()) newErrors.make = 'Make is required (e.g. Hyundai, Honda).';
    if (!model.trim()) newErrors.model = 'Model is required (e.g. Creta, City).';
    if (!registrationNumber.trim()) {
      newErrors.registrationNumber = 'Registration number is required.';
    } else {
      const clean = registrationNumber.replace(/[\s-]/g, '');
      if (clean.length < 4 || clean.length > 15) {
        newErrors.registrationNumber = 'Must be between 4 and 15 alphanumeric characters.';
      }
    }
    const yearNum = parseInt(registrationYear, 10);
    const maxYear = new Date().getFullYear() + 1;
    if (!registrationYear || isNaN(yearNum) || yearNum < 1980 || yearNum > maxYear) {
      newErrors.registrationYear = `Year must be between 1980 and ${maxYear}.`;
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSave = async () => {
    if (!validateForm()) return;

    setLoading(true);
    try {
      const payload = {
        vehicleType,
        make: make.trim(),
        model: model.trim(),
        variant: variant.trim() || undefined,
        registrationYear: parseInt(registrationYear, 10),
        fuelType,
        registrationNumber: registrationNumber.replace(/[\s-]/g, '').toUpperCase(),
      };

      if (isEditing) {
        const id = vehicleToEdit._id || vehicleToEdit.id;
        await vehicleApi.updateVehicle(id, payload);
        if (isDefault && !vehicleToEdit.isDefault) {
          await vehicleApi.setDefaultVehicle(id);
        }
        Alert.alert('Success', 'Vehicle updated successfully!');
      } else {
        const newVehicle = await vehicleApi.addVehicle(payload);
        if (isDefault && newVehicle?.data?._id) {
          await vehicleApi.setDefaultVehicle(newVehicle.data._id);
        }
        Alert.alert('Success', 'Vehicle added to garage!');
      }

      navigation.goBack();
    } catch (err) {
      const serverMsg = err.response?.data?.message || 'Failed to save vehicle.';
      Alert.alert('Error', serverMsg);
    } finally {
      setLoading(false);
    }
  };

  return (
    <KeyboardAvoidingView
      style={styles.container}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
    >
      <ScrollView
        contentContainerStyle={styles.scrollContent}
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}
      >
        <View style={styles.card}>
          <SelectDropdown
            label="Vehicle Type"
            value={vehicleType}
            options={VEHICLE_TYPES}
            onSelect={setVehicleType}
          />

          <InputField
            label="Brand / Make"
            value={make}
            onChangeText={(txt) => {
              setMake(txt);
              if (errors.make) setErrors((prev) => ({ ...prev, make: null }));
            }}
            placeholder="e.g. Hyundai, Tata, Honda"
            error={errors.make}
            autoCapitalize="words"
          />

          <InputField
            label="Model"
            value={model}
            onChangeText={(txt) => {
              setModel(txt);
              if (errors.model) setErrors((prev) => ({ ...prev, model: null }));
            }}
            placeholder="e.g. Creta, Nexon, City"
            error={errors.model}
            autoCapitalize="words"
          />

          <InputField
            label="Variant (Optional)"
            value={variant}
            onChangeText={setVariant}
            placeholder="e.g. SX(O), ZX, Fearless Plus"
            autoCapitalize="words"
          />

          <View style={styles.twoColumnRow}>
            <View style={{ flex: 1, marginRight: 8 }}>
              <InputField
                label="Registration Year"
                value={registrationYear}
                onChangeText={(txt) => {
                  setRegistrationYear(txt);
                  if (errors.registrationYear) {
                    setErrors((prev) => ({ ...prev, registrationYear: null }));
                  }
                }}
                placeholder="YYYY"
                keyboardType="numeric"
                maxLength={4}
                error={errors.registrationYear}
              />
            </View>

            <View style={{ flex: 1, marginLeft: 8 }}>
              <SelectDropdown
                label="Fuel Type"
                value={fuelType}
                options={FUEL_TYPES}
                onSelect={setFuelType}
              />
            </View>
          </View>

          <InputField
            label="Registration Number"
            value={registrationNumber}
            onChangeText={(txt) => {
              setRegistrationNumber(txt);
              if (errors.registrationNumber) {
                setErrors((prev) => ({ ...prev, registrationNumber: null }));
              }
            }}
            placeholder="e.g. MP07AB1234 / DL01AB9999"
            autoCapitalize="characters"
            error={errors.registrationNumber}
          />

          {/* Set as Default toggle */}
          <View style={styles.toggleRow}>
            <View style={styles.toggleTextGroup}>
              <Text style={styles.toggleLabel}>Set as Default Vehicle</Text>
              <Text style={styles.toggleSub}>
                Automatically selected for new service and emergency bookings
              </Text>
            </View>
            <Switch
              value={isDefault}
              onValueChange={setIsDefault}
              trackColor={{ false: '#E2E8F0', true: colors.accentLight }}
              thumbColor={isDefault ? colors.primary : '#FFFFFF'}
            />
          </View>

          <PrimaryButton
            title={isEditing ? 'Save Changes' : 'Add Vehicle'}
            onPress={handleSave}
            loading={loading}
            style={styles.submitBtn}
          />
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },
  scrollContent: {
    padding: 16,
    paddingBottom: 40,
  },
  card: {
    backgroundColor: colors.surface,
    borderRadius: 20,
    padding: 20,
    borderWidth: 1,
    borderColor: colors.borderLight,
    shadowColor: '#0F172A',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.04,
    shadowRadius: 6,
    elevation: 2,
  },
  twoColumnRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
  },
  toggleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 14,
    borderTopWidth: 1,
    borderTopColor: colors.borderLight,
    marginTop: 4,
    marginBottom: 16,
  },
  toggleTextGroup: {
    flex: 1,
    paddingRight: 16,
  },
  toggleLabel: {
    ...typography.subtextBold,
    color: colors.text,
  },
  toggleSub: {
    ...typography.caption,
    color: colors.textSecondary,
    marginTop: 2,
  },
  submitBtn: {
    marginTop: 8,
  },
});

export default AddVehicleScreen;
