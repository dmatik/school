import React, { useEffect } from 'react';
import { Platform, ScrollView, Text } from 'react-native';
import { render, act } from '@testing-library/react-native';
import { ThemeProvider } from '../src/theme/ThemeContext';
import {
  ScrollHeaderProvider,
  useScrollHeader,
} from '../src/components/ui/MobileHeader';

function PullToRefreshHarness({
  onRefresh,
  syncing = false,
}: {
  onRefresh: () => void;
  syncing?: boolean;
}) {
  const { pullToRefreshProps, registerSync, onScroll } = useScrollHeader('homework');

  useEffect(() => {
    registerSync(onRefresh, syncing);
  }, [registerSync, onRefresh, syncing]);

  return (
    <ScrollView
      testID="ptr-scroll"
      onScroll={onScroll}
      scrollEventThrottle={16}
      {...pullToRefreshProps}
    >
      <Text>Scrollable Content</Text>
    </ScrollView>
  );
}

describe('Mobile Pull-to-Refresh (ScrollHeaderProvider)', () => {
  const originalOS = Platform.OS;

  afterEach(() => {
    Platform.OS = originalOS;
  });

  it('triggers registered onRefresh on iOS when pulled past threshold and released', () => {
    Platform.OS = 'ios';
    const onRefresh = jest.fn();
    const { getByTestId } = render(
      <ThemeProvider>
        <ScrollHeaderProvider>
          <PullToRefreshHarness onRefresh={onRefresh} />
        </ScrollHeaderProvider>
      </ThemeProvider>
    );

    const scroll = getByTestId('ptr-scroll');

    act(() => {
      scroll.props.onScrollBeginDrag();
      const handler = scroll.props.onScroll.__getHandler?.() ?? scroll.props.onScroll;
      handler({
        nativeEvent: {
          contentOffset: { x: 0, y: -130 },
          contentSize: { width: 390, height: 1000 },
          layoutMeasurement: { width: 390, height: 700 },
        },
      });
      scroll.props.onScrollEndDrag();
    });

    expect(onRefresh).toHaveBeenCalledTimes(1);
  });

  it('does not trigger onRefresh on iOS when pull distance is below threshold', () => {
    Platform.OS = 'ios';
    const onRefresh = jest.fn();
    const { getByTestId } = render(
      <ThemeProvider>
        <ScrollHeaderProvider>
          <PullToRefreshHarness onRefresh={onRefresh} />
        </ScrollHeaderProvider>
      </ThemeProvider>
    );

    const scroll = getByTestId('ptr-scroll');

    act(() => {
      scroll.props.onScrollBeginDrag();
      const handler = scroll.props.onScroll.__getHandler?.() ?? scroll.props.onScroll;
      handler({
        nativeEvent: {
          contentOffset: { x: 0, y: -40 },
          contentSize: { width: 390, height: 1000 },
          layoutMeasurement: { width: 390, height: 700 },
        },
      });
      scroll.props.onScrollEndDrag();
    });

    expect(onRefresh).not.toHaveBeenCalled();
  });

  it('does not trigger duplicate onRefresh while already syncing', () => {
    Platform.OS = 'ios';
    const onRefresh = jest.fn();
    const { getByTestId } = render(
      <ThemeProvider>
        <ScrollHeaderProvider>
          <PullToRefreshHarness onRefresh={onRefresh} syncing={true} />
        </ScrollHeaderProvider>
      </ThemeProvider>
    );

    const scroll = getByTestId('ptr-scroll');

    act(() => {
      scroll.props.onScrollBeginDrag();
      const handler = scroll.props.onScroll.__getHandler?.() ?? scroll.props.onScroll;
      handler({
        nativeEvent: {
          contentOffset: { x: 0, y: -150 },
          contentSize: { width: 390, height: 1000 },
          layoutMeasurement: { width: 390, height: 700 },
        },
      });
      scroll.props.onScrollEndDrag();
    });

    expect(onRefresh).not.toHaveBeenCalled();
  });

  it('provides RefreshControl on Android and invokes onRefresh', () => {
    Platform.OS = 'android';
    const onRefresh = jest.fn();
    const { getByTestId } = render(
      <ThemeProvider>
        <ScrollHeaderProvider>
          <PullToRefreshHarness onRefresh={onRefresh} syncing={true} />
        </ScrollHeaderProvider>
      </ThemeProvider>
    );

    const scroll = getByTestId('ptr-scroll');
    const refreshControl = scroll.props.refreshControl;
    expect(refreshControl).toBeTruthy();
    expect(refreshControl.props.refreshing).toBe(true);

    act(() => {
      refreshControl.props.onRefresh();
    });

    expect(onRefresh).toHaveBeenCalledTimes(1);
  });

  it('disables bounce and RefreshControl on Web', () => {
    Platform.OS = 'web';
    const onRefresh = jest.fn();
    const { getByTestId } = render(
      <ThemeProvider>
        <ScrollHeaderProvider>
          <PullToRefreshHarness onRefresh={onRefresh} />
        </ScrollHeaderProvider>
      </ThemeProvider>
    );

    const scroll = getByTestId('ptr-scroll');
    expect(scroll.props.bounces).toBe(false);
    expect(scroll.props.alwaysBounceVertical).toBe(false);
    expect(scroll.props.refreshControl).toBeUndefined();
  });
});
