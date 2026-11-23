import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  ScrollView,
  KeyboardAvoidingView,
  Platform,
  StyleSheet,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Globe, Lock, User as UserIcon, Fingerprint } from 'lucide-react-native';
import { useTranslation } from 'react-i18next';
import { useTheme } from '../theme/ThemeContext';
import { heeboFont } from '../theme/typography';
import { useDirection } from '../i18n';
import {
  normalizeServerUrl,
  verifyServerConnection,
  persistSession,
  getActiveServerUrl,
} from '../lib/api';
import {
  getSavedPasskeyAccounts,
  isPasskeySupported,
  loginWithPasskey,
  type StoredPasskeyEntry,
} from '../lib/passkey';
import { mobileStorage } from '../lib/storage';
import {
  Button,
  LanguageToggleButton,
  ModeToggleButton,
} from '../components/ui/Buttons';
import { FieldLabel, IconInput } from '../components/ui/FormFields';
import { NoticeBanner } from '../components/ui/Surfaces';
import { PasskeyAccountRow } from '../components/ui/Cards';
import { Modal } from '../components/ui/Modal';
import type { User } from '../../../src/types';

export function LoginScreen({
  onLoginSuccess,
}: {
  onLoginSuccess: (serverUrl: string, token: string, user: User) => void;
}) {
  const { t } = useTranslation();
  const { palette } = useTheme();
  const { flexRow } = useDirection();

  const [serverUrl, setServerUrl] = useState(getActiveServerUrl() || '');
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [passkeyLoading, setPasskeyLoading] = useState(false);
  const [hasPasskeySupport, setHasPasskeySupport] = useState(false);
  const [passkeyAccounts, setPasskeyAccounts] = useState<StoredPasskeyEntry[]>([]);
  const [showPasskeyPicker, setShowPasskeyPicker] = useState(false);

  useEffect(() => {
    if (!serverUrl) {
      mobileStorage.getServerUrl().then((saved) => {
        if (saved) setServerUrl(saved);
      });
    }
  }, [serverUrl]);

  useEffect(() => {
    let active = true;
    isPasskeySupported().then((supported) => {
      if (active) setHasPasskeySupport(supported);
    });
    return () => {
      active = false;
    };
  }, []);

  const handleSubmit = async () => {
    setError(null);

    let normalizedUrl: string;
    try {
      normalizedUrl = normalizeServerUrl(serverUrl);
    } catch (err) {
      const code = err instanceof Error ? err.message : '';
      if (code === 'SERVER_URL_REQUIRED') {
        setError(t('auth.server_url_required'));
      } else {
        setError(t('auth.server_url_invalid'));
      }
      return;
    }

    if (!username.trim() || !password) {
      setError(t('auth.login_failed'));
      return;
    }

    setLoading(true);
    try {
      const reachable = await verifyServerConnection(normalizedUrl);
      if (!reachable) {
        setError(t('auth.server_unreachable'));
        return;
      }

      const res = await fetch(`${normalizedUrl}/api/auth/login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          username: username.trim(),
          password,
        }),
      });

      const data = await res.json().catch(() => null);
      if (!res.ok || !data?.token || !data?.user) {
        if (res.status === 401) {
          setError(t('auth.login_failed'));
        } else {
          setError(data?.message || data?.error || t('auth.login_failed'));
        }
        return;
      }

      await persistSession(normalizedUrl, data.token);
      onLoginSuccess(normalizedUrl, data.token, data.user);
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err);
      setError(msg || t('auth.login_failed'));
    } finally {
      setLoading(false);
    }
  };

  const executePasskeyLogin = async (normalizedUrl: string, targetUsername?: string) => {
    setPasskeyLoading(true);
    try {
      const reachable = await verifyServerConnection(normalizedUrl);
      if (!reachable) {
        setError(t('auth.server_unreachable'));
        return;
      }

      const result = await loginWithPasskey(
        normalizedUrl,
        targetUsername,
        t('auth.login_with_passkey')
      );
      await persistSession(normalizedUrl, result.token);
      onLoginSuccess(normalizedUrl, result.token, result.user);
    } catch (err) {
      const errorObj = err as Error & { name?: string };
      // Silently ignore user cancellation of the OS biometric prompt
      if (errorObj.name !== 'NotAllowedError') {
        setError(errorObj.message || t('auth.passkey_failed'));
      }
    } finally {
      setPasskeyLoading(false);
    }
  };

  const handlePasskeyLogin = async () => {
    setError(null);

    let normalizedUrl: string;
    try {
      normalizedUrl = normalizeServerUrl(serverUrl);
    } catch (err) {
      const code = err instanceof Error ? err.message : '';
      if (code === 'SERVER_URL_REQUIRED') {
        setError(t('auth.server_url_required'));
      } else {
        setError(t('auth.server_url_invalid'));
      }
      return;
    }

    const typedUsername = username.trim();
    if (!typedUsername) {
      const accounts = await getSavedPasskeyAccounts(normalizedUrl);
      if (accounts.length > 1) {
        setPasskeyAccounts(accounts);
        setShowPasskeyPicker(true);
        return;
      }
    }

    await executePasskeyLogin(normalizedUrl, typedUsername || undefined);
  };

  const handleSelectPasskeyAccount = async (account: StoredPasskeyEntry) => {
    setShowPasskeyPicker(false);
    let normalizedUrl: string;
    try {
      normalizedUrl = normalizeServerUrl(serverUrl);
    } catch {
      return;
    }
    await executePasskeyLogin(normalizedUrl, account.username);
  };

  return (
    <SafeAreaView style={[styles.safe, { backgroundColor: palette.background }]}>
      <View style={[styles.topControls, { flexDirection: flexRow }]}>
        <LanguageToggleButton />
        <ModeToggleButton />
      </View>

      <KeyboardAvoidingView
        style={{ flex: 1 }}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      >
        <ScrollView
          contentContainerStyle={styles.scrollContent}
          showsVerticalScrollIndicator={false}
          keyboardShouldPersistTaps="handled"
        >
          <View
            style={[
              styles.card,
              { backgroundColor: palette.card, borderColor: palette.border },
            ]}
          >
            <View style={styles.header}>
              <View
                style={[
                  styles.logoBox,
                  { backgroundColor: 'rgba(59, 130, 196, 0.12)' },
                ]}
              >
                <UserIcon size={24} color={palette.primary} />
              </View>
              <Text style={[styles.title, { color: palette.primary }]}>
                {t('common.app_title')}
              </Text>
              <Text style={[styles.subtitle, { color: palette.mutedForeground }]}>
                {t('auth.login_subtitle')}
              </Text>
            </View>

            {error ? (
              <NoticeBanner
                testID="login-error-box"
                variant="destructive"
                description={error}
              />
            ) : null}

            <View style={styles.fieldGroup}>
              <FieldLabel label={t('auth.server_url')} />
              <IconInput
                testID="server-url-input"
                icon={Globe}
                forceLtr
                value={serverUrl}
                onChangeText={setServerUrl}
                placeholder={t('auth.server_url_placeholder')}
                autoCapitalize="none"
                autoCorrect={false}
                keyboardType="url"
                editable={!loading && !passkeyLoading}
              />
            </View>

            <View style={styles.fieldGroup}>
              <FieldLabel label={t('auth.username')} />
              <IconInput
                testID="username-input"
                icon={UserIcon}
                forceLtr
                value={username}
                onChangeText={setUsername}
                placeholder={t('auth.username_placeholder')}
                autoCapitalize="none"
                autoCorrect={false}
                editable={!loading && !passkeyLoading}
              />
            </View>

            <View style={styles.fieldGroup}>
              <FieldLabel label={t('auth.password')} />
              <IconInput
                testID="password-input"
                icon={Lock}
                forceLtr
                value={password}
                onChangeText={setPassword}
                placeholder="••••••••"
                secureTextEntry
                autoCapitalize="none"
                editable={!loading && !passkeyLoading}
              />
            </View>

            <Button
              testID="login-submit-button"
              label={loading ? t('auth.logging_in') : t('auth.login_button')}
              loading={loading}
              disabled={loading || passkeyLoading}
              onPress={handleSubmit}
              style={{ marginTop: 6 }}
            />

            {hasPasskeySupport ? (
              <>
                <View style={[styles.dividerRow, { flexDirection: flexRow }]}>
                  <View
                    style={[
                      styles.dividerLine,
                      { backgroundColor: palette.border },
                    ]}
                  />
                  <Text
                    style={[
                      styles.dividerText,
                      { color: palette.mutedForeground },
                    ]}
                  >
                    {t('auth.or_use_password')}
                  </Text>
                  <View
                    style={[
                      styles.dividerLine,
                      { backgroundColor: palette.border },
                    ]}
                  />
                </View>

                <Button
                  testID="passkey-login-button"
                  variant="outline"
                  icon={Fingerprint}
                  label={
                    passkeyLoading
                      ? t('auth.logging_in')
                      : t('auth.login_with_passkey')
                  }
                  loading={passkeyLoading}
                  disabled={loading || passkeyLoading}
                  onPress={handlePasskeyLogin}
                />
              </>
            ) : null}
          </View>
        </ScrollView>
      </KeyboardAvoidingView>

      <Modal
        testID="passkey-account-picker-modal"
        visible={showPasskeyPicker}
        onClose={() => setShowPasskeyPicker(false)}
        title={t('auth.select_passkey_account_title')}
        description={t('auth.select_passkey_account_desc')}
        icon={Fingerprint}
        maxWidth="sm"
        footer={
          <Button
            label={t('common.cancel')}
            variant="outline"
            size="sm"
            onPress={() => setShowPasskeyPicker(false)}
          />
        }
      >
        <View style={{ gap: 10 }}>
          {passkeyAccounts.map((account) => (
            <PasskeyAccountRow
              key={account.credentialId}
              testID={`passkey-account-${account.username}`}
              username={account.username}
              firstName={account.firstName}
              lastName={account.lastName}
              deviceName={account.deviceName}
              onPress={() => {
                void handleSelectPasskeyAccount(account);
              }}
            />
          ))}
        </View>
      </Modal>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: {
    flex: 1,
  },
  topControls: {
    paddingHorizontal: 16,
    paddingTop: 8,
    justifyContent: 'flex-end',
    gap: 8,
  },
  scrollContent: {
    flexGrow: 1,
    justifyContent: 'center',
    padding: 16,
  },
  card: {
    borderRadius: 20,
    borderWidth: 1,
    padding: 20,
    gap: 14,
  },
  header: {
    alignItems: 'center',
    gap: 6,
    marginBottom: 4,
  },
  logoBox: {
    width: 48,
    height: 48,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 4,
  },
  title: {
    fontSize: 24,
    ...heeboFont('800'),
  },
  subtitle: {
    fontSize: 12,
    ...heeboFont('500'),
    textAlign: 'center',
  },
  fieldGroup: {
    gap: 6,
  },
  dividerRow: {
    alignItems: 'center',
    gap: 10,
    marginVertical: 2,
  },
  dividerLine: {
    flex: 1,
    height: 1,
  },
  dividerText: {
    fontSize: 11,
    ...heeboFont('500'),
    textTransform: 'uppercase',
    letterSpacing: 0.4,
  },
});
