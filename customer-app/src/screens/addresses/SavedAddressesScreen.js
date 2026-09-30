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
import { addressApi } from '../../api/addressApi';
import { AddressCard } from '../../components/cards/AddressCard';
import { EmptyState } from '../../components/common/EmptyState';
import { LoadingSkeleton } from '../../components/common/LoadingSkeleton';

export const SavedAddressesScreen = ({ navigation }) => {
  const [addresses, setAddresses] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const fetchAddresses = useCallback(async () => {
    try {
      const res = await addressApi.getAddresses();
      setAddresses(res?.data || []);
    } catch (err) {
      console.warn('Failed to fetch addresses:', err);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => {
    const unsubscribe = navigation.addListener('focus', () => {
      fetchAddresses();
    });
    return unsubscribe;
  }, [navigation, fetchAddresses]);

  const onRefresh = () => {
    setRefreshing(true);
    fetchAddresses();
  };

  const handleSetDefault = async (address) => {
    const id = address._id || address.id;
    try {
      await addressApi.setDefaultAddress(id);
      fetchAddresses();
    } catch (err) {
      Alert.alert('Error', err.response?.data?.message || 'Failed to update default address.');
    }
  };

  const handleDelete = (address) => {
    const id = address._id || address.id;
    Alert.alert(
      'Delete Address',
      `Are you sure you want to delete "${address.label || 'this address'}"?`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: async () => {
            try {
              await addressApi.deleteAddress(id);
              fetchAddresses();
            } catch (err) {
              Alert.alert('Error', err.response?.data?.message || 'Failed to delete address.');
            }
          },
        },
      ]
    );
  };

  return (
    <View style={styles.container}>
      {loading ? (
        <LoadingSkeleton count={3} />
      ) : (
        <FlatList
          data={addresses}
          keyExtractor={(item) => item._id || item.id}
          renderItem={({ item }) => (
            <AddressCard
              address={item}
              onEdit={() =>
                navigation.navigate('AddAddress', {
                  addressToEdit: item,
                })
              }
              onDelete={() => handleDelete(item)}
              onSetDefault={() => handleSetDefault(item)}
            />
          )}
          contentContainerStyle={styles.listContent}
          showsVerticalScrollIndicator={false}
          refreshing={refreshing}
          onRefresh={onRefresh}
          ListEmptyComponent={
            <EmptyState
              icon="location-outline"
              title="No saved addresses"
              description="Save your home, office, or workplace address to ensure quick vehicle pick-up and mechanic dispatch."
              buttonTitle="+ Add Address"
              onButtonPress={() => navigation.navigate('AddAddress')}
            />
          }
        />
      )}

      {/* Floating Add Address Button */}
      {addresses.length > 0 && (
        <View style={styles.fabWrapper}>
          <TouchableOpacity
            style={styles.fab}
            onPress={() => navigation.navigate('AddAddress')}
            activeOpacity={0.85}
          >
            <Ionicons name="add" size={24} color="#FFFFFF" />
            <Text style={styles.fabText}>Add New Address</Text>
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

export default SavedAddressesScreen;
