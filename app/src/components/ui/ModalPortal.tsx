import React, {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useId,
  useMemo,
  useRef,
  useState,
  type ComponentRef,
} from 'react';
import {
  BackHandler,
  Modal as RNModal,
  Platform,
  StyleSheet,
  View,
  type ModalProps,
} from 'react-native';
import { AndroidBlurTarget, AndroidBlurTargetProvider } from './GlassBackdrop';

interface PortalLayer {
  id: string;
  node: React.ReactNode;
  onRequestClose?: () => void;
}

interface ModalPortalContextValue {
  upsertLayer: (id: string, node: React.ReactNode, onRequestClose?: () => void) => void;
  removeLayer: (id: string) => void;
}

const ModalPortalContext = createContext<ModalPortalContextValue | null>(null);

/**
 * Provides a root-level JS overlay stack so modals, select sheets, and date
 * pickers can stack cleanly without nesting native <RNModal> instances (which
 * fails on iOS UIKit).
 */
export function ModalPortalProvider({ children }: { children: React.ReactNode }) {
  const [layers, setLayers] = useState<PortalLayer[]>([]);
  const layersRef = useRef<PortalLayer[]>([]);
  layersRef.current = layers;
  const portalBlurTargetRef = useRef<ComponentRef<typeof View> | null>(null);

  const upsertLayer = useCallback(
    (id: string, node: React.ReactNode, onRequestClose?: () => void) => {
      setLayers((prev) => {
        const idx = prev.findIndex((l) => l.id === id);
        if (idx === -1) {
          return [...prev, { id, node, onRequestClose }];
        }
        const next = prev.slice();
        next[idx] = { id, node, onRequestClose };
        return next;
      });
    },
    []
  );

  const removeLayer = useCallback((id: string) => {
    setLayers((prev) => {
      if (!prev.some((l) => l.id === id)) return prev;
      return prev.filter((l) => l.id !== id);
    });
  }, []);

  useEffect(() => {
    const sub = BackHandler.addEventListener('hardwareBackPress', () => {
      const current = layersRef.current;
      if (current.length === 0) return false;
      const top = current[current.length - 1];
      top?.onRequestClose?.();
      return true;
    });
    return () => sub.remove();
  }, []);

  useEffect(() => {
    if (Platform.OS !== 'web' || typeof document === 'undefined' || !document.body) {
      return;
    }
    if (layers.length === 0) return;

    const prevOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => {
      document.body.style.overflow = prevOverflow;
    };
  }, [layers.length]);

  const value = useMemo(
    () => ({ upsertLayer, removeLayer }),
    [upsertLayer, removeLayer]
  );

  return (
    <ModalPortalContext.Provider value={value}>
      <View style={styles.root}>
        <AndroidBlurTarget
          targetRef={portalBlurTargetRef}
          style={styles.childrenRoot}
          pointerEvents="box-none"
        >
          {children}
        </AndroidBlurTarget>
        {layers.length > 0 ? (
          <AndroidBlurTargetProvider value={portalBlurTargetRef}>
            <View
              style={[
                Platform.OS === 'web' ? styles.portalHostWeb : StyleSheet.absoluteFill,
                styles.portalHost,
              ]}
              pointerEvents="box-none"
            >
              {layers.map((layer, idx) => (
                <View
                  key={layer.id}
                  style={[StyleSheet.absoluteFill, { zIndex: 9999 + idx, elevation: 9999 + idx }]}
                  pointerEvents="box-none"
                >
                  {layer.node}
                </View>
              ))}
            </View>
          </AndroidBlurTargetProvider>
        ) : null}
      </View>
    </ModalPortalContext.Provider>
  );
}

/**
 * Renders modal content into ModalPortalProvider when mounted inside the app,
 * falling back to native <Modal> when rendered standalone (e.g. Storybook).
 */
export function ModalLayer({
  visible,
  children,
  onRequestClose,
  animationType = 'fade',
  statusBarTranslucent = true,
}: {
  visible: boolean;
  children: React.ReactNode;
  onRequestClose?: () => void;
  animationType?: ModalProps['animationType'];
  statusBarTranslucent?: boolean;
}) {
  const portal = useContext(ModalPortalContext);
  const id = useId();
  const onRequestCloseRef = useRef(onRequestClose);
  onRequestCloseRef.current = onRequestClose;

  useEffect(() => {
    if (!portal) return;
    if (visible) {
      portal.upsertLayer(id, children, () => onRequestCloseRef.current?.());
    } else {
      portal.removeLayer(id);
    }
  }, [portal, id, visible, children]);

  useEffect(() => {
    if (!portal) return;
    return () => {
      portal.removeLayer(id);
    };
  }, [portal, id]);

  if (portal) {
    return null;
  }

  return (
    <RNModal
      visible={visible}
      transparent
      animationType={animationType}
      statusBarTranslucent={statusBarTranslucent}
      onRequestClose={onRequestClose}
    >
      {children}
    </RNModal>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
  },
  childrenRoot: {
    flex: 1,
    zIndex: 0,
  },
  portalHost: {
    zIndex: 9999,
    elevation: 9999,
  },
  portalHostWeb: {
    position: 'fixed' as any,
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
  },
});
