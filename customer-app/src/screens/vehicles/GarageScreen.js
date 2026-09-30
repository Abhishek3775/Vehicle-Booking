import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  Alert,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { colors } from '../../theme/colors';
import { typography } from '../../theme/typography';
import { vehicleApi } from '../../api/vehicleApi';
import { VehicleCard } from '../../components/cards/VehicleCard';
import { EmptyState } from '../../components/common/EmptyState';
import { LoadingSkeleton } from '../../components/common/LoadingSkeleton';

export const GarageScreen = ({ navigation }) => {
  const [vehicles, setVehicles] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const fetchVehicles = useCallback(async () => {
    try {
      const res = await vehicleApi.getVehicles();
      setVehicles(res?.data || []);
    } catch (err) {
      console.warn('Failed to load vehicles:', err);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => {
    const unsubscribe = navigation.addListener('focus', () => {
      fetchVehicles();
    });
    return unsubscribe;
  }, [navigation, fetchVehicles]);

  const onRefresh = () => {
    setRefreshing(true);
    fetchVehicles();
  };

  const handleSetDefault = async (vehicle) => {
    const id = vehicle._id || vehicle.id;
    try {
      await vehicleApi.setDefaultVehicle(id);
      fetchVehicles();
    } catch (err) {
      Alert.alert('Error', err.response?.data?.message || 'Failed to set default vehicle.');
    }
  };

  return (
    <View style={styles.container}>
      {loading ? (
        <LoadingSkeleton count={3} />
      ) : (
        <FlatList
          data={vehicles}
          keyExtractor={(item) => item._id || item.id}
          renderItem={({ item }) => (
            <VehicleCard
              vehicle={item}
              onPress={() =>
                navigation.navigate('VehicleDetail', {
                  vehicleId: item._id || item.id,
                })
              }
              onEdit={() =>
                navigation.navigate('AddVehicle', {
                  vehicleToEdit: item,
                })
              }
              onSetDefault={() => handleSetDefault(item)}
            />
          )}
          contentContainerStyle={styles.listContent}
          showsVerticalScrollIndicator={false}
          refreshing={refreshing}
          onRefresh={onRefresh}
          ListEmptyComponent={
            <EmptyState
              icon="car-outline"
              title="No vehicles in your garage"
              description="Add your vehicle to easily schedule services, track repair history, and request roadside breakdown recovery."
              buttonTitle="+ Add Vehicle"
              onButtonPress={() => navigation.navigate('AddVehicle')}
            />
          }
        />
      )}

      {/* Floating Add Vehicle Button when list has items */}
      {vehicles.length > 0 && (
        <View style={styles.fabWrapper}>
          <TouchableOpacity
            style={styles.fab}
            onPress={() => navigation.navigate('AddVehicle')}
            activeOpacity={0.85}
          >
            <Ionicons name="add" size={24} color="#FFFFFF" />
            <Text style={styles.fabText}>Add Vehicle</Text>
          </TouchableOpacity>
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
  listContent: {
    padding: 16,
    paddingBottom: 90,
  },
  fabWrapper: {
    position: 'absolute',
    bottom: 24,
    left: 20,
    right: 20,
    alignItems: 'center',
  },
  fab: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    backgroundColor: colors.primary,
    paddingVertical: 14,
    paddingHorizontal: 28,
    borderRadius: 30,
    width: '100%',
    shadowColor: colors.primary,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.2,
    shadowRadius: 10,
    elevation: 4,
  },
  fabText: {
    ...typography.button,
    color: '#FFFFFF',
    fontWeight: '700',
  },
});

export default GarageScreen;
