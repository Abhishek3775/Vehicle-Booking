import React, { useState } from 'react';
import { View, Text, TouchableOpacity, ScrollView, StyleSheet } from 'react-native';
import { colors } from '../../theme/colors';
import { typography } from '../../theme/typography';

const TIME_SLOTS = [
  '09:00 AM',
  '10:30 AM',
  '12:00 PM',
  '02:00 PM',
  '03:30 PM',
  '05:00 PM',
  '06:30 PM',
];

// Generate next 7 selectable days starting from tomorrow
const getAvailableDays = () => {
  const days = [];
  const dayNames = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
  const monthNames = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

  for (let i = 1; i <= 7; i++) {
    const d = new Date();
    d.setDate(d.getDate() + i);
    days.push({
      dateObj: d,
      dateString: d.toISOString().split('T')[0],
      dayName: i === 1 ? 'Tomorrow' : dayNames[d.getDay()],
      dayNumber: d.getDate(),
      month: monthNames[d.getMonth()],
    });
  }
  return days;
};

export const TimeSlotPicker = ({ onSelectDateTime, selectedDateTime }) => {
  const days = getAvailableDays();
  const [selectedDay, setSelectedDay] = useState(days[0]);
  const [selectedSlot, setSelectedSlot] = useState(TIME_SLOTS[0]);

  const handleSelectDay = (day) => {
    setSelectedDay(day);
    combineAndEmit(day, selectedSlot);
  };

  const handleSelectSlot = (slot) => {
    setSelectedSlot(slot);
    combineAndEmit(selectedDay, slot);
  };

  const combineAndEmit = (day, slot) => {
    if (!day || !slot) return;
    const [time, ampm] = slot.split(' ');
    let [hours, minutes] = time.split(':').map(Number);
    if (ampm === 'PM' && hours !== 12) hours += 12;
    if (ampm === 'AM' && hours === 12) hours = 0;

    const fullDate = new Date(day.dateObj);
    fullDate.setHours(hours, minutes, 0, 0);

    onSelectDateTime({
      isoString: fullDate.toISOString(),
      displayString: `${day.dayNumber} ${day.month} • ${slot}`,
    });
  };

  return (
    <View style={styles.container}>
      <Text style={styles.sectionTitle}>Select Date</Text>
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={styles.daysScroll}
      >
        {days.map((item) => {
          const isSelected = selectedDay.dateString === item.dateString;
          return (
            <TouchableOpacity
              key={item.dateString}
              style={[styles.dayCard, isSelected && styles.dayCardSelected]}
              onPress={() => handleSelectDay(item)}
              activeOpacity={0.8}
            >
              <Text style={[styles.dayName, isSelected && styles.dayNameSelected]}>
                {item.dayName}
              </Text>
              <Text style={[styles.dayNumber, isSelected && styles.dayNumberSelected]}>
                {item.dayNumber}
              </Text>
              <Text style={[styles.monthText, isSelected && styles.monthTextSelected]}>
                {item.month}
              </Text>
            </TouchableOpacity>
          );
        })}
      </ScrollView>

      <Text style={[styles.sectionTitle, { marginTop: 24 }]}>Select Time Slot</Text>
      <View style={styles.slotsGrid}>
        {TIME_SLOTS.map((slot) => {
          const isSelected = selectedSlot === slot;
          return (
            <TouchableOpacity
              key={slot}
              style={[styles.slotChip, isSelected && styles.slotChipSelected]}
              onPress={() => handleSelectSlot(slot)}
              activeOpacity={0.7}
            >
              <Text style={[styles.slotText, isSelected && styles.slotTextSelected]}>
                {slot}
              </Text>
            </TouchableOpacity>
          );
        })}
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    marginVertical: 8,
  },
  sectionTitle: {
    ...typography.h4,
    color: colors.text,
    marginBottom: 12,
  },
  daysScroll: {
    paddingVertical: 4,
    gap: 10,
  },
  dayCard: {
    width: 76,
    paddingVertical: 14,
    borderRadius: 14,
    backgroundColor: colors.surface,
    borderWidth: 1.5,
    borderColor: colors.border,
    alignItems: 'center',
    justifyContent: 'center',
  },
  dayCardSelected: {
    backgroundColor: colors.primary,
    borderColor: colors.primary,
    shadowColor: colors.primary,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.15,
    shadowRadius: 8,
    elevation: 3,
  },
  dayName: {
    ...typography.caption,
    color: colors.textSecondary,
    fontWeight: '600',
    marginBottom: 4,
  },
  dayNameSelected: {
    color: '#E0F2F1',
  },
  dayNumber: {
    ...typography.h3,
    color: colors.text,
    fontWeight: '700',
    marginBottom: 2,
  },
  dayNumberSelected: {
    color: '#FFFFFF',
  },
  monthText: {
    ...typography.caption,
    color: colors.textMuted,
  },
  monthTextSelected: {
    color: '#B2DFDB',
  },
  slotsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 10,
  },
  slotChip: {
    paddingVertical: 10,
    paddingHorizontal: 16,
    borderRadius: 10,
    backgroundColor: colors.surface,
    borderWidth: 1.5,
    borderColor: colors.border,
    minWidth: '30%',
    alignItems: 'center',
  },
  slotChipSelected: {
    borderColor: colors.primary,
    backgroundColor: colors.primarySoft,
  },
  slotText: {
    ...typography.subtextBold,
    color: colors.text,
  },
  slotTextSelected: {
    color: colors.primary,
    fontWeight: '700',
  },
});

export default TimeSlotPicker;
