import React, { useRef } from 'react';
import { View, TextInput, StyleSheet } from 'react-native';
import { colors } from '../../theme/colors';
import { typography } from '../../theme/typography';

export const OtpInput = ({ length = 6, value = '', onChange, error }) => {
  const inputRefs = useRef([]);

  const handleTextChange = (text, index) => {
    // Only numeric digits
    const cleaned = text.replace(/[^0-9]/g, '');

    if (cleaned.length > 1) {
      // Handles pasting or fast autofill of multiple digits
      const pasted = cleaned.slice(0, length);
      onChange(pasted);
      const nextIdx = Math.min(pasted.length, length - 1);
      inputRefs.current[nextIdx]?.focus();
      return;
    }

    // Build fixed-length array to avoid sparse array gaps
    const currentChars = (value || '').split('');
    const newChars = Array.from({ length }, (_, i) => currentChars[i] || '');
    newChars[index] = cleaned;

    const newOtp = newChars.join('').trimEnd();
    onChange(newOtp);

    // Auto-advance to next box if digit was typed
    if (cleaned && index < length - 1) {
      inputRefs.current[index + 1]?.focus();
    }
  };

  const handleKeyPress = (e, index) => {
    if (e.nativeEvent.key === 'Backspace') {
      if ((!value || !value[index]) && index > 0) {
        // Move focus backward and clear previous box
        inputRefs.current[index - 1]?.focus();
        const currentChars = (value || '').split('');
        currentChars[index - 1] = '';
        onChange(currentChars.join(''));
      }
    }
  };

  return (
    <View style={styles.container}>
      {Array.from({ length }).map((_, index) => {
        const char = (value || '')[index] || '';
        const isFilled = Boolean(char);

        return (
          <TextInput
            key={index}
            ref={(ref) => (inputRefs.current[index] = ref)}
            style={[
              styles.box,
              isFilled && styles.boxFilled,
              error && styles.boxError,
            ]}
            keyboardType="number-pad"
            maxLength={index === 0 ? length : 1}
            value={char}
            onChangeText={(text) => handleTextChange(text, index)}
            onKeyPress={(e) => handleKeyPress(e, index)}
            selectTextOnFocus
            textAlign="center"
          />
        );
      })}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    width: '100%',
    marginVertical: 18,
  },
  box: {
    width: 46,
    height: 54,
    borderRadius: 12,
    borderWidth: 1.5,
    borderColor: colors.border,
    backgroundColor: colors.surface,
    ...typography.h2,
    color: colors.text,
    textAlign: 'center',
    shadowColor: '#0F172A',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.04,
    shadowRadius: 3,
    elevation: 1,
  },
  boxFilled: {
    borderColor: colors.primary,
    backgroundColor: '#FFFFFF',
  },
  boxError: {
    borderColor: colors.danger,
    backgroundColor: colors.dangerSoft,
  },
});

export default OtpInput;
