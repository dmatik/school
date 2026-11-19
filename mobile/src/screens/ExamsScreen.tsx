import React, { useCallback, useEffect, useMemo, useState } from 'react';
import {
  View,
  ScrollView,
  RefreshControl,
  ActivityIndicator,
  StyleSheet,
} from 'react-native';
import { FileCheck, Plus } from 'lucide-react-native';
import { useTranslation } from 'react-i18next';
import { useTheme } from '../theme/ThemeContext';
import { apiFetch } from '../lib/api';
import {
  FieldLabel,
  FilledInput,
  LiquidTabs,
  SearchInput,
  SelectField,
} from '../components/ui/FormFields';
import { EmptyStateCard, NoticeBanner } from '../components/ui/Surfaces';
import { ExamCard } from '../components/ui/Cards';
import { Button, FloatingActionButton } from '../components/ui/Buttons';
import { ConfirmModal, FullScreenModal } from '../components/ui/Modal';
import type { ExamItem, WebtopConfig, User } from '../../../src/types';

export function ExamsScreen({
  currentUser,
  syncTrigger,
}: {
  currentUser: User;
  syncTrigger: number;
}) {
  const { t } = useTranslation();
  const { palette } = useTheme();
  const isChild = currentUser.familyRole === 'child';
  const isParent = !isChild;

  const [exams, setExams] = useState<ExamItem[]>([]);
  const [config, setConfig] = useState<WebtopConfig | null>(null);
  const [selectedChildId, setSelectedChildId] = useState('all');
  const [period, setPeriod] = useState<'future' | 'past'>('future');
  const [search, setSearch] = useState('');
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

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
    else setLoading(true);
    try {
      const [cfgRes, exRes] = await Promise.all([
        apiFetch('/api/webtop/config'),
        apiFetch(`/api/exams?childId=${encodeURIComponent(selectedChildId)}`),
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
    } catch (err) {
      console.error('Exams load error:', err);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [selectedChildId, formChildId]);

  useEffect(() => {
    loadData();
  }, [loadData, syncTrigger]);

  const filtered = useMemo(() => {
    const today = new Date().toISOString().slice(0, 10);
    const q = search.trim().toLowerCase();
    return exams
      .filter((ex) => {
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
  }, [exams, period, search]);

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

  return (
    <View style={{ flex: 1 }}>
      <ScrollView
        style={styles.container}
        contentContainerStyle={styles.content}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={() => loadData(true)} />
        }
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

        <LiquidTabs
          tabs={[
            { label: t('exams.period_future'), value: 'future' },
            { label: t('exams.period_past'), value: 'past' },
          ]}
          value={period}
          onChange={(v) => setPeriod(v as 'future' | 'past')}
        />

        {!isChild && (config?.linkedChildren?.length || 0) > 1 && (
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
        )}

        {loading ? (
          <View style={styles.center}>
            <ActivityIndicator size="large" color={palette.primary} />
          </View>
        ) : filtered.length === 0 ? (
          <EmptyStateCard
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
          filtered.map((ex) => (
            <ExamCard
              key={ex.id}
              exam={ex}
              childColor={getChildColor(ex.childId)}
              canEdit={isParent}
              onEdit={() => openEditModal(ex)}
              onDelete={() => setDeleteTarget(ex)}
            />
          ))
        )}
      </ScrollView>

      {isParent && (
        <FloatingActionButton
          testID="add-exam-fab"
          icon={Plus}
          accessibilityLabel={t('exams.add_exam_button')}
          onPress={openAddModal}
        />
      )}

      <FullScreenModal
        visible={modalOpen}
        onClose={() => setModalOpen(false)}
        title={editingExam ? t('exams.edit_modal_title') : t('exams.add_modal_title')}
        description={editingExam ? t('exams.edit_modal_desc') : t('exams.add_modal_desc')}
        footer={
          <View style={styles.modalFooterRow}>
            <Button
              label={t('common.cancel')}
              variant="outline"
              onPress={() => setModalOpen(false)}
              style={{ flex: 1 }}
            />
            <Button
              label={t('common.save')}
              loading={saving}
              onPress={handleSave}
              style={{ flex: 1 }}
            />
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
            value={formName}
            onChangeText={setFormName}
            placeholder={t('exams.name_placeholder')}
          />
        </View>

        <View style={{ gap: 6 }}>
          <FieldLabel label={t('exams.date_label')} />
          <FilledInput
            forceLtr
            value={formDate}
            onChangeText={setFormDate}
            placeholder="YYYY-MM-DD"
          />
        </View>

        <View style={{ gap: 6 }}>
          <FieldLabel label={t('exams.description_label')} />
          <FilledInput
            value={formDesc}
            onChangeText={setFormDesc}
            placeholder={t('exams.description_placeholder')}
            multiline
          />
        </View>

        <View style={{ gap: 6 }}>
          <FieldLabel label={t('exams.grade_label')} />
          <FilledInput
            forceLtr
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
    padding: 16,
    paddingBottom: 110,
    gap: 12,
  },
  center: {
    paddingVertical: 48,
    alignItems: 'center',
  },
  modalFooterRow: {
    flexDirection: 'row',
    gap: 10,
  },
});
