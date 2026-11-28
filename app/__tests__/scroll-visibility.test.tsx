import React from 'react';
import { Dimensions, Platform, ScrollView, StyleSheet, Text, View } from 'react-native';
import { render, act } from '@testing-library/react-native';
import { BookOpen } from 'lucide-react-native';
import { ThemeProvider } from '../src/theme/ThemeContext';
import { LIGHT_PALETTE } from '../src/lib/colors';
import {
  MobileHeader,
  ScrollHeaderProvider,
  useScrollHeader,
} from '../src/components/ui/MobileHeader';
import { LiquidDock } from '../src/components/ui/LiquidDock';
import type { User } from '../../shared/types';

const TEST_USER: User = {
  id: 'u-1',
  username: 'parent1',
  firstName: 'Dana',
  lastName: 'Levi',
  role: 'user',
  familyRole: 'parent',
  linkedChildId: null,
};

function ScrollChromeHarness({
  hideOnScroll = true,
}: {
  hideOnScroll?: boolean;
}) {
  const { onScroll, switchTabScroll, resetScroll, isScrolling } = useScrollHeader('homework');

  return (
    <View>
      <Text testID="scrolling-flag">{String(isScrolling)}</Text>
      <Text testID="switch-tab-btn" onPress={() => switchTabScroll('exams')} />
      <Text testID="reset-scroll-btn" onPress={() => resetScroll()} />
      <ScrollView testID="scroll-view" onScroll={onScroll} scrollEventThrottle={16}>
        <Text>Content</Text>
      </ScrollView>
      <MobileHeader
        title="Homework"
        user={TEST_USER}
        onPressAccount={() => {}}
        onPressSync={() => {}}
      />
      <LiquidDock
        items={[{ id: 'homework', label: 'Homework', icon: BookOpen }]}
        activeId="homework"
        onSelect={() => {}}
        hideOnScroll={hideOnScroll}
      />
    </View>
  );
}

function fireScroll(scrollNode: any, y: number) {
  const handler = scrollNode.props.onScroll.__getHandler?.() ?? scrollNode.props.onScroll;
  handler({
    nativeEvent: {
      contentOffset: { x: 0, y },
      contentSize: { width: 390, height: 1200 },
      layoutMeasurement: { width: 390, height: 844 },
    },
  });
}

describe('Web Mobile Chrome Auto-Hide & Non-Sticky Header on Scroll', () => {
  const originalOS = Platform.OS;

  beforeEach(() => {
    jest.useFakeTimers();
    act(() => {
      Dimensions.set({
        window: { width: 390, height: 844, scale: 2, fontScale: 1 },
      });
    });
  });

  afterEach(() => {
    jest.useRealTimers();
    Platform.OS = originalOS;
    act(() => {
      Dimensions.set({
        window: { width: 390, height: 844, scale: 2, fontScale: 1 },
      });
    });
  });

  it('hides LiquidDock on Web mobile scroll, shows it after scrolling stops, and keeps MobileHeader borderless without opacity hide', () => {
    Platform.OS = 'web';
    const { getByTestId, queryByTestId } = render(
      <ThemeProvider>
        <ScrollHeaderProvider>
          <ScrollChromeHarness />
        </ScrollHeaderProvider>
      </ThemeProvider>
    );

    const header = getByTestId('mobile-header');
    const dockWrapper = getByTestId('mobile-dock-container');

    expect(StyleSheet.flatten(header.props.style).backgroundColor).toBe(LIGHT_PALETTE.background);
    expect(queryByTestId('mobile-header-bottom-border')).toBeNull();
    expect(getByTestId('scrolling-flag').props.children).toBe('false');
    expect(StyleSheet.flatten(dockWrapper.props.style).opacity).toBe(1);
    expect(dockWrapper.props.pointerEvents).toBe('auto');

    // Start scrolling on Web mobile
    act(() => {
      fireScroll(getByTestId('scroll-view'), 45);
    });

    expect(getByTestId('scrolling-flag').props.children).toBe('true');
    expect(StyleSheet.flatten(dockWrapper.props.style).opacity).toBe(0);
    expect(dockWrapper.props.pointerEvents).toBe('none');

    // Advance 300ms and scroll again -> timer should extend, still hidden
    act(() => {
      jest.advanceTimersByTime(300);
      fireScroll(getByTestId('scroll-view'), 95);
    });
    expect(getByTestId('scrolling-flag').props.children).toBe('true');

    // Advance 350ms (not yet 450ms since last scroll) -> still hidden
    act(() => {
      jest.advanceTimersByTime(350);
    });
    expect(getByTestId('scrolling-flag').props.children).toBe('true');

    // Advance remaining 100ms -> 450ms elapsed since last scroll -> visible again
    act(() => {
      jest.advanceTimersByTime(100);
    });
    expect(getByTestId('scrolling-flag').props.children).toBe('false');
    expect(StyleSheet.flatten(dockWrapper.props.style).opacity).toBe(1);
    expect(dockWrapper.props.pointerEvents).toBe('auto');
  });

  it('does not hide chrome on native iOS or Android when scrolling', () => {
    for (const os of ['ios', 'android'] as const) {
      Platform.OS = os;
      const { getByTestId, unmount } = render(
        <ThemeProvider>
          <ScrollHeaderProvider>
            <ScrollChromeHarness />
          </ScrollHeaderProvider>
        </ThemeProvider>
      );

      act(() => {
        fireScroll(getByTestId('scroll-view'), 120);
      });

      expect(getByTestId('scrolling-flag').props.children).toBe('false');
      expect(getByTestId('mobile-header-bottom-border')).toBeTruthy();
      expect(StyleSheet.flatten(getByTestId('mobile-dock-container').props.style).opacity).toBe(1);
      unmount();
    }
  });

  it('does not hide LiquidDock on Web desktop (>= 768px) when scrolling', () => {
    Platform.OS = 'web';
    act(() => {
      Dimensions.set({
        window: { width: 1280, height: 800, scale: 2, fontScale: 1 },
      });
    });

    const { getByTestId } = render(
      <ThemeProvider>
        <ScrollHeaderProvider>
          <ScrollChromeHarness />
        </ScrollHeaderProvider>
      </ThemeProvider>
    );

    act(() => {
      fireScroll(getByTestId('scroll-view'), 160);
    });

    expect(getByTestId('scrolling-flag').props.children).toBe('false');
    expect(StyleSheet.flatten(getByTestId('mobile-dock-container').props.style).opacity).toBe(1);
  });

  it('restores visibility immediately on switchTabScroll and ignores programmatic reset scroll', () => {
    Platform.OS = 'web';
    const { getByTestId } = render(
      <ThemeProvider>
        <ScrollHeaderProvider>
          <ScrollChromeHarness />
        </ScrollHeaderProvider>
      </ThemeProvider>
    );

    act(() => {
      fireScroll(getByTestId('scroll-view'), 80);
    });
    expect(getByTestId('scrolling-flag').props.children).toBe('true');

    act(() => {
      getByTestId('switch-tab-btn').props.onPress();
      fireScroll(getByTestId('scroll-view'), 0);
    });

    expect(getByTestId('scrolling-flag').props.children).toBe('false');
  });

  it('keeps chrome visible when hideOnScroll={false}', () => {
    Platform.OS = 'web';
    const { getByTestId } = render(
      <ThemeProvider>
        <ScrollHeaderProvider>
          <ScrollChromeHarness hideOnScroll={false} />
        </ScrollHeaderProvider>
      </ThemeProvider>
    );

    act(() => {
      fireScroll(getByTestId('scroll-view'), 90);
    });

    expect(getByTestId('scrolling-flag').props.children).toBe('true');
    expect(StyleSheet.flatten(getByTestId('mobile-dock-container').props.style).opacity).toBe(1);
  });
});
