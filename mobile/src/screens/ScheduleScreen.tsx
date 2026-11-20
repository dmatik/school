import React, { useCallback, useEffect, useState } from 'react';
import {
  Animated,
  View,
  RefreshControl,
  ActivityIndicator,
  Pressable,
  Text,
  StyleSheet,
} from 'react-native';
import { CalendarDays, Pencil, Check, Share2 } from 'lucide-react-native';
import * as Print from 'expo-print';
import * as Sharing from 'expo-sharing';
import { useTranslation } from 'react-i18next';
import { useTheme } from '../theme/ThemeContext';
import { useDirection } from '../i18n';
import { apiFetch } from '../lib/api';
import {
  FieldLabel,
  FilledInput,
  LiquidTabs,
  StickyFilterBar,
} from '../components/ui/FormFields';
import { EmptyStateCard, NoticeBanner } from '../components/ui/Surfaces';
import { ScheduleTable } from '../components/ui/ScheduleTable';
import { Button, FloatingActionButton } from '../components/ui/Buttons';
import { FullScreenModal } from '../components/ui/Modal';
import { useScrollHeader } from '../components/ui/MobileHeader';
import type {
  ScheduleLesson,
  ScheduleFinishTime,
  WebtopConfig,
  User,
} from '../../../src/types';

const COMMON_FINISH_PRESETS = ['11:45', '12:45', '13:30', '14:15', '15:00', '16:00'];

export function ScheduleScreen({
  currentUser,
  syncTrigger,
}: {
  currentUser: User;
  syncTrigger: number;
}) {
  const { t } = useTranslation();
  const { palette } = useTheme();
  const { headerHeight, onScroll } = useScrollHeader();
  const { flexRow, isRTL } = useDirection();
  const isChild = currentUser.familyRole === 'child';
  const isParent = !isChild;

  const [config, setConfig] = useState<WebtopConfig | null>(null);
  const [selectedChildId, setSelectedChildId] = useState('');
  const [lessons, setLessons] = useState<ScheduleLesson[]>([]);
  const [finishTimes, setFinishTimes] = useState<ScheduleFinishTime[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [isEditMode, setIsEditMode] = useState(false);

  const [editingLesson, setEditingLesson] = useState<{
    dayOfWeek: number;
    hourNum: number;
  } | null>(null);
  const [formSubject, setFormSubject] = useState('');
  const [savingLesson, setSavingLesson] = useState(false);

  const [editingFinishDay, setEditingFinishDay] = useState<number | null>(null);
  const [formFinishTime, setFormFinishTime] = useState('');
  const [savingFinish, setSavingFinish] = useState(false);

  const loadConfig = useCallback(async () => {
    try {
      const res = await apiFetch('/api/webtop/config');
      if (res.ok) {
        const cfg: WebtopConfig = await res.json();
        setConfig(cfg);
        if (isChild) {
          setSelectedChildId(currentUser.linkedChildId || '');
        } else if (cfg.linkedChildren?.length) {
          setSelectedChildId((prev) => {
            if (prev && cfg.linkedChildren.some((c) => c.id === prev)) return prev;
            if (
              cfg.selectedChildId &&
              cfg.selectedChildId !== 'all' &&
              cfg.linkedChildren.some((c) => c.id === cfg.selectedChildId)
            ) {
              return cfg.selectedChildId;
            }
            return cfg.linkedChildren[0].id;
          });
        }
      }
    } catch (err) {
      console.error('Schedule config error:', err);
    }
  }, [isChild, currentUser.linkedChildId]);

  const loadSchedule = useCallback(async (childId: string, isRefresh = false) => {
    if (!childId) {
      setLoading(false);
      setRefreshing(false);
      return;
    }
    if (isRefresh) setRefreshing(true);
    else setLoading(true);

    try {
      const res = await apiFetch(`/api/schedule?childId=${encodeURIComponent(childId)}`);
      if (res.ok) {
        const data = await res.json();
        setLessons(data.lessons || []);
        setFinishTimes(data.finishTimes || []);
      }
    } catch (err) {
      console.error('Schedule load error:', err);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => {
    loadConfig();
  }, [loadConfig, syncTrigger]);

  useEffect(() => {
    if (selectedChildId) {
      loadSchedule(selectedChildId);
    } else if (config !== null) {
      setLoading(false);
    }
  }, [selectedChildId, config, loadSchedule]);

  const handleSaveLesson = async (subjectOverride?: string) => {
    if (!editingLesson || !selectedChildId) return;
    setSavingLesson(true);
    try {
      const res = await apiFetch('/api/schedule/lesson', {
        method: 'PUT',
        body: JSON.stringify({
          childId: selectedChildId,
          dayOfWeek: editingLesson.dayOfWeek,
          hourNum: editingLesson.hourNum,
          subject: (subjectOverride ?? formSubject).trim(),
        }),
      });
      if (res.ok) {
        setEditingLesson(null);
        await loadSchedule(selectedChildId);
      }
    } finally {
      setSavingLesson(false);
    }
  };

  const handleSaveFinishTime = async (timeOverride?: string) => {
    if (editingFinishDay === null || !selectedChildId) return;
    setSavingFinish(true);
    try {
      const res = await apiFetch('/api/schedule/finish-time', {
        method: 'PUT',
        body: JSON.stringify({
          childId: selectedChildId,
          dayOfWeek: editingFinishDay,
          finishTime: (timeOverride ?? formFinishTime).trim(),
        }),
      });
      if (res.ok) {
        setEditingFinishDay(null);
        await loadSchedule(selectedChildId);
      }
    } finally {
      setSavingFinish(false);
    }
  };

  const handleSharePdf = async () => {
    const child = config?.linkedChildren?.find((c) => c.id === selectedChildId);
    const childName = child ? `${child.firstName} ${child.lastName}`.trim() : '';
    const maxHour = Math.max(6, lessons.reduce((acc, l) => Math.max(acc, l.hourNum), 0));
    const days = [0, 1, 2, 3, 4, 5];

    const headerCells = days
      .map((d) => `<th>${t(`schedule.days.day_${d}`)}</th>`)
      .join('');
    const rows = Array.from({ length: maxHour }, (_, idx) => {
      const hour = idx + 1;
      const cells = days
        .map((d) => {
          const l = lessons.find((item) => item.dayOfWeek === d && item.hourNum === hour);
          return `<td>${l ? l.subject : ''}</td>`;
        })
        .join('');
      return `<tr><th>${hour}</th>${cells}</tr>`;
    }).join('');

    const html = `
      <html dir="${isRTL ? 'rtl' : 'ltr'}">
        <head>
          <meta charset="utf-8" />
          <style>
            body { font-family: sans-serif; padding: 20px; }
            h1 { font-size: 18px; margin-bottom: 12px; }
            table { width: 100%; border-collapse: collapse; table-layout: fixed; }
            th, td { border: 1px solid #cbd5e1; padding: 8px; text-align: center; font-size: 12px; }
            th { background: #f1f5f9; }
          </style>
        </head>
        <body>
          <h1>${t('schedule.title')}${childName ? ` - ${childName}` : ''}</h1>
          <table>
            <thead><tr><th>#</th>${headerCells}</tr></thead>
            <tbody>${rows}</tbody>
          </table>
        </body>
      </html>
    `;

    try {
      const { uri } = await Print.printToFileAsync({ html });
      if (await Sharing.isAvailableAsync()) {
        await Sharing.shareAsync(uri);
      }
    } catch (err) {
      console.error('Schedule share PDF failed:', err);
    }
  };

  return (
    <View style={{ flex: 1 }}>
      <Animated.ScrollView
        style={styles.container}
        contentContainerStyle={[styles.content, { paddingTop: headerHeight + 8 }]}
        onScroll={onScroll}
        scrollEventThrottle={16}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={() => loadSchedule(selectedChildId, true)}
          />
        }
      >
        {isChild && !currentUser.linkedChildId ? (
          <NoticeBanner variant="warning" description={t('schedule.child_unlinked_desc')} />
        ) : null}

        {isParent && (config?.linkedChildren?.length || 0) > 0 && (
          <StickyFilterBar>
            <View style={[styles.filterRow, { flexDirection: flexRow }]}>
              <View style={{ flex: 1 }}>
                <LiquidTabs
                  testID="schedule-child-selector"
                  tabs={(config?.linkedChildren || []).map((c) => ({
                    label: c.firstName,
                    value: c.id,
                  }))}
                  value={selectedChildId}
                  onChange={setSelectedChildId}
                />
              </View>
              <Pressable
                testID="schedule-share-btn"
                accessibilityLabel={t('schedule.share')}
                onPress={handleSharePdf}
                style={[
                  styles.shareBtn,
                  { backgroundColor: palette.card, borderColor: palette.border },
                ]}
              >
                <Share2 size={16} color={palette.foreground} />
              </Pressable>
            </View>
          </StickyFilterBar>
        )}

        {isChild && selectedChildId ? (
          <View style={[styles.filterRow, { flexDirection: flexRow, justifyContent: 'flex-end' }]}>
            <Pressable
              testID="schedule-share-btn"
              accessibilityLabel={t('schedule.share')}
              onPress={handleSharePdf}
              style={[
                styles.shareBtn,
                { backgroundColor: palette.card, borderColor: palette.border },
              ]}
            >
              <Share2 size={16} color={palette.foreground} />
            </Pressable>
          </View>
        ) : null}

        {loading ? (
          <View style={styles.center}>
            <ActivityIndicator size="large" color={palette.primary} />
          </View>
        ) : !selectedChildId ? (
          <EmptyStateCard
            icon={CalendarDays}
            title={t('schedule.no_students_found')}
            description={t('schedule.no_children_warning')}
          />
        ) : (
          <ScheduleTable
            lessons={lessons}
            finishTimes={finishTimes}
            isEditMode={isEditMode}
            onPressCell={(dayOfWeek, hourNum, lesson) => {
              setEditingLesson({ dayOfWeek, hourNum });
              setFormSubject(lesson?.subject || '');
            }}
            onPressFinishTime={(dayOfWeek, currentFinish) => {
              setEditingFinishDay(dayOfWeek);
              setFormFinishTime(currentFinish || '');
            }}
          />
        )}
      </Animated.ScrollView>

      {isParent && selectedChildId ? (
        <FloatingActionButton
          testID="schedule-edit-fab"
          icon={isEditMode ? Check : Pencil}
          variant={isEditMode ? 'success' : 'primary'}
          accessibilityLabel={
            isEditMode ? t('schedule.edit_mode_disable') : t('schedule.edit_mode_enable')
          }
          onPress={() => setIsEditMode((prev) => !prev)}
        />
      ) : null}

      <FullScreenModal
        visible={Boolean(editingLesson)}
        onClose={() => setEditingLesson(null)}
        title={
          formSubject
            ? t('schedule.lesson_modal_title_edit')
            : t('schedule.lesson_modal_title_add')
        }
        description={
          editingLesson
            ? t('schedule.lesson_modal_desc', {
                day: t(`schedule.days.day_${editingLesson.dayOfWeek}`),
                hour: editingLesson.hourNum,
              })
            : undefined
        }
        footer={
          <View style={styles.modalFooterRow}>
            <Button
              label={t('schedule.clear_lesson')}
              variant="destructive"
              onPress={() => handleSaveLesson('')}
              loading={savingLesson}
              style={{ flex: 1 }}
            />
            <Button
              label={t('common.save')}
              onPress={() => handleSaveLesson()}
              loading={savingLesson}
              style={{ flex: 1 }}
            />
          </View>
        }
      >
        <View style={{ gap: 6 }}>
          <FieldLabel label={t('schedule.subject_label')} />
          <FilledInput
            value={formSubject}
            onChangeText={setFormSubject}
            placeholder={t('schedule.subject_placeholder')}
          />
        </View>
      </FullScreenModal>

      <FullScreenModal
        visible={editingFinishDay !== null}
        onClose={() => setEditingFinishDay(null)}
        title={t('schedule.finish_time_modal_title')}
        description={
          editingFinishDay !== null
            ? t('schedule.finish_time_modal_desc', {
                day: t(`schedule.days.day_${editingFinishDay}`),
              })
            : undefined
        }
        footer={
          <View style={styles.modalFooterRow}>
            <Button
              label={t('schedule.clear_finish_time')}
              variant="destructive"
              onPress={() => handleSaveFinishTime('')}
              loading={savingFinish}
              style={{ flex: 1 }}
            />
            <Button
              label={t('common.save')}
              onPress={() => handleSaveFinishTime()}
              loading={savingFinish}
              style={{ flex: 1 }}
            />
          </View>
        }
      >
        <View style={{ gap: 6 }}>
          <FieldLabel label={t('schedule.finish_time_label')} />
          <FilledInput
            forceLtr
            value={formFinishTime}
            onChangeText={setFormFinishTime}
            placeholder="13:30"
          />
        </View>
        <View style={{ gap: 8 }}>
          <FieldLabel label={t('schedule.finish_time_presets')} />
          <View style={styles.presetsGrid}>
            {COMMON_FINISH_PRESETS.map((preset) => (
              <Pressable
                key={preset}
                onPress={() => setFormFinishTime(preset)}
                style={[
                  styles.presetChip,
                  {
                    backgroundColor:
                      formFinishTime === preset ? palette.primary : palette.muted,
                    borderColor: palette.border,
                  },
                ]}
              >
                <Text
                  style={{
                    fontSize: 13,
                    fontWeight: '600',
                    color: formFinishTime === preset ? '#ffffff' : palette.foreground,
                  }}
                >
                  {preset}
                </Text>
              </Pressable>
            ))}
          </View>
        </View>
      </FullScreenModal>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  content: {
    padding: 16,
    paddingBottom: 110,
    gap: 12,
  },
  filterRow: {
    alignItems: 'center',
    gap: 10,
  },
  shareBtn: {
    width: 38,
    height: 38,
    borderRadius: 19,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  center: {
    paddingVertical: 48,
    alignItems: 'center',
  },
  modalFooterRow: {
    flexDirection: 'row',
    gap: 10,
  },
  presetsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  presetChip: {
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 10,
    borderWidth: 1,
  },
});
