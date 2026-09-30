import React from 'react';
import {
  View,
  Text,
  Modal,
  TouchableOpacity,
  FlatList,
  StyleSheet,
  SafeAreaView,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { colors } from '../../theme/colors';
import { typography } from '../../theme/typography';
import { VehicleCard } from '../cards/VehicleCard';

export const VehiclePickerSheet = ({
  visible,
  onClose,
  vehicles = [],
  selectedVehicleId,
  onSelectVehicle,
  onAddNew,
}) => {
  return (
    <Modal
      visible={visible}
      transparent={true}
      animationType="slide"
      onRequestClose={onClose}
    >
      <TouchableOpacity
        style={styles.overlay}
        activeOpacity={1}
        onPress={onClose}
      >
        <SafeAreaView style={styles.sheetContainer}>
          <TouchableOpacity
            activeOpacity={1}
            style={styles.sheet}
            onPress={(e) => e.stopPropagation()}
          >
            <View style={styles.handle} />

            <View style={styles.header}>
              <Text style={styles.title}>Select Vehicle</Text>
              <TouchableOpacity onPress={onClose}>
                <Ionicons name="close" size={22} color={colors.textSecondary} />
              </TouchableOpacity>
            </View>

            <FlatList
              data={vehicles}
              keyExtractor={(item) => item._id || item.id}
              showsVerticalScrollIndicator={false}
              style={styles.list}
              renderItem={({ item }) => {
                const id = item._id || item.id;
                const isSelected = id === selectedVehicleId;
                return (
                  <VehicleCard
                    vehicle={item}
                    selectable={true}
                    selected={isSelected}
                    onPress={() => {
                      onSelectVehicle(item);
                      onClose();
                    }}
                  />
                );
              }}
              ListEmptyComponent={
                <View style={styles.emptyContainer}>
                  <Text style={styles.emptyText}>No vehicles in garage</Text>
                </View>
              }
              ListFooterComponent={
                onAddNew ? (
                  <TouchableOpacity
                    style={styles.addNewBtn}
                    onPress={() => {
                      onClose();
                      onAddNew();
                    }}
                    activeOpacity={0.8}
                  >
                    <Ionicons name="add-circle-outline" size={20} color={colors.primary} />
                    <Text style={styles.addNewText}>Add New Vehicle</Text>
                  </TouchableOpacity>
                ) : null
              }
            />
          </TouchableOpacity>
        </SafeAreaView>
      </TouchableOpacity>
    </Modal>
  );
};

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(15, 23, 42, 0.45)',
    justifyContent: 'flex-end',
  },
  sheetContainer: {
    backgroundColor: colors.surface,
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    maxHeight: '75%',
  },
  sheet: {
    paddingHorizontal: 20,
    paddingBottom: 24,
  },
  handle: {
    width: 36,
    height: 4,
    borderRadius: 2,
    backgroundColor: '#CBD5E1',
    alignSelf: 'center',
    marginTop: 10,
    marginBottom: 12,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 10,
    borderBottomWidth: 1,
    borderBottomColor: colors.borderLight,
    marginBottom: 14,
  },
  title: {
    ...typography.h3,
    color: colors.text,
  },
  list: {
    maxHeight: 400,
  },
  addNewBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    paddingVertical: 14,
    borderWidth: 1.5,
    borderColor: colors.border,
    borderStyle: 'dashed',
    borderRadius: 14,
    marginTop: 8,
  },
  addNewText: {
    ...typography.subtextBold,
    color: colors.primary,
  },
  emptyContainer: {
    paddingVertical: 24,
    alignItems: 'center',
  },
  emptyText: {
    ...typography.body,
    color: colors.textSecondary,
  },
});

export default VehiclePickerSheet;
