import React, { useMemo, useState } from 'react';
import {
  Modal,
  Pressable,
  Text,
  View,
  StyleSheet,
} from 'react-native';
import {
  addMonths,
  eachDayOfInterval,
  endOfMonth,
  format,
  getDay,
  isSameDay,
  isToday,
  isYesterday,
  startOfMonth,
  subMonths,
} from 'date-fns';
import { he, enUS } from 'date-fns/locale';
import { Calendar, ChevronLeft, ChevronRight, X } from 'lucide-react-native';
import { useTranslation } from 'react-i18next';
import { useTheme } from '../../theme/ThemeContext';
import { heeboFont } from '../../theme/typography';
import { useDirection } from '../../i18n';
import { ModalLayer } from './ModalPortal';
import { Button } from './Buttons';
import { GlassBackdrop, getGlassShadow } from './GlassBackdrop';
import { FieldLabel } from './FormFields';

function CalendarModal({
  open,
  onClose,
  date,
  onSelectDate,
  viewMonth,
  setViewMonth,
  disableFuture,
  clearable,
}: {
  open: boolean;
  onClose: () => void;
  date?: Date;
  onSelectDate: (d: Date | undefined) => void;
  viewMonth: Date;
  setViewMonth: React.Dispatch<React.SetStateAction<Date>>;
  disableFuture: boolean;
  clearable: boolean;
}) {
  const { t, i18n } = useTranslation();
  const { palette, isDark } = useTheme();
  const { isRTL, flexRow } = useDirection();
  const dateLocale = (i18n.language || 'he').startsWith('en') ? enUS : he;

  const calendarWeeks = useMemo(() => {
    const start = startOfMonth(viewMonth);
    const end = endOfMonth(viewMonth);
    const days = eachDayOfInterval({ start, end });
    const leadingBlanks = getDay(start);
    const cells: Array<Date | null> = [
      ...Array.from({ length: leadingBlanks }, () => null),
      ...days,
    ];
    while (cells.length % 7 !== 0) {
      cells.push(null);
    }
    const weeks: Array<Array<Date | null>> = [];
    for (let i = 0; i < cells.length; i += 7) {
      weeks.push(cells.slice(i, i + 7));
    }
    return weeks;
  }, [viewMonth]);

  const weekdayLabels = useMemo(() => {
    const base = new Date(2024, 0, 7);
    return Array.from({ length: 7 }, (_, i) => {
      const d = new Date(base);
      d.setDate(base.getDate() + i);
      return format(d, 'EEEEE', { locale: dateLocale });
    });
  }, [dateLocale]);

  const endOfToday = useMemo(() => {
    const d = new Date();
    d.setHours(23, 59, 59, 999);
    return d;
  }, []);

  return (
    <ModalLayer
      visible={open}
      animationType="fade"
      onRequestClose={onClose}
    >
      <View style={styles.backdrop}>
        <Pressable accessible={false} style={StyleSheet.absoluteFill} onPress={onClose} />
        <View
          style={[
            styles.calendarCard,
            { backgroundColor: palette.card, borderColor: palette.border },
          ]}
        >
          {/* Month Navigation */}
          <View style={[styles.monthHeader, { flexDirection: flexRow }]}>
            <Pressable
              accessibilityRole="button"
              accessibilityLabel={t('common.previous_month')}
              onPress={() => setViewMonth((m) => subMonths(m, 1))}
              hitSlop={8}
              style={[styles.navBtn, { backgroundColor: palette.muted }]}
            >
              {isRTL ? (
                <ChevronRight size={18} color={palette.foreground} />
              ) : (
                <ChevronLeft size={18} color={palette.foreground} />
              )}
            </Pressable>

            <Text style={[styles.monthTitle, { color: palette.foreground }]}>
              {format(viewMonth, 'MMMM yyyy', { locale: dateLocale })}
            </Text>

            <Pressable
              accessibilityRole="button"
              accessibilityLabel={t('common.next_month')}
              onPress={() => setViewMonth((m) => addMonths(m, 1))}
              hitSlop={8}
              style={[styles.navBtn, { backgroundColor: palette.muted }]}
            >
              {isRTL ? (
                <ChevronLeft size={18} color={palette.foreground} />
              ) : (
                <ChevronRight size={18} color={palette.foreground} />
              )}
            </Pressable>
          </View>

          {/* Weekday Header */}
          <View style={[styles.weekRow, { flexDirection: flexRow }]}>
            {weekdayLabels.map((lbl, idx) => (
              <View key={idx} style={styles.daySlot}>
                <Text
                  style={[styles.weekdayText, { color: palette.mutedForeground }]}
                >
                  {lbl}
                </Text>
              </View>
            ))}
          </View>

          {/* Weeks Grid */}
          <View style={styles.weeksWrap}>
            {calendarWeeks.map((week, wIdx) => (
              <View key={wIdx} style={[styles.weekRow, { flexDirection: flexRow }]}>
                {week.map((d, dIdx) => {
                  if (!d) {
                    return <View key={`blank-${wIdx}-${dIdx}`} style={styles.daySlot} />;
                  }
                  const disabled = disableFuture && d > endOfToday;
                  const selected = Boolean(date && isSameDay(d, date));
                  const today = isToday(d);

                  return (
                    <View key={d.toISOString()} style={styles.daySlot}>
                      <Pressable
                        disabled={disabled}
                        onPress={() => {
                          onSelectDate(d);
                          onClose();
                        }}
                        style={[
                          styles.dayCircle,
                          selected && { backgroundColor: palette.primary },
                          !selected &&
                            today && {
                              borderWidth: 1.5,
                              borderColor: palette.primary,
                            },
                          disabled && { opacity: 0.3 },
                        ]}
                      >
                        <Text
                          style={[
                            heeboFont(selected || today ? '700' : '500'),
                            {
                              fontSize: 13,
                              color: selected ? '#ffffff' : palette.foreground,
                            },
                          ]}
                        >
                          {format(d, 'd')}
                        </Text>
                      </Pressable>
                    </View>
                  );
                })}
              </View>
            ))}
          </View>

          {/* Quick Actions */}
          <View style={[styles.footerActions, { flexDirection: flexRow }]}>
            <Button
              label={t('common.today')}
              variant="outline"
              size="sm"
              onPress={() => {
                onSelectDate(new Date());
                onClose();
              }}
              style={{ flex: 1 }}
            />
            {clearable ? (
              <Button
                label={t('common.all_dates')}
                variant="ghost"
                size="sm"
                onPress={() => {
                  onSelectDate(undefined);
                  onClose();
                }}
                style={{ flex: 1 }}
              />
            ) : null}
          </View>
        </View>
      </View>
    </ModalLayer>
  );
}

/**
 * Form-styled pill date picker matching `FilledInput` and `SelectField`.
 */
export function DatePickerField({
  label,
  description,
  date,
  setDate,
  placeholder,
  variant = 'filled',
  clearable = true,
  disableFuture = false,
  formatPattern = 'dd/MM/yyyy',
  disabled = false,
  testID,
}: {
  label?: string;
  description?: string;
  date?: Date;
  setDate: (date: Date | undefined) => void;
  placeholder?: string;
  variant?: 'filled' | 'card';
  clearable?: boolean;
  disableFuture?: boolean;
  formatPattern?: string;
  disabled?: boolean;
  testID?: string;
}) {
  const { t, i18n } = useTranslation();
  const { palette, isDark } = useTheme();
  const { flexRow, textAlign } = useDirection();
  const [open, setOpen] = useState(false);
  const [viewMonth, setViewMonth] = useState<Date>(() => date || new Date());

  const dateLocale = (i18n.language || 'he').startsWith('en') ? enUS : he;
  const displayLabel = date
    ? format(date, formatPattern, { locale: dateLocale })
    : placeholder || t('common.select_date');

  const triggerBg = variant === 'card' ? palette.card : palette.inputBg;

  return (
    <View style={{ gap: 8, width: '100%' }}>
      {label ? <FieldLabel label={label} description={description} /> : null}
      <View
        style={[
          styles.fieldTrigger,
          {
            flexDirection: flexRow,
            backgroundColor: triggerBg,
            opacity: disabled ? 0.5 : 1,
          },
        ]}
      >
        <Pressable
          testID={testID}
          disabled={disabled}
          accessibilityRole="button"
          accessibilityLabel={label || displayLabel}
          onPress={() => {
            setViewMonth(date || new Date());
            setOpen(true);
          }}
          style={({ pressed }) => [
            styles.fieldTriggerBtn,
            { flexDirection: flexRow, opacity: pressed ? 0.8 : 1 },
          ]}
        >
          <Calendar size={16} color={palette.mutedForeground} />
          <Text
            numberOfLines={1}
            style={[
              styles.fieldTriggerText,
              {
                color: date ? palette.foreground : palette.mutedForeground,
                textAlign,
              },
            ]}
          >
            {displayLabel}
          </Text>
        </Pressable>

        {clearable && date && !disabled ? (
          <Pressable
            accessibilityLabel={t('common.cancel')}
            onPress={() => setDate(undefined)}
            hitSlop={8}
            style={styles.fieldClearBtn}
          >
            <X size={14} color={palette.mutedForeground} />
          </Pressable>
        ) : null}
      </View>

      <CalendarModal
        open={open}
        onClose={() => setOpen(false)}
        date={date}
        onSelectDate={setDate}
        viewMonth={viewMonth}
        setViewMonth={setViewMonth}
        disableFuture={disableFuture}
        clearable={clearable}
      />
    </View>
  );
}

export function LiquidDatePicker({
  date,
  setDate,
  isChild = false,
  fullFormat,
  disableFuture = true,
  testID,
}: {
  date?: Date;
  setDate: (date: Date | undefined) => void;
  isChild?: boolean;
  fullFormat?: boolean;
  disableFuture?: boolean;
  testID?: string;
}) {
  const { t, i18n } = useTranslation();
  const { palette, isDark } = useTheme();
  const { isRTL, flexRow } = useDirection();
  const [open, setOpen] = useState(false);
  const [viewMonth, setViewMonth] = useState<Date>(() => date || new Date());

  const dateLocale = (i18n.language || 'he').startsWith('en') ? enUS : he;
  const useFullFormat = fullFormat ?? isChild;

  const displayLabel = useMemo(() => {
    if (!date) return t('common.all_dates_short');
    if (useFullFormat) {
      if (isToday(date)) return t('common.today');
      if (isYesterday(date)) return t('common.yesterday');
      return format(date, 'EEEE, PPP', { locale: dateLocale });
    }
    return format(date, 'dd/MM');
  }, [date, useFullFormat, t, dateLocale]);

  return (
    <>
      <View style={[styles.pillOuter, getGlassShadow(isDark)]}>
        <View style={styles.pillShell}>
          <GlassBackdrop />
          <View style={[styles.pillRow, { flexDirection: flexRow }]}>
            <Pressable
              testID={testID}
              onPress={() => {
                setViewMonth(date || new Date());
                setOpen(true);
              }}
              style={[
                styles.pillTrigger,
                { flexDirection: flexRow },
                date
                  ? isRTL
                    ? { paddingRight: 16, paddingLeft: 6 }
                    : { paddingLeft: 16, paddingRight: 6 }
                  : { paddingHorizontal: 16 },
              ]}
            >
              <Calendar
                size={16}
                color={date ? palette.primary : palette.mutedForeground}
              />
              <Text
                numberOfLines={1}
                style={[
                  {
                    fontSize: 16,
                    color: date ? palette.foreground : palette.mutedForeground,
                  },
                  heeboFont('500'),
                ]}
              >
                {displayLabel}
              </Text>
            </Pressable>

            {date ? (
              <Pressable
                accessibilityLabel={t('common.all_dates')}
                onPress={() => setDate(undefined)}
                hitSlop={8}
                style={[
                  styles.clearBtn,
                  isRTL
                    ? { paddingLeft: 12, paddingRight: 4 }
                    : { paddingRight: 12, paddingLeft: 4 },
                ]}
              >
                <X size={14} color={palette.mutedForeground} />
              </Pressable>
            ) : null}
          </View>
        </View>
      </View>

      <CalendarModal
        open={open}
        onClose={() => setOpen(false)}
        date={date}
        onSelectDate={setDate}
        viewMonth={viewMonth}
        setViewMonth={setViewMonth}
        disableFuture={disableFuture}
        clearable
      />
    </>
  );
}

const styles = StyleSheet.create({
  pillOuter: {
    borderRadius: 999,
    flexGrow: 0,
    flexShrink: 0,
  },
  pillShell: {
    height: 40,
    borderRadius: 999,
    overflow: 'hidden',
    justifyContent: 'center',
  },
  pillRow: {
    height: '100%',
    alignItems: 'center',
  },
  pillTrigger: {
    height: '100%',
    alignItems: 'center',
    gap: 8,
  },
  clearBtn: {
    height: '100%',
    alignItems: 'center',
    justifyContent: 'center',
  },
  backdrop: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'center',
    padding: 20,
  },
  calendarCard: {
    width: '100%',
    maxWidth: 380,
    alignSelf: 'center',
    borderRadius: 20,
    borderWidth: 1,
    padding: 16,
    gap: 12,
  },
  monthHeader: {
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  navBtn: {
    width: 34,
    height: 34,
    borderRadius: 17,
    alignItems: 'center',
    justifyContent: 'center',
  },
  monthTitle: {
    fontSize: 15,
    ...heeboFont('700'),
  },
  weekRow: {
    width: '100%',
    alignItems: 'center',
  },
  weeksWrap: {
    gap: 4,
  },
  daySlot: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  weekdayText: {
    textAlign: 'center',
    fontSize: 11,
    ...heeboFont('700'),
  },
  dayCircle: {
    width: 36,
    height: 36,
    borderRadius: 18,
    alignItems: 'center',
    justifyContent: 'center',
  },
  footerActions: {
    gap: 10,
    marginTop: 4,
  },
  fieldTrigger: {
    height: 40,
    borderRadius: 999,
    paddingHorizontal: 14,
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 8,
  },
  fieldTriggerBtn: {
    flex: 1,
    height: '100%',
    alignItems: 'center',
    gap: 8,
  },
  fieldTriggerText: {
    flex: 1,
    fontSize: 14,
    ...heeboFont('400'),
    includeFontPadding: false,
    textAlignVertical: 'center',
  },
  fieldClearBtn: {
    padding: 2,
    borderRadius: 999,
  },
});
