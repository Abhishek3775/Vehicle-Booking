import React from 'react';
import { View, StyleSheet, ActivityIndicator, Text } from 'react-native';
import { colors } from '../../theme/colors';
import { typography } from '../../theme/typography';

export const LoadingSkeleton = ({
  count = 3,
  message = 'Loading...',
  type = 'card',
  style,
}) => {
  return (
    <View style={[styles.container, style]}>
      <ActivityIndicator size="large" color={colors.primary} style={styles.spinner} />
      {message ? <Text style={styles.message}>{message}</Text> : null}

      <View style={styles.skeletonList}>
        {Array.from({ length: count }).map((_, index) => (
          <View key={index} style={[styles.skeletonCard, type === 'row' && styles.skeletonRow]}>
            <View style={styles.skeletonHeader}>
              <View style={styles.skeletonAvatar} />
              <View style={styles.skeletonTextGroup}>
                <View style={styles.skeletonLineShort} />
                <View style={styles.skeletonLineTiny} />
              </View>
            </View>
            <View style={styles.skeletonLineLong} />
          </View>
        ))}
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    padding: 16,
    alignItems: 'center',
    justifyContent: 'center',
  },
  spinner: {
    marginBottom: 12,
  },
  message: {
    ...typography.subtext,
    color: colors.textSecondary,
    marginBottom: 20,
  },
  skeletonList: {
    width: '100%',
  },
  skeletonCard: {
    backgroundColor: colors.surface,
    borderRadius: 14,
    padding: 16,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: colors.borderLight,
  },
  skeletonRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  skeletonHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
  },
  skeletonAvatar: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#E2E8F0',
    marginRight: 12,
  },
  skeletonTextGroup: {
    flex: 1,
  },
  skeletonLineShort: {
    width: '60%',
    height: 14,
    borderRadius: 7,
    backgroundColor: '#E2E8F0',
    marginBottom: 6,
  },
  skeletonLineTiny: {
    width: '35%',
    height: 10,
    borderRadius: 5,
    backgroundColor: '#EEF2F6',
  },
  skeletonLineLong: {
    width: '90%',
    height: 12,
    borderRadius: 6,
    backgroundColor: '#F1F5F9',
  },
});

export default LoadingSkeleton;
