import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  Animated,
  View,
  RefreshControl,
  ActivityIndicator,
  StyleSheet,
} from 'react-native';
import { format } from 'date-fns';
import { AlertCircle } from 'lucide-react-native';
import { useTranslation } from 'react-i18next';
import { useTheme } from '../theme/ThemeContext';
import { useDirection } from '../i18n';
import { apiFetch } from '../lib/api';
import { formatDateSectionHeader } from '../lib/dateUtils';
import { LiquidTabs, SearchInput, StickyFilterBar } from '../components/ui/FormFields';
import { LiquidDatePicker } from '../components/ui/LiquidDatePicker';
import { EmptyStateCard, NoticeBanner, SectionDateHeader } from '../components/ui/Surfaces';
import { IncidentCard } from '../components/ui/Cards';
import { useScrollHeader } from '../components/ui/MobileHeader';
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
  const { flexRow } = useDirection();
  const { headerHeight, onScroll, pullToRefreshProps } = useScrollHeader();
  const isChild = currentUser.familyRole === 'child';

  const [items, setItems] = useState<Incident[]>([]);
  const [config, setConfig] = useState<WebtopConfig | null>(null);
  const [selectedChildId, setSelectedChildId] = useState('all');
  const [selectedDate, setSelectedDate] = useState<Date | undefined>(undefined);
  const [search, setSearch] = useState('');
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const hasLoadedRef = useRef(false);

  const loadData = useCallback(async (isRefresh = false) => {
    if (isRefresh) setRefreshing(true);
    else if (!hasLoadedRef.current) setLoading(true);
    try {
      const [cfgRes, incRes] = await Promise.all([
        apiFetch('/api/webtop/config'),
        apiFetch('/api/incidents?childId=all'),
      ]);
      if (cfgRes.ok) setConfig(await cfgRes.json());
      if (incRes.ok) {
        const data = await incRes.json();
        setItems(Array.isArray(data) ? data : data.incidents || []);
      }
      hasLoadedRef.current = true;
    } catch (err) {
      console.error('Incidents load error:', err);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => {
    loadData();
  }, [loadData, syncTrigger]);

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    const formattedDate = selectedDate ? format(selectedDate, 'yyyy-MM-dd') : null;
    const selectedChild =
      selectedChildId !== 'all'
        ? config?.linkedChildren?.find(
            (c) => c.id === selectedChildId || c.externalId === selectedChildId
          )
        : null;

    return items.filter((item) => {
      if (selectedChild) {
        const matchesId =
          item.childId === selectedChild.id ||
          item.studentId === selectedChild.id ||
          (selectedChild.externalId &&
            (item.childId === selectedChild.externalId ||
              item.studentId === selectedChild.externalId));
        const matchesName =
          item.studentName &&
          item.studentName.trim() ===
            `${selectedChild.firstName} ${selectedChild.lastName}`.trim();
        if (!matchesId && !matchesName) return false;
      }
      if (formattedDate && item.date !== formattedDate) return false;
      if (!q) return true;
      const hay = `${item.type} ${item.subject || ''} ${item.description} ${item.teacher || ''} ${item.studentName || ''}`.toLowerCase();
      return hay.includes(q);
    });
  }, [items, selectedChildId, config, selectedDate, search]);

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

  const hasChildFilter = !isChild && (config?.linkedChildren?.length || 0) > 1;

  return (
    <Animated.ScrollView
      style={styles.container}
      contentContainerStyle={[styles.content, { paddingTop: headerHeight + 8 }]}
      onScroll={onScroll}
      scrollEventThrottle={16}
      {...pullToRefreshProps}
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
                tabs={childOptions}
                value={selectedChildId}
                onChange={setSelectedChildId}
              />
            </View>
          )}
          <LiquidDatePicker
            testID="incidents-date-picker"
            date={selectedDate}
            setDate={setSelectedDate}
            isChild={isChild}
            fullFormat={!hasChildFilter}
          />
        </View>
      </StickyFilterBar>

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
          <View key={date} style={{ gap: 4 }}>
            <SectionDateHeader
              title={formatDateSectionHeader(date, i18n.language, t)}
            />
            <View style={{ gap: 10 }}>
              {list.map((inc) => (
                <IncidentCard
                  key={inc.id}
                  item={inc}
                  childColor={getChildColor(inc.childId || inc.studentId)}
                  showChildBadge={!isChild}
                />
              ))}
            </View>
          </View>
        ))
      )}
    </Animated.ScrollView>
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
  filterRow: {
    alignItems: 'center',
    gap: 8,
  },
});
