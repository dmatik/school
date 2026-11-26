import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  Animated,
  Keyboard,
  Modal as RNModal,
  PanResponder,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  UIManager,
  View,
  useWindowDimensions,
  type NativeScrollEvent,
  type NativeSyntheticEvent,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { X, type LucideIcon } from 'lucide-react-native';
import { useTheme } from '../../theme/ThemeContext';
import { heeboFont } from '../../theme/typography';
import { useDirection } from '../../i18n';
import { ModalLayer } from './ModalPortal';
import { Button } from './Buttons';

let NativeBlurView: React.ComponentType<any> | null = null;
const hasNativeBlur =
  Platform.OS !== 'web' && UIManager.getViewManagerConfig?.('ExpoBlurView') != null;

if (hasNativeBlur) {
  try {
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    NativeBlurView = require('expo-blur').BlurView;
  } catch {
    NativeBlurView = null;
  }
}

export interface ModalProps {
  visible: boolean;
  onClose: () => void;
  title: string;
  description?: string;
  icon?: LucideIcon;
  maxWidth?: 'sm' | 'md' | 'lg';
  children: React.ReactNode;
  footer?: React.ReactNode;
  testID?: string;
}

/**
 * Responsive mobile bottom sheet (< 640px) / centered dialog (>= 640px)
 * with swipe-to-close handle, blurred dimmed backdrop, dynamic keyboard
 * height compression, and automatic scroll-into-view for focused inputs.
 */
export function Modal({
  visible,
  onClose,
  title,
  description,
  icon: Icon,
  maxWidth = 'md',
  children,
  footer,
  testID,
}: ModalProps) {
  const { palette, isDark } = useTheme();
  const { flexRow, textAlign } = useDirection();
  const insets = useSafeAreaInsets();
  const { width, height } = useWindowDimensions();
  const isTablet = width >= 640;

  const [keyboardHeight, setKeyboardHeight] = useState(0);
  const dragY = useRef(new Animated.Value(0)).current;
  const scrollRef = useRef<React.ComponentRef<typeof ScrollView> | null>(null);
  const scrollViewportRef = useRef<React.ComponentRef<typeof View> | null>(null);
  const scrollOffsetRef = useRef(0);

  const scrollFocusedInputIntoView = useCallback(() => {
    const currentlyFocused = (
      TextInput.State as unknown as {
        currentlyFocusedInput?: () => {
          measureInWindow?: (
            cb: (x: number, y: number, w: number, h: number) => void
          ) => void;
        } | null;
      }
    )?.currentlyFocusedInput?.();

    if (!currentlyFocused?.measureInWindow || !scrollViewportRef.current?.measureInWindow) {
      return;
    }

    currentlyFocused.measureInWindow((_fx, fy, _fw, fh) => {
      scrollViewportRef.current?.measureInWindow((_sx: number, sy: number, _sw: number, sh: number) => {
        if (sh <= 0 || fh <= 0) return;
        const bottomBuffer = 20;
        const topBuffer = 12;

        if (fy + fh > sy + sh - bottomBuffer) {
          const overflowBottom = fy + fh - (sy + sh - bottomBuffer);
          const nextY = scrollOffsetRef.current + overflowBottom;
          scrollRef.current?.scrollTo({ y: nextY, animated: true });
          scrollOffsetRef.current = nextY;
        } else if (fy < sy + topBuffer) {
          const overflowTop = sy + topBuffer - fy;
          const nextY = Math.max(0, scrollOffsetRef.current - overflowTop);
          scrollRef.current?.scrollTo({ y: nextY, animated: true });
          scrollOffsetRef.current = nextY;
        }
      });
    });
  }, []);

  useEffect(() => {
    if (!visible) {
      setKeyboardHeight(0);
      dragY.setValue(0);
      scrollOffsetRef.current = 0;
      return;
    }

    const showEvent = Platform.OS === 'ios' ? 'keyboardWillShow' : 'keyboardDidShow';
    const hideEvent = Platform.OS === 'ios' ? 'keyboardWillHide' : 'keyboardDidHide';

    let t1: ReturnType<typeof setTimeout> | null = null;
    let t2: ReturnType<typeof setTimeout> | null = null;

    const onShow = (e: { endCoordinates?: { height?: number } }) => {
      const kbH = e.endCoordinates?.height || 0;
      setKeyboardHeight(kbH);
      t1 = setTimeout(scrollFocusedInputIntoView, 60);
      t2 = setTimeout(scrollFocusedInputIntoView, 220);
    };

    const onHide = () => {
      setKeyboardHeight(0);
    };

    const showSub = Keyboard.addListener(showEvent, onShow);
    const hideSub = Keyboard.addListener(hideEvent, onHide);

    return () => {
      showSub.remove();
      hideSub.remove();
      if (t1) clearTimeout(t1);
      if (t2) clearTimeout(t2);
    };
  }, [visible, dragY, scrollFocusedInputIntoView]);

  const panResponder = useMemo(
    () =>
      PanResponder.create({
        onStartShouldSetPanResponder: () => !isTablet,
        onMoveShouldSetPanResponder: (_, g) =>
          !isTablet && Math.abs(g.dy) > 4 && Math.abs(g.dy) > Math.abs(g.dx),
        onPanResponderMove: (_, g) => {
          if (g.dy > 0) {
            dragY.setValue(g.dy);
          }
        },
        onPanResponderRelease: (_, g) => {
          if (g.dy > 75 || (g.vy > 0.6 && g.dy > 24)) {
            Keyboard.dismiss();
            Animated.timing(dragY, {
              toValue: 400,
              duration: 180,
              useNativeDriver: true,
            }).start(() => {
              dragY.setValue(0);
              onClose();
            });
          } else {
            Animated.spring(dragY, {
              toValue: 0,
              useNativeDriver: true,
              bounciness: 6,
            }).start();
          }
        },
        onPanResponderTerminate: () => {
          Animated.spring(dragY, {
            toValue: 0,
            useNativeDriver: true,
          }).start();
        },
      }),
    [isTablet, dragY, onClose]
  );

  const handleDismiss = useCallback(() => {
    Keyboard.dismiss();
    onClose();
  }, [onClose]);

  const topReserve = Math.max(insets.top, 24) + 12;
  const maxSheetHeight = isTablet
    ? Math.max(260, height - keyboardHeight - 48)
    : Math.max(240, height - topReserve);

  const tabletMaxWidth = maxWidth === 'sm' ? 384 : maxWidth === 'lg' ? 512 : 448;
  const keyboardOpen = Platform.OS === 'ios' && keyboardHeight > 0;
  const footerBottomPad = isTablet
    ? 16
    : keyboardOpen
    ? keyboardHeight + 12
    : Math.max(insets.bottom, 16);

  return (
    <ModalLayer
      visible={visible}
      animationType={isTablet ? 'fade' : 'slide'}
      statusBarTranslucent
      onRequestClose={handleDismiss}
    >
      <View
        style={[
          styles.overlayRoot,
          isTablet
            ? {
                justifyContent: 'center',
                alignItems: 'center',
                padding: 24,
                paddingBottom: Math.max(24, keyboardHeight + 16),
              }
            : {
                justifyContent: 'flex-end',
              },
        ]}
      >
        {/* Blurred + dimmed backdrop */}
        <Pressable style={StyleSheet.absoluteFill} onPress={handleDismiss}>
          {NativeBlurView ? (
            <NativeBlurView
              intensity={18}
              tint={isDark ? 'dark' : 'light'}
              style={StyleSheet.absoluteFill}
            />
          ) : null}
          <View
            style={[
              StyleSheet.absoluteFill,
              {
                backgroundColor: isDark
                  ? 'rgba(0, 0, 0, 0.65)'
                  : 'rgba(0, 0, 0, 0.45)',
              },
            ]}
          />
        </Pressable>

        {/* Sheet / Card Container */}
        <Animated.View
          testID={testID}
          style={[
            styles.sheetCard,
            {
              backgroundColor: palette.card,
              borderColor: isTablet ? palette.border : palette.borderSubtle,
              maxHeight: maxSheetHeight,
              transform: [{ translateY: isTablet ? 0 : dragY }],
            },
            isTablet
              ? [styles.tabletCard, { maxWidth: tabletMaxWidth }]
              : styles.mobileSheet,
          ]}
        >
          {/* Grab Handle + Header (Swipe-to-close on mobile) */}
          <View {...(!isTablet ? panResponder.panHandlers : {})}>
            {!isTablet && (
              <View style={styles.handleWrap}>
                <View
                  style={[
                    styles.handleBar,
                    { backgroundColor: palette.mutedForeground },
                  ]}
                />
              </View>
            )}

            <View
              style={[
                styles.modalHeader,
                {
                  flexDirection: flexRow,
                  borderBottomColor: palette.borderSubtle,
                  paddingTop: isTablet ? 18 : 4,
                },
              ]}
            >
              <View style={styles.headerTextWrap}>
                <View style={[styles.titleRow, { flexDirection: flexRow }]}>
                  {Icon ? <Icon size={20} color={palette.primary} /> : null}
                  <Text style={[styles.modalTitle, { color: palette.foreground, textAlign }]}>
                    {title}
                  </Text>
                </View>
                {description ? (
                  <Text
                    style={[
                      styles.modalDesc,
                      { color: palette.mutedForeground, textAlign },
                    ]}
                  >
                    {description}
                  </Text>
                ) : null}
              </View>

              {isTablet && (
                <Pressable onPress={handleDismiss} hitSlop={10} style={styles.closeBtn}>
                  <X size={18} color={palette.mutedForeground} />
                </Pressable>
              )}
            </View>
          </View>

          {/* Scrollable Form Body with Auto-Scroll-Into-View */}
          <View
            ref={scrollViewportRef}
            style={styles.bodyViewport}
            onTouchEndCapture={() => {
              setTimeout(scrollFocusedInputIntoView, 90);
            }}
          >
            <ScrollView
              ref={scrollRef}
              showsVerticalScrollIndicator={false}
              keyboardShouldPersistTaps="handled"
              onScroll={(e: NativeSyntheticEvent<NativeScrollEvent>) => {
                scrollOffsetRef.current = e.nativeEvent.contentOffset.y;
              }}
              scrollEventThrottle={16}
              contentContainerStyle={styles.modalBody}
            >
              {children}
            </ScrollView>
          </View>

          {/* Footer */}
          {footer ? (
            <View
              style={[
                styles.modalFooter,
                {
                  borderTopColor: palette.borderSubtle,
                  paddingBottom: footerBottomPad,
                },
              ]}
            >
              {footer}
            </View>
          ) : (
            <View
              style={{
                height: isTablet
                  ? 12
                  : keyboardOpen
                  ? keyboardHeight + 8
                  : Math.max(insets.bottom, 16),
              }}
            />
          )}
        </Animated.View>
      </View>
    </ModalLayer>
  );
}

/**
 * Backward-compatible alias for `Modal`.
 */
export const FullScreenModal = Modal;

export function ConfirmModal({
  visible,
  onClose,
  onConfirm,
  title,
  description,
  icon: Icon,
  confirmText,
  cancelText,
  variant = 'destructive',
  loading = false,
}: {
  visible: boolean;
  onClose: () => void;
  onConfirm: () => void;
  title: string;
  description: string;
  icon?: LucideIcon;
  confirmText: string;
  cancelText: string;
  variant?: 'destructive' | 'default';
  loading?: boolean;
}) {
  const { palette, isDark } = useTheme();
  const { flexRow, textAlign } = useDirection();
  const isDestructive = variant === 'destructive';

  return (
    <ModalLayer
      visible={visible}
      animationType="fade"
      statusBarTranslucent
      onRequestClose={() => {
        if (!loading) onClose();
      }}
    >
      <View style={styles.confirmBackdrop}>
        <Pressable
          style={StyleSheet.absoluteFill}
          onPress={() => {
            if (!loading) onClose();
          }}
        >
          {NativeBlurView ? (
            <NativeBlurView
              intensity={18}
              tint={isDark ? 'dark' : 'light'}
              style={StyleSheet.absoluteFill}
            />
          ) : null}
          <View
            style={[
              StyleSheet.absoluteFill,
              {
                backgroundColor: isDark
                  ? 'rgba(0, 0, 0, 0.65)'
                  : 'rgba(0, 0, 0, 0.45)',
              },
            ]}
          />
        </Pressable>

        <View
          style={[
            styles.confirmBox,
            { backgroundColor: palette.card, borderColor: palette.border },
          ]}
        >
          <View style={[styles.titleRow, { flexDirection: flexRow }]}>
            {Icon ? (
              <Icon
                size={18}
                color={isDestructive ? palette.destructive : palette.primary}
              />
            ) : null}
            <Text
              style={[
                styles.confirmTitle,
                {
                  color: isDestructive ? palette.destructive : palette.foreground,
                  textAlign,
                },
              ]}
            >
              {title}
            </Text>
          </View>
          <Text style={[styles.confirmDesc, { color: palette.mutedForeground, textAlign }]}>
            {description}
          </Text>
          <View style={[styles.confirmActions, { flexDirection: flexRow }]}>
            <Button
              label={cancelText}
              variant="outline"
              size="sm"
              disabled={loading}
              onPress={onClose}
              style={{ flex: 1 }}
            />
            <Button
              label={confirmText}
              variant={isDestructive ? 'destructive' : 'primary'}
              size="sm"
              loading={loading}
              onPress={onConfirm}
              style={{ flex: 1 }}
            />
          </View>
        </View>
      </View>
    </ModalLayer>
  );
}

const styles = StyleSheet.create({
  overlayRoot: {
    flex: 1,
  },
  sheetCard: {
    overflow: 'hidden',
    flexShrink: 1,
  },
  mobileSheet: {
    width: '100%',
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    borderTopWidth: 1,
  },
  tabletCard: {
    width: '100%',
    borderRadius: 16,
    borderWidth: 1,
  },
  handleWrap: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingTop: 10,
    paddingBottom: 10,
  },
  handleBar: {
    width: 40,
    height: 5,
    borderRadius: 999,
    opacity: 0.28,
  },
  modalHeader: {
    paddingHorizontal: 16,
    paddingBottom: 12,
    borderBottomWidth: 1,
    alignItems: 'flex-start',
    gap: 12,
  },
  headerTextWrap: {
    flex: 1,
    gap: 4,
    minWidth: 0,
  },
  titleRow: {
    alignItems: 'center',
    gap: 8,
  },
  modalTitle: {
    fontSize: 18,
    ...heeboFont('700'),
    flexShrink: 1,
  },
  modalDesc: {
    fontSize: 13,
    ...heeboFont('400'),
  },
  closeBtn: {
    padding: 4,
    borderRadius: 999,
  },
  bodyViewport: {
    flexShrink: 1,
  },
  modalBody: {
    paddingHorizontal: 16,
    paddingVertical: 14,
    gap: 14,
  },
  modalFooter: {
    paddingHorizontal: 16,
    paddingTop: 12,
    borderTopWidth: 1,
  },
  confirmBackdrop: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 24,
  },
  confirmBox: {
    width: '100%',
    maxWidth: 400,
    borderRadius: 16,
    borderWidth: 1,
    padding: 20,
    gap: 10,
  },
  confirmTitle: {
    fontSize: 17,
    ...heeboFont('700'),
    flexShrink: 1,
  },
  confirmDesc: {
    fontSize: 14,
    ...heeboFont('400'),
  },
  confirmActions: {
    gap: 10,
    marginTop: 8,
  },
});
