import React from 'react';
import { View, ActivityIndicator, StyleSheet } from 'react-native';
import { NavigationContainer } from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { colors } from '../theme/colors';
import { useAuth } from '../hooks/useAuth';
import { AuthNavigator } from './AuthNavigator';
import { CustomerNavigator } from './CustomerNavigator';

// Stack detail screens
import { ServiceDetailScreen } from '../screens/services/ServiceDetailScreen';
import { PackageDetailScreen } from '../screens/services/PackageDetailScreen';
import { AddVehicleScreen } from '../screens/vehicles/AddVehicleScreen';
import { VehicleDetailScreen } from '../screens/vehicles/VehicleDetailScreen';
import { SavedAddressesScreen } from '../screens/addresses/SavedAddressesScreen';
import { AddAddressScreen } from '../screens/addresses/AddAddressScreen';
import { BookServiceScreen } from '../screens/bookings/BookServiceScreen';
import { EmergencyAssistanceScreen } from '../screens/emergency/EmergencyAssistanceScreen';
import { MechanicTrackingScreen } from '../screens/tracking/MechanicTrackingScreen';
import { BookingDetailScreen } from '../screens/bookings/BookingDetailScreen';
import { InspectionReportScreen } from '../screens/inspection/InspectionReportScreen';
import { QuotationDetailScreen } from '../screens/quotation/QuotationDetailScreen';
import { PaymentScreen } from '../screens/payments/PaymentScreen';
import { PaymentSuccessScreen } from '../screens/payments/PaymentSuccessScreen';
import { InvoicesListScreen } from '../screens/invoices/InvoicesListScreen';
import { InvoiceDetailScreen } from '../screens/invoices/InvoiceDetailScreen';
import { NotificationsScreen } from '../screens/notifications/NotificationsScreen';
import { EditProfileScreen } from '../screens/profile/EditProfileScreen';
import { PrivacyPolicyScreen } from '../screens/profile/PrivacyPolicyScreen';
import { TermsScreen } from '../screens/profile/TermsScreen';

const Stack = createNativeStackNavigator();

export const RootNavigator = () => {
  const { isAuthenticated, isLoading } = useAuth();

  if (isLoading) {
    return (
      <View style={styles.splashContainer}>
        <ActivityIndicator size="large" color={colors.primary} />
      </View>
    );
  }

  return (
    <NavigationContainer>
      <Stack.Navigator
        screenOptions={{
          headerStyle: {
            backgroundColor: colors.surface,
          },
          headerTintColor: colors.text,
          headerTitleStyle: {
            fontWeight: '700',
            fontSize: 18,
          },
          headerShadowVisible: false,
          contentStyle: {
            backgroundColor: colors.background,
          },
        }}
      >
        {!isAuthenticated ? (
          <Stack.Screen
            name="AuthFlow"
            component={AuthNavigator}
            options={{ headerShown: false }}
          />
        ) : (
          <>
            <Stack.Screen
              name="MainTabs"
              component={CustomerNavigator}
              options={{ headerShown: false }}
            />
            <Stack.Screen
              name="ServiceDetail"
              component={ServiceDetailScreen}
              options={{ title: 'Service Details' }}
            />
            <Stack.Screen
              name="PackageDetail"
              component={PackageDetailScreen}
              options={{ title: 'Package Details' }}
            />
            <Stack.Screen
              name="AddVehicle"
              component={AddVehicleScreen}
              options={({ route }) => ({
                title: route.params?.vehicleToEdit ? 'Edit Vehicle' : 'Add Vehicle',
              })}
            />
            <Stack.Screen
              name="VehicleDetail"
              component={VehicleDetailScreen}
              options={{ title: 'Vehicle Information' }}
            />
            <Stack.Screen
              name="SavedAddresses"
              component={SavedAddressesScreen}
              options={{ title: 'Saved Addresses' }}
            />
            <Stack.Screen
              name="AddAddress"
              component={AddAddressScreen}
              options={({ route }) => ({
                title: route.params?.addressToEdit ? 'Edit Address' : 'Add Address',
              })}
            />
            <Stack.Screen
              name="BookService"
              component={BookServiceScreen}
              options={{ title: 'Book Service' }}
            />
            <Stack.Screen
              name="EmergencyAssistance"
              component={EmergencyAssistanceScreen}
              options={{ title: 'Emergency Breakdown Help' }}
            />
            <Stack.Screen
              name="MechanicTracking"
              component={MechanicTrackingScreen}
              options={{ headerShown: false }}
            />
            <Stack.Screen
              name="BookingDetail"
              component={BookingDetailScreen}
              options={{ title: 'Booking Status' }}
            />
            <Stack.Screen
              name="InspectionReport"
              component={InspectionReportScreen}
              options={{ title: 'Vehicle Inspection' }}
            />
            <Stack.Screen
              name="QuotationDetail"
              component={QuotationDetailScreen}
              options={{ title: 'Quotation' }}
            />
            <Stack.Screen
              name="Payment"
              component={PaymentScreen}
              options={{ title: 'Complete Payment' }}
            />
            <Stack.Screen
              name="PaymentSuccess"
              component={PaymentSuccessScreen}
              options={{ headerShown: false }}
            />
            <Stack.Screen
              name="InvoicesList"
              component={InvoicesListScreen}
              options={{ title: 'My Invoices' }}
            />
            <Stack.Screen
              name="InvoiceDetail"
              component={InvoiceDetailScreen}
              options={{ title: 'Tax Invoice' }}
            />
            <Stack.Screen
              name="Notifications"
              component={NotificationsScreen}
              options={{ title: 'Notifications' }}
            />
            <Stack.Screen
              name="EditProfile"
              component={EditProfileScreen}
              options={{ title: 'Edit Profile' }}
            />
            <Stack.Screen
              name="PrivacyPolicy"
              component={PrivacyPolicyScreen}
              options={{ title: 'Privacy Policy' }}
            />
            <Stack.Screen
              name="Terms"
              component={TermsScreen}
              options={{ title: 'Terms & Conditions' }}
            />
          </>
        )}
      </Stack.Navigator>
    </NavigationContainer>
  );
};

const styles = StyleSheet.create({
  splashContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.background,
  },
});

export default RootNavigator;
