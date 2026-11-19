import React, { useCallback, useEffect, useState } from 'react';
import {
  View,
  Text,
  ScrollView,
  ActivityIndicator,
  StyleSheet,
} from 'react-native';
import { GraduationCap, Palette, Check, Globe } from 'lucide-react-native';
import { useTranslation } from 'react-i18next';
import { useTheme, type ThemeMode } from '../theme/ThemeContext';
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
import { Button, SyncButton } from '../components/ui/Buttons';
import { ConfirmModal } from '../components/ui/Modal';
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
  const { themeMode, setThemeMode, palette } = useTheme();
  const { flexRow, textAlign } = useDirection();
  const isChild = currentUser.familyRole === 'child';

  const [config, setConfig] = useState<WebtopConfig | null>(null);
  const [loadingWebtop, setLoadingWebtop] = useState(false);
  const [webtopUsername, setWebtopUsername] = useState('');
  const [webtopPassword, setWebtopPassword] = useState('');
  const [isEditingWebtop, setIsEditingWebtop] = useState(false);
  const [testingWebtop, setTestingWebtop] = useState(false);
  const [savingWebtop, setSavingWebtop] = useState(false);
  const [syncingWebtop, setSyncingWebtop] = useState(false);
  const [showDisconnect, setShowDisconnect] = useState(false);
  const [disconnecting, setDisconnecting] = useState(false);
  const [feedback, setFeedback] = useState<{
    variant: 'info' | 'destructive';
    message: string;
  } | null>(null);

  const loadConfig = useCallback(async () => {
    if (isChild) return;
    setLoadingWebtop(true);
    try {
      const res = await apiFetch('/api/webtop/config');
      if (res.ok) {
        const data: WebtopConfig = await res.json();
        setConfig(data);
        if (data.username) setWebtopUsername(data.username);
      }
    } catch (err) {
      console.error('Settings webtop config error:', err);
    } finally {
      setLoadingWebtop(false);
    }
  }, [isChild]);

  useEffect(() => {
    loadConfig();
  }, [loadConfig, syncTrigger]);

  const handleTest = async () => {
    if (!webtopUsername || !webtopPassword) return;
    setTestingWebtop(true);
    setFeedback(null);
    try {
      const res = await apiFetch('/api/webtop/test', {
        method: 'POST',
        body: JSON.stringify({ username: webtopUsername, password: webtopPassword }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || t('common.error'));
      setFeedback({
        variant: 'info',
        message: t('account.webtop_test_success', {
          count: data.children?.length || 0,
        }),
      });
    } catch (err) {
      setFeedback({
        variant: 'destructive',
        message: err instanceof Error ? err.message : t('common.error'),
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
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || t('account.webtop_save_failed'));
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
    try {
      const res = await apiFetch('/api/webtop/sync', { method: 'POST' });
      if (res.ok) {
        await loadConfig();
        onSyncCompleted();
      }
    } finally {
      setSyncingWebtop(false);
    }
  };

  const handleToggleAutoSync = async (enabled: boolean) => {
    const res = await apiFetch('/api/webtop/auto-sync', {
      method: 'PUT',
      body: JSON.stringify({ enabled }),
    });
    if (res.ok) {
      await loadConfig();
    }
  };

  const handleColorSelect = async (childId: string, color: string | null) => {
    const res = await apiFetch('/api/webtop/child-color', {
      method: 'PATCH',
      body: JSON.stringify({ childId, color }),
    });
    if (res.ok) {
      const data = await res.json();
      setConfig((prev) =>
        prev
          ? {
              ...prev,
              linkedChildren:
                data.linkedChildren ||
                prev.linkedChildren.map((c) =>
                  c.id === childId ? { ...c, color } : c
                ),
            }
          : prev
      );
    }
  };

  const handleDisconnect = async () => {
    setDisconnecting(true);
    try {
      const res = await apiFetch('/api/webtop/config', { method: 'DELETE' });
      if (res.ok) {
        setShowDisconnect(false);
        setIsEditingWebtop(false);
        setWebtopUsername('');
        setWebtopPassword('');
        await loadConfig();
        onSyncCompleted();
      }
    } finally {
      setDisconnecting(false);
    }
  };

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>
      <SectionCard
        icon={Palette}
        title={t('settings.appearance_title')}
        description={t('settings.appearance_desc')}
      >
        <SelectField
          testID="settings-language-selector"
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

      {!isChild && (
        <SectionCard
          icon={GraduationCap}
          title={t('account.webtop_title')}
          description={t('account.webtop_desc')}
          action={
            loadingWebtop ? (
              <ActivityIndicator size="small" color={palette.primary} />
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

          {config?.configured && !isEditingWebtop ? (
            <View style={{ gap: 14 }}>
              <InfoBox>
                <InfoItem
                  label={t('account.webtop_username')}
                  value={config.username}
                />
                <InfoItem
                  label={t('account.webtop_last_synced', { date: '' }).replace(':', '')}
                  value={
                    config.lastSyncedAt
                      ? formatSystemDateTime(config.lastSyncedAt)
                      : '-'
                  }
                  isLtr={Boolean(config.lastSyncedAt)}
                />
              </InfoBox>

              {config.autoSyncAvailable ? (
                <SwitchField
                  label={t('account.webtop_auto_sync_label')}
                  description={t('account.webtop_auto_sync_desc')}
                  value={Boolean(config.autoSyncEnabled)}
                  onValueChange={handleToggleAutoSync}
                />
              ) : null}

              {config.syncError ? (
                <NoticeBanner
                  variant="destructive"
                  description={`${t('account.webtop_status_error')}: ${config.syncError}`}
                />
              ) : null}

              {(config.linkedChildren?.length || 0) > 0 && (
                <View style={{ gap: 10 }}>
                  <FieldLabel
                    label={t('account.webtop_linked_kids_title')}
                    description={t('account.webtop_linked_kids_desc')}
                  />
                  {config.linkedChildren.map((child) => {
                    const name = `${child.firstName} ${child.lastName}`.trim();
                    return (
                      <InfoBox key={child.id}>
                        <View style={[styles.childRow, { flexDirection: flexRow }]}>
                          <ChildBadge name={name} colorId={child.color} variant="solid" />
                          {child.classCode ? (
                            <Text
                              style={{
                                fontSize: 12,
                                color: palette.mutedForeground,
                                textAlign,
                              }}
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
                        />
                      </InfoBox>
                    );
                  })}
                </View>
              )}

              <View style={[styles.actionsRow, { flexDirection: flexRow }]}>
                <SyncButton
                  syncing={syncingWebtop}
                  onPress={handleSync}
                  label={t('account.webtop_sync_button')}
                />
                <Button
                  label={t('common.edit')}
                  variant="outline"
                  size="sm"
                  onPress={() => setIsEditingWebtop(true)}
                />
                <Button
                  label={t('account.webtop_disconnect')}
                  variant="destructive"
                  size="sm"
                  onPress={() => setShowDisconnect(true)}
                />
              </View>
            </View>
          ) : (
            <View style={{ gap: 12 }}>
              <View style={{ gap: 6 }}>
                <FieldLabel label={t('account.webtop_username')} />
                <FilledInput
                  value={webtopUsername}
                  onChangeText={setWebtopUsername}
                  placeholder={t('account.webtop_username_placeholder')}
                  autoCapitalize="none"
                />
              </View>

              <View style={{ gap: 6 }}>
                <FieldLabel label={t('account.webtop_password')} />
                <FilledInput
                  value={webtopPassword}
                  onChangeText={setWebtopPassword}
                  placeholder={t('account.webtop_password_placeholder')}
                  secureTextEntry
                  autoCapitalize="none"
                />
              </View>

              <View style={[styles.actionsRow, { flexDirection: flexRow }]}>
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
    gap: 14,
  },
  childRow: {
    alignItems: 'center',
    gap: 8,
  },
  actionsRow: {
    flexWrap: 'wrap',
    gap: 8,
    alignItems: 'center',
  },
});
