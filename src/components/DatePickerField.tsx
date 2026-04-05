import DateTimePicker, { type DateTimePickerEvent } from '@react-native-community/datetimepicker';
import React, { useState } from 'react';
import { Platform, Pressable, StyleSheet, Text, View } from 'react-native';
import { useTranslation } from 'react-i18next';
import { colors } from '../theme/colors';
import { parseYMD, toYMD } from '../utils/dateUtils';

type Props = {
  label: string;
  valueYmd: string;
  onChangeYmd: (ymd: string) => void;
  minimumDate?: Date;
  maximumDate?: Date;
};

export function DatePickerField({ label, valueYmd, onChangeYmd, minimumDate, maximumDate }: Props) {
  const { i18n } = useTranslation();
  const [open, setOpen] = useState(false);
  const date = parseYMD(valueYmd);
  const safe = isNaN(date.getTime()) ? new Date() : date;

  const onPick = (event: DateTimePickerEvent, selected?: Date) => {
    if (Platform.OS === 'android') setOpen(false);
    if (event.type === 'dismissed') return;
    if (selected) onChangeYmd(toYMD(selected));
  };

  const display = safe.toLocaleDateString(i18n.language, {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
  });

  return (
    <View style={styles.wrap}>
      <Text style={styles.label}>{label}</Text>
      <Pressable onPress={() => setOpen(true)} style={styles.box}>
        <Text style={styles.value}>{display}</Text>
      </Pressable>
      {open && (
        <DateTimePicker
          value={safe}
          mode="date"
          display={Platform.OS === 'ios' ? 'spinner' : 'default'}
          minimumDate={minimumDate}
          maximumDate={maximumDate}
          onChange={onPick}
        />
      )}
      {open && Platform.OS === 'ios' && (
        <Pressable onPress={() => setOpen(false)} style={styles.done}>
          <Text style={styles.doneText}>OK</Text>
        </Pressable>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { marginBottom: 14 },
  label: {
    fontSize: 13,
    fontWeight: '600',
    color: colors.textMuted,
    marginBottom: 6,
  },
  box: {
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 10,
    paddingHorizontal: 14,
    paddingVertical: 14,
    backgroundColor: colors.surface,
  },
  value: { fontSize: 16, color: colors.text },
  done: { alignSelf: 'flex-end', marginTop: 8 },
  doneText: { color: colors.primary, fontWeight: '600', fontSize: 16 },
});
