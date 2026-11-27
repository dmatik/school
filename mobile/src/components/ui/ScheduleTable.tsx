import React, { useEffect, useMemo, useRef, useState } from 'react';
import {
  View,
  Text,
  ScrollView,
  Pressable,
  useWindowDimensions,
  StyleSheet,
} from 'react-native';
import { ChevronLeft, ChevronRight, Clock, Pencil, Plus } from 'lucide-react-native';
import { useTranslation } from 'react-i18next';
import { useTheme } from '../../theme/ThemeContext';
import { heeboFont } from '../../theme/typography';
import { useDirection } from '../../i18n';
import { getSubjectConfig } from '../../lib/subjectIcons';
import { getChildColor, getChildSolidHex } from '../../../../src/lib/child-colors';
import type { ScheduleLesson, ScheduleFinishTime } from '../../../../src/types';

const DAYS = [0, 1, 2, 3, 4, 5] as const; // Sunday -> Friday
const HOUR_COL_WIDTH = 40;
const HEADER_HEIGHT = 44;
const ROW_HEIGHT = 56;

export interface ScheduleTableProps {
  lessons: ScheduleLesson[];
  finishTimes: ScheduleFinishTime[];
  childColorId?: string | null;
  currentDayOfWeek?: number;
  isEditMode?: boolean;
  canEdit?: boolean;
  resetScrollKey?: string;
  onPressCell?: (dayOfWeek: number, hourNum: number, lesson?: ScheduleLesson) => void;
  onPressFinishTime?: (dayOfWeek: number, currentFinish?: string) => void;
}

export function ScheduleTable({
  lessons,
  finishTimes,
  childColorId,
  currentDayOfWeek: currentDayOfWeekProp,
  isEditMode = false,
  canEdit: canEditProp,
  resetScrollKey,
  onPressCell,
  onPressFinishTime,
}: ScheduleTableProps) {
  const { t } = useTranslation();
  const { palette, isDark } = useTheme();
  const { isRTL, flexRow } = useDirection();
  const { width: screenWidth } = useWindowDimensions();

  const [tableWidth, setTableWidth] = useState(() => Math.max(screenWidth - 32, 240));
  const scrollRef = useRef<React.ComponentRef<typeof ScrollView> | null>(null);
  const scrollOffsetRef = useRef(0);
  const lastAutoScrollKeyRef = useRef<string | null>(null);
  const hasAutoScrolledRef = useRef(false);

  const editable = canEditProp ?? isEditMode;
  const currentDay = currentDayOfWeekProp ?? new Date().getDay();

  // Match Web initial target day (showing 3 days at a time):
  // Wed(3)/Thu(4)/Fri(5) -> 3 (Wed..Fri); Sat(6) -> 0 (Sun..Tue); Sun..Tue -> currentDay
  const initialTargetDay = useMemo(() => {
    if (currentDay >= 3 && currentDay <= 5) return 3;
    if (currentDay === 6) return 0;
    if (currentDay >= 0 && currentDay <= 2) return currentDay;
    return 0;
  }, [currentDay]);

  const dayViewportWidth = Math.max(tableWidth - 2 - HOUR_COL_WIDTH, 210);
  const dayColWidth = dayViewportWidth / 3;

  // Match Web hours calculation:
  // Edit mode: 1 empty row below highest populated lesson (min 1, max 12)
  // View mode: populated hours only (max 12)
  const hours = useMemo(() => {
    let maxPopulated = 0;
    for (const l of lessons) {
      if (l.subject && l.subject.trim() && l.hourNum > maxPopulated) {
        maxPopulated = l.hourNum;
      }
    }
    const maxHour = isEditMode
      ? Math.min(Math.max(maxPopulated + 1, 1), 12)
      : Math.min(maxPopulated, 12);
    return Array.from({ length: maxHour }, (_, i) => i + 1);
  }, [lessons, isEditMode]);

  const lessonMap = useMemo(() => {
    const map = new Map<string, ScheduleLesson>();
    for (const l of lessons) {
      map.set(`${l.dayOfWeek}-${l.hourNum}`, l);
    }
    return map;
  }, [lessons]);

  const finishTimeMap = useMemo(() => {
    const map = new Map<number, string>();
    for (const f of finishTimes) {
      if (f.finishTime) {
        map.set(f.dayOfWeek, f.finishTime);
      }
    }
    return map;
  }, [finishTimes]);

  const hasChildColor = Boolean(childColorId && getChildColor(childColorId));
  const headerBg = hasChildColor ? getChildSolidHex(childColorId) : palette.primary;
  const hourHeaderTextColor = hasChildColor ? '#ffffff' : palette.primaryForeground;
  const headerDividerColor = 'rgba(255, 255, 255, 0.2)';
  const rowDividerColor = isDark ? 'rgba(46, 56, 74, 0.7)' : 'rgba(214, 221, 230, 0.7)';
  const dismissalBg = isDark ? palette.secondary : palette.muted;
  const todayCellTint = isDark ? 'rgba(87, 158, 224, 0.04)' : 'rgba(59, 130, 196, 0.03)';
  const todayDismissalTint = isDark ? 'rgba(87, 158, 224, 0.08)' : 'rgba(59, 130, 196, 0.06)';
  const todayHeaderOverlay = isDark ? 'rgba(0, 0, 0, 0.25)' : 'rgba(0, 0, 0, 0.15)';
  const endBorderStyle = isRTL ? { borderLeftWidth: 1 } : { borderRightWidth: 1 };

  const getScrollXForDay = (day: number) => {
    const clamped = Math.max(0, Math.min(3, day));
    return isRTL ? (3 - clamped) * dayColWidth : clamped * dayColWidth;
  };

  const autoScrollKey = `${resetScrollKey ?? ''}|${isRTL ? 'rtl' : 'ltr'}|${currentDay}|${initialTargetDay}`;

  const performAutoScroll = (animated: boolean) => {
    if (!scrollRef.current || dayColWidth <= 0) return;
    const targetX = getScrollXForDay(initialTargetDay);
    scrollRef.current.scrollTo({ x: targetX, animated });
    scrollOffsetRef.current = targetX;
  };

  useEffect(() => {
    if (dayColWidth <= 0) return;
    if (lastAutoScrollKeyRef.current === autoScrollKey) return;

    const rafId = requestAnimationFrame(() => {
      const shouldAnimate = hasAutoScrolledRef.current;
      performAutoScroll(shouldAnimate);
      lastAutoScrollKeyRef.current = autoScrollKey;
      hasAutoScrolledRef.current = true;
    });
    return () => cancelAnimationFrame(rafId);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [autoScrollKey, dayColWidth]);

  const handleScrollStep = (direction: 'forward' | 'backward') => {
    if (!scrollRef.current || dayColWidth <= 0) return;
    const sign = direction === 'forward' ? (isRTL ? -1 : 1) : isRTL ? 1 : -1;
    const currentIndex = Math.round(scrollOffsetRef.current / dayColWidth);
    const nextIndex = Math.max(0, Math.min(3, currentIndex + sign));
    const nextX = nextIndex * dayColWidth;
    scrollRef.current.scrollTo({ x: nextX, animated: true });
    scrollOffsetRef.current = nextX;
  };

  return (
    <View style={styles.wrapper}>
      {/* Scroll hint bar matching Web mobile controls */}
      <View style={[styles.scrollHintBar, { flexDirection: flexRow }]}>
        <Pressable
          accessibilityLabel={t('schedule.scroll_backward')}
          accessibilityRole="button"
          hitSlop={8}
          onPress={() => handleScrollStep('backward')}
          style={({ pressed }) => [styles.scrollHintBtn, pressed && { opacity: 0.6 }]}
        >
          {isRTL ? (
            <ChevronRight size={16} color={palette.mutedForeground} />
          ) : (
            <ChevronLeft size={16} color={palette.mutedForeground} />
          )}
        </Pressable>

        <Text
          style={[
            heeboFont('500'),
            { fontSize: 12, color: palette.mutedForeground, opacity: 0.8 },
          ]}
        >
          {t('schedule.days.day_0')} – {t('schedule.days.day_5')}
        </Text>

        <Pressable
          accessibilityLabel={t('schedule.scroll_forward')}
          accessibilityRole="button"
          hitSlop={8}
          onPress={() => handleScrollStep('forward')}
          style={({ pressed }) => [styles.scrollHintBtn, pressed && { opacity: 0.6 }]}
        >
          {isRTL ? (
            <ChevronLeft size={16} color={palette.mutedForeground} />
          ) : (
            <ChevronRight size={16} color={palette.mutedForeground} />
          )}
        </Pressable>
      </View>

      {/* Unified Schedule Table Container */}
      <View
        testID="schedule-table"
        onLayout={(e) => {
          const nextW = e.nativeEvent.layout.width;
          if (nextW > 0 && Math.abs(nextW - tableWidth) > 0.5) {
            setTableWidth(nextW);
          }
        }}
        style={[
          styles.tableContainer,
          {
            backgroundColor: palette.card,
            borderColor: palette.border,
            flexDirection: flexRow,
          },
        ]}
      >
        {/* Fixed # Hour Column */}
        <View style={{ width: HOUR_COL_WIDTH }}>
          <View
            testID="schedule-hour-col"
            style={[
              styles.headerCell,
              endBorderStyle,
              {
                backgroundColor: headerBg,
                borderBottomColor: palette.border,
                borderLeftColor: headerDividerColor,
                borderRightColor: headerDividerColor,
              },
            ]}
          >
            <Text style={[styles.headerText, { color: hourHeaderTextColor }]}>
              {t('schedule.hour_col_header')}
            </Text>
          </View>

          {hours.map((h, idx) => (
            <View
              key={h}
              style={[
                styles.hourCell,
                endBorderStyle,
                {
                  backgroundColor: palette.card,
                  borderLeftColor: palette.border,
                  borderRightColor: palette.border,
                  borderBottomWidth: idx < hours.length - 1 ? 1 : 0,
                  borderBottomColor: rowDividerColor,
                },
              ]}
            >
              <Text style={[styles.hourText, { color: palette.mutedForeground }]}>{h}</Text>
            </View>
          ))}

          <View
            testID="schedule-finish-icon"
            style={[
              styles.finishCell,
              endBorderStyle,
              {
                backgroundColor: dismissalBg,
                borderTopColor: palette.border,
                borderLeftColor: palette.border,
                borderRightColor: palette.border,
              },
            ]}
          >
            <Clock size={17} strokeWidth={2.2} color={palette.primary} />
          </View>
        </View>

        {/* Horizontally Snapping 3-Day Viewport (6 days total) */}
        <ScrollView
          ref={scrollRef}
          horizontal
          bounces={false}
          alwaysBounceHorizontal={false}
          overScrollMode="never"
          style={{ flex: 1 }}
          showsHorizontalScrollIndicator={false}
          snapToInterval={dayColWidth}
          decelerationRate="fast"
          onContentSizeChange={() => {
            if (dayColWidth > 0 && lastAutoScrollKeyRef.current !== autoScrollKey) {
              performAutoScroll(false);
              lastAutoScrollKeyRef.current = autoScrollKey;
              hasAutoScrolledRef.current = true;
            }
          }}
          onScroll={(e) => {
            scrollOffsetRef.current = e.nativeEvent.contentOffset.x;
          }}
          onMomentumScrollEnd={(e) => {
            scrollOffsetRef.current = e.nativeEvent.contentOffset.x;
          }}
          scrollEventThrottle={16}
        >
          <View style={{ flexDirection: flexRow }}>
            {DAYS.map((day, dayIndex) => {
              const isToday = day === currentDay;
              const finishTime = finishTimeMap.get(day);
              const showDivider = dayIndex < DAYS.length - 1;
              const dayEndBorder = showDivider ? endBorderStyle : undefined;

              return (
                <View key={day} style={{ width: dayColWidth }}>
                  {/* Header Cell */}
                  <View
                    testID={`schedule-day-${day}`}
                    style={[
                      styles.headerCell,
                      dayEndBorder,
                      {
                        backgroundColor: headerBg,
                        borderBottomColor: palette.border,
                        borderLeftColor: headerDividerColor,
                        borderRightColor: headerDividerColor,
                      },
                    ]}
                  >
                    {isToday ? (
                      <View
                        pointerEvents="none"
                        style={[
                          StyleSheet.absoluteFill,
                          { backgroundColor: todayHeaderOverlay },
                        ]}
                      />
                    ) : null}
                    <View style={[styles.headerContent, { flexDirection: flexRow }]}>
                      <Text
                        numberOfLines={1}
                        style={[styles.headerText, { color: '#ffffff', flexShrink: 1 }]}
                      >
                        {t(`schedule.days.day_${day}`)}
                      </Text>
                      {isToday ? (
                        <View style={styles.todayBadge}>
                          <Text style={styles.todayBadgeText}>
                            {t('schedule.today_badge')}
                          </Text>
                        </View>
                      ) : null}
                    </View>
                  </View>

                  {/* Lesson Rows */}
                  {hours.map((h, idx) => {
                    const lesson = lessonMap.get(`${day}-${h}`);
                    const hasSubject = Boolean(lesson && lesson.subject.trim());
                    const cfg = hasSubject ? getSubjectConfig(lesson?.subject) : null;
                    const subjectColor = cfg
                      ? isDark
                        ? cfg.textDark
                        : cfg.textLight
                      : palette.foreground;

                    return (
                      <Pressable
                        key={h}
                        disabled={!editable}
                        onPress={() => onPressCell?.(day, h, lesson)}
                        style={({ pressed }) => [
                          styles.lessonCell,
                          dayEndBorder,
                          {
                            backgroundColor: isToday ? todayCellTint : 'transparent',
                            borderLeftColor: palette.border,
                            borderRightColor: palette.border,
                            borderBottomWidth: idx < hours.length - 1 ? 1 : 0,
                            borderBottomColor: rowDividerColor,
                            opacity: editable && pressed ? 0.7 : 1,
                          },
                        ]}
                      >
                        {hasSubject && lesson ? (
                          <Text
                            numberOfLines={2}
                            style={[styles.lessonSubject, { color: subjectColor }]}
                          >
                            {lesson.subject}
                          </Text>
                        ) : editable ? (
                          <Plus
                            size={14}
                            color={palette.mutedForeground}
                            style={{ opacity: 0.4 }}
                          />
                        ) : null}
                      </Pressable>
                    );
                  })}

                  {/* Dismissal Finish Time Cell */}
                  <Pressable
                    testID={day === 0 ? 'schedule-dismissal-row' : undefined}
                    disabled={!editable}
                    onPress={() => onPressFinishTime?.(day, finishTime)}
                    style={({ pressed }) => [
                      styles.finishCell,
                      dayEndBorder,
                      {
                        backgroundColor: dismissalBg,
                        borderTopColor: palette.border,
                        borderLeftColor: palette.border,
                        borderRightColor: palette.border,
                        opacity: editable && pressed ? 0.7 : 1,
                      },
                    ]}
                  >
                    {isToday ? (
                      <View
                        pointerEvents="none"
                        style={[
                          StyleSheet.absoluteFill,
                          { backgroundColor: todayDismissalTint },
                        ]}
                      />
                    ) : null}
                    <View style={[styles.finishTimeRow, { flexDirection: flexRow }]}>
                      <Text
                        numberOfLines={1}
                        style={[
                          styles.finishTimeText,
                          {
                            color: finishTime ? palette.foreground : palette.mutedForeground,
                            opacity: finishTime ? 1 : 0.5,
                          },
                        ]}
                      >
                        {finishTime || '--:--'}
                      </Text>
                      {editable ? (
                        <Pencil
                          size={12}
                          color={palette.mutedForeground}
                          style={{ opacity: 0.65 }}
                        />
                      ) : null}
                    </View>
                    <Text
                      numberOfLines={1}
                      style={[styles.finishLabel, { color: palette.mutedForeground }]}
                    >
                      {t('schedule.finish_time_row')}
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
    width: '100%',
  },
  scrollHintBar: {
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingBottom: 8,
    paddingHorizontal: 4,
  },
  scrollHintBtn: {
    padding: 4,
    borderRadius: 6,
    alignItems: 'center',
    justifyContent: 'center',
  },
  tableContainer: {
    borderRadius: 12,
    borderWidth: 1,
    overflow: 'hidden',
    shadowColor: '#000',
    shadowOpacity: 0.04,
    shadowRadius: 3,
    shadowOffset: { width: 0, height: 1 },
    elevation: 1,
  },
  headerCell: {
    height: HEADER_HEIGHT,
    borderBottomWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 4,
    overflow: 'hidden',
  },
  headerContent: {
    alignItems: 'center',
    justifyContent: 'center',
    gap: 4,
    maxWidth: '100%',
  },
  headerText: {
    fontSize: 16,
    includeFontPadding: false,
    textAlignVertical: 'center',
    textAlign: 'center',
    ...heeboFont('700'),
  },
  todayBadge: {
    backgroundColor: '#ffffff',
    borderRadius: 999,
    paddingHorizontal: 6,
    paddingVertical: 1,
    alignItems: 'center',
    justifyContent: 'center',
    flexShrink: 0,
  },
  todayBadgeText: {
    fontSize: 11,
    color: '#18181b',
    includeFontPadding: false,
    textAlignVertical: 'center',
    ...heeboFont('700'),
  },
  hourCell: {
    height: ROW_HEIGHT,
    alignItems: 'center',
    justifyContent: 'center',
  },
  hourText: {
    fontSize: 16,
    includeFontPadding: false,
    textAlignVertical: 'center',
    textAlign: 'center',
    ...heeboFont('700'),
  },
  lessonCell: {
    height: ROW_HEIGHT,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 4,
    paddingVertical: 2,
    overflow: 'hidden',
  },
  lessonSubject: {
    fontSize: 16,
    includeFontPadding: false,
    textAlignVertical: 'center',
    ...heeboFont('700'),
    textAlign: 'center',
  },
  finishCell: {
    height: ROW_HEIGHT,
    borderTopWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 4,
    paddingVertical: 0,
    overflow: 'hidden',
  },
  finishTimeRow: {
    alignItems: 'center',
    justifyContent: 'center',
    gap: 4,
    maxWidth: '100%',
  },
  finishTimeText: {
    fontSize: 16,
    includeFontPadding: false,
    textAlignVertical: 'center',
    fontVariant: ['tabular-nums'],
    ...heeboFont('700'),
  },
  finishLabel: {
    fontSize: 12,
    marginTop: -4,
    opacity: 0.8,
    maxWidth: '100%',
    includeFontPadding: false,
    textAlignVertical: 'center',
    ...heeboFont('500'),
  },
});
