# Requirements Document

## Introduction

This document captures the requirements for migrating the Slick AI trading app from the broken `slickai/` project into the clean `SlickApp/` project. The migration follows a layer-by-layer approach where each layer is independently buildable and verifiable via EAS Build before the next layer begins.

`SlickApp/` is a clean Expo SDK 54 project (React Native 0.81.5, New Architecture enabled) that currently renders only a "Welcome to Slick" placeholder. The goal is to reconstruct the full AI-powered forex trading application — real-time signals, broker account connectivity, automated trade execution, subscription paywall, and push notifications — within this clean project, reusing the vetted logic from `slickai/src/` while fixing any underlying dependency, asset, or build-pipeline problems that caused the original project to break.

Each layer introduces the smallest possible set of new dependencies and must produce a working EAS build before the next layer is started.

---

## Glossary

- **App**: The SlickApp React Native / Expo application being built.
- **SlickApp**: The clean target project at `C:\Users\Slick\Desktop\Projects\SlickApp`.
- **slickai**: The broken source project at `C:\Users\Slick\Desktop\Projects\AI\Naita\slickai` whose logic is being migrated.
- **EAS Build**: Expo Application Services managed cloud build producing an APK (preview profile) or AAB (production profile).
- **Layer**: A discrete migration phase that adds one cohesive capability and ends with a passing EAS Build.
- **JWT**: JSON Web Token used as the short-lived access credential for API calls.
- **Refresh Token**: A long-lived credential stored in SecureStore used to silently renew an expired JWT.
- **SecureStore**: The `expo-secure-store` library that writes to the Android Keystore / iOS Secure Enclave.
- **Zustand_Store**: A Zustand reactive state container.
- **ApiClient**: The Axios instance with 401-refresh interceptor created by `createAuthenticatedClient`.
- **WebSocket_Service**: The singleton `websocketService` wrapping socket.io-client.
- **RootNavigator**: The top-level React component that renders the correct navigator based on auth and subscription state.
- **AuthNavigator**: The React Navigation native stack navigator covering Welcome, Login, and Register screens.
- **MainTabNavigator**: The React Navigation bottom-tabs navigator covering Dashboard, Signals, Charts, Accounts, and Settings.
- **Paywall_Screen**: The RevenueCat-powered subscription screen shown to authenticated users who lack an active entitlement.
- **Onboarding_Screen**: The three-slide introduction shown once to new users before any auth flow.
- **BundledNativeModules**: The list of native module versions shipped with a given Expo SDK version, published at `expo/bundledNativeModules.json`.

---

## Requirements

### Requirement 1: Project Bootstrapping and Build Pipeline

**User Story:** As a developer, I want the clean SlickApp project to have all foundational configuration in place, so that every subsequent layer can be added without touching core build infrastructure.

#### Acceptance Criteria

1. THE App SHALL compile and run on a physical Android device via EAS Build using the `preview` profile before any feature code is added.
2. THE App SHALL have `newArchEnabled: true` in `app.json` and this setting SHALL NOT be changed at any point during migration.
3. THE App SHALL use `babel-preset-expo ~54.0.12` throughout all layers.
4. WHEN a new native module dependency is added, THE Developer SHALL verify the module version against `expo/bundledNativeModules.json` for Expo SDK 54 before committing.
5. THE App SHALL keep `react-native-webview` pinned to `^14.0.1` and excluded from `expo install` version overrides via the `expo.install.exclude` field in `package.json`.
6. WHEN `eas-build-pre-install` runs, THE Build_Script SHALL execute `npm install --legacy-peer-deps` to resolve peer dependency conflicts without changing lock-file semantics.
7. THE `app.json` SHALL include the EAS `projectId` (`62147f18-bef3-464f-9798-f721a3a4e366`) under `expo.extra.eas` so OTA updates and push tokens resolve to the correct project.
8. THE `assets/` directory SHALL contain valid PNG files with correct CRC checksums so that jimp validation during prebuild does not fail.

---

### Requirement 2: Navigation Shell

**User Story:** As a developer, I want a working navigation skeleton with all five main tabs and an auth stack, so that each screen destination is reachable before screen content is added.

#### Acceptance Criteria

1. WHEN the App starts, THE RootNavigator SHALL render the AuthNavigator when no authenticated user exists.
2. WHEN the App starts and an authenticated user exists, THE RootNavigator SHALL render the MainTabNavigator.
3. THE MainTabNavigator SHALL expose exactly five tabs: Dashboard, Signals, Charts, Accounts, and Settings.
4. THE AuthNavigator SHALL expose exactly three screens: Welcome, Login, and Register.
5. WHEN a navigation transition occurs, THE Navigator SHALL use the `slide_from_right` animation for the AuthNavigator stack and the default platform animation for tab changes.
6. THE tab bar SHALL use the brand dark background color (`#0F1420`) and the primary green accent (`#00C851`) for the active tab icon.
7. THE Layer_2_EAS_Build SHALL pass without any runtime navigation errors on a physical Android device.
8. WHEN the App renders the navigation shell, THE App SHALL NOT import or require any native module that is not already present in the base Expo SDK 54 installation.

---

### Requirement 3: Authentication Screens

**User Story:** As a user, I want to create an account, sign in, and use biometric login, so that I can securely access my trading data.

#### Acceptance Criteria

1. THE WelcomeScreen SHALL display the app logo, tagline, feature bullets, and a "Get Started" button that navigates to the Login screen.
2. WHEN a user submits the login form, THE LoginScreen SHALL validate that the email matches the pattern `[^\s@]+@[^\s@]+\.[^\s@]+` before making any network call.
3. IF the email field is blank or invalid, THEN THE LoginScreen SHALL display an inline field-level error without submitting the request.
4. WHEN a user fails authentication 3 or more times, THE Auth_System SHALL lock the account for 15 minutes and display a countdown timer.
5. WHILE the account is locked, THE LoginScreen SHALL display a lockout screen and SHALL prevent any further login attempts.
6. WHEN a successful login response is received, THE Auth_System SHALL store the JWT and refresh token in SecureStore using the keys `SlickAI_auth_token` and `SlickAI_refresh_token`.
7. THE Auth_System SHALL NOT store tokens in AsyncStorage, plain files, or any non-hardware-backed storage.
8. WHEN biometric hardware is available and enrolled, THE LoginScreen SHALL display a biometric sign-in button.
9. WHEN biometric authentication succeeds and a stored token exists, THE Auth_System SHALL authenticate the user without a network call.
10. THE RegisterScreen SHALL perform the same email validation as the LoginScreen before submitting a registration request.
11. WHEN registration succeeds, THE Auth_System SHALL automatically log the user in by performing a login call with the same credentials, resulting in a stored JWT pair.
12. IF a network request fails with no HTTP response, THEN THE Auth_System SHALL display the message "Cannot reach the server. Check your internet connection."
13. THE Auth_System SHALL NOT log email addresses, passwords, or token values to the console in any build configuration.

---

### Requirement 4: Onboarding

**User Story:** As a new user, I want a one-time onboarding flow that explains the app's features, so that I understand what the app does before signing in.

#### Acceptance Criteria

1. WHEN the App launches for the first time, THE RootNavigator SHALL display the OnboardingScreen before showing the AuthNavigator.
2. THE OnboardingScreen SHALL present exactly three slides covering AI trading, broker connectivity, and subscription modes.
3. WHEN the user completes the final slide or taps "Skip", THE Onboarding_System SHALL record completion status in SecureStore under the key `slickai_onboarding_done`.
4. WHEN the App launches after onboarding has been completed, THE RootNavigator SHALL skip the OnboardingScreen and proceed directly to the auth or main app flow.
5. WHEN the user taps "Next" on a slide that is not the last, THE OnboardingScreen SHALL scroll to the next slide.
6. WHEN the user taps "Next" on the last slide, THE OnboardingScreen SHALL complete the onboarding flow.

---

### Requirement 5: State Management and API Client

**User Story:** As a developer, I want all application state managed in typed Zustand stores and all API calls routed through an authenticated Axios client, so that data is consistent and auth tokens are refreshed transparently.

#### Acceptance Criteria

1. THE App SHALL contain five Zustand stores: Auth_Store, Account_Store, Signal_Store, Trade_Store, and Subscription_Store.
2. THE Auth_Store SHALL persist the authenticated user object, JWT, and refresh token, and expose `login`, `logout`, `register`, `loadStoredAuth`, `incrementFailedAttempts`, `resetFailedAttempts`, `isLockedOut`, and `getLockoutRemainingMs` actions.
3. THE ApiClient SHALL attach the `Authorization: Bearer <token>` header to every outgoing request.
4. WHEN a 401 response is received and the request has not already been retried, THE ApiClient SHALL attempt to refresh the JWT by posting the refresh token to `/auth/refresh`.
5. WHEN the token refresh succeeds, THE ApiClient SHALL update the stored token in SecureStore, update the Auth_Store, and retry the original request exactly once.
6. WHEN the token refresh fails or returns a second 401, THE ApiClient SHALL call `useAuthStore.getState().logout()` and route the user to the AuthNavigator.
7. THE ApiClient SHALL use a single shared refresh promise so that concurrent 401 responses trigger only one refresh call (no refresh storms).
8. THE ApiClient SHALL have a request timeout of 15,000 ms for standard calls.
9. THE API_Base_URL SHALL be configurable via the `EXPO_PUBLIC_API_BASE_URL` environment variable and SHALL default to `https://saita-backend.onrender.com/api/v1`.
10. THE WebSocket_URL SHALL be configurable via the `EXPO_PUBLIC_WS_URL` environment variable and SHALL default to the API base URL with the scheme replaced by `wss://`.

---

### Requirement 6: WebSocket Service

**User Story:** As a user, I want real-time signal and trade updates pushed to my device, so that I see new information immediately without manual refresh.

#### Acceptance Criteria

1. WHEN the user is authenticated, THE WebSocket_Service SHALL connect to the backend WebSocket endpoint using a socket.io-client with the JWT passed in the `auth` object.
2. WHEN the WebSocket connects, THE WebSocket_Service SHALL subscribe to the `signals`, `trades`, and `positions` channels.
3. WHEN a `signal` event is received, THE WebSocket_Service SHALL dispatch the payload to the Signal_Store and trigger a local notification.
4. WHEN a `trade_executed` event is received, THE WebSocket_Service SHALL dispatch the payload to the Trade_Store and trigger a local notification.
5. WHEN a `trade_closed` event is received, THE WebSocket_Service SHALL update the closed trade in the Trade_Store and trigger a local notification.
6. WHEN a `position_update` event is received, THE WebSocket_Service SHALL update the matching open position in the Trade_Store.
7. WHEN the WebSocket disconnects unexpectedly, THE WebSocket_Service SHALL schedule a reconnection attempt with exponential backoff: delay = 3000 ms × min(attempt, 5).
8. THE WebSocket_Service SHALL stop reconnection attempts after 10 consecutive failures.
9. WHEN the App transitions to the background, THE WebSocket_Service SHALL pause reconnection attempts to conserve battery.
10. WHEN the App returns to the foreground, THE WebSocket_Service SHALL immediately attempt to reconnect.
11. WHEN network connectivity is restored after an offline period, THE WebSocket_Service SHALL resume reconnection.
12. THE WebSocket_Service SHALL be implemented as a singleton and SHALL NOT create multiple simultaneous socket connections.

---

### Requirement 7: Core Screens

**User Story:** As a trader, I want to view my performance dashboard, active signals, broker accounts, settings, and live charts, so that I can monitor and manage my trading activity.

#### Acceptance Criteria

1. THE DashboardScreen SHALL display total P&L, win rate, open position count, and trade count for the selected time period (1D, 7D, 30D, ALL).
2. WHEN a user selects a time period tab, THE DashboardScreen SHALL reload performance data and the equity curve for that period.
3. THE DashboardScreen SHALL render an equity curve chart for the selected period using the `/performance/summary` equity_curve data.
4. THE DashboardScreen SHALL list all open positions as TradeCards with entry price, current price, position size, stop-loss, take-profit, and unrealized P&L.
5. WHEN an account is in `automated_trading` mode, THE DashboardScreen SHALL display an AutomatedBanner and show an "AI Managed" indicator on that account's trade cards.
6. THE SignalsScreen SHALL fetch and display signals from `/signals` and update in real time via WebSocket.
7. THE SignalsScreen SHALL support filtering signals by direction (BUY, SELL) and by active (non-expired) status.
8. WHEN a signal is older than 15 minutes from `generatedAt`, THE SignalCard SHALL render in a visually muted state with an "EXPIRED" badge.
9. THE AccountsScreen SHALL list all connected broker accounts with status, balance, currency, and subscription mode.
10. THE AccountsScreen SHALL provide a two-step modal flow to connect a Deriv account: step 1 collects the PAT, step 2 presents the available trading accounts from `/accounts/deriv/list-accounts` for selection.
11. THE AccountsScreen SHALL support connecting MetaTrader 5 accounts via login, password, and server credentials.
12. WHEN the user taps "Disconnect" on an account, THE AccountsScreen SHALL confirm via an Alert before calling `/accounts/:id` DELETE.
13. THE AccountsScreen SHALL provide a balance refresh button per account that calls the backend and updates the displayed balance.
14. THE SettingsScreen SHALL allow toggling subscription mode per account between `signal_delivery` and `automated_trading`.
15. WHEN a user switches an account to `automated_trading`, THE SettingsScreen SHALL display a risk-disclosure modal requiring explicit confirmation before applying the change.
16. THE SettingsScreen SHALL allow toggling push notifications and haptic feedback preferences, persisted to SecureStore.
17. THE ChartScreen SHALL display a TradingView advanced chart widget in a WebView for the selected forex symbol.
18. THE ChartScreen SHALL support switching between at least 10 symbols including EUR/USD, GBP/USD, XAU/USD, USD/JPY, and BTC/USD.
19. WHEN the ChartScreen mounts or the symbol changes, THE WebView SHALL render the TradingView widget using `source={{ html }}` (not a data URI).

---

### Requirement 8: Native Module Layer — expo-secure-store

**User Story:** As a security-conscious user, I want my authentication tokens stored in the device's hardware-backed secure enclave, so that they cannot be extracted from the device.

#### Acceptance Criteria

1. THE App SHALL use `expo-secure-store ~15.0.8` as the sole mechanism for persisting auth tokens.
2. THE App SHALL store the JWT under the key `SlickAI_auth_token` and the refresh token under `SlickAI_refresh_token`.
3. THE App SHALL store the user object under the key `SlickAI_auth_user` as a JSON string.
4. WHEN the user logs out, THE Auth_System SHALL delete all three SecureStore keys.
5. WHEN the App starts, THE Auth_System SHALL call `loadStoredAuth` to restore session state from SecureStore before rendering any authenticated content.
6. IF SecureStore read fails during `loadStoredAuth`, THEN THE Auth_System SHALL silently ignore the error and treat the user as unauthenticated.
7. THE Layer_6_EAS_Build SHALL confirm that SecureStore writes and reads succeed on a physical Android device.

---

### Requirement 9: Native Module Layer — react-native-webview

**User Story:** As a trader, I want live TradingView charts embedded directly in the app, so that I can analyze price action without switching to a browser.

#### Acceptance Criteria

1. THE App SHALL use `react-native-webview ^14.0.1` (not 13.x, which crashes on RN 0.76+ with `source={{ html }}`).
2. THE ChartScreen SHALL pass chart HTML via `source={{ html }}` to avoid the `btoa()` unavailability in the Hermes engine.
3. THE WebView SHALL have `javaScriptEnabled`, `domStorageEnabled`, and `androidLayerType="hardware"` set.
4. WHEN the WebView finishes loading, THE loading overlay SHALL be dismissed.
5. THE Layer_7_EAS_Build SHALL confirm that the TradingView widget renders without a white screen on a physical Android device.

---

### Requirement 10: Native Module Layer — expo-notifications

**User Story:** As a trader, I want to receive push notifications for new signals and trade executions, so that I am alerted even when the app is in the background.

#### Acceptance Criteria

1. THE App SHALL use `expo-notifications ~0.32.17`.
2. WHEN the user authenticates, THE Notification_Service SHALL request push notification permissions from the OS.
3. WHEN permissions are granted and an EAS project ID is configured, THE Notification_Service SHALL fetch an Expo push token and register it with the backend via `POST /notifications/register`.
4. WHEN running in Expo Go, THE Notification_Service SHALL skip all remote push token operations and SHALL NOT throw an error.
5. WHEN a `signal`, `trade_executed`, or `trade_closed` WebSocket event is received, THE Notification_Service SHALL schedule a local notification immediately.
6. WHEN the user taps a push notification of type `signal`, THE App SHALL navigate to the Signals tab.
7. WHEN the user taps a push notification of type `trade_executed` or `trade_closed`, THE App SHALL navigate to the Dashboard tab.

---

### Requirement 11: Native Module Layer — react-native-purchases

**User Story:** As the app owner, I want users to subscribe before accessing the trading features, so that the business model is enforced.

#### Acceptance Criteria

1. THE App SHALL use `react-native-purchases 10.9.1` and `react-native-purchases-ui 10.9.1`.
2. WHEN an authenticated user has no active `pro` entitlement, THE App SHALL display the Paywall_Screen instead of the MainTabNavigator.
3. THE Paywall_Screen SHALL fetch available offerings from RevenueCat and display Monthly, Quarterly, and Annual plans with pricing.
4. WHEN the RevenueCat SDK is unavailable (Expo Go or missing native module), THE Paywall_Screen SHALL display an informational card and SHALL NOT crash.
5. WHEN running in `__DEV__` mode with no RevenueCat SDK available, THE App SHALL bypass the paywall and render the MainTabNavigator directly.
6. WHEN a purchase succeeds, THE Subscription_Store SHALL be updated with the active entitlement and the App SHALL transition to the MainTabNavigator.
7. WHEN the user taps "Restore Purchase", THE App SHALL call `restorePurchases()` and update the Subscription_Store if a `pro` entitlement is found.
8. THE Subscription_Store SHALL derive `isSubscribed`, `planName`, and `expiresAt` from the RevenueCat CustomerInfo object.
9. THE RevenueCat SDK SHALL be configured with the platform-appropriate API key from the environment variables `EXPO_PUBLIC_REVENUECAT_IOS_KEY` and `EXPO_PUBLIC_REVENUECAT_ANDROID_KEY`.

---

### Requirement 12: Cross-Cutting Security Requirements

**User Story:** As a security engineer, I want consistent security controls applied at every layer, so that no layer introduces a regression in the app's security posture.

#### Acceptance Criteria

1. THE App SHALL NEVER log token values, passwords, or personally identifiable information to the console in any build configuration.
2. IF a console log of sensitive data is detected in code review, THEN THE Build_Gate SHALL reject the commit before merging.
3. THE App SHALL wrap the MainTabNavigator in an ErrorBoundary component that displays an error screen with a "Restart" button instead of an unhandled exception crash.
4. WHEN the ErrorBoundary catches an error in `__DEV__` mode, THE ErrorBoundary SHALL log the error and component stack to the console.
5. THE NetworkBanner component SHALL display a persistent bottom banner when the device has no internet connectivity, and SHALL dismiss automatically when connectivity is restored.
6. THE ApiClient SHALL NOT retry any request other than the single 401-triggered token refresh.
7. WHEN connecting a broker account with Deriv, THE AccountsScreen SHALL use `secureTextEntry` for the API token field.
8. WHEN connecting an MT5 account, THE AccountsScreen SHALL use `secureTextEntry` for the password field.
9. THE App SHALL include a global error handler set via `ErrorUtils.setGlobalHandler` to catch unhandled JS exceptions in production builds.
10. THE SettingsScreen SHALL require an explicit "I Understand" confirmation before enabling automated trading on any account.

---

### Requirement 13: Build Verification Gates

**User Story:** As a developer, I want every layer to be verified by a real EAS Build before proceeding, so that no broken state is compounded by subsequent changes.

#### Acceptance Criteria

1. WHEN a layer is complete, THE Developer SHALL trigger an EAS Build using the `preview` profile targeting Android.
2. THE EAS Build SHALL succeed (exit code 0) with no red-level build errors.
3. THE resulting APK SHALL install and launch on a physical Android device without crashing on startup.
4. WHEN the Layer build passes, THE Developer SHALL commit the layer with a message of the form `feat: Layer N — <description>`.
5. THE GitHub Actions workflow SHALL trigger the EAS Build automatically on push to `main`.
6. WHEN a Layer build fails, THE Developer SHALL diagnose the root cause before adding any more code from the next layer.
