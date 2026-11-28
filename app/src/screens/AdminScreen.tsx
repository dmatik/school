import React, { useCallback, useEffect, useMemo, useRef, useState, type ComponentRef } from 'react';
import {
  Animated,
  View,
  ActivityIndicator,
  StyleSheet,
} from 'react-native';
import { Shield, UserPlus } from 'lucide-react-native';
import { useTranslation } from 'react-i18next';
import { useTheme } from '../theme/ThemeContext';
import { useDirection } from '../i18n';
import { apiFetch } from '../lib/api';
import {
  FieldLabel,
  FilledInput,
  SearchInput,
  SelectField,
} from '../components/ui/FormFields';
import { EmptyStateCard, NoticeBanner } from '../components/ui/Surfaces';
import { AdminUserRow } from '../components/ui/Cards';
import { Button, FloatingActionButton, useFabScrollPadding } from '../components/ui/Buttons';
import { AndroidBlurTarget, AndroidBlurTargetProvider } from '../components/ui/GlassBackdrop';
import { ConfirmModal, FullScreenModal } from '../components/ui/Modal';
import { InlineWebMobileHeader, useScrollHeader } from '../components/ui/MobileHeader';
import { PageHeader } from '../components/ui/PageHeader';
import { useResponsiveLayout } from '../hooks/useResponsiveLayout';
import type { User, WebtopChild } from '../../../shared/types';

export function AdminScreen({
  currentUser,
  syncTrigger = 0,
}: {
  currentUser: User;
  syncTrigger?: number;
}) {
  const { t } = useTranslation();
  const { palette } = useTheme();
  const { flexRow } = useDirection();
  const { isDesktop, pageMaxWidth } = useResponsiveLayout();
  const { headerHeight, onScroll, pullToRefreshProps, scrollRef } = useScrollHeader('admin');
  const fabBlurTargetRef = useRef<ComponentRef<typeof View> | null>(null);

  const [users, setUsers] = useState<User[]>([]);
  const [children, setChildren] = useState<WebtopChild[]>([]);
  const [search, setSearch] = useState('');
  const [loading, setLoading] = useState(true);
  const hasLoadedRef = useRef(false);

  const [userModalOpen, setUserModalOpen] = useState(false);
  const [editingUser, setEditingUser] = useState<User | null>(null);
  const [formUsername, setFormUsername] = useState('');
  const [formPassword, setFormPassword] = useState('');
  const [formFirstName, setFormFirstName] = useState('');
  const [formLastName, setFormLastName] = useState('');
  const [formRole, setFormRole] = useState<'admin' | 'user'>('user');
  const [formFamilyRole, setFormFamilyRole] = useState<'parent' | 'child'>('parent');
  const [formLinkedChildId, setFormLinkedChildId] = useState('');
  const [modalError, setModalError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  const [resetTarget, setResetTarget] = useState<User | null>(null);
  const [resetPassword, setResetPassword] = useState('');
  const [resetting, setResetting] = useState(false);

  const [deleteTarget, setDeleteTarget] = useState<User | null>(null);
  const [deleting, setDeleting] = useState(false);

  const loadData = useCallback(async () => {
    if (!hasLoadedRef.current) setLoading(true);
    try {
      const [usersRes, cfgRes] = await Promise.all([
        apiFetch('/api/admin/users'),
        apiFetch('/api/webtop/config'),
      ]);
      if (usersRes.ok) {
        const data = await usersRes.json();
        setUsers(Array.isArray(data) ? data : data.users || []);
      }
      if (cfgRes.ok) {
        const cfg = await cfgRes.json();
        setChildren(cfg.linkedChildren || []);
      }
      hasLoadedRef.current = true;
    } catch (err) {
      console.error('Admin load error:', err);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadData();
  }, [loadData, syncTrigger]);

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return users;
    return users.filter((u) =>
      `${u.username} ${u.firstName} ${u.lastName}`.toLowerCase().includes(q)
    );
  }, [users, search]);

  const openCreateModal = () => {
    setEditingUser(null);
    setFormUsername('');
    setFormPassword('');
    setFormFirstName('');
    setFormLastName('');
    setFormRole('user');
    setFormFamilyRole('parent');
    setFormLinkedChildId('');
    setModalError(null);
    setUserModalOpen(true);
  };

  const openEditModal = (u: User) => {
    setEditingUser(u);
    setFormUsername(u.username);
    setFormPassword('');
    setFormFirstName(u.firstName || '');
    setFormLastName(u.lastName || '');
    setFormRole(u.role);
    setFormFamilyRole(u.role === 'admin' ? 'parent' : u.familyRole || 'parent');
    setFormLinkedChildId(u.linkedChildId || '');
    setModalError(null);
    setUserModalOpen(true);
  };

  const handleSaveUser = async () => {
    setModalError(null);
    if (!editingUser && (!formUsername.trim() || !formPassword)) {
      setModalError(t('admin.create_failed'));
      return;
    }

    setSaving(true);
    try {
      const payload = editingUser
        ? {
            firstName: formFirstName.trim(),
            lastName: formLastName.trim(),
            role: formRole,
            familyRole: formRole === 'admin' ? 'parent' : formFamilyRole,
            linkedChildId:
              formRole === 'user' && formFamilyRole === 'child'
                ? formLinkedChildId || null
                : null,
          }
        : {
            username: formUsername.trim(),
            password: formPassword,
            firstName: formFirstName.trim(),
            lastName: formLastName.trim(),
            role: formRole,
            familyRole: formRole === 'admin' ? 'parent' : formFamilyRole,
            linkedChildId:
              formRole === 'user' && formFamilyRole === 'child'
                ? formLinkedChildId || null
                : null,
          };

      const res = editingUser
        ? await apiFetch(`/api/admin/users/${encodeURIComponent(editingUser.id)}`, {
            method: 'PUT',
            body: JSON.stringify(payload),
          })
        : await apiFetch('/api/admin/users', {
            method: 'POST',
            body: JSON.stringify(payload),
          });

      const data = await res.json().catch(() => null);
      if (!res.ok) {
        setModalError(data?.error || t('admin.create_failed'));
        return;
      }

      setUserModalOpen(false);
      await loadData();
    } catch (err) {
      setModalError(err instanceof Error ? err.message : t('admin.create_failed'));
    } finally {
      setSaving(false);
    }
  };

  const handleResetPassword = async () => {
    if (!resetTarget || !resetPassword) return;
    setResetting(true);
    try {
      const res = await apiFetch(
        `/api/admin/users/${encodeURIComponent(resetTarget.id)}/password`,
        {
          method: 'PUT',
          body: JSON.stringify({ password: resetPassword }),
        }
      );
      if (res.ok) {
        setResetTarget(null);
        setResetPassword('');
      }
    } catch (err) {
      console.error('Reset password error:', err);
    } finally {
      setResetting(false);
    }
  };

  const handleDeleteUser = async () => {
    if (!deleteTarget) return;
    setDeleting(true);
    try {
      const res = await apiFetch(
        `/api/admin/users/${encodeURIComponent(deleteTarget.id)}`,
        { method: 'DELETE' }
      );
      if (res.ok) {
        setDeleteTarget(null);
        await loadData();
      }
    } catch (err) {
      console.error('Delete user error:', err);
    } finally {
      setDeleting(false);
    }
  };

  const bottomPadding = useFabScrollPadding();

  const listHeader = (
    <>
      <InlineWebMobileHeader />
      <SearchInput
        testID="admin-search-input"
        value={search}
        onChangeText={setSearch}
        placeholder={t('admin.search_placeholder')}
        style={styles.searchBar}
      />
    </>
  );

  const listEmpty = loading ? (
    <View style={styles.center}>
      <ActivityIndicator size="large" color={palette.primary} />
    </View>
  ) : (
    <EmptyStateCard
      centered
      icon={Shield}
      title={users.length ? t('admin.no_users_found') : t('admin.no_users')}
    />
  );

  return (
    <View style={{ flex: 1 }}>
      <PageHeader title={t('admin.title')} />
      <AndroidBlurTarget targetRef={fabBlurTargetRef} style={{ flex: 1 }}>
        <Animated.FlatList
          ref={scrollRef as any}
          style={styles.container}
          contentContainerStyle={[
            styles.content,
            isDesktop
              ? {
                  maxWidth: pageMaxWidth,
                  width: '100%',
                  alignSelf: 'center',
                  paddingHorizontal: 24,
                  paddingTop: 12,
                  paddingBottom: bottomPadding,
                }
              : { paddingTop: headerHeight + 8, paddingBottom: bottomPadding },
          ]}
          showsVerticalScrollIndicator={false}
          data={loading ? [] : filtered}
          keyExtractor={(u) => u.id}
          ListHeaderComponent={listHeader}
          ListHeaderComponentStyle={{ zIndex: 20, elevation: 20 }}
          ListEmptyComponent={listEmpty}
          ItemSeparatorComponent={() => <View style={{ height: 12 }} />}
          renderItem={({ item: u }) => {
            const linked = children.find(
              (c) => c.id === u.linkedChildId || c.externalId === u.linkedChildId
            );
            const linkedName = linked
              ? `${linked.firstName} ${linked.lastName}`.trim()
              : null;

            return (
              <AdminUserRow
                user={u}
                isSelf={u.id === currentUser.id}
                linkedChildName={linkedName}
                onEdit={() => openEditModal(u)}
                onResetPassword={() => {
                  setResetTarget(u);
                  setResetPassword('');
                }}
                onDelete={() => setDeleteTarget(u)}
              />
            );
          }}
          onScroll={onScroll}
          scrollEventThrottle={16}
          {...pullToRefreshProps}
        />
      </AndroidBlurTarget>

      <AndroidBlurTargetProvider value={fabBlurTargetRef}>
        <FloatingActionButton
          testID="add-user-fab"
          icon={UserPlus}
          accessibilityLabel={t('admin.add_user_button')}
          onPress={openCreateModal}
        />
      </AndroidBlurTargetProvider>

      <FullScreenModal
        testID="user-modal"
        visible={userModalOpen}
        onClose={() => setUserModalOpen(false)}
        title={
          editingUser
            ? t('admin.edit_user_modal_title')
            : t('admin.create_user_modal_title')
        }
        description={
          editingUser
            ? t('admin.edit_user_modal_desc')
            : t('admin.create_user_modal_desc')
        }
        footer={
          <View style={[styles.modalFooterRow, { flexDirection: flexRow }]}>
            <Button
              testID="create-user-cancel"
              label={t('common.cancel')}
              variant="outline"
              onPress={() => setUserModalOpen(false)}
              style={{ flex: 1 }}
            />
            <Button
              testID="create-user-submit"
              label={editingUser ? t('common.save') : t('admin.create_button')}
              loading={saving}
              onPress={handleSaveUser}
              style={{ flex: 1 }}
            />
          </View>
        }
      >
        {modalError ? (
          <NoticeBanner variant="destructive" description={modalError} />
        ) : null}

        {!editingUser && (
          <>
            <View style={{ gap: 6 }}>
              <FieldLabel label={t('auth.username')} />
              <FilledInput
                testID="create-username"
                value={formUsername}
                onChangeText={setFormUsername}
                placeholder={t('auth.username_placeholder')}
                autoCapitalize="none"
              />
            </View>
            <View style={{ gap: 6 }}>
              <FieldLabel label={t('auth.password')} />
              <FilledInput
                value={formPassword}
                onChangeText={setFormPassword}
                placeholder="••••••••"
                secureTextEntry
                autoCapitalize="none"
              />
            </View>
          </>
        )}

        <View style={{ flexDirection: flexRow, gap: 12 }}>
          <View style={{ flex: 1, gap: 6 }}>
            <FieldLabel label={t('account.first_name')} />
            <FilledInput
              value={formFirstName}
              onChangeText={setFormFirstName}
              placeholder={t('account.first_name_placeholder')}
            />
          </View>

          <View style={{ flex: 1, gap: 6 }}>
            <FieldLabel label={t('account.last_name')} />
            <FilledInput
              value={formLastName}
              onChangeText={setFormLastName}
              placeholder={t('account.last_name_placeholder')}
            />
          </View>
        </View>

        <SelectField
          label={t('account.role')}
          value={formRole}
          options={[
            { label: t('account.role_user'), value: 'user' },
            { label: t('account.role_admin'), value: 'admin' },
          ]}
          onValueChange={(v) => {
            const role = v as 'admin' | 'user';
            setFormRole(role);
            if (role === 'admin') setFormFamilyRole('parent');
          }}
        />

        {formRole === 'user' && (
          <SelectField
            label={t('admin.family_role')}
            value={formFamilyRole}
            options={[
              { label: t('admin.role_parent'), value: 'parent' },
              { label: t('admin.role_child'), value: 'child' },
            ]}
            onValueChange={(v) => setFormFamilyRole(v as 'parent' | 'child')}
          />
        )}

        {formRole === 'user' && formFamilyRole === 'child' && (
          <SelectField
            label={t('admin.linked_child')}
            value={formLinkedChildId}
            options={[
              { label: t('admin.select_child_placeholder'), value: '' },
              ...children.map((c) => ({
                label: `${c.firstName} ${c.lastName}`.trim(),
                value: c.id,
              })),
            ]}
            onValueChange={setFormLinkedChildId}
          />
        )}
      </FullScreenModal>

      <FullScreenModal
        visible={Boolean(resetTarget)}
        onClose={() => setResetTarget(null)}
        title={t('admin.reset_password_modal_title')}
        description={
          resetTarget
            ? t('admin.reset_password_modal_desc', { username: resetTarget.username })
            : undefined
        }
        footer={
          <View style={[styles.modalFooterRow, { flexDirection: flexRow }]}>
            <Button
              label={t('common.cancel')}
              variant="outline"
              onPress={() => setResetTarget(null)}
              style={{ flex: 1 }}
            />
            <Button
              label={t('common.save')}
              loading={resetting}
              onPress={handleResetPassword}
              style={{ flex: 1 }}
            />
          </View>
        }
      >
        <View style={{ gap: 6 }}>
          <FieldLabel label={t('admin.new_password')} />
          <FilledInput
            value={resetPassword}
            onChangeText={setResetPassword}
            secureTextEntry
            autoCapitalize="none"
          />
        </View>
      </FullScreenModal>

      <ConfirmModal
        visible={Boolean(deleteTarget)}
        onClose={() => setDeleteTarget(null)}
        onConfirm={handleDeleteUser}
        title={t('admin.delete_user_title')}
        description={
          deleteTarget
            ? t('admin.delete_user_desc', { username: deleteTarget.username })
            : ''
        }
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
    gap: 12,
  },
  searchBar: {
    marginBottom: 6,
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
