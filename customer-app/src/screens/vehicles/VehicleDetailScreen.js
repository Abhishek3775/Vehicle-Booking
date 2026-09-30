import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  Alert,
  ActivityIndicator,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { colors } from '../../theme/colors';
import { typography } from '../../theme/typography';
import { vehicleApi } from '../../api/vehicleApi';
import { formatRegistrationNumber } from '../../utils/formatters';
import { Badge } from '../../components/common/Badge';
import { PrimaryButton } from '../../components/buttons/PrimaryButton';
import { SecondaryButton } from '../../components/buttons/SecondaryButton';

export const VehicleDetailScreen = ({ route, navigation }) => {
  const { vehicleId } = route.params || {};
  const [vehicle, setVehicle] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchVehicle = async () => {
      try {
        const res = await vehicleApi.getVehicleById(vehicleId);
        setVehicle(res?.data || null);
      } catch (err) {
        console.warn('Failed to fetch vehicle:', err);
      } finally {
        setLoading(false);
      }
    };

    if (vehicleId) {
      fetchVehicle();
    }
  }, [vehicleId]);

  const handleSetDefault = async () => {
    try {
      await vehicleApi.setDefaultVehicle(vehicleId);
      setVehicle((prev) => ({ ...prev, isDefault: true }));
      Alert.alert('Updated', 'Vehicle set as your default vehicle.');
    } catch (err) {
      Alert.alert('Error', err.response?.data?.message || 'Failed to update default vehicle.');
    }
  };

  const handleDelete = () => {
    Alert.alert(
      'Remove Vehicle',
      'Are you sure you want to remove this vehicle from your garage?',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Remove',
          style: 'destructive',
          onPress: async () => {
            try {
              await vehicleApi.deleteVehicle(vehicleId);
              Alert.alert('Removed', 'Vehicle removed from your garage.');
              navigation.goBack();
            } catch (err) {
              Alert.alert('Error', err.response?.data?.message || 'Failed to remove vehicle.');
            }
          },
        },
      ]
    );
  };

  if (loading) {
    return (
      <View style={styles.centerContainer}>
        <ActivityIndicator size="large" color={colors.primary} />
      </View>
    );
  }

  if (!vehicle) {
    return (
      <View style={styles.centerContainer}>
        <Text style={styles.errorText}>Vehicle not found.</Text>
      </View>
    );
  }

  const isTwoWheeler = vehicle.vehicleType === 'TWO_WHEELER';

  return (
    <View style={styles.container}>
      <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
        {/* Header Hero Card */}
        <View style={styles.heroCard}>
          <View style={styles.iconCircle}>
            <Ionicons
              name={isTwoWheeler ? 'bicycle' : 'car-sport'}
              size={36}
              color={colors.primary}
            />
          </View>

          <Text style={styles.heroTitle}>
            {vehicle.make} {vehicle.model}
          </Text>

          {vehicle.variant ? (
            <Text style={styles.heroVariant}>{vehicle.variant}</Text>
          ) : null}

          <View style={styles.heroBadgeRow}>
            {vehicle.isDefault && (
              <Badge label="Default Vehicle" variant="primary" size="sm" />
            )}
            <View style={styles.plateBadge}>
              <Text style={styles.plateText}>
                {formatRegistrationNumber(vehicle.registrationNumber)}
              </Text>
            </View>
          </View>
        </View>

        {/* Specifications Grid */}
        <View style={styles.specsCard}>
          <Text style={styles.specsTitle}>Vehicle Specifications</Text>

          <View style={styles.specRow}>
            <Text style={styles.specLabel}>Vehicle Category</Text>
            <Text style={styles.specValue}>
              {isTwoWheeler ? '2-Wheeler (Motorcycle/Scooter)' : '4-Wheeler (Passenger Car)'}
            </Text>
          </View>

          <View style={styles.divider} />

          <View style={styles.specRow}>
            <Text style={styles.specLabel}>Registration Year</Text>
            <Text style={styles.specValue}>{vehicle.registrationYear}</Text>
          </View>

          <View style={styles.divider} />

          <View style={styles.specRow}>
            <Text style={styles.specLabel}>Fuel Type</Text>
            <Text style={styles.specValue}>{vehicle.fuelType}</Text>
          </View>

          {vehicle.transmission ? (
            <>
              <View style={styles.divider} />
              <View style={styles.specRow}>
                <Text style={styles.specLabel}>Transmission</Text>
                <Text style={styles.specValue}>{vehicle.transmission}</Text>
              </View>
            </>
          ) : null}

          {vehicle.color ? (
            <>
              <View style={styles.divider} />
              <View style={styles.specRow}>
                <Text style={styles.specLabel}>Exterior Color</Text>
                <Text style={styles.specValue}>{vehicle.color}</Text>
              </View>
            </>
          ) : null}

          {vehicle.odometerReading ? (
            <>
              <View style={styles.divider} />
              <View style={styles.specRow}>
                <Text style={styles.specLabel}>Odometer</Text>
                <Text style={styles.specValue}>{vehicle.odometerReading.toLocaleString()} km</Text>
              </View>
            </>
          ) : null}
        </View>

        {/* Action Buttons */}
        <View style={styles.actionContainer}>
          {!vehicle.isDefault && (
            <SecondaryButton
              title="Set as Default Vehicle"
              onPress={handleSetDefault}
              variant="soft"
              style={{ marginBottom: 12 }}
            />
          )}

          <PrimaryButton
            title="Edit Vehicle Details"
            onPress={() =>
              navigation.navigate('AddVehicle', {
                vehicleToEdit: vehicle,
              })
            }
            style={{ marginBottom: 12 }}
          />

          <SecondaryButton
            title="Delete Vehicle"
            onPress={handleDelete}
            variant="outlined"
            textStyle={{ color: colors.danger }}
            style={{ borderColor: colors.dangerBorder }}
          />
        </View>
      </ScrollView>
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
  scrollContent: {
    padding: 20,
    paddingBottom: 40,
  },
  heroCard: {
    backgroundColor: colors.surface,
    borderRadius: 20,
    padding: 24,
    alignItems: 'center',
    marginBottom: 16,
    borderWidth: 1,
    borderColor: colors.borderLight,
    shadowColor: '#0F172A',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.04,
    shadowRadius: 6,
    elevation: 2,
  },
  iconCircle: {
    width: 68,
    height: 68,
    borderRadius: 34,
    backgroundColor: colors.primarySoft,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 14,
  },
  heroTitle: {
    ...typography.h2,
    color: colors.text,
    textAlign: 'center',
  },
  heroVariant: {
    ...typography.subtext,
    color: colors.textSecondary,
    marginTop: 2,
    marginBottom: 8,
  },
  heroBadgeRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginTop: 6,
  },
  plateBadge: {
    backgroundColor: '#F1F5F9',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 6,
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  plateText: {
    ...typography.caption,
    fontWeight: '700',
    color: colors.text,
    letterSpacing: 0.5,
  },
  specsCard: {
    backgroundColor: colors.surface,
    borderRadius: 18,
    padding: 20,
    marginBottom: 20,
    borderWidth: 1,
    borderColor: colors.borderLight,
  },
  specsTitle: {
    ...typography.h4,
    color: colors.text,
    marginBottom: 14,
  },
  specRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 6,
  },
  specLabel: {
    ...typography.subtext,
    color: colors.textSecondary,
  },
  specValue: {
    ...typography.subtextBold,
    color: colors.text,
  },
  divider: {
    height: 1,
    backgroundColor: colors.borderLight,
    marginVertical: 6,
  },
  actionContainer: {
    marginTop: 8,
  },
  errorText: {
    ...typography.body,
    color: colors.danger,
  },
});

export default VehicleDetailScreen;
