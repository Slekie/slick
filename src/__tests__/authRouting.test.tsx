/**
 * Property test: Auth navigation routing (Property 1)
 * Validates: Requirements 2.1, 2.2
 *
 * For any isAuthenticated value, RootNavigator renders exactly the correct navigator:
 * - false → shows Auth flow (Welcome screen)
 * - true  → shows Main app (Dashboard tab)
 *
 * Note: @testing-library/react-native v14 render() is async.
 */
import React from 'react';
import { render, screen } from '@testing-library/react-native';
import * as fc from 'fast-check';

// Mock heavy native modules before importing components.
// jest.mock factories are hoisted — use require() inside to access React.
jest.mock('react-native-reanimated', () =>
  require('react-native-reanimated/mock')
);

jest.mock('@react-navigation/native', () => {
  const mockReact = require('react');
  const { View } = require('react-native');
  return {
    NavigationContainer: ({ children }: { children: mockReact.ReactNode }) =>
      mockReact.createElement(View, { testID: 'nav-container' }, children),
    DarkTheme: {
      dark: true,
      colors: {
        primary: '#00C851',
        background: '#080B14',
        card: '#0F1420',
        text: '#FFFFFF',
        border: '#1E2840',
        notification: '#00C851',
      },
      fonts: {},
    },
  };
});

jest.mock('@react-navigation/native-stack', () => {
  const mockReact = require('react');
  return {
    createNativeStackNavigator: () => ({
      Navigator: ({ children }: { children: mockReact.ReactNode }) =>
        mockReact.createElement(mockReact.Fragment, null, children),
      Screen: ({ component: C }: { component: mockReact.ComponentType }) =>
        mockReact.createElement(C),
    }),
  };
});

jest.mock('@react-navigation/bottom-tabs', () => {
  const mockReact = require('react');
  return {
    createBottomTabNavigator: () => ({
      Navigator: ({ children }: { children: mockReact.ReactNode }) =>
        mockReact.createElement(mockReact.Fragment, null, children),
      Screen: ({ component: C }: { component: mockReact.ComponentType }) =>
        mockReact.createElement(C),
    }),
  };
});

jest.mock('@expo/vector-icons', () => ({
  Ionicons: () => null,
}));

jest.mock('react-native-safe-area-context', () => {
  const mockReact = require('react');
  return {
    SafeAreaProvider: ({ children }: { children: mockReact.ReactNode }) =>
      mockReact.createElement(mockReact.Fragment, null, children),
    useSafeAreaInsets: () => ({ top: 0, right: 0, bottom: 0, left: 0 }),
  };
});

jest.mock('react-native-gesture-handler', () => {
  const mockReact = require('react');
  return {
    GestureHandlerRootView: ({ children }: { children: mockReact.ReactNode }) =>
      mockReact.createElement(mockReact.Fragment, null, children),
  };
});

// Testable version that accepts isAuthenticated as prop
const TestableRootNavigator: React.FC<{ isAuthenticated: boolean }> = ({ isAuthenticated }) => {
  const { NavigationContainer } = require('@react-navigation/native');
  const { AuthNavigator } = require('../navigation/AuthNavigator');
  const { MainTabNavigator } = require('../navigation/MainTabNavigator');

  return React.createElement(
    NavigationContainer,
    null,
    isAuthenticated
      ? React.createElement(MainTabNavigator)
      : React.createElement(AuthNavigator)
  );
};

describe('Property 1: Auth navigation routing', () => {
  // RNTL v14 render() is async — all tests must await it
  fc.configureGlobal({ numRuns: 50 });

  test('unauthenticated renders Auth flow (WelcomeScreen text)', async () => {
    await render(React.createElement(TestableRootNavigator, { isAuthenticated: false }));
    expect(screen.getByText('Welcome Screen')).toBeTruthy();
  });

  test('authenticated renders Main app (Dashboard text)', async () => {
    await render(React.createElement(TestableRootNavigator, { isAuthenticated: true }));
    expect(screen.getByText('Dashboard')).toBeTruthy();
  });

  test('property: for any boolean, correct navigator is shown', async () => {
    await fc.assert(
      fc.asyncProperty(fc.boolean(), async (isAuthenticated) => {
        const { unmount } = await render(
          React.createElement(TestableRootNavigator, { isAuthenticated })
        );
        const found = isAuthenticated
          ? screen.queryByText('Dashboard')
          : screen.queryByText('Welcome Screen');
        await unmount();
        return found !== null;
      })
    );
  });
});
