import React, { useMemo, useRef, useState } from 'react';
import {
  View,
  Text,
  ScrollView,
  Pressable,
  useWindowDimensions,
  StyleSheet,
} from 'react-native';
import { ChevronLeft, ChevronRight, Clock, Plus } from 'lucide-react-native';
import { useTranslation } from 'react-i18next';
import { useTheme } from '../../theme/ThemeContext';
import { heeboFont } from '../../theme/typography';
import { useDirection } from '../../i18n';
import { getSubjectConfig } from '../../lib/subjectIcons';
import type { ScheduleLesson, ScheduleFinishTime } from '../../../../src/types';

const DAYS = [0, 1, 2, 3, 4, 5]; // Sunday -> Friday

export function ScheduleTable({
  lessons,
  finishTimes,
  isEditMode,
  onPressCell,
  onPressFinishTime,
}: {
  lessons: ScheduleLesson[];
  finishTimes: ScheduleFinishTime[];
  isEditMode: boolean;
  onPressCell: (dayOfWeek: number, hourNum: number, lesson?: ScheduleLesson) => void;
  onPressFinishTime: (dayOfWeek: number, currentFinish?: string) => void;
}) {
  const { t } = useTranslation();
  const { palette, isDark } = useTheme();
  const { isRTL, flexRow } = useDirection();
  const { width: screenWidth } = useWindowDimensions();
  const scrollRef = useRef<React.ComponentRef<typeof ScrollView> | null>(null);
  const [scrollOffset, setScrollOffset] = useState(0);

  const hourColWidth = 38;
  const availableWidth = Math.max(screenWidth - 32 - hourColWidth, 240);
  const dayColWidth = Math.floor(availableWidth / 3);

  const maxHour = useMemo(() => {
    const maxLessonHour = lessons.reduce((acc, l) => Math.max(acc, l.hourNum), 0);
    return Math.max(isEditMode ? 8 : 6, maxLessonHour);
  }, [lessons, isEditMode]);

  const hours = useMemo(
    () => Array.from({ length: maxHour }, (_, i) => i + 1),
    [maxHour]
  );

  const currentDay = new Date().getDay();

  const handleScrollStep = (direction: 'forward' | 'backward') => {
    const delta = direction === 'forward' ? dayColWidth : -dayColWidth;
    const nextX = Math.max(0, Math.min(dayColWidth * 3, scrollOffset + delta));
    scrollRef.current?.scrollTo({ x: nextX, animated: true });
    setScrollOffset(nextX);
  };

  return (
    <View style={styles.wrapper}>
      <View style={[styles.scrollHintBar, { flexDirection: flexRow }]}>
        <Pressable
          accessibilityLabel={t('schedule.scroll_backward')}
          onPress={() => handleScrollStep('backward')}
          style={[
            styles.scrollHintBtn,
            { backgroundColor: palette.card, borderColor: palette.border },
          ]}
        >
          {isRTL ? (
            <ChevronRight size={16} color={palette.foreground} />
          ) : (
            <ChevronLeft size={16} color={palette.foreground} />
          )}
        </Pressable>

        <Text style={[heeboFont('600'), { fontSize: 11, color: palette.mutedForeground }]}>
          {t('schedule.days.day_0')} - {t('schedule.days.day_5')}
        </Text>

        <Pressable
          accessibilityLabel={t('schedule.scroll_forward')}
          onPress={() => handleScrollStep('forward')}
          style={[
            styles.scrollHintBtn,
            { backgroundColor: palette.card, borderColor: palette.border },
          ]}
        >
          {isRTL ? (
            <ChevronLeft size={16} color={palette.foreground} />
          ) : (
            <ChevronRight size={16} color={palette.foreground} />
          )}
        </Pressable>
      </View>

      <View
        style={[
          styles.tableContainer,
          { backgroundColor: palette.card, borderColor: palette.border, flexDirection: flexRow },
        ]}
      >
        <View
          style={[
            styles.hourColumn,
            { width: hourColWidth, borderColor: palette.border },
          ]}
        >
          <View
            testID="schedule-hour-col"
            style={[
              styles.headerCell,
              { backgroundColor: palette.muted, borderBottomColor: palette.border },
            ]}
          >
            <Text style={[styles.headerText, { color: palette.mutedForeground }]}>
              {t('schedule.hour_col_header')}
            </Text>
          </View>

          {hours.map((h) => (
            <View
              key={h}
              style={[styles.hourCell, { borderBottomColor: palette.border }]}
            >
              <Text style={[styles.hourText, { color: palette.mutedForeground }]}>
                {h}
              </Text>
            </View>
          ))}

          <View
            testID="schedule-finish-icon"
            style={[styles.finishCell, { backgroundColor: palette.muted }]}
          >
            <Clock size={14} color={palette.mutedForeground} />
          </View>
        </View>

        <ScrollView
          ref={scrollRef}
          horizontal
          showsHorizontalScrollIndicator={false}
          snapToInterval={dayColWidth}
          decelerationRate="fast"
          onMomentumScrollEnd={(e) => setScrollOffset(e.nativeEvent.contentOffset.x)}
        >
          <View style={{ flexDirection: flexRow }}>
            {DAYS.map((day) => {
              const isToday = day === currentDay;
              const finish = finishTimes.find((f) => f.dayOfWeek === day);

              return (
                <View
                  key={day}
                  style={[
                    styles.dayColumn,
                    { width: dayColWidth, borderColor: palette.border },
                  ]}
                >
                  <View
                    testID={`schedule-day-${day}`}
                    style={[
                      styles.headerCell,
                      {
                        backgroundColor: isToday
                          ? 'rgba(59, 130, 196, 0.14)'
                          : palette.muted,
                        borderBottomColor: palette.border,
                      },
                    ]}
                  >
                    <Text
                      numberOfLines={1}
                      style={[
                        styles.headerText,
                        { color: isToday ? palette.primary : palette.foreground },
                      ]}
                    >
                      {t(`schedule.days.day_${day}`)}
                    </Text>
                  </View>

                  {hours.map((h) => {
                    const lesson = lessons.find(
                      (l) => l.dayOfWeek === day && l.hourNum === h
                    );
                    const cfg = lesson ? getSubjectConfig(lesson.subject) : null;
                    const Icon = cfg?.icon;
                    const cellBg = cfg
                      ? isDark
                        ? cfg.badgeBgDark
                        : cfg.badgeBgLight
                      : 'transparent';
                    const textColor = cfg
                      ? isDark
                        ? cfg.badgeTextDark
                        : cfg.badgeTextLight
                      : palette.mutedForeground;

                    return (
                      <Pressable
                        key={h}
                        disabled={!isEditMode}
                        onPress={() => onPressCell(day, h, lesson)}
                        style={[
                          styles.lessonCell,
                          {
                            borderBottomColor: palette.border,
                            backgroundColor: cellBg,
                          },
                        ]}
                      >
                        {lesson ? (
                          <View style={styles.lessonInner}>
                            {Icon && <Icon size={13} color={textColor} />}
                            <Text
                              numberOfLines={2}
                              style={[styles.lessonSubject, { color: textColor }]}
                            >
                              {lesson.subject}
                            </Text>
                          </View>
                        ) : isEditMode ? (
                          <Plus size={14} color={palette.mutedForeground} />
                        ) : (
                          <Text style={{ color: palette.border, fontSize: 12 }}>—</Text>
                        )}
                      </Pressable>
                    );
                  })}

                  <Pressable
                    testID={day === 0 ? 'schedule-dismissal-row' : undefined}
                    disabled={!isEditMode}
                    onPress={() => onPressFinishTime(day, finish?.finishTime)}
                    style={[
                      styles.finishCell,
                      { backgroundColor: palette.muted },
                    ]}
                  >
                    <Text
                      style={[
                        heeboFont('700'),
                        {
                          fontSize: 11,
                          color: finish?.finishTime
                            ? palette.foreground
                            : palette.mutedForeground,
                        },
                      ]}
                    >
                      {finish?.finishTime || '—'}
                    </Text>
                  </Pressable>
                </View>
              );
            })}
          </View>
        </ScrollView>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  wrapper: {
    gap: 8,
  },
  scrollHintBar: {
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  scrollHintBtn: {
    width: 32,
    height: 32,
    borderRadius: 16,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  tableContainer: {
    borderRadius: 16,
    borderWidth: 1,
    overflow: 'hidden',
  },
  hourColumn: {
    borderEndWidth: 1,
  },
  dayColumn: {
    borderEndWidth: 1,
  },
  headerCell: {
    height: 40,
    borderBottomWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 4,
  },
  headerText: {
    fontSize: 12,
    ...heeboFont('700'),
  },
  hourCell: {
    height: 56,
    borderBottomWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  hourText: {
    fontSize: 12,
    ...heeboFont('700'),
  },
  lessonCell: {
    height: 56,
    borderBottomWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 4,
  },
  lessonInner: {
    alignItems: 'center',
    justifyContent: 'center',
    gap: 3,
  },
  lessonSubject: {
    fontSize: 11,
    ...heeboFont('700'),
    textAlign: 'center',
  },
  finishCell: {
    height: 38,
    alignItems: 'center',
    justifyContent: 'center',
  },
});
