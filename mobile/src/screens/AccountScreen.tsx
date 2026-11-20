import React, { useState } from 'react';
import { Animated, View, StyleSheet } from 'react-native';
import { User as UserIcon, Lock, LogOut } from 'lucide-react-native';
import * as ImagePicker from 'expo-image-picker';
import { useTranslation } from 'react-i18next';
import { apiFetch } from '../lib/api';
import { useDirection } from '../i18n';
import { NoticeBanner, SectionCard } from '../components/ui/Surfaces';
import { FieldLabel, FilledInput } from '../components/ui/FormFields';
import { StatusBadge, UserAvatar } from '../components/ui/Badges';
import { Button } from '../components/ui/Buttons';
import { useScrollHeader } from '../components/ui/MobileHeader';
import type { User } from '../../../src/types';

export function AccountScreen({
  currentUser,
  onUserUpdated,
  onLogout,
}: {
  currentUser: User;
  onUserUpdated: (user: User) => void;
  onLogout: () => void;
}) {
  const { t } = useTranslation();
  const { flexRow } = useDirection();
  const { headerHeight, onScroll } = useScrollHeader();

  const [firstName, setFirstName] = useState(currentUser.firstName || '');
  const [lastName, setLastName] = useState(currentUser.lastName || '');
  const [avatar, setAvatar] = useState(currentUser.avatar || '');
  const [savingProfile, setSavingProfile] = useState(false);

  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [savingPassword, setSavingPassword] = useState(false);

  const [feedback, setFeedback] = useState<{
    variant: 'info' | 'destructive';
    message: string;
  } | null>(null);

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
    <Animated.ScrollView
      style={styles.container}
      contentContainerStyle={[styles.content, { paddingTop: headerHeight + 8 }]}
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

        <View style={[styles.badgesRow, { flexDirection: flexRow }]}>
          <StatusBadge
            label={
              currentUser.role === 'admin'
                ? t('account.role_admin')
                : t('account.role_user')
            }
            variant="primary"
          />
          <StatusBadge
            label={
              currentUser.familyRole === 'child'
                ? t('account.role_child')
                : t('account.role_parent')
            }
            variant="neutral"
          />
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
  badgesRow: {
    gap: 8,
  },
});
