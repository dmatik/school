import React, { useCallback, useEffect, useMemo, useState } from 'react';
import {
  View,
  ScrollView,
  RefreshControl,
  ActivityIndicator,
  StyleSheet,
} from 'react-native';
import { BookOpen } from 'lucide-react-native';
import { useTranslation } from 'react-i18next';
import { useTheme } from '../theme/ThemeContext';
import { apiFetch } from '../lib/api';
import { formatDateSectionHeader } from '../lib/dateUtils';
import { getHomeworkText, consolidateHomework } from '../lib/homeworkUtils';
import { LiquidTabs, SearchInput } from '../components/ui/FormFields';
import { EmptyStateCard, NoticeBanner, SectionDateHeader } from '../components/ui/Surfaces';
import { HomeworkCard } from '../components/ui/Cards';
import type {
  HomeworkItem,
  ConsolidatedHomeworkItem,
  WebtopConfig,
  User,
} from '../../../src/types';

export function HomeworkScreen({
  currentUser,
  syncTrigger,
}: {
  currentUser: User;
  syncTrigger: number;
}) {
  const { t, i18n } = useTranslation();
  const { palette } = useTheme();
  const isChild = currentUser.familyRole === 'child';

  const [items, setItems] = useState<HomeworkItem[]>([]);
  const [config, setConfig] = useState<WebtopConfig | null>(null);
  const [selectedChildId, setSelectedChildId] = useState('all');
  const [search, setSearch] = useState('');
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const loadData = useCallback(async (isRefresh = false) => {
    if (isRefresh) setRefreshing(true);
    else setLoading(true);

    try {
      const [cfgRes, hwRes] = await Promise.all([
        apiFetch('/api/webtop/config'),
        apiFetch(`/api/homework?childId=${encodeURIComponent(selectedChildId)}`),
      ]);
      if (cfgRes.ok) {
        setConfig(await cfgRes.json());
      }
      if (hwRes.ok) {
        const data = await hwRes.json();
        setItems(Array.isArray(data) ? data : data.homework || []);
      }
    } catch (err) {
      console.error('Homework load error:', err);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [selectedChildId]);

  useEffect(() => {
    loadData();
  }, [loadData, syncTrigger]);

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    const list = items.filter((item) => {
      const hwText = getHomeworkText(item);
      if (!hwText) return false;
      if (q) {
        const hay = `${item.subject} ${hwText} ${item.teacher || ''} ${item.studentName || ''}`.toLowerCase();
        if (!hay.includes(q)) return false;
      }
      return true;
    });
    return consolidateHomework(list);
  }, [items, search]);

  const groupedByDate = useMemo(() => {
    const groups = new Map<string, ConsolidatedHomeworkItem[]>();
    for (const item of filtered) {
      const list = groups.get(item.dueDate) || [];
      list.push(item);
      groups.set(item.dueDate, list);
    }
    return Array.from(groups.entries()).sort((a, b) => b[0].localeCompare(a[0]));
  }, [filtered]);

  const childOptions = useMemo(() => {
    const kids = config?.linkedChildren || [];
    return [
      { label: t('homework.all_short'), value: 'all' },
      ...kids.map((c) => ({
        label: c.firstName,
        value: c.id,
      })),
    ];
  }, [config, t]);

  const getChildColor = (childId?: string) =>
    config?.linkedChildren?.find((c) => c.id === childId || c.externalId === childId)?.color;

  return (
    <ScrollView
      style={styles.container}
      contentContainerStyle={styles.content}
      refreshControl={
        <RefreshControl refreshing={refreshing} onRefresh={() => loadData(true)} />
      }
    >
      {isChild && !currentUser.linkedChildId ? (
        <NoticeBanner variant="warning" description={t('homework.child_unlinked_desc')} />
      ) : null}

      <SearchInput
        testID="homework-search-input"
        value={search}
        onChangeText={setSearch}
        placeholder={t('homework.search_placeholder')}
      />

      {!isChild && (config?.linkedChildren?.length || 0) > 1 && (
        <LiquidTabs
          tabs={childOptions}
          value={selectedChildId}
          onChange={setSelectedChildId}
        />
      )}

      {loading ? (
        <View style={styles.center}>
          <ActivityIndicator size="large" color={palette.primary} />
        </View>
      ) : groupedByDate.length === 0 ? (
        <EmptyStateCard
          icon={BookOpen}
          title={t('homework.empty_title')}
          description={
            items.length > 0 ? t('homework.no_homework_match') : t('homework.empty_desc')
          }
        />
      ) : (
        groupedByDate.map(([date, list]) => (
          <View key={date} style={{ gap: 8 }}>
            <SectionDateHeader
              title={formatDateSectionHeader(date, i18n.language, t)}
            />
            {list.map((hw) => (
              <HomeworkCard
                key={hw.ids.join('-')}
                item={hw}
                childColor={getChildColor(hw.childId || hw.studentId)}
              />
            ))}
          </View>
        ))
      )}
    </ScrollView>
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
});
