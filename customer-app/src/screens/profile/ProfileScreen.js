import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Image,
  Alert,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { colors } from '../../theme/colors';
import { typography } from '../../theme/typography';
import { useAuth } from '../../hooks/useAuth';
import { formatPhone } from '../../utils/formatters';

export const ProfileScreen = ({ navigation }) => {
  const { user, logout } = useAuth();

  const fullName = `${user?.firstName || ''} ${user?.lastName || ''}`.trim() || 'Customer';
  const phone = user?.phone || '';
  const email = user?.email || 'No email added';

  const handleLogout = () => {
    Alert.alert(
      'Log Out',
      'Are you sure you want to log out of your AutoCare account?',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Log Out',
          style: 'destructive',
          onPress: async () => {
            await logout();
          },
        },
      ]
    );
  };

  const menuItems = [
    {
      icon: 'person-outline',
      label: 'Personal Information',
      onPress: () => navigation.navigate('EditProfile'),
    },
    {
      icon: 'car-outline',
      label: 'My Garage',
      onPress: () => navigation.navigate('GarageTab'),
    },
    {
      icon: 'location-outline',
      label: 'Saved Addresses',
      onPress: () => navigation.navigate('SavedAddresses'),
    },
    {
      icon: 'receipt-outline',
      label: 'My Invoices & Receipts',
      onPress: () => navigation.navigate('InvoicesList'),
    },
    {
      icon: 'notifications-outline',
      label: 'Notifications',
      onPress: () => navigation.navigate('Notifications'),
    },
    {
      icon: 'help-circle-outline',
      label: 'Help & 24/7 Support',
      onPress: () => {
        Alert.alert(
          'Customer Support',
          'Emergency Hotline: 1800-123-4567\nEmail: support@autocare.com\nOur dispatch team is available 24/7.',
          [{ text: 'Close' }]
        );
      },
    },
    {
      icon: 'shield-checkmark-outline',
      label: 'Privacy Policy',
      onPress: () => navigation.navigate('PrivacyPolicy'),
    },
    {
      icon: 'document-text-outline',
      label: 'Terms & Conditions',
      onPress: () => navigation.navigate('Terms'),
    },
  ];

  return (
    <View style={styles.container}>
      <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
        {/* Profile Header Block */}
        <View style={styles.headerBlock}>
          <View style={styles.avatarWrapper}>
            {user?.profileImage ? (
              <Image source={{ uri: user.profileImage }} style={styles.avatarImage} />
            ) : (
              <View style={styles.avatarFallback}>
                <Ionicons name="person" size={36} color={colors.primary} />
              </View>
            )}
            <TouchableOpacity
              style={styles.editAvatarBtn}
              onPress={() => navigation.navigate('EditProfile')}
            >
              <Ionicons name="pencil" size={14} color="#FFFFFF" />
            </TouchableOpacity>
          </View>

          <Text style={styles.name}>{fullName}</Text>
          <Text style={styles.phone}>{formatPhone(phone)}</Text>
          <Text style={styles.email}>{email}</Text>
        </View>

        {/* Menu Items List */}
        <View style={styles.menuSection}>
          {menuItems.map((item, index) => (
            <TouchableOpacity
              key={index}
              style={[
                styles.menuRow,
                index === menuItems.length - 1 && styles.menuRowLast,
              ]}
              onPress={item.onPress}
              activeOpacity={0.7}
            >
              <View style={styles.menuLeft}>
                <View style={styles.iconCircle}>
                  <Ionicons name={item.icon} size={20} color={colors.primary} />
                </View>
                <Text style={styles.menuLabel}>{item.label}</Text>
              </View>

              <Ionicons name="chevron-forward" size={18} color={colors.textSecondary} />
            </TouchableOpacity>
          ))}
        </View>

        {/* Logout Row */}
        <TouchableOpacity style={styles.logoutRow} onPress={handleLogout} activeOpacity={0.7}>
          <View style={styles.menuLeft}>
            <View style={[styles.iconCircle, { backgroundColor: colors.dangerSoft }]}>
              <Ionicons name="log-out-outline" size={20} color={colors.danger} />
            </View>
            <Text style={styles.logoutLabel}>Log Out</Text>
          </View>
        </TouchableOpacity>

        <Text style={styles.versionText}>AutoCare Customer v1.0.0 (Production Build)</Text>
      </ScrollView>
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
    paddingBottom: 40,
  },
  headerBlock: {
    alignItems: 'center',
    paddingVertical: 20,
    backgroundColor: colors.surface,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: colors.borderLight,
    marginBottom: 20,
    shadowColor: '#0F172A',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.04,
    shadowRadius: 6,
    elevation: 2,
  },
  avatarWrapper: {
    position: 'relative',
    marginBottom: 12,
  },
  avatarImage: {
    width: 80,
    height: 80,
    borderRadius: 40,
  },
  avatarFallback: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: colors.primarySoft,
    alignItems: 'center',
    justifyContent: 'center',
  },
  editAvatarBtn: {
    position: 'absolute',
    bottom: 0,
    right: 0,
    width: 26,
    height: 26,
    borderRadius: 13,
    backgroundColor: colors.primary,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 2,
    borderColor: '#FFFFFF',
  },
  name: {
    ...typography.h3,
    color: colors.text,
  },
  phone: {
    ...typography.subtextBold,
    color: colors.textSecondary,
    marginTop: 2,
  },
  email: {
    ...typography.caption,
    color: colors.textMuted,
    marginTop: 2,
  },
  menuSection: {
    backgroundColor: colors.surface,
    borderRadius: 18,
    borderWidth: 1,
    borderColor: colors.borderLight,
    overflow: 'hidden',
    marginBottom: 16,
  },
  menuRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 14,
    paddingHorizontal: 16,
    borderBottomWidth: 1,
    borderBottomColor: colors.borderLight,
  },
  menuRowLast: {
    borderBottomWidth: 0,
  },
  menuLeft: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  iconCircle: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: colors.primarySoft,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 14,
  },
  menuLabel: {
    ...typography.body,
    color: colors.text,
    fontWeight: '500',
  },
  logoutRow: {
    backgroundColor: colors.surface,
    borderRadius: 18,
    borderWidth: 1,
    borderColor: colors.borderLight,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 14,
    paddingHorizontal: 16,
    marginBottom: 24,
  },
  logoutLabel: {
    ...typography.bodyBold,
    color: colors.danger,
  },
  versionText: {
    ...typography.caption,
    color: colors.textMuted,
    textAlign: 'center',
  },
});

export default ProfileScreen;
