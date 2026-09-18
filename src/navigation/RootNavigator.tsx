import React, { useState } from 'react';
import { NavigationContainer, DarkTheme } from '@react-navigation/native';
import { AuthNavigator } from './AuthNavigator';
import { MainTabNavigator } from './MainTabNavigator';
import { COLORS } from '../theme';

const navigationTheme = {
  ...DarkTheme,
  colors: {
    ...DarkTheme.colors,
    primary:      COLORS.primary,
    background:   COLORS.bg,
    card:         COLORS.bgCard,
    text:         COLORS.text,
    border:       COLORS.border,
    notification: COLORS.primary,
  },
};

export const RootNavigator: React.FC = () => {
  // Layer 2: simple boolean. Replaced by useAuthStore in Layer 3 (Task 4.9).
  const [isAuthenticated] = useState(false);

  return (
    <NavigationContainer theme={navigationTheme}>
      {isAuthenticated ? <MainTabNavigator /> : <AuthNavigator />}
    </NavigationContainer>
  );
};
