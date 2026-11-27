import React from 'react';
import { ThemeProvider } from '../src/theme/ThemeContext';
import { ModalPortalProvider } from '../src/components/ui/ModalPortal';
import { ScrollHeaderProvider } from '../src/components/ui/MobileHeader';

export function TestProviders({ children }: { children: React.ReactNode }) {
  return (
    <ThemeProvider>
      <ModalPortalProvider>
        <ScrollHeaderProvider>{children}</ScrollHeaderProvider>
      </ModalPortalProvider>
    </ThemeProvider>
  );
}

export function mockJsonResponse<T>(data: T, ok = true, status = 200): Response {
  return {
    ok,
    status,
    json: async () => data,
  } as unknown as Response;
}
