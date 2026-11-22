import React, { useCallback, useEffect, useRef, useState } from 'react';
import {
  Animated,
  View,
  Text,
  Pressable,
  ActivityIndicator,
  StyleSheet,
  useWindowDimensions,
} from 'react-native';
import { GraduationCap, Palette, Check, Globe } from 'lucide-react-native';
import { useTranslation } from 'react-i18next';
import { useTheme, type ThemeMode } from '../theme/ThemeContext';
import { heeboFont } from '../theme/typography';
import { setAppLanguage, useDirection } from '../i18n';
import { apiFetch } from '../lib/api';
import { formatGradeHebrew, formatSystemDateTime } from '../lib/dateUtils';
import {
  InfoBox,
  InfoItem,
  NoticeBanner,
  SectionCard,
} from '../components/ui/Surfaces';
import {
  ColorSwatchPicker,
  FieldLabel,
  FilledInput,
  SelectField,
  SwitchField,
} from '../components/ui/FormFields';
import { ChildBadge, StatusBadge } from '../components/ui/Badges';
import {
  Button,
  DestructiveButton,
  EditButton,
  SyncButton,
} from '../components/ui/Buttons';
import { ConfirmModal } from '../components/ui/Modal';
import { useScrollHeader } from '../components/ui/MobileHeader';
import appConfig from '../../app.json';
import type { WebtopConfig, User } from '../../../src/types';

export function SettingsScreen({
  currentUser,
  syncTrigger,
  onSyncCompleted,
}: {
  currentUser: User;
  syncTrigger: number;
  onSyncCompleted: () => void;
}) {
  const { t, i18n } = useTranslation();
  const { themeMode, setThemeMode, palette, isDark } = useTheme();
  const { headerHeight, onScroll, pullToRefreshProps, scrollRef } = useScrollHeader('settings');
  const { flexRow, textAlign, isRTL } = useDirection();
  const { width } = useWindowDimensions();
  const isWide = width >= 640;
  const isChild = currentUser.familyRole === 'child';

  const [config, setConfig] = useState<WebtopConfig | null>(null);
  const [loadingWebtop, setLoadingWebtop] = useState(false);
  const [webtopUsername, setWebtopUsername] = useState('');
  const [webtopPassword, setWebtopPassword] = useState('');
  const [isEditingWebtop, setIsEditingWebtop] = useState(false);
  const [testingWebtop, setTestingWebtop] = useState(false);
  const [savingWebtop, setSavingWebtop] = useState(false);
  const [syncingWebtop, setSyncingWebtop] = useState(false);
  const [syncSuccessWebtop, setSyncSuccessWebtop] = useState(false);
  const syncSuccessTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const hasLoadedWebtopRef = useRef(false);
  const [showDisconnect, setShowDisconnect] = useState(false);
  const [disconnecting, setDisconnecting] = useState(false);
  const [feedback, setFeedback] = useState<{
    variant: 'info' | 'destructive';
    message: string;
  } | null>(null);

  useEffect(() => {
    return () => {
      if (syncSuccessTimerRef.current) {
        clearTimeout(syncSuccessTimerRef.current);
      }
    };
  }, []);

  const loadConfig = useCallback(async () => {
    if (isChild) return;
    if (!hasLoadedWebtopRef.current) {
      setLoadingWebtop(true);
    }
    try {
      const res = await apiFetch('/api/webtop/config');
      if (res.ok) {
        const data: WebtopConfig = await res.json();
        hasLoadedWebtopRef.current = true;
        setConfig(data);
        if (data.username && !isEditingWebtop) {
          setWebtopUsername(data.username);
        }
      }
    } catch (err) {
      console.error('Settings webtop config error:', err);
    } finally {
      setLoadingWebtop(false);
    }
  }, [isChild, isEditingWebtop]);

  useEffect(() => {
    loadConfig();
  }, [loadConfig, syncTrigger]);

  const handleTest = async () => {
    if (!webtopUsername || !webtopPassword) {
      setFeedback({
        variant: 'destructive',
        message: t('account.webtop_username_placeholder'),
      });
      return;
    }
    setTestingWebtop(true);
    setFeedback(null);
    try {
      const res = await apiFetch('/api/webtop/test', {
        method: 'POST',
        body: JSON.stringify({ username: webtopUsername, password: webtopPassword }),
      });
      const data = await res.json().catch(() => null);
      if (!res.ok) {
        throw new Error(
          data?.error || t('account.webtop_test_failed', { error: 'Unknown error' })
        );
      }
      setFeedback({
        variant: 'info',
        message: t('account.webtop_test_success', {
          count: data?.children?.length || 0,
        }),
      });
    } catch (err) {
      setFeedback({
        variant: 'destructive',
        message:
          err instanceof Error
            ? err.message
            : t('account.webtop_test_failed', { error: '' }),
      });
    } finally {
      setTestingWebtop(false);
    }
  };

  const handleSave = async () => {
    if (!webtopUsername || !webtopPassword) return;
    setSavingWebtop(true);
    setFeedback(null);
    try {
      const res = await apiFetch('/api/webtop/config', {
        method: 'POST',
        body: JSON.stringify({
          username: webtopUsername,
          password: webtopPassword,
          selectedChildId: config?.selectedChildId,
        }),
      });
      const data = await res.json().catch(() => null);
      if (!res.ok) throw new Error(data?.error || t('account.webtop_save_failed'));
      setIsEditingWebtop(false);
      setWebtopPassword('');
      await loadConfig();
      onSyncCompleted();
      setFeedback({ variant: 'info', message: t('account.webtop_saved_success') });
    } catch (err) {
      setFeedback({
        variant: 'destructive',
        message: err instanceof Error ? err.message : t('account.webtop_save_failed'),
      });
    } finally {
      setSavingWebtop(false);
    }
  };

  const handleSync = async () => {
    setSyncingWebtop(true);
    setSyncSuccessWebtop(false);
    setFeedback(null);
    try {
      const res = await apiFetch('/api/webtop/sync', { method: 'POST' });
      const data = await res.json().catch(() => null);
      if (!res.ok) {
        throw new Error(
          data?.error || t('account.webtop_sync_failed', { error: 'Unknown' })
        );
      }
      await loadConfig();
      setSyncSuccessWebtop(true);
      if (syncSuccessTimerRef.current) clearTimeout(syncSuccessTimerRef.current);
      syncSuccessTimerRef.current = setTimeout(() => {
        setSyncSuccessWebtop(false);
      }, 3000);
      onSyncCompleted();
    } catch (err) {
      setFeedback({
        variant: 'destructive',
        message:
          err instanceof Error
            ? err.message
            : t('account.webtop_sync_failed', { error: '' }),
      });
    } finally {
      setSyncingWebtop(false);
    }
  };

  const handleToggleAutoSync = async (enabled: boolean) => {
    setFeedback(null);
    try {
      const res = await apiFetch('/api/webtop/auto-sync', {
        method: 'PUT',
        body: JSON.stringify({ enabled }),
      });
      const data = await res.json().catch(() => null);
      if (!res.ok) throw new Error(data?.error || t('common.error'));
      await loadConfig();
    } catch (err) {
      setFeedback({
        variant: 'destructive',
        message: err instanceof Error ? err.message : t('common.error'),
      });
    }
  };

  const handleColorSelect = async (childId: string, color: string | null) => {
    setFeedback(null);
    try {
      const res = await apiFetch('/api/webtop/child-color', {
        method: 'PATCH',
        body: JSON.stringify({ childId, color }),
      });
      const data = await res.json().catch(() => null);
      if (!res.ok) {
        throw new Error(data?.error || t('account.color_update_failed'));
      }
      setConfig((prev) =>
        prev
          ? {
              ...prev,
              linkedChildren:
                data?.linkedChildren ||
                prev.linkedChildren.map((c) =>
                  c.id === childId ? { ...c, color } : c
                ),
            }
          : prev
      );
      onSyncCompleted();
    } catch (err) {
      setFeedback({
        variant: 'destructive',
        message: err instanceof Error ? err.message : t('account.color_update_failed'),
      });
    }
  };

  const handleDisconnect = async () => {
    setDisconnecting(true);
    setFeedback(null);
    try {
      const res = await apiFetch('/api/webtop/config', { method: 'DELETE' });
      const data = await res.json().catch(() => null);
      if (!res.ok) throw new Error(data?.error || t('account.disconnect_failed'));
      setShowDisconnect(false);
      setIsEditingWebtop(false);
      setWebtopUsername('');
      setWebtopPassword('');
      await loadConfig();
      onSyncCompleted();
      setFeedback({
        variant: 'info',
        message: t('account.webtop_disconnected_success'),
      });
    } catch (err) {
      setFeedback({
        variant: 'destructive',
        message: err instanceof Error ? err.message : t('account.disconnect_failed'),
      });
    } finally {
      setDisconnecting(false);
    }
  };

  return (
    <Animated.ScrollView
      ref={scrollRef}
      style={styles.container}
      contentContainerStyle={[styles.content, { paddingTop: headerHeight + 18 }]}
      showsVerticalScrollIndicator={false}
      onScroll={onScroll}
      scrollEventThrottle={16}
      {...pullToRefreshProps}
    >
      <View style={styles.innerStack}>
        {/* Appearance & Language Card */}
        <SectionCard
          icon={Palette}
          title={t('settings.appearance_title')}
          description={t('settings.appearance_desc')}
          divided
          contentStyle={{ paddingTop: 6, paddingBottom: 8 }}
        >
          <SelectField
            testID="settings-language-selector"
            layout="responsive"
            variant="filled"
            label={t('settings.language_label')}
            description={t('settings.language_desc')}
            value={(i18n.language || 'he').startsWith('en') ? 'en' : 'he'}
            options={[
              { label: t('common.hebrew'), value: 'he' },
              { label: t('common.english'), value: 'en' },
            ]}
            onValueChange={(val) => setAppLanguage(val as 'he' | 'en')}
          />

          <SelectField
            testID="settings-theme-selector"
            layout="responsive"
            variant="filled"
            label={t('settings.theme_label')}
            description={t('settings.theme_desc')}
            value={themeMode}
            options={[
              { label: t('common.light'), value: 'light' },
              { label: t('common.dark'), value: 'dark' },
              { label: t('common.system'), value: 'system' },
            ]}
            onValueChange={(val) => setThemeMode(val as ThemeMode)}
          />
        </SectionCard>

        {/* Webtop Integration Card */}
        {!isChild && (
          <SectionCard
            icon={GraduationCap}
            title={t('account.webtop_title')}
            description={t('account.webtop_desc')}
            action={
              loadingWebtop ? (
                <ActivityIndicator size="small" color={palette.mutedForeground} />
              ) : config?.configured ? (
                <StatusBadge
                  variant="success"
                  label={t('account.webtop_status_connected')}
                />
              ) : (
                <StatusBadge
                  variant="neutral"
                  label={t('account.webtop_status_not_connected')}
                />
              )
            }
          >
            {feedback ? (
              <NoticeBanner variant={feedback.variant} description={feedback.message} />
            ) : null}

            {loadingWebtop ? (
              <View style={styles.webtopLoading}>
                <ActivityIndicator size="large" color={palette.mutedForeground} />
              </View>
            ) : config?.configured && !isEditingWebtop ? (
              <View style={{ gap: 20 }}>
                <InfoBox columns={2}>
                  <InfoItem
                    label={t('account.webtop_username')}
                    value={config.username}
                  />
                  <InfoItem
                    label={t('account.webtop_last_synced', { date: '' })
                      .replace(':', '')
                      .trim()}
                    value={
                      config.lastSyncedAt
                        ? formatSystemDateTime(config.lastSyncedAt)
                        : '-'
                    }
                    isLtr={Boolean(config.lastSyncedAt)}
                    valueStyle={styles.lastSyncedValue}
                  />
                </InfoBox>

                {config.autoSyncAvailable ? (
                  <View style={{ gap: 12 }}>
                    <SwitchField
                      label={t('account.webtop_auto_sync_label')}
                      description={
                        config.autoSyncEnabled && config.nextSyncAt
                          ? t('account.webtop_auto_sync_next', {
                              date: formatSystemDateTime(config.nextSyncAt),
                            })
                          : t('account.webtop_auto_sync_desc')
                      }
                      value={Boolean(config.autoSyncEnabled)}
                      onValueChange={handleToggleAutoSync}
                    />
                    {config.autoSyncPaused ? (
                      <NoticeBanner
                        variant="warning"
                        title={t('account.webtop_auto_sync_paused_title')}
                        description={t('account.webtop_auto_sync_paused_desc')}
                      >
                        <Pressable
                          onPress={() => handleToggleAutoSync(true)}
                          style={({ pressed }) => ({
                            alignSelf: isRTL ? 'flex-end' : 'flex-start',
                            opacity: pressed ? 0.7 : 1,
                          })}
                        >
                          <Text
                            style={[
                              styles.resumeLinkText,
                              { color: palette.primary, textAlign },
                            ]}
                          >
                            {t('account.webtop_auto_sync_resume')}
                          </Text>
                        </Pressable>
                      </NoticeBanner>
                    ) : null}
                  </View>
                ) : null}

                {config.syncError ? (
                  <NoticeBanner
                    variant="destructive"
                    description={`${t('account.webtop_status_error')}: ${config.syncError}`}
                  />
                ) : null}

                {(config.linkedChildren?.length || 0) > 0 && (
                  <View style={{ gap: 12, paddingTop: 2 }}>
                    <FieldLabel
                      label={t('account.webtop_linked_kids_title')}
                      description={t('account.webtop_linked_kids_desc')}
                    />
                    <View style={{ gap: 10 }}>
                      {config.linkedChildren.map((child) => {
                        const name = `${child.firstName} ${child.lastName}`.trim();
                        return (
                          <InfoBox
                            key={child.id}
                            columns={1}
                            style={
                              isWide
                                ? {
                                    flexDirection: flexRow,
                                    alignItems: 'center',
                                    justifyContent: 'space-between',
                                  }
                                : { gap: 12 }
                            }
                          >
                            <View style={[styles.childRow, { flexDirection: flexRow }]}>
                              <ChildBadge
                                name={name}
                                colorId={child.color}
                                variant="solid"
                                size="sm"
                              />
                              {child.classCode ? (
                                <Text
                                  style={[
                                    styles.childClassLabel,
                                    { color: palette.mutedForeground, textAlign },
                                  ]}
                                >
                                  ({t('account.class_label', {
                                    code: formatGradeHebrew(child.classCode),
                                    num: child.classNum,
                                  })})
                                </Text>
                              ) : null}
                            </View>
                            <ColorSwatchPicker
                              selectedColorId={child.color}
                              onSelectColor={(col) => handleColorSelect(child.id, col)}
                              clearPosition="end"
                            />
                          </InfoBox>
                        );
                      })}
                    </View>
                  </View>
                )}

                <View style={[styles.actionsFooter, { flexDirection: flexRow }]}>
                  <View style={[styles.actionsStartGroup, { flexDirection: flexRow }]}>
                    <SyncButton
                      variant="outline"
                      syncing={syncingWebtop}
                      success={syncSuccessWebtop}
                      onPress={handleSync}
                    />
                    <EditButton onPress={() => setIsEditingWebtop(true)} />
                  </View>
                  <DestructiveButton
                    label={t('account.webtop_disconnect')}
                    onPress={() => setShowDisconnect(true)}
                  />
                </View>
              </View>
            ) : (
              <View style={{ gap: 16 }}>
                <View
                  style={{
                    flexDirection: isWide ? flexRow : 'column',
                    gap: 16,
                  }}
                >
                  <View style={{ flex: isWide ? 1 : undefined, gap: 8 }}>
                    <FieldLabel label={t('account.webtop_username')} />
                    <FilledInput
                      value={webtopUsername}
                      onChangeText={setWebtopUsername}
                      placeholder={t('account.webtop_username_placeholder')}
                      autoCapitalize="none"
                      autoCorrect={false}
                    />
                  </View>

                  <View style={{ flex: isWide ? 1 : undefined, gap: 8 }}>
                    <FieldLabel label={t('account.webtop_password')} />
                    <FilledInput
                      value={webtopPassword}
                      onChangeText={setWebtopPassword}
                      placeholder={t('account.webtop_password_placeholder')}
                      secureTextEntry
                      autoCapitalize="none"
                      autoCorrect={false}
                    />
                  </View>
                </View>

                <View style={[styles.actionsFooter, { flexDirection: flexRow }]}>
                  <View style={[styles.actionsStartGroup, { flexDirection: flexRow }]}>
                    <Button
                      label={
                        testingWebtop
                          ? t('account.webtop_testing')
                          : t('account.webtop_test_button')
                      }
                      variant="outline"
                      size="sm"
                      icon={Globe}
                      loading={testingWebtop}
                      disabled={!webtopUsername || !webtopPassword}
                      onPress={handleTest}
                    />
                    {isEditingWebtop ? (
                      <Button
                        label={t('common.cancel')}
                        variant="ghost"
                        size="sm"
                        onPress={() => {
                          setIsEditingWebtop(false);
                          setWebtopPassword('');
                        }}
                      />
                    ) : null}
                  </View>

                  <Button
                    label={
                      savingWebtop
                        ? t('account.webtop_saving')
                        : t('account.webtop_save_button')
                    }
                    size="sm"
                    icon={Check}
                    loading={savingWebtop}
                    disabled={!webtopUsername || !webtopPassword}
                    onPress={handleSave}
                  />
                </View>
              </View>
            )}
          </SectionCard>
        )}

        <Text
          testID="app-version-text"
          style={[styles.versionText, { color: palette.mutedForeground }]}
        >
          {t('settings.app_version', { version: appConfig.expo.version })}
        </Text>
      </View>

      {!isChild && (
        <ConfirmModal
          visible={showDisconnect}
          onClose={() => setShowDisconnect(false)}
          onConfirm={handleDisconnect}
          title={t('account.webtop_disconnect')}
          description={t('account.webtop_disconnect_confirm')}
          confirmText={t('common.delete')}
          cancelText={t('common.cancel')}
          loading={disconnecting}
        />
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
  },
  innerStack: {
    width: '100%',
    maxWidth: 768,
    alignSelf: 'center',
    gap: 16,
  },
  webtopLoading: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 32,
  },
  lastSyncedValue: {
    fontSize: 12,
    ...heeboFont('500'),
  },
  resumeLinkText: {
    fontSize: 12,
    ...heeboFont('600'),
  },
  childRow: {
    alignItems: 'center',
    gap: 10,
    flexWrap: 'wrap',
  },
  childClassLabel: {
    fontSize: 12,
    ...heeboFont('400'),
  },
  actionsFooter: {
    flexWrap: 'wrap',
    gap: 12,
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingTop: 4,
  },
  actionsStartGroup: {
    alignItems: 'center',
    gap: 8,
  },
  versionText: {
    fontSize: 12,
    textAlign: 'center',
    paddingTop: 4,
    ...heeboFont('400'),
  },
});
