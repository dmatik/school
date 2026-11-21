import React, { useCallback, useEffect, useMemo, useState } from 'react';
import {
  Animated,
  View,
  ActivityIndicator,
  Pressable,
  Text,
  StyleSheet,
} from 'react-native';
import { CalendarDays, Pencil, Check, Share2 } from 'lucide-react-native';
import { useTranslation } from 'react-i18next';
import { useTheme } from '../theme/ThemeContext';
import { heeboFont } from '../theme/typography';
import { useDirection } from '../i18n';
import { apiFetch } from '../lib/api';
import { shareSchedulePdfMobile } from '../lib/schedulePdf';
import {
  FieldLabel,
  FilledInput,
  LiquidTabs,
  StickyFilterBar,
} from '../components/ui/FormFields';
import { EmptyStateCard, NoticeBanner } from '../components/ui/Surfaces';
import { ScheduleTable } from '../components/ui/ScheduleTable';
import { Button, FloatingActionButton, LiquidButton } from '../components/ui/Buttons';
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
  const { headerHeight, onScroll, pullToRefreshProps } = useScrollHeader();
  const { flexRow, isRTL } = useDirection();
  const isChild = currentUser.familyRole === 'child';
  const isParent = !isChild;

  const [config, setConfig] = useState<WebtopConfig | null>(null);
  const [selectedChildId, setSelectedChildId] = useState('');
  const [lessons, setLessons] = useState<ScheduleLesson[]>([]);
  const [finishTimes, setFinishTimes] = useState<ScheduleFinishTime[]>([]);
  const [loading, setLoading] = useState(true);
  const [sharingPdf, setSharingPdf] = useState(false);
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

  const loadSchedule = useCallback(async (childId: string) => {
    if (!childId) {
      setLoading(false);
      return;
    }
    setLoading(true);

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

  const currentChild = useMemo(() => {
    if (!config?.linkedChildren?.length) return null;
    if (selectedChildId) {
      return (
        config.linkedChildren.find(
          (c) => c.id === selectedChildId || c.externalId === selectedChildId
        ) || null
      );
    }
    if (currentUser.linkedChildId) {
      return (
        config.linkedChildren.find(
          (c) =>
            c.id === currentUser.linkedChildId ||
            c.externalId === currentUser.linkedChildId
        ) || null
      );
    }
    return config.linkedChildren[0] || null;
  }, [config, selectedChildId, currentUser.linkedChildId]);

  const handleSelectChild = useCallback(
    (childId: string) => {
      if (isEditMode) {
        setIsEditMode(false);
      }
      if (childId !== selectedChildId) {
        setSelectedChildId(childId);
      }
    },
    [isEditMode, selectedChildId]
  );

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

  const handleSharePdf = useCallback(async () => {
    if (sharingPdf) return;
    setSharingPdf(true);
    try {
      await shareSchedulePdfMobile({
        lessons,
        finishTimes,
        childColor: currentChild?.color,
        isRtl: isRTL,
        t,
      });
    } catch (err) {
      console.error('Schedule share PDF failed:', err);
    } finally {
      setSharingPdf(false);
    }
  }, [sharingPdf, lessons, finishTimes, currentChild?.color, isRTL, t]);

  const hasChildFilter = isParent && (config?.linkedChildren?.length || 0) > 0;

  return (
    <View style={{ flex: 1 }}>
      <Animated.ScrollView
        style={styles.container}
        contentContainerStyle={[styles.content, { paddingTop: headerHeight + 8 }]}
        onScroll={onScroll}
        scrollEventThrottle={16}
        {...pullToRefreshProps}
      >
        {isChild && !currentUser.linkedChildId ? (
          <NoticeBanner variant="warning" description={t('schedule.child_unlinked_desc')} />
        ) : null}

        {(hasChildFilter || Boolean(selectedChildId)) && (
          <StickyFilterBar style={styles.scheduleStickyFilterBar}>
            <View
              style={[
                styles.filterRow,
                {
                  flexDirection: flexRow,
                  justifyContent: hasChildFilter ? 'space-between' : 'flex-start',
                },
              ]}
            >
              {hasChildFilter && (
                <View style={{ flex: 1, minWidth: 0 }}>
                  <LiquidTabs
                    testID="schedule-child-selector"
                    tabs={(config?.linkedChildren || []).map((c) => ({
                      label: c.firstName,
                      value: c.id,
                    }))}
                    value={selectedChildId}
                    onChange={handleSelectChild}
                  />
                </View>
              )}
              {selectedChildId ? (
                <LiquidButton
                  testID="schedule-share-btn"
                  icon={Share2}
                  label={t('schedule.share')}
                  accessibilityLabel={t('schedule.share')}
                  disabled={loading || sharingPdf}
                  loading={sharingPdf}
                  onPress={handleSharePdf}
                />
              ) : null}
            </View>
          </StickyFilterBar>
        )}

        {loading ? (
          <View style={styles.center}>
            <ActivityIndicator size="large" color={palette.primary} />
          </View>
        ) : !selectedChildId ? (
          <EmptyStateCard
            centered
            icon={CalendarDays}
            title={t('schedule.no_students_found')}
            description={t('schedule.no_children_warning')}
          />
        ) : (
          <ScheduleTable
            lessons={lessons}
            finishTimes={finishTimes}
            childColorId={currentChild?.color}
            isEditMode={isEditMode}
            canEdit={isParent && isEditMode}
            resetScrollKey={selectedChildId}
            onPressCell={(dayOfWeek, hourNum, lesson) => {
              if (!isParent || !isEditMode) return;
              setEditingLesson({ dayOfWeek, hourNum });
              setFormSubject(lesson?.subject || '');
            }}
            onPressFinishTime={(dayOfWeek, currentFinish) => {
              if (!isParent || !isEditMode) return;
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
                  style={[
                    heeboFont('600'),
                    {
                      fontSize: 13,
                      color: formFinishTime === preset ? '#ffffff' : palette.foreground,
                    },
                  ]}
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
    flexGrow: 1,
    padding: 16,
    paddingBottom: 110,
    gap: 12,
  },
  filterRow: {
    alignItems: 'center',
    gap: 10,
  },
  scheduleStickyFilterBar: {
    marginBottom: 12,
  },
  center: {
    flex: 1,
    paddingVertical: 48,
    alignItems: 'center',
    justifyContent: 'center',
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
