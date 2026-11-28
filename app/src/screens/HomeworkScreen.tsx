import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  Animated,
  Platform,
  View,
  ActivityIndicator,
  StyleSheet,
} from 'react-native';
import { format } from 'date-fns';
import { BookOpen } from 'lucide-react-native';
import { useTranslation } from 'react-i18next';
import { useTheme } from '../theme/ThemeContext';
import { useDirection } from '../i18n';
import { apiFetch } from '../lib/api';
import { formatDateSectionHeader } from '../lib/dateUtils';
import { getHomeworkText, consolidateHomework } from '../lib/homeworkUtils';
import { AndroidStickyBlurHost, LiquidTabs, SearchInput, StickyFilterBar } from '../components/ui/FormFields';
import { LiquidDatePicker } from '../components/ui/LiquidDatePicker';
import { Button } from '../components/ui/Buttons';
import { EmptyStateCard, NoticeBanner, SectionDateHeader } from '../components/ui/Surfaces';
import { HomeworkCard } from '../components/ui/Cards';
import { InlineWebMobileHeader, useScrollHeader } from '../components/ui/MobileHeader';
import { PageHeader } from '../components/ui/PageHeader';
import { ScreenScrollView } from '../components/ui/ScreenScrollView';
import { useResponsiveLayout } from '../hooks/useResponsiveLayout';
import type {
  HomeworkItem,
  ConsolidatedHomeworkItem,
  WebtopConfig,
  User,
} from '../../../shared/types';

export function HomeworkScreen({
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
  const { headerHeight, onScroll, pullToRefreshProps, scrollRef } = useScrollHeader('homework');
  const isChild = currentUser.familyRole === 'child';

  const [items, setItems] = useState<HomeworkItem[]>([]);
  const [config, setConfig] = useState<WebtopConfig | null>(null);
  const [selectedChildId, setSelectedChildId] = useState('all');
  const [selectedDate, setSelectedDate] = useState<Date | undefined>(undefined);
  const [search, setSearch] = useState('');
  const [loading, setLoading] = useState(true);
  const hasLoadedRef = useRef(false);

  const loadData = useCallback(async () => {
    if (!hasLoadedRef.current) setLoading(true);

    try {
      const [cfgRes, hwRes] = await Promise.all([
        apiFetch('/api/webtop/config'),
        apiFetch('/api/homework?childId=all'),
      ]);
      if (cfgRes.ok) {
        setConfig(await cfgRes.json());
      }
      if (hwRes.ok) {
        const data = await hwRes.json();
        setItems(Array.isArray(data) ? data : data.homework || []);
      }
      hasLoadedRef.current = true;
    } catch (err) {
      console.error('Homework load error:', err);
    } finally {
      setLoading(false);
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

    const list = items.filter((item) => {
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
      const hwText = getHomeworkText(item);
      if (!hwText) return false;
      if (formattedDate && item.dueDate !== formattedDate) return false;
      if (q) {
        const hay = `${item.subject} ${hwText} ${item.teacher || ''} ${item.studentName || ''}`.toLowerCase();
        if (!hay.includes(q)) return false;
      }
      return true;
    });
    return consolidateHomework(list);
  }, [items, selectedChildId, config, selectedDate, search]);

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

  const hasChildFilter = !isChild && (config?.linkedChildren?.length || 0) > 1;
  const sections = useMemo(
    () => groupedByDate.map(([date, data]) => ({ title: date, data })),
    [groupedByDate]
  );

  const listHeader = (
    <View style={styles.listHeader}>
      {isChild && !currentUser.linkedChildId ? (
        <NoticeBanner variant="warning" description={t('homework.child_unlinked_desc')} />
      ) : null}

      <SearchInput
        testID="homework-search-input"
        value={search}
        onChangeText={setSearch}
        placeholder={t('homework.search_placeholder')}
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
                tabs={childOptions}
                value={selectedChildId}
                onChange={setSelectedChildId}
              />
            </View>
          )}
          <LiquidDatePicker
            testID="homework-date-picker"
            date={selectedDate}
            setDate={setSelectedDate}
            isChild={isChild}
            fullFormat={!hasChildFilter}
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
      icon={BookOpen}
      title={
        selectedDate && !search
          ? t('homework.no_homework_for_date')
          : search || selectedDate
          ? t('homework.no_homework_match')
          : t('homework.empty_title')
      }
      description={
        search || selectedDate ? undefined : t('homework.empty_desc')
      }
      action={
        selectedDate ? (
          <View style={[styles.emptyActions, { flexDirection: flexRow }]}>
            <Button
              label={t('homework.back_to_today')}
              variant="outline"
              size="sm"
              onPress={() => setSelectedDate(new Date())}
            />
            <Button
              label={t('common.all_dates')}
              variant="ghost"
              size="sm"
              onPress={() => setSelectedDate(undefined)}
            />
          </View>
        ) : undefined
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
          paddingBottom: 24,
        }
      : { paddingTop: headerHeight + 8 },
  ];

  const renderSectionHeader = (title: string) => (
    <View style={styles.sectionHeaderWrap}>
      <SectionDateHeader
        title={formatDateSectionHeader(title, i18n.language, t)}
      />
    </View>
  );

  const renderHomeworkItem = (hw: ConsolidatedHomeworkItem) => (
    <View key={hw.ids.join('-')} style={styles.cardWrap}>
      <HomeworkCard
        item={hw}
        childColor={getChildColor(hw.childId || hw.studentId)}
        showChildBadge={!isChild}
      />
    </View>
  );

  return (
    <View style={{ flex: 1 }}>
      <PageHeader title={t('homework.title')} />
      <AndroidStickyBlurHost>
        {Platform.OS === 'web' ? (
          <ScreenScrollView
            ref={scrollRef as any}
            style={styles.container}
            contentContainerStyle={scrollContentStyle}
            showsVerticalScrollIndicator={false}
            onScroll={onScroll}
            scrollEventThrottle={16}
          >
            <InlineWebMobileHeader />
            <View style={styles.webHeaderStack}>
              {isChild && !currentUser.linkedChildId ? (
                <NoticeBanner variant="warning" description={t('homework.child_unlinked_desc')} />
              ) : null}

              <SearchInput
                testID="homework-search-input"
                value={search}
                onChangeText={setSearch}
                placeholder={t('homework.search_placeholder')}
              />
            </View>

            <StickyFilterBar style={styles.webStickyBar}>
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
                  testID="homework-date-picker"
                  date={selectedDate}
                  setDate={setSelectedDate}
                  isChild={isChild}
                  fullFormat={!hasChildFilter}
                />
              </View>
            </StickyFilterBar>

            {loading || sections.length === 0
              ? listEmpty
              : sections.map((section) => (
                  <React.Fragment key={section.title}>
                    {renderSectionHeader(section.title)}
                    {section.data.map(renderHomeworkItem)}
                  </React.Fragment>
                ))}
          </ScreenScrollView>
        ) : (
          <Animated.SectionList
            ref={scrollRef as any}
            style={styles.container}
            contentContainerStyle={scrollContentStyle}
            showsVerticalScrollIndicator={false}
            stickySectionHeadersEnabled={false}
            sections={loading ? [] : sections}
            keyExtractor={(item) => item.ids.join('-')}
            ListHeaderComponent={listHeader}
            ListHeaderComponentStyle={styles.listHeaderContainer}
            ListEmptyComponent={listEmpty}
            renderSectionHeader={({ section }) => renderSectionHeader(section.title)}
            renderItem={({ item: hw }) => renderHomeworkItem(hw)}
            onScroll={onScroll}
            scrollEventThrottle={16}
            {...pullToRefreshProps}
          />
        )}
      </AndroidStickyBlurHost>
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
  listHeader: {
    gap: 12,
    marginBottom: 12,
  },
  webHeaderStack: {
    gap: 12,
    marginBottom: 12,
  },
  webStickyBar: {
    marginBottom: 12,
  },
  listHeaderContainer: {
    zIndex: 20,
    elevation: 20,
  },
  sectionHeaderWrap: {
    marginTop: 8,
    marginBottom: 4,
  },
  cardWrap: {
    marginBottom: 10,
  },
  center: {
    flex: 1,
    paddingVertical: 48,
    alignItems: 'center',
    justifyContent: 'center',
  },
  filterRow: {
    alignItems: 'center',
    gap: 8,
  },
  emptyActions: {
    gap: 8,
    alignItems: 'center',
  },
});
