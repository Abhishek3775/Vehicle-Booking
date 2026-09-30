import React from 'react';
import { TouchableOpacity, Text, StyleSheet } from 'react-native';
import { colors } from '../../theme/colors';
import { typography } from '../../theme/typography';

export const SecondaryButton = ({
  title,
  onPress,
  disabled = false,
  variant = 'outlined', // 'outlined' | 'soft'
  style,
  textStyle,
  icon,
}) => {
  const isSoft = variant === 'soft';

  return (
    <TouchableOpacity
      style={[
        styles.button,
        isSoft ? styles.softButton : styles.outlinedButton,
        disabled && styles.disabledButton,
        style,
      ]}
      onPress={onPress}
      disabled={disabled}
      activeOpacity={0.7}
    >
      {icon ? icon : null}
      <Text
        style={[
          styles.text,
          isSoft ? styles.softText : styles.outlinedText,
          disabled && styles.disabledText,
          textStyle,
        ]}
      >
        {title}
      </Text>
    </TouchableOpacity>
  );
};

const styles = StyleSheet.create({
  button: {
    height: 48,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
    flexDirection: 'row',
    paddingHorizontal: 18,
  },
  outlinedButton: {
    backgroundColor: 'transparent',
    borderWidth: 1.5,
    borderColor: colors.border,
  },
  softButton: {
    backgroundColor: colors.primarySoft,
  },
  disabledButton: {
    borderColor: '#E2E8F0',
    backgroundColor: '#F8FAFC',
  },
  text: {
    ...typography.button,
    fontWeight: '600',
  },
  outlinedText: {
    color: colors.text,
  },
  softText: {
    color: colors.primary,
  },
  disabledText: {
    color: colors.textMuted,
  },
});

export default SecondaryButton;
