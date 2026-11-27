import React from 'react';
import { Dimensions } from 'react-native';
import { render, fireEvent, waitFor, act } from '@testing-library/react-native';
import { TestProviders, mockJsonResponse } from './testHelpers';
import { LoginScreen } from '../src/screens/LoginScreen';
import { AppSidebar } from '../src/components/ui/AppSidebar';
import { LiquidDock } from '../src/components/ui/LiquidDock';
import { BookOpen, AlertCircle } from 'lucide-react-native';
import * as api from '../src/lib/api';
import type { User } from '../../shared/types';

describe('LoginScreen & Responsive Shell', () => {
  const origFetch = global.fetch;

  afterEach(() => {
    global.fetch = origFetch;
    act(() => {
      Dimensions.set({
        window: { width: 390, height: 844, scale: 1, fontScale: 1 },
        screen: { width: 390, height: 844, scale: 1, fontScale: 1 },
      });
    });
    jest.restoreAllMocks();
  });

  it('submits username and password login and calls onLoginSuccess', async () => {
    const mockUser: User = {
      id: 'u1',
      username: 'parent1',
      firstName: 'Dana',
      lastName: 'Cohen',
      role: 'user',
      familyRole: 'parent',
    };

    jest.spyOn(api, 'verifyServerConnection').mockResolvedValue(true);
    jest.spyOn(api, 'persistSession').mockResolvedValue(undefined);
    global.fetch = jest.fn().mockResolvedValue(
      mockJsonResponse({
        token: 'jwt-123',
        user: mockUser,
      })
    );

    const onLoginSuccess = jest.fn();
    const { getByTestId } = render(
      <TestProviders>
        <LoginScreen onLoginSuccess={onLoginSuccess} />
      </TestProviders>
    );

    fireEvent.changeText(getByTestId('server-url-input'), 'https://school.example.com');
    fireEvent.changeText(getByTestId('username-input'), 'parent1');
    fireEvent.changeText(getByTestId('password-input'), 'secret123');

    fireEvent.press(getByTestId('login-submit-button'));

    await waitFor(() => {
      expect(onLoginSuccess).toHaveBeenCalledWith(
        'https://school.example.com',
        'jwt-123',
        mockUser
      );
    });
  });

  it('shows error notice when login fails with 401', async () => {
    jest.spyOn(api, 'verifyServerConnection').mockResolvedValue(true);
    global.fetch = jest.fn().mockResolvedValue(
      mockJsonResponse({ error: 'Invalid credentials' }, false, 401)
    );

    const onLoginSuccess = jest.fn();
    const { getByTestId } = render(
      <TestProviders>
        <LoginScreen onLoginSuccess={onLoginSuccess} />
      </TestProviders>
    );

    fireEvent.changeText(getByTestId('server-url-input'), 'https://school.example.com');
    fireEvent.changeText(getByTestId('username-input'), 'parent1');
    fireEvent.changeText(getByTestId('password-input'), 'wrong');

    fireEvent.press(getByTestId('login-submit-button'));

    await waitFor(() => {
      expect(getByTestId('login-error-box')).toBeTruthy();
    });
    expect(onLoginSuccess).not.toHaveBeenCalled();
  });

  it('shows error notice when server is unreachable', async () => {
    jest.spyOn(api, 'verifyServerConnection').mockResolvedValue(false);
    const fetchSpy = jest.fn();
    global.fetch = fetchSpy;

    const { getByTestId } = render(
      <TestProviders>
        <LoginScreen onLoginSuccess={jest.fn()} />
      </TestProviders>
    );

    fireEvent.changeText(getByTestId('server-url-input'), 'https://unreachable.example.com');
    fireEvent.changeText(getByTestId('username-input'), 'parent1');
    fireEvent.changeText(getByTestId('password-input'), 'secret123');

    fireEvent.press(getByTestId('login-submit-button'));

    await waitFor(() => {
      expect(getByTestId('login-error-box')).toBeTruthy();
    });
    expect(fetchSpy).not.toHaveBeenCalled();
  });

  it('prevents submission and shows error when username or password is empty', async () => {
    const fetchSpy = jest.fn();
    global.fetch = fetchSpy;

    const { getByTestId } = render(
      <TestProviders>
        <LoginScreen onLoginSuccess={jest.fn()} />
      </TestProviders>
    );

    fireEvent.changeText(getByTestId('server-url-input'), 'https://school.example.com');
    fireEvent.press(getByTestId('login-submit-button'));

    await waitFor(() => {
      expect(getByTestId('login-error-box')).toBeTruthy();
    });
    expect(fetchSpy).not.toHaveBeenCalled();
  });

  it('switches navigation chrome between AppSidebar (desktop) and LiquidDock (mobile)', () => {
    const user: User = {
      id: 'u1',
      username: 'dana',
      firstName: 'Dana',
      lastName: 'Cohen',
      role: 'user',
      familyRole: 'parent',
    };
    const navItems = [
      { id: 'homework', label: 'Homework', icon: BookOpen },
      { id: 'incidents', label: 'Incidents', icon: AlertCircle },
    ];

    const onSelectDesktop = jest.fn();
    act(() => {
      Dimensions.set({
        window: { width: 1280, height: 800, scale: 1, fontScale: 1 },
        screen: { width: 1280, height: 800, scale: 1, fontScale: 1 },
      });
    });

    const desktopView = render(
      <TestProviders>
        <AppSidebar
          currentUser={user}
          activeTab="homework"
          onSelectTab={onSelectDesktop}
          onPressAccount={jest.fn()}
          navItems={navItems}
          onPressSync={jest.fn()}
        />
      </TestProviders>
    );
    expect(desktopView.getByTestId('desktop-sidebar')).toBeTruthy();
    fireEvent.press(desktopView.getByText('Incidents'));
    expect(onSelectDesktop).toHaveBeenCalledWith('incidents');

    const onSelectMobile = jest.fn();
    act(() => {
      Dimensions.set({
        window: { width: 390, height: 844, scale: 1, fontScale: 1 },
        screen: { width: 390, height: 844, scale: 1, fontScale: 1 },
      });
    });

    const mobileView = render(
      <TestProviders>
        <LiquidDock items={navItems} activeId="homework" onSelect={onSelectMobile} />
      </TestProviders>
    );
    expect(mobileView.getByText('Homework')).toBeTruthy();
    fireEvent.press(mobileView.getByText('Incidents'));
    expect(onSelectMobile).toHaveBeenCalledWith('incidents');
  });
});
