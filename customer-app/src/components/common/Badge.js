import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { colors } from '../../theme/colors';
import { typography } from '../../theme/typography';

export const Badge = ({
  label,
  variant = 'neutral', // success, warning, danger, info, primary, neutral
  size = 'md', // sm, md
  style,
  textStyle,
}) => {
  const getVariantStyles = () => {
    switch (variant) {
      case 'success':
        return { bg: colors.successSoft, text: colors.success, border: colors.successBorder };
      case 'warning':
        return { bg: colors.warningSoft, text: colors.warning, border: colors.warningBorder };
      case 'danger':
        return { bg: colors.dangerSoft, text: colors.danger, border: colors.dangerBorder };
      case 'info':
        return { bg: colors.infoSoft, text: colors.info, border: colors.infoBorder };
      case 'primary':
        return { bg: colors.primarySoft, text: colors.primary, border: colors.border };
      case 'neutral':
      default:
        return { bg: '#F1F5F9', text: colors.textSecondary, border: colors.borderLight };
    }
  };

  const v = getVariantStyles();

  return (
    <View
      style={[
        styles.badge,
        { backgroundColor: v.bg, borderColor: v.border },
        size === 'sm' && styles.badgeSm,
        style,
      ]}
    >
      <Text
        style={[
          styles.text,
          { color: v.text },
          size === 'sm' && styles.textSm,
          textStyle,
        ]}
      >
        {label}
      </Text>
    </View>
  );
};

const styles = StyleSheet.create({
  badge: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 8,
    borderWidth: 1,
    alignSelf: 'flex-start',
  },
  badgeSm: {
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 6,
  },
  text: {
    ...typography.caption,
    fontWeight: '600',
  },
  textSm: {
    fontSize: 10,
  },
});

export default Badge;
