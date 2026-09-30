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
import { ADDRESS_LABELS } from '../../constants/appConstants';
import { addressApi } from '../../api/addressApi';
import { InputField } from '../../components/forms/InputField';
import { SelectDropdown } from '../../components/forms/SelectDropdown';
import { PrimaryButton } from '../../components/buttons/PrimaryButton';
import { useAuth } from '../../hooks/useAuth';

export const AddAddressScreen = ({ route, navigation }) => {
  const { addressToEdit } = route.params || {};
  const isEditing = Boolean(addressToEdit);
  const { user } = useAuth();

  const [label, setLabel] = useState(addressToEdit?.label || 'HOME');
  const [fullName, setFullName] = useState(
    addressToEdit?.fullName || `${user?.firstName || ''} ${user?.lastName || ''}`.trim()
  );
  const [phone, setPhone] = useState(addressToEdit?.phone || user?.phone || '');
  const [addressLine1, setAddressLine1] = useState(addressToEdit?.addressLine1 || '');
  const [addressLine2, setAddressLine2] = useState(addressToEdit?.addressLine2 || '');
  const [landmark, setLandmark] = useState(addressToEdit?.landmark || '');
  const [city, setCity] = useState(addressToEdit?.city || '');
  const [state, setState] = useState(addressToEdit?.state || '');
  const [postalCode, setPostalCode] = useState(addressToEdit?.postalCode || '');
  const [isDefault, setIsDefault] = useState(Boolean(addressToEdit?.isDefault));

  const [loading, setLoading] = useState(false);
  const [errors, setErrors] = useState({});

  const validate = () => {
    const errs = {};
    if (!fullName.trim()) errs.fullName = 'Full name is required.';
    if (!phone.trim() || phone.replace(/\D/g, '').length < 10) {
      errs.phone = 'Valid 10-digit phone number is required.';
    }
    if (!addressLine1.trim()) errs.addressLine1 = 'House/flat number and street is required.';
    if (!city.trim()) errs.city = 'City is required.';
    if (!state.trim()) errs.state = 'State is required.';
    if (!postalCode.trim() || postalCode.length < 4) {
      errs.postalCode = 'Valid postal / pin code is required.';
    }

    setErrors(errs);
    return Object.keys(errs).length === 0;
  };

  const handleSave = async () => {
    if (!validate()) return;

    setLoading(true);
    try {
      const payload = {
        label,
        fullName: fullName.trim(),
        phone: phone.replace(/\D/g, '').trim(),
        addressLine1: addressLine1.trim(),
        addressLine2: addressLine2.trim() || undefined,
        landmark: landmark.trim() || undefined,
        city: city.trim(),
        state: state.trim(),
        postalCode: postalCode.trim(),
      };

      if (isEditing) {
        const id = addressToEdit._id || addressToEdit.id;
        await addressApi.updateAddress(id, payload);
        if (isDefault && !addressToEdit.isDefault) {
          await addressApi.setDefaultAddress(id);
        }
        Alert.alert('Success', 'Address updated successfully!');
      } else {
        const res = await addressApi.addAddress(payload);
        if (isDefault && res?.data?._id) {
          await addressApi.setDefaultAddress(res.data._id);
        }
        Alert.alert('Success', 'Address saved to your profile!');
      }

      navigation.goBack();
    } catch (err) {
      const msg = err.response?.data?.message || 'Failed to save address.';
      Alert.alert('Error', msg);
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
            label="Address Label"
            value={label}
            options={ADDRESS_LABELS}
            onSelect={setLabel}
          />

          <InputField
            label="Contact Person Name"
            value={fullName}
            onChangeText={(txt) => {
              setFullName(txt);
              if (errors.fullName) setErrors((prev) => ({ ...prev, fullName: null }));
            }}
            placeholder="Recipient / Customer name"
            error={errors.fullName}
            autoCapitalize="words"
          />

          <InputField
            label="Contact Phone Number"
            value={phone}
            onChangeText={(txt) => {
              setPhone(txt);
              if (errors.phone) setErrors((prev) => ({ ...prev, phone: null }));
            }}
            placeholder="10-digit phone number"
            keyboardType="phone-pad"
            maxLength={15}
            error={errors.phone}
          />

          <InputField
            label="Address Line 1"
            value={addressLine1}
            onChangeText={(txt) => {
              setAddressLine1(txt);
              if (errors.addressLine1) setErrors((prev) => ({ ...prev, addressLine1: null }));
            }}
            placeholder="Flat / House No., Building Name, Street"
            error={errors.addressLine1}
          />

          <InputField
            label="Address Line 2 (Optional)"
            value={addressLine2}
            onChangeText={setAddressLine2}
            placeholder="Area, Locality, Sector"
          />

          <InputField
            label="Landmark (Optional)"
            value={landmark}
            onChangeText={setLandmark}
            placeholder="Near prominent hospital, school or mall"
          />

          <View style={styles.twoColRow}>
            <View style={{ flex: 1, marginRight: 8 }}>
              <InputField
                label="City"
                value={city}
                onChangeText={(txt) => {
                  setCity(txt);
                  if (errors.city) setErrors((prev) => ({ ...prev, city: null }));
                }}
                placeholder="e.g. Gwalior"
                error={errors.city}
              />
            </View>

            <View style={{ flex: 1, marginLeft: 8 }}>
              <InputField
                label="State"
                value={state}
                onChangeText={(txt) => {
                  setState(txt);
                  if (errors.state) setErrors((prev) => ({ ...prev, state: null }));
                }}
                placeholder="e.g. MP"
                error={errors.state}
              />
            </View>
          </View>

          <InputField
            label="Postal / PIN Code"
            value={postalCode}
            onChangeText={(txt) => {
              setPostalCode(txt);
              if (errors.postalCode) setErrors((prev) => ({ ...prev, postalCode: null }));
            }}
            placeholder="e.g. 474001"
            keyboardType="number-pad"
            maxLength={10}
            error={errors.postalCode}
          />

          {/* Set as Default toggle */}
          <View style={styles.toggleRow}>
            <View style={styles.toggleTextGroup}>
              <Text style={styles.toggleLabel}>Set as Default Address</Text>
              <Text style={styles.toggleSub}>
                Pre-selected for service bookings and mechanic dispatch
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
            title={isEditing ? 'Update Address' : 'Save Address'}
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
  twoColRow: {
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

export default AddAddressScreen;
