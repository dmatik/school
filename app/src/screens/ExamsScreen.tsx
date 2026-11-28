import React, { useCallback, useEffect, useMemo, useRef, useState, type ComponentRef } from 'react';
import {
  Animated,
  Platform,
  View,
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
  AndroidStickyBlurHost,
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
import { AndroidBlurTargetProvider } from '../components/ui/GlassBackdrop';
import { ConfirmModal, FullScreenModal } from '../components/ui/Modal';
import { InlineWebMobileHeader, useScrollHeader } from '../components/ui/MobileHeader';
import { PageHeader } from '../components/ui/PageHeader';
import { useResponsiveLayout } from '../hooks/useResponsiveLayout';
import type { ExamItem, WebtopConfig, User } from '../../../shared/types';

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
  const { isDesktop, pageMaxWidth } = useResponsiveLayout();
  const { headerHeight, onScroll, pullToRefreshProps, scrollRef } = useScrollHeader('exams');
  const fabBlurTargetRef = useRef<ComponentRef<typeof View> | null>(null);
  const isChild = currentUser.familyRole === 'child';
  const isParent = !isChild;

  const [exams, setExams] = useState<ExamItem[]>([]);
  const [config, setConfig] = useState<WebtopConfig | null>(null);
  const [selectedChildId, setSelectedChildId] = useState('all');
  const [period, setPeriod] = useState<'future' | 'past'>('future');
  const [search, setSearch] = useState('');
  const [loading, setLoading] = useState(true);
  const hasLoadedRef = useRef(false);

  const [modalOpen, setModalOpen] = useState(false);
  const [editingExam, setEditingExam] = useState<ExamItem | null>(null);
  const [formChildId, setFormChildId] = useState('');
  const [formName, setFormName] = useState('');
  const [formDesc, setFormDesc] = useState('');
  const [formDate, setFormDate] = useState(() => format(new Date(), 'yyyy-MM-dd'));
  const [formGrade, setFormGrade] = useState('');
  const [saving, setSaving] = useState(false);

  const [deleteTarget, setDeleteTarget] = useState<ExamItem | null>(null);
  const [deleting, setDeleting] = useState(false);

  const loadData = useCallback(async () => {
    if (!hasLoadedRef.current) setLoading(true);
    try {
      const [cfgRes, exRes] = await Promise.all([
        apiFetch('/api/webtop/config'),
        apiFetch('/api/exams?childId=all'),
      ]);
      if (cfgRes.ok) {
        const cfg: WebtopConfig = await cfgRes.json();
        setConfig(cfg);
        if (cfg.linkedChildren?.length) {
          setFormChildId((prev) => prev || cfg.linkedChildren[0].id);
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
    }
  }, []);

  useEffect(() => {
    loadData();
  }, [loadData, syncTrigger]);

  const filtered = useMemo(() => {
    const today = format(new Date(), 'yyyy-MM-dd');
    const q = search.trim().toLowerCase();
    const selectedChild =
      selectedChildId !== 'all'
        ? config?.linkedChildren?.find(
            (c) => c.id === selectedChildId || c.externalId === selectedChildId
          )
        : null;

    return exams
      .filter((ex) => {
        const examDate = ex.date || '';
        if (selectedChild) {
          const matchesId =
            ex.childId === selectedChild.id ||
            (selectedChild.externalId && ex.childId === selectedChild.externalId);
          const matchesName =
            (ex.studentName || '').trim() ===
            `${selectedChild.firstName} ${selectedChild.lastName}`.trim();
          if (!matchesId && !matchesName) return false;
        }
        if (period === 'future' && examDate < today) return false;
        if (period === 'past' && examDate >= today) return false;
        if (q) {
          const hay = `${ex.name || ''} ${ex.description || ''} ${ex.studentName || ''}`.toLowerCase();
          if (!hay.includes(q)) return false;
        }
        return true;
      })
      .sort((a, b) => {
        const dateA = a.date || '';
        const dateB = b.date || '';
        return period === 'future' ? dateA.localeCompare(dateB) : dateB.localeCompare(dateA);
      });
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
    setFormDate(format(new Date(), 'yyyy-MM-dd'));
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
    } catch (err) {
      console.error('Save exam error:', err);
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
    } catch (err) {
      console.error('Delete exam error:', err);
    } finally {
      setDeleting(false);
    }
  };

  const getChildColor = (childId?: string) =>
    config?.linkedChildren?.find((c) => c.id === childId || c.externalId === childId)?.color;

  const hasChildFilter = !isChild && (config?.linkedChildren?.length || 0) > 1;
  const bottomPadding = useFabScrollPadding(isParent);
  const sections = useMemo(
    () => groupedByDate.map(([date, data]) => ({ title: date, data })),
    [groupedByDate]
  );

  const listHeader = (
    <View style={{ gap: 12, marginBottom: 12 }}>
      {isChild && !currentUser.linkedChildId ? (
        <NoticeBanner variant="warning" description={t('exams.child_unlinked_desc')} />
      ) : null}

      <SearchInput
        testID="exams-search-input"
        value={search}
        onChangeText={setSearch}
        placeholder={t('exams.search_placeholder')}
      />

      <StickyFilterBar relativeToHeader>
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
    </View>
  );

  const listEmpty = loading ? (
    <View style={styles.center}>
      <ActivityIndicator size="large" color={palette.primary} />
    </View>
  ) : (
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
  );

  const scrollContentStyle = [
    styles.content,
    isDesktop
      ? {
          maxWidth: pageMaxWidth,
          width: '100%' as const,
          alignSelf: 'center' as const,
          paddingHorizontal: 24,
          paddingTop: 12,
          paddingBottom: bottomPadding,
        }
      : { paddingTop: headerHeight + 8, paddingBottom: bottomPadding },
  ];

  const renderExamSectionHeader = (title: string) =>
    title !== 'no-date' ? (
      <View style={{ marginTop: 8, marginBottom: 4 }}>
        <SectionDateHeader
          title={formatDateSectionHeader(title, i18n.language, t)}
        />
      </View>
    ) : null;

  const renderExamItem = (ex: ExamItem) => (
    <View key={ex.id} style={{ marginBottom: 10 }}>
      <ExamCard
        exam={ex}
        childColor={getChildColor(ex.childId)}
        showChildBadge={!isChild}
        canEdit={isParent}
        onEdit={() => openEditModal(ex)}
      />
    </View>
  );

  return (
    <View style={{ flex: 1 }}>
      <PageHeader title={t('exams.title')} />
      <AndroidStickyBlurHost blurTargetRef={fabBlurTargetRef}>
        {Platform.OS === 'web' ? (
          <Animated.ScrollView
            ref={scrollRef as any}
            style={styles.container}
            contentContainerStyle={scrollContentStyle}
            showsVerticalScrollIndicator={false}
            onScroll={onScroll}
            scrollEventThrottle={16}
          >
            <InlineWebMobileHeader />
            <View style={{ gap: 12, marginBottom: 12 }}>
              {isChild && !currentUser.linkedChildId ? (
                <NoticeBanner variant="warning" description={t('exams.child_unlinked_desc')} />
              ) : null}

              <SearchInput
                testID="exams-search-input"
                value={search}
                onChangeText={setSearch}
                placeholder={t('exams.search_placeholder')}
              />
            </View>

            <StickyFilterBar style={{ marginBottom: 12 }}>
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

            {loading || sections.length === 0
              ? listEmpty
              : sections.map((section) => (
                  <React.Fragment key={section.title}>
                    {renderExamSectionHeader(section.title)}
                    {section.data.map(renderExamItem)}
                  </React.Fragment>
                ))}
          </Animated.ScrollView>
        ) : (
          <Animated.SectionList
            ref={scrollRef as any}
            style={styles.container}
            contentContainerStyle={scrollContentStyle}
            showsVerticalScrollIndicator={false}
            stickySectionHeadersEnabled={false}
            sections={loading ? [] : sections}
            keyExtractor={(item) => item.id}
            ListHeaderComponent={listHeader}
            ListHeaderComponentStyle={{ zIndex: 20, elevation: 20 }}
            ListEmptyComponent={listEmpty}
            renderSectionHeader={({ section }) => renderExamSectionHeader(section.title)}
            renderItem={({ item: ex }) => renderExamItem(ex)}
            onScroll={onScroll}
            scrollEventThrottle={16}
            {...pullToRefreshProps}
          />
        )}
      </AndroidStickyBlurHost>

      {isParent && (
        <AndroidBlurTargetProvider value={fabBlurTargetRef}>
          <FloatingActionButton
            testID="add-exam-fab"
            icon={Plus}
            accessibilityLabel={t('exams.add_exam_button')}
            onPress={openAddModal}
          />
        </AndroidBlurTargetProvider>
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
