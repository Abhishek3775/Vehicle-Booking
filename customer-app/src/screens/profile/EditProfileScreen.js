import React, { useState } from 'react';
import {
  View,
  StyleSheet,
  ScrollView,
  KeyboardAvoidingView,
  Platform,
  Alert,
} from 'react-native';
import { colors } from '../../theme/colors';
import { userApi } from '../../api/userApi';
import { useAuth } from '../../hooks/useAuth';
import { InputField } from '../../components/forms/InputField';
import { SelectDropdown } from '../../components/forms/SelectDropdown';
import { PrimaryButton } from '../../components/buttons/PrimaryButton';

const GENDER_OPTIONS = [
  { label: 'Male', value: 'male' },
  { label: 'Female', value: 'female' },
  { label: 'Other', value: 'other' },
  { label: 'Prefer not to say', value: 'prefer_not_to_say' },
];

export const EditProfileScreen = ({ navigation }) => {
  const { user, refreshProfile } = useAuth();

  const [firstName, setFirstName] = useState(user?.firstName || '');
  const [lastName, setLastName] = useState(user?.lastName || '');
  const [email, setEmail] = useState(user?.email || '');
  const [gender, setGender] = useState(user?.gender || 'prefer_not_to_say');
  const [profileImage, setProfileImage] = useState(user?.profileImage || '');
  const [loading, setLoading] = useState(false);
  const [errors, setErrors] = useState({});

  const validate = () => {
    const errs = {};
    if (!firstName.trim()) errs.firstName = 'First name is required.';
    if (email.trim() && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim())) {
      errs.email = 'Please enter a valid email address.';
    }
    setErrors(errs);
    return Object.keys(errs).length === 0;
  };

  const handleSave = async () => {
    if (!validate()) return;

    setLoading(true);
    try {
      await userApi.updateProfile({
        firstName: firstName.trim(),
        lastName: lastName.trim() || undefined,
        email: email.trim() || undefined,
        gender,
      });

      if (profileImage.trim() && profileImage !== user?.profileImage) {
        await userApi.updateProfileImage(profileImage.trim());
      }

      await refreshProfile();
      Alert.alert('Profile Updated', 'Your profile details have been updated successfully.');
      navigation.goBack();
    } catch (err) {
      const msg = err.response?.data?.message || 'Failed to update profile.';
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
      <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
        <View style={styles.card}>
          <InputField
            label="First Name"
            value={firstName}
            onChangeText={(txt) => {
              setFirstName(txt);
              if (errors.firstName) setErrors((prev) => ({ ...prev, firstName: null }));
            }}
            placeholder="e.g. Abhishek"
            error={errors.firstName}
            autoCapitalize="words"
          />

          <InputField
            label="Last Name"
            value={lastName}
            onChangeText={setLastName}
            placeholder="e.g. Sharma"
            autoCapitalize="words"
          />

          <InputField
            label="Email Address"
            value={email}
            onChangeText={(txt) => {
              setEmail(txt);
              if (errors.email) setErrors((prev) => ({ ...prev, email: null }));
            }}
            placeholder="name@example.com"
            keyboardType="email-address"
            autoCapitalize="none"
            error={errors.email}
          />

          <SelectDropdown
            label="Gender"
            value={gender}
            options={GENDER_OPTIONS}
            onSelect={setGender}
          />

          <InputField
            label="Profile Avatar URL (Optional)"
            value={profileImage}
            onChangeText={setProfileImage}
            placeholder="https://example.com/avatar.jpg"
            autoCapitalize="none"
          />

          <PrimaryButton
            title="Save Profile"
            onPress={handleSave}
            loading={loading}
            style={styles.saveBtn}
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
  saveBtn: {
    marginTop: 10,
  },
});

export default EditProfileScreen;
