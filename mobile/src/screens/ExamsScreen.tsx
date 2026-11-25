import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  Animated,
  View,
  RefreshControl,
  ActivityIndicator,
  StyleSheet,
} from 'react-native';
import { FileCheck, Plus, Trash2 } from 'lucide-react-native';
import { format, isValid, parseISO } from 'date-fns';
import { useTranslation } from 'react-i18next';
import { useTheme } from '../theme/ThemeContext';
import { useDirection } from '../i18n';
import { apiFetch } from '../lib/api';
import {
  CounterField,
  FieldLabel,
  FilledInput,
  FilledTextarea,
  LiquidTabs,
  SearchInput,
  SelectField,
  StickyFilterBar,
} from '../components/ui/FormFields';
import { DatePickerField } from '../components/ui/LiquidDatePicker';
import { EmptyStateCard, NoticeBanner, SectionDateHeader } from '../components/ui/Surfaces';
import { formatDateSectionHeader } from '../lib/dateUtils';
import { ExamCard } from '../components/ui/Cards';
import { Button, FloatingActionButton, useFabScrollPadding } from '../components/ui/Buttons';
import { ConfirmModal, FullScreenModal } from '../components/ui/Modal';
import { useScrollHeader } from '../components/ui/MobileHeader';
import type { ExamItem, WebtopConfig, User } from '../../../src/types';

export function ExamsScreen({
  currentUser,
  syncTrigger,
}: {
  currentUser: User;
  syncTrigger: number;
}) {
  const { t, i18n } = useTranslation();
  const { palette } = useTheme();
  const { flexRow } = useDirection();
  const { headerHeight, onScroll, pullToRefreshProps, scrollRef } = useScrollHeader('exams');
  const isChild = currentUser.familyRole === 'child';
  const isParent = !isChild;

  const [exams, setExams] = useState<ExamItem[]>([]);
  const [config, setConfig] = useState<WebtopConfig | null>(null);
  const [selectedChildId, setSelectedChildId] = useState('all');
  const [period, setPeriod] = useState<'future' | 'past'>('future');
  const [search, setSearch] = useState('');
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const hasLoadedRef = useRef(false);

  const [modalOpen, setModalOpen] = useState(false);
  const [editingExam, setEditingExam] = useState<ExamItem | null>(null);
  const [formChildId, setFormChildId] = useState('');
  const [formName, setFormName] = useState('');
  const [formDesc, setFormDesc] = useState('');
  const [formDate, setFormDate] = useState(new Date().toISOString().slice(0, 10));
  const [formGrade, setFormGrade] = useState('');
  const [saving, setSaving] = useState(false);

  const [deleteTarget, setDeleteTarget] = useState<ExamItem | null>(null);
  const [deleting, setDeleting] = useState(false);

  const loadData = useCallback(async (isRefresh = false) => {
    if (isRefresh) setRefreshing(true);
    else if (!hasLoadedRef.current) setLoading(true);
    try {
      const [cfgRes, exRes] = await Promise.all([
        apiFetch('/api/webtop/config'),
        apiFetch('/api/exams?childId=all'),
      ]);
      if (cfgRes.ok) {
        const cfg: WebtopConfig = await cfgRes.json();
        setConfig(cfg);
        if (!formChildId && cfg.linkedChildren?.length) {
          setFormChildId(cfg.linkedChildren[0].id);
        }
      }
      if (exRes.ok) {
        const data = await exRes.json();
        setExams(Array.isArray(data) ? data : data.exams || []);
      }
      hasLoadedRef.current = true;
    } catch (err) {
      console.error('Exams load error:', err);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [formChildId]);

  useEffect(() => {
    loadData();
  }, [loadData, syncTrigger]);

  const filtered = useMemo(() => {
    const today = new Date().toISOString().slice(0, 10);
    const q = search.trim().toLowerCase();
    const selectedChild =
      selectedChildId !== 'all'
        ? config?.linkedChildren?.find(
            (c) => c.id === selectedChildId || c.externalId === selectedChildId
          )
        : null;

    return exams
      .filter((ex) => {
        if (selectedChild) {
          const matchesId =
            ex.childId === selectedChild.id ||
            (selectedChild.externalId && ex.childId === selectedChild.externalId);
          const matchesName =
            ex.studentName.trim() ===
            `${selectedChild.firstName} ${selectedChild.lastName}`.trim();
          if (!matchesId && !matchesName) return false;
        }
        if (period === 'future' && ex.date < today) return false;
        if (period === 'past' && ex.date >= today) return false;
        if (q) {
          const hay = `${ex.name} ${ex.description || ''} ${ex.studentName}`.toLowerCase();
          if (!hay.includes(q)) return false;
        }
        return true;
      })
      .sort((a, b) =>
        period === 'future' ? a.date.localeCompare(b.date) : b.date.localeCompare(a.date)
      );
  }, [exams, selectedChildId, config, period, search]);

  const groupedByDate = useMemo(() => {
    const groups: Record<string, ExamItem[]> = {};
    for (const ex of filtered) {
      const key = ex.date || 'no-date';
      if (!groups[key]) groups[key] = [];
      groups[key].push(ex);
    }
    return Object.entries(groups);
  }, [filtered]);

  const openAddModal = () => {
    setEditingExam(null);
    setFormChildId(config?.linkedChildren?.[0]?.id || '');
    setFormName('');
    setFormDesc('');
    setFormDate(new Date().toISOString().slice(0, 10));
    setFormGrade('');
    setModalOpen(true);
  };

  const openEditModal = (exam: ExamItem) => {
    setEditingExam(exam);
    setFormChildId(exam.childId);
    setFormName(exam.name);
    setFormDesc(exam.description || '');
    setFormDate(exam.date);
    setFormGrade(exam.grade || '');
    setModalOpen(true);
  };

  const handleSave = async () => {
    if (!formName.trim() || !formDate.trim() || !formChildId) return;
    setSaving(true);
    try {
      const payload = {
        childId: formChildId,
        name: formName.trim(),
        description: formDesc.trim() || null,
        date: formDate.trim(),
        grade: formGrade.trim() || null,
      };
      const res = editingExam
        ? await apiFetch(`/api/exams/${encodeURIComponent(editingExam.id)}`, {
            method: 'PUT',
            body: JSON.stringify(payload),
          })
        : await apiFetch('/api/exams', {
            method: 'POST',
            body: JSON.stringify(payload),
          });
      if (res.ok) {
        setModalOpen(false);
        await loadData();
      }
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async () => {
    if (!deleteTarget) return;
    setDeleting(true);
    try {
      const res = await apiFetch(`/api/exams/${encodeURIComponent(deleteTarget.id)}`, {
        method: 'DELETE',
      });
      if (res.ok) {
        setDeleteTarget(null);
        await loadData();
      }
    } finally {
      setDeleting(false);
    }
  };

  const getChildColor = (childId?: string) =>
    config?.linkedChildren?.find((c) => c.id === childId || c.externalId === childId)?.color;

  const hasChildFilter = !isChild && (config?.linkedChildren?.length || 0) > 1;
  const bottomPadding = useFabScrollPadding(isParent);

  return (
    <View style={{ flex: 1 }}>
      <Animated.ScrollView
        ref={scrollRef}
        style={styles.container}
        contentContainerStyle={[styles.content, { paddingTop: headerHeight + 8, paddingBottom: bottomPadding }]}
        showsVerticalScrollIndicator={false}
        onScroll={onScroll}
        scrollEventThrottle={16}
        {...pullToRefreshProps}
      >
        {isChild && !currentUser.linkedChildId ? (
          <NoticeBanner variant="warning" description={t('exams.child_unlinked_desc')} />
        ) : null}

        <SearchInput
          testID="exams-search-input"
          value={search}
          onChangeText={setSearch}
          placeholder={t('exams.search_placeholder')}
        />

        <StickyFilterBar>
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
                  tabs={[
                    { label: t('exams.all_short'), value: 'all' },
                    ...(config?.linkedChildren || []).map((c) => ({
                      label: c.firstName,
                      value: c.id,
                    })),
                  ]}
                  value={selectedChildId}
                  onChange={setSelectedChildId}
                />
              </View>
            )}

            <LiquidTabs
              tabs={[
                { label: t('exams.period_future'), value: 'future' },
                { label: t('exams.period_past'), value: 'past' },
              ]}
              value={period}
              onChange={(v) => setPeriod(v as 'future' | 'past')}
            />
          </View>
        </StickyFilterBar>

        {loading ? (
          <View style={styles.center}>
            <ActivityIndicator size="large" color={palette.primary} />
          </View>
        ) : filtered.length === 0 ? (
          <EmptyStateCard
            centered
            icon={FileCheck}
            title={
              period === 'future'
                ? t('exams.empty_future_title')
                : t('exams.empty_past_title')
            }
            description={
              exams.length > 0
                ? t('exams.no_exams_match')
                : period === 'future'
                ? t('exams.empty_future_desc')
                : t('exams.empty_past_desc')
            }
          />
        ) : (
          groupedByDate.map(([date, list]) => (
            <View key={date} style={{ gap: 4 }}>
              {date !== 'no-date' && (
                <SectionDateHeader
                  title={formatDateSectionHeader(date, i18n.language, t)}
                />
              )}
              <View style={{ gap: 10 }}>
                {list.map((ex) => (
                  <ExamCard
                    key={ex.id}
                    exam={ex}
                    childColor={getChildColor(ex.childId)}
                    showChildBadge={!isChild}
                    canEdit={isParent}
                    onEdit={() => openEditModal(ex)}
                    onDelete={() => setDeleteTarget(ex)}
                  />
                ))}
              </View>
            </View>
          ))
        )}
      </Animated.ScrollView>

      {isParent && (
        <FloatingActionButton
          testID="add-exam-fab"
          icon={Plus}
          accessibilityLabel={t('exams.add_exam_button')}
          onPress={openAddModal}
        />
      )}

      <FullScreenModal
        testID="exam-modal"
        visible={modalOpen}
        onClose={() => setModalOpen(false)}
        title={editingExam ? t('exams.edit_modal_title') : t('exams.add_modal_title')}
        description={editingExam ? t('exams.edit_modal_desc') : t('exams.add_modal_desc')}
        footer={
          <View style={[styles.modalFooterRow, { flexDirection: flexRow, justifyContent: 'space-between', alignItems: 'center' }]}>
            {editingExam ? (
              <Button
                label={t('common.delete')}
                variant="destructive"
                size="sm"
                icon={Trash2}
                onPress={() => {
                  const target = editingExam;
                  setModalOpen(false);
                  setDeleteTarget(target);
                }}
              />
            ) : (
              <View />
            )}
            <View style={{ flexDirection: flexRow, gap: 8, alignItems: 'center' }}>
              <Button
                testID="exam-cancel-btn"
                label={t('common.cancel')}
                variant="outline"
                size="sm"
                onPress={() => setModalOpen(false)}
              />
              <Button
                testID="exam-save-btn"
                label={t('common.save')}
                size="sm"
                loading={saving}
                onPress={handleSave}
              />
            </View>
          </View>
        }
      >
        {(config?.linkedChildren?.length || 0) > 0 && (
          <SelectField
            label={t('exams.child_label')}
            value={formChildId}
            options={(config?.linkedChildren || []).map((c) => ({
              label: `${c.firstName} ${c.lastName}`.trim(),
              value: c.id,
            }))}
            onValueChange={setFormChildId}
          />
        )}

        <View style={{ gap: 6 }}>
          <FieldLabel label={t('exams.name_label')} />
          <FilledInput
            testID="exam-name-input"
            value={formName}
            onChangeText={setFormName}
            placeholder={t('exams.name_placeholder')}
          />
        </View>

        <DatePickerField
          label={t('exams.date_label')}
          date={(() => {
            if (!formDate) return undefined;
            const d = parseISO(formDate);
            return isValid(d) ? d : undefined;
          })()}
          setDate={(d) => setFormDate(d ? format(d, 'yyyy-MM-dd') : '')}
          clearable={false}
          disableFuture={false}
          formatPattern="dd/MM/yyyy"
        />

        <CounterField
          label={t('exams.description_label')}
          currentLength={formDesc.length}
          maxLength={200}
        >
          <FilledTextarea
            value={formDesc}
            maxLength={200}
            onChangeText={setFormDesc}
            placeholder={t('exams.description_placeholder')}
          />
        </CounterField>

        <View style={{ gap: 6 }}>
          <FieldLabel label={t('exams.grade_label')} />
          <FilledInput
            value={formGrade}
            onChangeText={setFormGrade}
            placeholder={t('exams.grade_placeholder')}
          />
        </View>
      </FullScreenModal>

      <ConfirmModal
        visible={Boolean(deleteTarget)}
        onClose={() => setDeleteTarget(null)}
        onConfirm={handleDelete}
        title={t('exams.delete_modal_title')}
        description={t('exams.delete_confirm')}
        confirmText={t('common.delete')}
        cancelText={t('common.cancel')}
        loading={deleting}
      />
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
    gap: 8,
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
});
