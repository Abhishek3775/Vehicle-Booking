import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { colors } from '../../theme/colors';
import { typography } from '../../theme/typography';

const STEPS = [
  'Vehicle',
  'Service',
  'Address',
  'Schedule',
  'Review',
  'Confirm',
];

export const StepIndicator = ({ currentStep = 1, totalSteps = 6 }) => {
  return (
    <View style={styles.container}>
      <View style={styles.progressRow}>
        {Array.from({ length: totalSteps }).map((_, index) => {
          const stepNumber = index + 1;
          const isCompleted = stepNumber < currentStep;
          const isCurrent = stepNumber === currentStep;

          return (
            <React.Fragment key={index}>
              <View
                style={[
                  styles.dot,
                  isCompleted && styles.dotCompleted,
                  isCurrent && styles.dotCurrent,
                ]}
              >
                <Text
                  style={[
                    styles.dotText,
                    (isCompleted || isCurrent) && styles.dotTextActive,
                  ]}
                >
                  {stepNumber}
                </Text>
              </View>

              {index < totalSteps - 1 && (
                <View
                  style={[
                    styles.bar,
                    isCompleted && styles.barCompleted,
                  ]}
                />
              )}
            </React.Fragment>
          );
        })}
      </View>

      <View style={styles.titleRow}>
        <Text style={styles.stepTitle}>
          Step {currentStep} of {totalSteps}:{' '}
          <Text style={styles.stepName}>{STEPS[currentStep - 1] || ''}</Text>
        </Text>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    paddingHorizontal: 20,
    paddingVertical: 14,
    backgroundColor: colors.surface,
    borderBottomWidth: 1,
    borderBottomColor: colors.borderLight,
  },
  progressRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
  },
  dot: {
    width: 26,
    height: 26,
    borderRadius: 13,
    backgroundColor: '#E2E8F0',
    alignItems: 'center',
    justifyContent: 'center',
  },
  dotCompleted: {
    backgroundColor: colors.accent,
  },
  dotCurrent: {
    backgroundColor: colors.primary,
    borderWidth: 2,
    borderColor: colors.primarySoft,
  },
  dotText: {
    fontSize: 11,
    fontWeight: '700',
    color: colors.textSecondary,
  },
  dotTextActive: {
    color: '#FFFFFF',
  },
  bar: {
    flex: 1,
    height: 3,
    backgroundColor: '#E2E8F0',
    marginHorizontal: 4,
    borderRadius: 1.5,
  },
  barCompleted: {
    backgroundColor: colors.accent,
  },
  titleRow: {
    marginTop: 10,
    alignItems: 'center',
  },
  stepTitle: {
    ...typography.caption,
    color: colors.textSecondary,
    fontWeight: '500',
  },
  stepName: {
    color: colors.primary,
    fontWeight: '700',
  },
});

export default StepIndicator;
