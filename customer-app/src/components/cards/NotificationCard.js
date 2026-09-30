import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { colors } from '../../theme/colors';
import { typography } from '../../theme/typography';
import { formatDateTime } from '../../utils/formatters';

const getCategoryIcon = (category) => {
  switch (category) {
    case 'BOOKING':
      return { name: 'calendar-outline', color: colors.primary };
    case 'DISPATCH':
      return { name: 'navigate-outline', color: colors.primaryLight };
    case 'INSPECTION':
      return { name: 'clipboard-outline', color: '#8B5CF6' };
    case 'QUOTATION':
      return { name: 'calculator-outline', color: '#F59E0B' };
    case 'PAYMENT':
      return { name: 'cash-outline', color: colors.accent };
    case 'INVOICE':
      return { name: 'receipt-outline', color: colors.primary };
    default:
      return { name: 'notifications-outline', color: colors.textSecondary };
  }
};

export const NotificationCard = ({
  notification,
  onPress,
  onDelete,
  style,
}) => {
  const cat = getCategoryIcon(notification?.category);
  const isUnread = !notification?.isRead;

  return (
    <TouchableOpacity
      style={[
        styles.card,
        isUnread && styles.cardUnread,
        style,
      ]}
      onPress={onPress}
      activeOpacity={0.8}
    >
      <View style={styles.contentRow}>
        <View style={[styles.iconCircle, { backgroundColor: `${cat.color}15` }]}>
          <Ionicons name={cat.name} size={20} color={cat.color} />
        </View>

        <View style={styles.textColumn}>
          <View style={styles.titleRow}>
            <Text
              style={[styles.title, isUnread && styles.titleUnread]}
              numberOfLines={1}
            >
              {notification?.title}
            </Text>
            {isUnread && <View style={styles.unreadDot} />}
          </View>

          <Text style={styles.message} numberOfLines={3}>
            {notification?.message}
          </Text>

          <View style={styles.footerRow}>
            <Text style={styles.timeText}>
              {formatDateTime(notification?.createdAt)}
            </Text>

            {onDelete && (
              <TouchableOpacity
                onPress={(e) => {
                  e.stopPropagation();
                  onDelete(notification);
                }}
                hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
              >
                <Ionicons name="trash-outline" size={16} color={colors.textMuted} />
              </TouchableOpacity>
            )}
          </View>
        </View>
      </View>
    </TouchableOpacity>
  );
};

const styles = StyleSheet.create({
  card: {
    backgroundColor: colors.surface,
    borderRadius: 14,
    padding: 14,
    marginBottom: 10,
    borderWidth: 1,
    borderColor: colors.borderLight,
    shadowColor: '#0F172A',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.03,
    shadowRadius: 4,
    elevation: 1,
  },
  cardUnread: {
    borderColor: colors.border,
    backgroundColor: '#FAFDFD',
  },
  contentRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
  },
  iconCircle: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },
  textColumn: {
    flex: 1,
  },
  titleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 4,
  },
  title: {
    ...typography.subtextBold,
    color: colors.text,
    flex: 1,
  },
  titleUnread: {
    fontWeight: '700',
    color: colors.primary,
  },
  unreadDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: colors.accent,
    marginLeft: 6,
  },
  message: {
    ...typography.subtext,
    color: colors.textSecondary,
    lineHeight: 18,
    marginBottom: 8,
  },
  footerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  timeText: {
    ...typography.caption,
    color: colors.textMuted,
  },
});

export default NotificationCard;
