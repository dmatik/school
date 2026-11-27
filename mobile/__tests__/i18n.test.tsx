import React from 'react';
import { Text, View } from 'react-native';
import { render, act, fireEvent, waitFor } from '@testing-library/react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import i18n, { hydrateLanguage, setAppLanguage, useDirection } from '../src/i18n';
import { LanguageToggleButton } from '../src/components/ui/Buttons';
import { TestProviders } from './testHelpers';
import { resetMockStorage } from '../jest.setup';

function DirectionProbe() {
  const { isRTL, flexRow, textAlign, writingDirection } = useDirection();
  return (
    <View>
      <Text testID="lang">{i18n.language}</Text>
      <Text testID="rtl">{isRTL ? 'rtl' : 'ltr'}</Text>
      <Text testID="row">{flexRow}</Text>
      <Text testID="align">{textAlign}</Text>
      <Text testID="dir">{writingDirection}</Text>
    </View>
  );
}

describe('Mobile i18n, LanguageToggleButton & RTL/LTR Direction', () => {
  beforeEach(async () => {
    resetMockStorage();
    await i18n.changeLanguage('he');
  });

  it('defaults to Hebrew (he) and full RTL direction properties', () => {
    const { getByTestId } = render(<DirectionProbe />);
    expect(getByTestId('lang').props.children).toBe('he');
    expect(getByTestId('rtl').props.children).toBe('rtl');
    expect(getByTestId('row').props.children).toBe('row-reverse');
    expect(getByTestId('align').props.children).toBe('right');
    expect(getByTestId('dir').props.children).toBe('rtl');
  });

  it('switches language via setAppLanguage and persists preference to AsyncStorage', async () => {
    const { getByTestId } = render(<DirectionProbe />);

    await act(async () => {
      await setAppLanguage('en');
    });

    await waitFor(() => {
      expect(getByTestId('lang').props.children).toBe('en');
      expect(getByTestId('rtl').props.children).toBe('ltr');
      expect(getByTestId('row').props.children).toBe('row');
      expect(getByTestId('align').props.children).toBe('left');
      expect(getByTestId('dir').props.children).toBe('ltr');
    });

    expect(await AsyncStorage.getItem('school_lang')).toBe('en');
  });

  it('hydrates stored English preference from AsyncStorage and ignores invalid values', async () => {
    await AsyncStorage.setItem('school_lang', 'en');
    await hydrateLanguage();
    expect(i18n.language).toBe('en');

    await AsyncStorage.setItem('school_lang', 'fr');
    await hydrateLanguage();
    expect(i18n.language).toBe('en');
  });

  it('toggles between Hebrew (EN label) and English (עב label) via LanguageToggleButton', async () => {
    const { getByText, getByRole } = render(
      <TestProviders>
        <LanguageToggleButton />
      </TestProviders>
    );

    expect(getByText('EN')).toBeTruthy();

    await act(async () => {
      fireEvent.press(getByRole('button'));
    });

    await waitFor(() => {
      expect(i18n.language).toBe('en');
      expect(getByText('עב')).toBeTruthy();
    });

    await act(async () => {
      fireEvent.press(getByRole('button'));
    });

    await waitFor(() => {
      expect(i18n.language).toBe('he');
      expect(getByText('EN')).toBeTruthy();
    });
  });
});
