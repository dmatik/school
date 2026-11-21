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
import { Globe, Lock, User as UserIcon } from 'lucide-react-native';
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
import { mobileStorage } from '../lib/storage';
import {
  Button,
  LanguageToggleButton,
  ModeToggleButton,
} from '../components/ui/Buttons';
import { FieldLabel, IconInput } from '../components/ui/FormFields';
import { NoticeBanner } from '../components/ui/Surfaces';
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

  useEffect(() => {
    if (!serverUrl) {
      mobileStorage.getServerUrl().then((saved) => {
        if (saved) setServerUrl(saved);
      });
    }
  }, [serverUrl]);

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
              />
            </View>

            <View style={styles.fieldGroup}>
              <FieldLabel label={t('auth.username')} />
              <IconInput
                testID="username-input"
                icon={UserIcon}
                value={username}
                onChangeText={setUsername}
                placeholder={t('auth.username_placeholder')}
                autoCapitalize="none"
                autoCorrect={false}
              />
            </View>

            <View style={styles.fieldGroup}>
              <FieldLabel label={t('auth.password')} />
              <IconInput
                testID="password-input"
                icon={Lock}
                value={password}
                onChangeText={setPassword}
                placeholder="••••••••"
                secureTextEntry
                autoCapitalize="none"
              />
            </View>

            <Button
              testID="login-submit-button"
              label={loading ? t('auth.logging_in') : t('auth.login_button')}
              loading={loading}
              onPress={handleSubmit}
              style={{ marginTop: 6 }}
            />

            <View style={[styles.footerHint, { borderTopColor: palette.border }]}>
              <Text style={[styles.hintText, { color: palette.mutedForeground }]}>
                {t('auth.default_credentials_hint')}
              </Text>
            </View>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
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
  footerHint: {
    borderTopWidth: 1,
    paddingTop: 12,
    marginTop: 4,
  },
  hintText: {
    fontSize: 11,
    textAlign: 'center',
  },
});
