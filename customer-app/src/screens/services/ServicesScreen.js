import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TextInput,
  TouchableOpacity,
  ScrollView,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { colors } from '../../theme/colors';
import { typography } from '../../theme/typography';
import { SERVICE_CATEGORIES } from '../../constants/appConstants';
import { serviceApi } from '../../api/serviceApi';
import { packageApi } from '../../api/packageApi';
import { ServiceCard } from '../../components/cards/ServiceCard';
import { PackageCard } from '../../components/cards/PackageCard';
import { EmptyState } from '../../components/common/EmptyState';
import { LoadingSkeleton } from '../../components/common/LoadingSkeleton';

export const ServicesScreen = ({ navigation }) => {
  const [activeTab, setActiveTab] = useState('SERVICES'); // 'SERVICES' | 'PACKAGES'
  const [selectedCategory, setSelectedCategory] = useState('ALL');
  const [searchQuery, setSearchQuery] = useState('');
  const [services, setServices] = useState([]);
  const [packages, setPackages] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const fetchCatalogue = useCallback(async () => {
    try {
      if (activeTab === 'SERVICES') {
        const params = {
          ...(selectedCategory !== 'ALL' ? { category: selectedCategory } : {}),
          ...(searchQuery.trim() ? { search: searchQuery.trim() } : {}),
        };
        const res = await serviceApi.getServices(params);
        setServices(res?.data || []);
      } else {
        const params = {
          ...(searchQuery.trim() ? { search: searchQuery.trim() } : {}),
        };
        const res = await packageApi.getPackages(params);
        setPackages(res?.data || []);
      }
    } catch (err) {
      console.warn('Error loading catalogue:', err);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [activeTab, selectedCategory, searchQuery]);

  useEffect(() => {
    setLoading(true);
    const delayDebounce = setTimeout(() => {
      fetchCatalogue();
    }, 250);
    return () => clearTimeout(delayDebounce);
  }, [fetchCatalogue]);

  const onRefresh = () => {
    setRefreshing(true);
    fetchCatalogue();
  };

  return (
    <View style={styles.container}>
      {/* Search Bar */}
      <View style={styles.searchSection}>
        <View style={styles.searchBar}>
          <Ionicons name="search" size={20} color={colors.textSecondary} style={styles.searchIcon} />
          <TextInput
            style={styles.searchInput}
            placeholder={activeTab === 'SERVICES' ? 'Search services (e.g. Oil Change, Brakes)...' : 'Search service packages...'}
            placeholderTextColor={colors.textMuted}
            value={searchQuery}
            onChangeText={setSearchQuery}
            clearButtonMode="while-editing"
          />
          {searchQuery ? (
            <TouchableOpacity onPress={() => setSearchQuery('')}>
              <Ionicons name="close-circle" size={18} color={colors.textMuted} />
            </TouchableOpacity>
          ) : null}
        </View>

        {/* Tab Toggle: Services vs Packages */}
        <View style={styles.tabToggle}>
          <TouchableOpacity
            style={[styles.tabButton, activeTab === 'SERVICES' && styles.tabButtonActive]}
            onPress={() => {
              setActiveTab('SERVICES');
              setSearchQuery('');
            }}
            activeOpacity={0.8}
          >
            <Text style={[styles.tabButtonText, activeTab === 'SERVICES' && styles.tabButtonTextActive]}>
              Individual Services
            </Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.tabButton, activeTab === 'PACKAGES' && styles.tabButtonActive]}
            onPress={() => {
              setActiveTab('PACKAGES');
              setSearchQuery('');
            }}
            activeOpacity={0.8}
          >
            <Text style={[styles.tabButtonText, activeTab === 'PACKAGES' && styles.tabButtonTextActive]}>
              Service Packages
            </Text>
          </TouchableOpacity>
        </View>
      </View>

      {/* Category Pills (only applicable to Individual Services) */}
      {activeTab === 'SERVICES' && (
        <View style={styles.categoryContainer}>
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={styles.categoryScroll}
          >
            {SERVICE_CATEGORIES.map((cat) => {
              const isSelected = selectedCategory === cat.value;
              return (
                <TouchableOpacity
                  key={cat.value}
                  style={[styles.categoryPill, isSelected && styles.categoryPillSelected]}
                  onPress={() => setSelectedCategory(cat.value)}
                  activeOpacity={0.7}
                >
                  <Ionicons
                    name={cat.icon}
                    size={16}
                    color={isSelected ? '#FFFFFF' : colors.textSecondary}
                    style={{ marginRight: 6 }}
                  />
                  <Text style={[styles.categoryPillText, isSelected && styles.categoryPillTextSelected]}>
                    {cat.label}
                  </Text>
                </TouchableOpacity>
              );
            })}
          </ScrollView>
        </View>
      )}

      {/* Main List */}
      {loading ? (
        <LoadingSkeleton count={4} />
      ) : activeTab === 'SERVICES' ? (
        <FlatList
          data={services}
          keyExtractor={(item) => item._id || item.id}
          renderItem={({ item }) => (
            <ServiceCard
              service={item}
              onPress={() =>
                navigation.navigate('ServiceDetail', {
                  serviceId: item._id || item.id,
                })
              }
            />
          )}
          contentContainerStyle={styles.listContent}
          showsVerticalScrollIndicator={false}
          refreshing={refreshing}
          onRefresh={onRefresh}
          ListEmptyComponent={
            <EmptyState
              icon="search-outline"
              title="No services found"
              description="Try adjusting your search keywords or filter category."
            />
          }
        />
      ) : (
        <FlatList
          data={packages}
          keyExtractor={(item) => item._id || item.id}
          renderItem={({ item }) => (
            <PackageCard
              servicePackage={item}
              onPress={() =>
                navigation.navigate('PackageDetail', {
                  packageId: item._id || item.id,
                })
              }
            />
          )}
          contentContainerStyle={styles.listContent}
          showsVerticalScrollIndicator={false}
          refreshing={refreshing}
          onRefresh={onRefresh}
          ListEmptyComponent={
            <EmptyState
              icon="cube-outline"
              title="No packages found"
              description="Try searching with a different term."
            />
          }
        />
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },
  searchSection: {
    backgroundColor: colors.surface,
    paddingHorizontal: 16,
    paddingTop: 12,
    paddingBottom: 8,
    borderBottomWidth: 1,
    borderBottomColor: colors.borderLight,
  },
  searchBar: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F8FAFC',
    borderRadius: 12,
    paddingHorizontal: 12,
    height: 46,
    borderWidth: 1,
    borderColor: colors.border,
    marginBottom: 10,
  },
  searchIcon: {
    marginRight: 8,
  },
  searchInput: {
    flex: 1,
    ...typography.body,
    color: colors.text,
    height: '100%',
  },
  tabToggle: {
    flexDirection: 'row',
    backgroundColor: '#F1F5F9',
    borderRadius: 10,
    padding: 3,
    marginBottom: 4,
  },
  tabButton: {
    flex: 1,
    paddingVertical: 8,
    alignItems: 'center',
    borderRadius: 8,
  },
  tabButtonActive: {
    backgroundColor: colors.surface,
    shadowColor: '#0F172A',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.06,
    shadowRadius: 3,
    elevation: 1,
  },
  tabButtonText: {
    ...typography.subtextBold,
    color: colors.textSecondary,
  },
  tabButtonTextActive: {
    color: colors.primary,
  },
  categoryContainer: {
    backgroundColor: colors.surface,
    paddingVertical: 10,
    borderBottomWidth: 1,
    borderBottomColor: colors.borderLight,
  },
  categoryScroll: {
    paddingHorizontal: 16,
    gap: 8,
  },
  categoryPill: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 14,
    paddingVertical: 7,
    borderRadius: 20,
    backgroundColor: '#F1F5F9',
    borderWidth: 1,
    borderColor: 'transparent',
  },
  categoryPillSelected: {
    backgroundColor: colors.primary,
    borderColor: colors.primary,
  },
  categoryPillText: {
    ...typography.caption,
    fontWeight: '600',
    color: colors.textSecondary,
  },
  categoryPillTextSelected: {
    color: '#FFFFFF',
  },
  listContent: {
    padding: 16,
    paddingBottom: 32,
  },
});

export default ServicesScreen;
