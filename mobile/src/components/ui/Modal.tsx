import React from 'react';
import {
  Modal as RNModal,
  View,
  Text,
  ScrollView,
  Pressable,
  KeyboardAvoidingView,
  Platform,
  StyleSheet,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { X } from 'lucide-react-native';
import { useTheme } from '../../theme/ThemeContext';
import { heeboFont } from '../../theme/typography';
import { useDirection } from '../../i18n';
import { Button } from './Buttons';

export function FullScreenModal({
  visible,
  onClose,
  title,
  description,
  children,
  footer,
  testID,
}: {
  visible: boolean;
  onClose: () => void;
  title: string;
  description?: string;
  children: React.ReactNode;
  footer?: React.ReactNode;
  testID?: string;
}) {
  const { palette } = useTheme();
  const { flexRow, textAlign } = useDirection();

  return (
    <RNModal
      visible={visible}
      animationType="slide"
      presentationStyle="fullScreen"
      onRequestClose={onClose}
    >
      <SafeAreaView
        testID={testID}
        style={[styles.fullModal, { backgroundColor: palette.background }]}
      >
        <View
          style={[
            styles.modalHeader,
            { flexDirection: flexRow, borderBottomColor: palette.border, backgroundColor: palette.card },
          ]}
        >
          <View style={{ flex: 1 }}>
            <Text style={[styles.modalTitle, { color: palette.foreground, textAlign }]}>
              {title}
            </Text>
            {description ? (
              <Text style={[styles.modalDesc, { color: palette.mutedForeground, textAlign }]}>
                {description}
              </Text>
            ) : null}
          </View>
          <Pressable onPress={onClose} hitSlop={10} style={styles.closeBtn}>
            <X size={20} color={palette.foreground} />
          </Pressable>
        </View>

        <KeyboardAvoidingView
          style={{ flex: 1 }}
          behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        >
          <ScrollView
            contentContainerStyle={styles.modalBody}
            showsVerticalScrollIndicator={false}
            keyboardShouldPersistTaps="handled"
          >
            {children}
          </ScrollView>
          {footer ? (
            <View
              style={[
                styles.modalFooter,
                { borderTopColor: palette.border, backgroundColor: palette.card },
              ]}
            >
              {footer}
            </View>
          ) : null}
        </KeyboardAvoidingView>
      </SafeAreaView>
    </RNModal>
  );
}

export function ConfirmModal({
  visible,
  onClose,
  onConfirm,
  title,
  description,
  confirmText,
  cancelText,
  loading = false,
}: {
  visible: boolean;
  onClose: () => void;
  onConfirm: () => void;
  title: string;
  description: string;
  confirmText: string;
  cancelText: string;
  loading?: boolean;
}) {
  const { palette } = useTheme();
  const { flexRow, textAlign } = useDirection();

  return (
    <RNModal visible={visible} transparent animationType="fade" onRequestClose={onClose}>
      <View style={styles.confirmBackdrop}>
        <View
          style={[
            styles.confirmBox,
            { backgroundColor: palette.card, borderColor: palette.border },
          ]}
        >
          <Text style={[styles.confirmTitle, { color: palette.foreground, textAlign }]}>
            {title}
          </Text>
          <Text style={[styles.confirmDesc, { color: palette.mutedForeground, textAlign }]}>
            {description}
          </Text>
          <View style={[styles.confirmActions, { flexDirection: flexRow }]}>
            <Button
              label={cancelText}
              variant="outline"
              size="sm"
              onPress={onClose}
              style={{ flex: 1 }}
            />
            <Button
              label={confirmText}
              variant="destructive"
              size="sm"
              loading={loading}
              onPress={onConfirm}
              style={{ flex: 1 }}
            />
          </View>
        </View>
      </View>
    </RNModal>
  );
}

const styles = StyleSheet.create({
  fullModal: {
    flex: 1,
  },
  modalHeader: {
    paddingHorizontal: 16,
    paddingVertical: 14,
    borderBottomWidth: 1,
    alignItems: 'center',
    gap: 12,
  },
  modalTitle: {
    fontSize: 17,
    ...heeboFont('700'),
  },
  modalDesc: {
    fontSize: 12,
    marginTop: 2,
    ...heeboFont('400'),
  },
  closeBtn: {
    padding: 6,
  },
  modalBody: {
    padding: 16,
    gap: 14,
  },
  modalFooter: {
    padding: 16,
    borderTopWidth: 1,
  },
  confirmBackdrop: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'center',
    padding: 24,
  },
  confirmBox: {
    borderRadius: 16,
    borderWidth: 1,
    padding: 20,
    gap: 12,
  },
  confirmTitle: {
    fontSize: 16,
    ...heeboFont('700'),
  },
  confirmDesc: {
    fontSize: 13,
    lineHeight: 19,
    ...heeboFont('400'),
  },
  confirmActions: {
    gap: 10,
    marginTop: 6,
  },
});
