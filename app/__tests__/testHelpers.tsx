import React from 'react';
import { ThemeProvider } from '../src/theme/ThemeContext';
import { ModalPortalProvider } from '../src/components/ui/ModalPortal';
import {
  MobileHeader,
  MobileHeaderActionProvider,
  ScrollHeaderProvider,
  useActiveMobileHeaderAction,
} from '../src/components/ui/MobileHeader';
import type { User } from '../../shared/types';

const DEFAULT_TEST_USER: User = {
  id: 'u-test',
  username: 'test',
  firstName: 'Test',
  lastName: 'User',
  role: 'admin',
  familyRole: 'parent',
};

function TestMobileHeaderHost({ tabId }: { tabId: string }) {
  const endAction = useActiveMobileHeaderAction(tabId);
  return (
    <MobileHeader
      title={tabId}
      user={DEFAULT_TEST_USER}
      onPressAccount={() => {}}
      onPressSync={() => {}}
      endAction={endAction}
    />
  );
}

export function TestProviders({
  children,
  mobileHeaderTab,
}: {
  children: React.ReactNode;
  mobileHeaderTab?: string;
}) {
  return (
    <ThemeProvider>
      <ModalPortalProvider>
        <ScrollHeaderProvider>
          <MobileHeaderActionProvider>
            {mobileHeaderTab ? <TestMobileHeaderHost tabId={mobileHeaderTab} /> : null}
            {children}
          </MobileHeaderActionProvider>
        </ScrollHeaderProvider>
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
