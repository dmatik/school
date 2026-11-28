import React, { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState } from 'react';
import {
  Animated,
  Platform,
  RefreshControl,
  type NativeScrollEvent,
  type NativeSyntheticEvent,
  type ViewStyle,
} from 'react-native';
import { useSharedValue, type SharedValue } from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useResponsiveLayout } from '../../hooks/useResponsiveLayout';

export const PULL_THRESHOLD = 110;
const SCROLL_IDLE_DELAY_MS = 450;
const SCROLL_DELTA_THRESHOLD = 3;
const PROGRAMMATIC_RESET_GUARD_MS = 250;

/**
 * Web-only CSS transition for scroll-hidden chrome.
 * Omits `transform` when visible so CSS `transform` settles to `none` after
 * the transition and never traps `BlurView` (`backdrop-filter`) in a
 * composited stacking context.
 */
export function getScrollVisibilityWebStyle(
  isHidden: boolean,
  translateY: number,
  scale = 1
): ViewStyle {
  return {
    opacity: isHidden ? 0 : 1,
    ...(isHidden
      ? {
          transform:
            scale === 1
              ? [{ translateY }]
              : [{ translateY }, { scale }],
        }
      : {}),
    ...({
      transitionProperty: 'opacity, transform',
      transitionDuration: isHidden ? '180ms' : '240ms',
      transitionTimingFunction: isHidden
        ? 'cubic-bezier(0.4, 0, 1, 1)'
        : 'cubic-bezier(0.22, 1, 0.36, 1)',
    } as ViewStyle),
  };
}

export interface PullToRefreshScrollProps {
  onScrollBeginDrag: () => void;
  onScrollEndDrag: () => void;
  alwaysBounceVertical: boolean;
  bounces: boolean;
  refreshControl?: React.ReactElement<React.ComponentProps<typeof RefreshControl>>;
}

export interface ScrollHeaderContextValue {
  headerHeight: number;
  scrollY: Animated.Value;
  isScrolling: boolean;
  onScroll: (...args: any[]) => void;
  resetScroll: () => void;
  switchTabScroll: (tab: string) => void;
  pullToRefreshProps: PullToRefreshScrollProps;
  pullDistance: SharedValue<number>;
  isPulling: SharedValue<boolean>;
  pullReady: boolean;
  registerSync: (onRefresh: () => void, syncing: boolean) => void;
  registerScrollView: (tab: string, node: any) => void;
}

function scrollNodeToTop(node: any) {
  if (!node) return;
  const target =
    typeof node.scrollTo === 'function' || typeof node.scrollToOffset === 'function'
      ? node
      : node.getNode?.();
  if (typeof target?.scrollTo === 'function') {
    target.scrollTo({ y: 0, animated: false });
  } else if (typeof target?.scrollToOffset === 'function') {
    target.scrollToOffset({ offset: 0, animated: false });
  }
}

const ScrollHeaderContext = createContext<ScrollHeaderContextValue | null>(null);

export function ScrollHeaderProvider({ children }: { children: React.ReactNode }) {
  const insets = useSafeAreaInsets();
  const { isDesktop } = useResponsiveLayout();
  const scrollY = useRef(new Animated.Value(0)).current;
  const headerHeight = isDesktop || Platform.OS === 'web' ? 0 : Math.max(insets.top, 8) + 52;
  const isWebMobile = Platform.OS === 'web' && !isDesktop;
  const isWebMobileRef = useRef(isWebMobile);
  isWebMobileRef.current = isWebMobile;

  const syncConfigRef = useRef<{ onRefresh?: () => void; syncing?: boolean }>({});
  const isDraggingRef = useRef(false);
  const readyRef = useRef(false);
  const currentTabRef = useRef<string>('homework');
  const scrollViewsRef = useRef<Record<string, any>>({});
  const [pullReady, setPullReady] = useState(false);

  const [isScrolling, setIsScrolling] = useState(false);
  const isScrollingRef = useRef(false);
  const scrollIdleTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const ignoreResetTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const lastScrollYRef = useRef(0);
  const ignoreScrollResetRef = useRef(false);

  const pullDistance = useSharedValue(0);
  const isPulling = useSharedValue(false);

  const [androidSyncing, setAndroidSyncing] = useState(false);

  const clearScrollingState = useCallback(() => {
    if (scrollIdleTimerRef.current) {
      clearTimeout(scrollIdleTimerRef.current);
      scrollIdleTimerRef.current = null;
    }
    if (isScrollingRef.current) {
      isScrollingRef.current = false;
      setIsScrolling(false);
    }
  }, []);

  const scheduleScrollStop = useCallback(() => {
    if (scrollIdleTimerRef.current) {
      clearTimeout(scrollIdleTimerRef.current);
    }
    scrollIdleTimerRef.current = setTimeout(() => {
      scrollIdleTimerRef.current = null;
      if (isScrollingRef.current) {
        isScrollingRef.current = false;
        setIsScrolling(false);
      }
    }, SCROLL_IDLE_DELAY_MS);
  }, []);

  const beginProgrammaticResetGuard = useCallback(() => {
    if (ignoreResetTimerRef.current) {
      clearTimeout(ignoreResetTimerRef.current);
    }
    ignoreScrollResetRef.current = true;
    ignoreResetTimerRef.current = setTimeout(() => {
      ignoreScrollResetRef.current = false;
      ignoreResetTimerRef.current = null;
    }, PROGRAMMATIC_RESET_GUARD_MS);
  }, []);

  useEffect(() => {
    if (!isWebMobile) {
      clearScrollingState();
    }
  }, [isWebMobile, clearScrollingState]);

  useEffect(() => {
    return () => {
      if (scrollIdleTimerRef.current) {
        clearTimeout(scrollIdleTimerRef.current);
        scrollIdleTimerRef.current = null;
      }
      if (ignoreResetTimerRef.current) {
        clearTimeout(ignoreResetTimerRef.current);
        ignoreResetTimerRef.current = null;
      }
    };
  }, []);

  const registerSync = useCallback((onRefresh: () => void, syncing: boolean) => {
    syncConfigRef.current = { onRefresh, syncing };
    if (Platform.OS === 'android') {
      setAndroidSyncing(syncing);
    }
  }, []);

  const registerScrollView = useCallback((tab: string, node: any) => {
    if (node) {
      scrollViewsRef.current[tab] = node;
    } else {
      delete scrollViewsRef.current[tab];
    }
  }, []);

  const clearPullState = useCallback(() => {
    isDraggingRef.current = false;
    readyRef.current = false;
    pullDistance.value = 0;
    isPulling.value = false;
    setPullReady(false);
  }, [pullDistance, isPulling]);

  const onScrollBeginDrag = useCallback(() => {
    if (ignoreResetTimerRef.current) {
      clearTimeout(ignoreResetTimerRef.current);
      ignoreResetTimerRef.current = null;
    }
    ignoreScrollResetRef.current = false;
    if (syncConfigRef.current.syncing) return;
    isDraggingRef.current = true;
    readyRef.current = false;
  }, []);

  const onScrollEndDrag = useCallback(() => {
    const shouldTrigger =
      isDraggingRef.current && readyRef.current && !syncConfigRef.current.syncing;
    clearPullState();
    if (shouldTrigger) {
      syncConfigRef.current.onRefresh?.();
    }
  }, [clearPullState]);

  const onScroll = useRef(
    Animated.event([{ nativeEvent: { contentOffset: { y: scrollY } } }], {
      useNativeDriver: Platform.OS !== 'web',
      listener: (e: NativeSyntheticEvent<NativeScrollEvent>) => {
        const y = e.nativeEvent.contentOffset.y;

        if (isWebMobileRef.current) {
          if (!ignoreScrollResetRef.current) {
            const delta = Math.abs(y - lastScrollYRef.current);
            lastScrollYRef.current = y;
            if (y >= 0 && delta >= SCROLL_DELTA_THRESHOLD) {
              if (!isScrollingRef.current) {
                isScrollingRef.current = true;
                setIsScrolling(true);
              }
              scheduleScrollStop();
            }
          } else {
            lastScrollYRef.current = y;
          }
        }

        if (!isDraggingRef.current || syncConfigRef.current.syncing) return;
        const pull = y < 0 ? -y : 0;
        pullDistance.value = pull;
        isPulling.value = pull > 4;
        const nextReady = pull >= PULL_THRESHOLD;
        if (nextReady !== readyRef.current) {
          readyRef.current = nextReady;
          setPullReady(nextReady);
        }
      },
    })
  ).current;

  const switchTabScroll = useCallback(
    (tab: string) => {
      const prevTab = currentTabRef.current;
      if (prevTab !== tab) {
        scrollNodeToTop(scrollViewsRef.current[prevTab]);
      }
      scrollNodeToTop(scrollViewsRef.current[tab]);
      currentTabRef.current = tab;
      scrollY.setValue(0);
      lastScrollYRef.current = 0;
      beginProgrammaticResetGuard();
      clearScrollingState();
      clearPullState();
    },
    [scrollY, beginProgrammaticResetGuard, clearScrollingState, clearPullState]
  );

  const resetScroll = useCallback(() => {
    Object.values(scrollViewsRef.current).forEach(scrollNodeToTop);
    currentTabRef.current = 'homework';
    scrollY.setValue(0);
    lastScrollYRef.current = 0;
    beginProgrammaticResetGuard();
    clearScrollingState();
    clearPullState();
  }, [scrollY, beginProgrammaticResetGuard, clearScrollingState, clearPullState]);

  const pullToRefreshProps = useMemo<PullToRefreshScrollProps>(() => {
    if (isDesktop || Platform.OS === 'web') {
      return {
        onScrollBeginDrag,
        onScrollEndDrag,
        alwaysBounceVertical: false,
        bounces: false,
      };
    }
    const base: PullToRefreshScrollProps = {
      onScrollBeginDrag,
      onScrollEndDrag,
      alwaysBounceVertical: true,
      bounces: true,
    };
    if (Platform.OS === 'android') {
      base.refreshControl = (
        <RefreshControl
          refreshing={androidSyncing}
          onRefresh={() => syncConfigRef.current.onRefresh?.()}
          progressViewOffset={headerHeight}
        />
      );
    }
    return base;
  }, [isDesktop, onScrollBeginDrag, onScrollEndDrag, androidSyncing, headerHeight]);

  return (
    <ScrollHeaderContext.Provider
      value={{
        headerHeight,
        scrollY,
        isScrolling,
        onScroll,
        resetScroll,
        switchTabScroll,
        pullToRefreshProps,
        pullDistance,
        isPulling,
        pullReady,
        registerSync,
        registerScrollView,
      }}
    >
      {children}
    </ScrollHeaderContext.Provider>
  );
}

export function useOptionalScrollHeader(): ScrollHeaderContextValue | null {
  return useContext(ScrollHeaderContext);
}

export function useScrollHeader(tabId?: string) {
  const ctx = useContext(ScrollHeaderContext);
  if (!ctx) {
    throw new Error('useScrollHeader must be used inside ScrollHeaderProvider');
  }
  const { registerScrollView } = ctx;
  const scrollRef = useCallback(
    (node: any) => {
      if (tabId) {
        registerScrollView(tabId, node);
      }
    },
    [tabId, registerScrollView]
  );
  return { ...ctx, scrollRef };
}
