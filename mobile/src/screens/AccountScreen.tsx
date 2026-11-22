import React, { useState, useEffect, useRef, useCallback } from 'react';
import {
  Animated,
  View,
  Text,
  Platform,
  ActivityIndicator,
  StyleSheet,
} from 'react-native';
import {
  User as UserIcon,
  Lock,
  LogOut,
  Fingerprint,
  Plus,
  Smartphone,
  Laptop,
  Key,
  Trash2,
  Shield,
  Users,
  Baby,
} from 'lucide-react-native';
import * as ImagePicker from 'expo-image-picker';
import { useTranslation } from 'react-i18next';
import { apiFetch } from '../lib/api';
import {
  isPasskeySupported,
  registerPasskey,
  fetchUserPasskeys,
  deletePasskey,
  type PasskeyInfo,
} from '../lib/passkey';
import { formatShortDate } from '../lib/dateUtils';
import { useDirection } from '../i18n';
import { useTheme } from '../theme/ThemeContext';
import { heeboFont } from '../theme/typography';
import {
  NoticeBanner,
  SectionCard,
  EmptyStateCard,
} from '../components/ui/Surfaces';
import {
  FieldLabel,
  FilledInput,
  ReadOnlyPillField,
} from '../components/ui/FormFields';
import { StatusBadge, UserAvatar } from '../components/ui/Badges';
import { Button, DestructiveButton } from '../components/ui/Buttons';
import { Modal, ConfirmModal } from '../components/ui/Modal';
import { useScrollHeader } from '../components/ui/MobileHeader';
import type { User } from '../../../src/types';

export function AccountScreen({
  currentUser,
  syncTrigger = 0,
  onUserUpdated,
  onLogout,
}: {
  currentUser: User;
  syncTrigger?: number;
  onUserUpdated: (user: User) => void;
  onLogout: () => void;
}) {
  const { t } = useTranslation();
  const { palette, isDark } = useTheme();
  const { flexRow, textAlign } = useDirection();
  const { headerHeight, onScroll, scrollRef } = useScrollHeader('account');

  const [firstName, setFirstName] = useState(currentUser.firstName || '');
  const [lastName, setLastName] = useState(currentUser.lastName || '');
  const [avatar, setAvatar] = useState(currentUser.avatar || '');
  const [savingProfile, setSavingProfile] = useState(false);

  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [savingPassword, setSavingPassword] = useState(false);

  // Passkey state
  const [passkeys, setPasskeys] = useState<PasskeyInfo[]>([]);
  const [loadingPasskeys, setLoadingPasskeys] = useState(false);
  const [addingPasskey, setAddingPasskey] = useState(false);
  const [showAddPasskeyDialog, setShowAddPasskeyDialog] = useState(false);
  const [newPasskeyName, setNewPasskeyName] = useState('');
  const [passkeyToDelete, setPasskeyToDelete] = useState<PasskeyInfo | null>(null);
  const [deletingPasskey, setDeletingPasskey] = useState(false);
  const [passkeySupported, setPasskeySupported] = useState(false);
  const hasLoadedPasskeysRef = useRef(false);

  const [feedback, setFeedback] = useState<{
    variant: 'info' | 'destructive';
    message: string;
  } | null>(null);

  const loadPasskeys = useCallback(async () => {
    const showFullSpinner = !hasLoadedPasskeysRef.current;
    if (showFullSpinner) {
      setLoadingPasskeys(true);
    }
    try {
      const list = await fetchUserPasskeys();
      setPasskeys(list);
      hasLoadedPasskeysRef.current = true;
    } catch {
      // Silently ignore on initial load
    } finally {
      if (showFullSpinner) {
        setLoadingPasskeys(false);
      }
    }
  }, []);

  useEffect(() => {
    let active = true;
    isPasskeySupported().then((supported) => {
      if (!active) return;
      setPasskeySupported(supported);
      if (supported) {
        loadPasskeys();
      }
    });
    return () => {
      active = false;
    };
  }, [loadPasskeys, syncTrigger]);

  const getDefaultPasskeyName = () => {
    if (Platform.OS === 'ios') return t('account.passkey_device_iphone');
    if (Platform.OS === 'android') return t('account.passkey_device_android');
    return t('account.passkey_default_name');
  };

  const handleStartAddPasskey = () => {
    setNewPasskeyName(getDefaultPasskeyName());
    setShowAddPasskeyDialog(true);
  };

  const handleConfirmAddPasskey = async () => {
    setAddingPasskey(true);
    setFeedback(null);
    const deviceName = newPasskeyName.trim() || t('account.passkey_default_name');

    try {
      const created = await registerPasskey(
        deviceName,
        currentUser,
        t('account.add_passkey')
      );
      setShowAddPasskeyDialog(false);
      if (created?.id) {
        setPasskeys((prev) => [
          {
            id: created.id,
            deviceName: created.deviceName || deviceName,
            deviceType: created.deviceType || 'singleDevice',
            backedUp: created.backedUp ?? false,
            createdAt: created.createdAt || new Date().toISOString(),
            lastUsedAt: created.lastUsedAt ?? null,
          },
          ...prev.filter((p) => p.id !== created.id),
        ]);
      } else {
        await loadPasskeys();
      }
      setFeedback({
        variant: 'info',
        message: t('account.passkey_created_desc'),
      });
    } catch (err) {
      setShowAddPasskeyDialog(false);
      const error = err as Error & { name?: string };
      if (error.name !== 'NotAllowedError') {
        setFeedback({
          variant: 'destructive',
          message: error.message || t('account.passkey_failed'),
        });
      }
    } finally {
      setAddingPasskey(false);
    }
  };

  const handleDeletePasskey = async () => {
    if (!passkeyToDelete) return;
    setDeletingPasskey(true);
    setFeedback(null);
    try {
      const deletedId = passkeyToDelete.id;
      await deletePasskey(deletedId);
      setPasskeyToDelete(null);
      setPasskeys((prev) => prev.filter((p) => p.id !== deletedId));
      setFeedback({
        variant: 'info',
        message: t('account.passkey_deleted_desc'),
      });
    } catch (err) {
      setFeedback({
        variant: 'destructive',
        message:
          err instanceof Error ? err.message : t('account.passkey_failed'),
      });
    } finally {
      setDeletingPasskey(false);
    }
  };

  const handlePickAvatar = async () => {
    const perm = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (!perm.granted) return;

    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ['images'],
      allowsEditing: true,
      aspect: [1, 1],
      quality: 0.7,
      base64: true,
    });

    if (!result.canceled && result.assets?.[0]?.base64) {
      const mime = result.assets[0].mimeType || 'image/jpeg';
      setAvatar(`data:${mime};base64,${result.assets[0].base64}`);
    }
  };

  const handleSaveProfile = async () => {
    setSavingProfile(true);
    setFeedback(null);
    try {
      const res = await apiFetch('/api/auth/profile', {
        method: 'PUT',
        body: JSON.stringify({
          firstName: firstName.trim(),
          lastName: lastName.trim(),
          avatar,
        }),
      });
      const data = await res.json().catch(() => null);
      if (!res.ok) throw new Error(data?.error || t('account.update_failed'));
      if (data?.user) {
        onUserUpdated(data.user);
      }
      setFeedback({ variant: 'info', message: t('account.profile_updated_desc') });
    } catch (err) {
      setFeedback({
        variant: 'destructive',
        message: err instanceof Error ? err.message : t('account.update_failed'),
      });
    } finally {
      setSavingProfile(false);
    }
  };

  const handleChangePassword = async () => {
    setFeedback(null);
    if (newPassword !== confirmPassword) {
      setFeedback({
        variant: 'destructive',
        message: t('account.password_mismatch_desc'),
      });
      return;
    }
    if (newPassword.length < 4) {
      setFeedback({
        variant: 'destructive',
        message: t('account.password_too_short_desc'),
      });
      return;
    }

    setSavingPassword(true);
    try {
      const res = await apiFetch('/api/auth/password', {
        method: 'PUT',
        body: JSON.stringify({ currentPassword, newPassword }),
      });
      const data = await res.json().catch(() => null);
      if (!res.ok) {
        throw new Error(data?.error || t('account.password_change_failed'));
      }
      setCurrentPassword('');
      setNewPassword('');
      setConfirmPassword('');
      setFeedback({ variant: 'info', message: t('account.password_changed_desc') });
    } catch (err) {
      setFeedback({
        variant: 'destructive',
        message:
          err instanceof Error ? err.message : t('account.password_change_failed'),
      });
    } finally {
      setSavingPassword(false);
    }
  };

  return (
    <>
      <Animated.ScrollView
        ref={scrollRef}
        style={styles.container}
        contentContainerStyle={[styles.content, { paddingTop: headerHeight + 18 }]}
        showsVerticalScrollIndicator={false}
        onScroll={onScroll}
        scrollEventThrottle={16}
      >
        {feedback ? (
          <NoticeBanner variant={feedback.variant} description={feedback.message} />
        ) : null}

        <SectionCard
          icon={UserIcon}
          title={t('account.personal_info')}
          description={t('account.personal_info_desc')}
        >
          <View style={[styles.avatarRow, { flexDirection: flexRow }]}>
            <UserAvatar
              user={{
                firstName,
                lastName,
                username: currentUser.username,
                avatar,
              }}
              size={56}
            />
            <View style={[styles.avatarButtons, { flexDirection: flexRow }]}>
              <Button
                label={t('account.change_photo')}
                variant="outline"
                size="sm"
                onPress={handlePickAvatar}
              />
              {avatar ? (
                <Button
                  label={t('account.remove_photo')}
                  variant="ghost"
                  size="sm"
                  onPress={() => setAvatar('')}
                />
              ) : null}
            </View>
          </View>

          <View style={styles.pillFieldsGrid}>
            <ReadOnlyPillField
              label={t('auth.username')}
              value={currentUser.username}
            />
            <View style={[styles.pillRow, { flexDirection: flexRow }]}>
              <ReadOnlyPillField
                style={{ flex: 1 }}
                label={t('account.role')}
                icon={Shield}
                value={
                  currentUser.role === 'admin'
                    ? t('account.role_admin')
                    : t('account.role_user')
                }
              />
              <ReadOnlyPillField
                style={{ flex: 1 }}
                label={t('account.family_role')}
                icon={currentUser.familyRole === 'child' ? Baby : Users}
                value={
                  currentUser.familyRole === 'child'
                    ? t('account.role_child')
                    : t('account.role_parent')
                }
              />
            </View>
          </View>

          <View style={{ gap: 6 }}>
            <FieldLabel label={t('account.first_name')} />
            <FilledInput
              value={firstName}
              onChangeText={setFirstName}
              placeholder={t('account.first_name_placeholder')}
            />
          </View>

          <View style={{ gap: 6 }}>
            <FieldLabel label={t('account.last_name')} />
            <FilledInput
              value={lastName}
              onChangeText={setLastName}
              placeholder={t('account.last_name_placeholder')}
            />
          </View>

          <Button
            label={t('common.save')}
            loading={savingProfile}
            onPress={handleSaveProfile}
          />
        </SectionCard>

        {passkeySupported ? (
          <SectionCard
            icon={Fingerprint}
            title={t('account.passkeys_title')}
            description={t('account.passkeys_desc')}
          >
            {loadingPasskeys ? (
              <View style={styles.passkeysLoading}>
                <ActivityIndicator size="small" color={palette.mutedForeground} />
              </View>
            ) : passkeys.length === 0 ? (
              <EmptyStateCard
                icon={Fingerprint}
                title={t('account.no_passkeys')}
                description={t('account.no_passkeys_desc')}
                action={
                  <Button
                    label={t('account.add_passkey')}
                    variant="outline"
                    icon={Plus}
                    size="sm"
                    onPress={handleStartAddPasskey}
                    disabled={addingPasskey}
                  />
                }
              />
            ) : (
              <View style={styles.passkeysList}>
                {passkeys.map((p, index) => {
                  const lowerName = (p.deviceName || '').toLowerCase();
                  const isPhone =
                    lowerName.includes('iphone') ||
                    lowerName.includes('android') ||
                    lowerName.includes('ipad');
                  const isDesktop =
                    lowerName.includes('mac') || lowerName.includes('windows');
                  const DeviceIcon = isPhone
                    ? Smartphone
                    : isDesktop
                      ? Laptop
                      : Fingerprint;

                  return (
                    <View
                      key={p.id}
                      style={[
                        styles.passkeyRow,
                        {
                          flexDirection: flexRow,
                          borderTopWidth: index > 0 ? 1 : 0,
                          borderTopColor: palette.borderSubtle,
                        },
                      ]}
                    >
                      <View
                        style={[
                          styles.passkeyRowInfo,
                          { flexDirection: flexRow },
                        ]}
                      >
                        <View
                          style={[
                            styles.passkeyIconBox,
                            {
                              backgroundColor: isDark
                                ? 'rgba(87, 158, 224, 0.14)'
                                : 'rgba(59, 130, 196, 0.10)',
                            },
                          ]}
                        >
                          <DeviceIcon size={18} color={palette.primary} />
                        </View>
                        <View style={styles.passkeyTextGroup}>
                          <View
                            style={[
                              styles.passkeyNameRow,
                              { flexDirection: flexRow },
                            ]}
                          >
                            <Text
                              numberOfLines={1}
                              style={[
                                styles.passkeyName,
                                { color: palette.foreground, textAlign },
                              ]}
                            >
                              {p.deviceName}
                            </Text>
                            {p.backedUp ? (
                              <StatusBadge
                                label={t('account.synced')}
                                variant="neutral"
                              />
                            ) : null}
                          </View>
                          <Text
                            style={[
                              styles.passkeyMeta,
                              { color: palette.mutedForeground, textAlign },
                            ]}
                          >
                            {t('account.created_on', {
                              date: formatShortDate(p.createdAt),
                            })}
                          </Text>
                          {p.lastUsedAt ? (
                            <Text
                              style={[
                                styles.passkeyMeta,
                                { color: palette.mutedForeground, textAlign },
                              ]}
                            >
                              {t('account.last_used', {
                                date: formatShortDate(p.lastUsedAt),
                              })}
                            </Text>
                          ) : null}
                        </View>
                      </View>
                      <DestructiveButton
                        icon={Trash2}
                        accessibilityLabel={t('common.delete')}
                        onPress={() => setPasskeyToDelete(p)}
                      />
                    </View>
                  );
                })}
              </View>
            )}
            {!loadingPasskeys && passkeys.length > 0 ? (
              <Button
                testID="add-passkey-button"
                label={t('account.add_passkey')}
                icon={Plus}
                onPress={handleStartAddPasskey}
                disabled={addingPasskey}
              />
            ) : null}
          </SectionCard>
        ) : null}

        <SectionCard
          icon={Lock}
          title={t('account.change_password')}
          description={t('account.change_password_desc')}
        >
          <View style={{ gap: 6 }}>
            <FieldLabel label={t('account.current_password')} />
            <FilledInput
              value={currentPassword}
              onChangeText={setCurrentPassword}
              secureTextEntry
              autoCapitalize="none"
            />
          </View>

          <View style={{ gap: 6 }}>
            <FieldLabel label={t('account.new_password')} />
            <FilledInput
              value={newPassword}
              onChangeText={setNewPassword}
              secureTextEntry
              autoCapitalize="none"
            />
          </View>

          <View style={{ gap: 6 }}>
            <FieldLabel label={t('account.confirm_password')} />
            <FilledInput
              value={confirmPassword}
              onChangeText={setConfirmPassword}
              secureTextEntry
              autoCapitalize="none"
            />
          </View>

          <Button
            label={t('account.update_password_button')}
            loading={savingPassword}
            disabled={!currentPassword || !newPassword || !confirmPassword}
            onPress={handleChangePassword}
          />
        </SectionCard>

        <Button
          testID="logout-button"
          label={t('auth.logout')}
          variant="destructive"
          icon={LogOut}
          onPress={onLogout}
        />
      </Animated.ScrollView>

      {/* Add Passkey Modal */}
      <Modal
        visible={showAddPasskeyDialog}
        onClose={() => !addingPasskey && setShowAddPasskeyDialog(false)}
        icon={Fingerprint}
        title={t('account.add_passkey')}
        description={t('account.passkeys_desc')}
        footer={
          <View style={[styles.modalFooterRow, { flexDirection: flexRow }]}>
            <Button
              label={t('common.cancel')}
              variant="outline"
              disabled={addingPasskey}
              onPress={() => setShowAddPasskeyDialog(false)}
              style={{ flex: 1 }}
            />
            <Button
              testID="confirm-add-passkey-button"
              label={
                addingPasskey
                  ? t('account.adding_passkey')
                  : t('account.add_passkey')
              }
              icon={Key}
              loading={addingPasskey}
              onPress={handleConfirmAddPasskey}
              style={{ flex: 1 }}
            />
          </View>
        }
      >
        <View style={{ gap: 8 }}>
          <FieldLabel label={t('account.passkey_name_prompt')} />
          <FilledInput
            testID="passkey-name-input"
            value={newPasskeyName}
            onChangeText={setNewPasskeyName}
            placeholder={t('account.passkey_name_placeholder')}
            editable={!addingPasskey}
          />
        </View>
      </Modal>

      {/* Delete Passkey Confirmation Modal */}
      <ConfirmModal
        visible={Boolean(passkeyToDelete)}
        onClose={() => !deletingPasskey && setPasskeyToDelete(null)}
        onConfirm={handleDeletePasskey}
        icon={Trash2}
        title={t('account.passkey_deleted_title')}
        description={`${t('account.delete_passkey_confirm')}${
          passkeyToDelete ? ` (${passkeyToDelete.deviceName})` : ''
        }`}
        confirmText={t('common.delete')}
        cancelText={t('common.cancel')}
        loading={deletingPasskey}
        variant="destructive"
      />
    </>
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
  avatarRow: {
    alignItems: 'center',
    gap: 12,
  },
  avatarButtons: {
    gap: 8,
    alignItems: 'center',
  },
  pillFieldsGrid: {
    gap: 12,
  },
  pillRow: {
    gap: 10,
  },
  passkeysLoading: {
    paddingVertical: 24,
    alignItems: 'center',
    justifyContent: 'center',
  },
  passkeysList: {
    marginVertical: -4,
  },
  passkeyRow: {
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 10,
    gap: 10,
  },
  passkeyRowInfo: {
    flex: 1,
    alignItems: 'center',
    gap: 12,
    minWidth: 0,
  },
  passkeyIconBox: {
    width: 36,
    height: 36,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
  },
  passkeyTextGroup: {
    flex: 1,
    minWidth: 0,
    gap: 2,
  },
  passkeyNameRow: {
    alignItems: 'center',
    gap: 8,
    flexWrap: 'wrap',
  },
  passkeyName: {
    fontSize: 14,
    ...heeboFont('600'),
  },
  passkeyMeta: {
    fontSize: 12,
    ...heeboFont('400'),
  },
  modalFooterRow: {
    gap: 10,
    alignItems: 'center',
  },
});
