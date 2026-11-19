import React, { useCallback, useEffect, useMemo, useState } from 'react';
import {
  View,
  ScrollView,
  RefreshControl,
  ActivityIndicator,
  StyleSheet,
} from 'react-native';
import { AlertCircle } from 'lucide-react-native';
import { useTranslation } from 'react-i18next';
import { useTheme } from '../theme/ThemeContext';
import { apiFetch } from '../lib/api';
import { formatDateSectionHeader } from '../lib/dateUtils';
import { LiquidTabs, SearchInput } from '../components/ui/FormFields';
import { EmptyStateCard, NoticeBanner, SectionDateHeader } from '../components/ui/Surfaces';
import { IncidentCard } from '../components/ui/Cards';
import type { Incident, WebtopConfig, User } from '../../../src/types';

export function IncidentsScreen({
  currentUser,
  syncTrigger,
}: {
  currentUser: User;
  syncTrigger: number;
}) {
  const { t, i18n } = useTranslation();
  const { palette } = useTheme();
  const isChild = currentUser.familyRole === 'child';

  const [items, setItems] = useState<Incident[]>([]);
  const [config, setConfig] = useState<WebtopConfig | null>(null);
  const [selectedChildId, setSelectedChildId] = useState('all');
  const [search, setSearch] = useState('');
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const loadData = useCallback(async (isRefresh = false) => {
    if (isRefresh) setRefreshing(true);
    else setLoading(true);
    try {
      const [cfgRes, incRes] = await Promise.all([
        apiFetch('/api/webtop/config'),
        apiFetch(`/api/incidents?childId=${encodeURIComponent(selectedChildId)}`),
      ]);
      if (cfgRes.ok) setConfig(await cfgRes.json());
      if (incRes.ok) {
        const data = await incRes.json();
        setItems(Array.isArray(data) ? data : data.incidents || []);
      }
    } catch (err) {
      console.error('Incidents load error:', err);
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
    return items.filter((item) => {
      if (!q) return true;
      const hay = `${item.type} ${item.subject || ''} ${item.description} ${item.teacher || ''} ${item.studentName || ''}`.toLowerCase();
      return hay.includes(q);
    });
  }, [items, search]);

  const groupedByDate = useMemo(() => {
    const groups = new Map<string, Incident[]>();
    for (const item of filtered) {
      const list = groups.get(item.date) || [];
      list.push(item);
      groups.set(item.date, list);
    }
    return Array.from(groups.entries()).sort((a, b) => b[0].localeCompare(a[0]));
  }, [filtered]);

  const childOptions = useMemo(() => {
    const kids = config?.linkedChildren || [];
    return [
      { label: t('incidents.all_short'), value: 'all' },
      ...kids.map((c) => ({ label: c.firstName, value: c.id })),
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
        <NoticeBanner variant="warning" description={t('incidents.child_unlinked_desc')} />
      ) : null}

      <SearchInput
        testID="incidents-search-input"
        value={search}
        onChangeText={setSearch}
        placeholder={t('incidents.search_placeholder')}
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
          icon={AlertCircle}
          title={t('incidents.empty_title')}
          description={
            items.length > 0 ? t('incidents.no_incidents_match') : t('incidents.empty_desc')
          }
        />
      ) : (
        groupedByDate.map(([date, list]) => (
          <View key={date} style={{ gap: 8 }}>
            <SectionDateHeader
              title={formatDateSectionHeader(date, i18n.language, t)}
            />
            {list.map((inc) => (
              <IncidentCard
                key={inc.id}
                item={inc}
                childColor={getChildColor(inc.childId || inc.studentId)}
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
