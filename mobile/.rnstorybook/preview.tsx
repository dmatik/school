import React from 'react';
import { View, StyleSheet } from 'react-native';
import type { Preview } from '@storybook/react-native';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { ThemeProvider, useTheme } from '../src/theme/ThemeContext';
import { ScrollHeaderProvider } from '../src/components/ui/MobileHeader';
import '../src/i18n';

function StoryContainer({ children }: { children: React.ReactNode }) {
  const { palette } = useTheme();
  return (
    <View style={[styles.container, { backgroundColor: palette.background }]}>
      {children}
    </View>
  );
}

const preview: Preview = {
  decorators: [
    (Story) => (
      <SafeAreaProvider>
        <ThemeProvider>
          <ScrollHeaderProvider>
            <StoryContainer>
              <Story />
            </StoryContainer>
          </ScrollHeaderProvider>
        </ThemeProvider>
      </SafeAreaProvider>
    ),
  ],
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    padding: 16,
  },
});

export default preview;
