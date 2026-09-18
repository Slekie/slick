# Implementation Plan: Slick App Migration

## Overview

Migrate the full Slick AI trading app from `slickai/src/` into the clean `SlickApp/` project using a strict layer-by-layer approach. Each task group corresponds to one migration layer that must pass an EAS Build before work on the next layer begins. Tasks are ordered to build on each other with no orphaned code — every piece of logic is wired into the running app before the layer is closed.

TypeScript is used throughout. Source files are ported directly from `C:\Users\Slick\Desktop\Projects\AI\Naita\slickai\src\` with minimal changes needed to compile under the clean project structure.

---

## Tasks

- [ ] 1. Layer 1 — Project Foundation
  - [ ] 1.1 Add TypeScript and core type dependencies to `package.json`
    - Add `typescript ~5.9.2`, `@types/react ~19.1.0` to devDependencies
    - Add overrides: `"@types/react": "~19.1.0"` to resolve peer conflict
    - Add `expo-status-bar ~3.0.9`, `expo-system-ui ~6.0.9`, `expo-font ~14.0.12`, `expo-constants ~18.0.14` to dependencies
    - Add `fast-check ^4.9.0`, `jest ~29.7.0`, `jest-expo ~54.0.18`, `@types/jest 29.5.14`, `@testing-library/react-native ^14.0.1` to devDependencies
    - Add `eas-build-pre-install` script: `npm install --legacy-peer-deps`
    - _Requirements: 1.1, 1.3, 1.6_
  - [ ] 1.2 Create `tsconfig.json` with strict mode and path aliases
    - Extend `expo/tsconfig.base`, enable `strict: true`, set `baseUrl: "."`, add `paths: { "@/*": ["src/*"] }`
    - _Requirements: 1.1_
  - [ ] 1.3 Create `src/theme/index.ts`
    - Port COLORS, FONTS, SPACING, RADIUS constants from `slickai/src/theme/index.ts` verbatim
    - _Requirements: 2.6_
  - [ ] 1.4 Create `src/config/api.ts`
    - Port API_BASE_URL, WS_URL, API_TIMEOUT_MS, ENDPOINTS from `slickai/src/config/api.ts`
    - Add `/api/v1` suffix construction logic and `wss://` scheme swap
    - _Requirements: 5.9, 5.10_
  - [ ] 1.5 Update `App.tsx` to use the theme background color and status bar
    - Replace placeholder text with a dark-background container using `COLORS.bg`
    - Import and render `<StatusBar style="light" />`
    - _Requirements: 1.1_
  - [ ] 1.6 Verify `app.json` has `newArchEnabled: true`, correct EAS `projectId`, dark `userInterfaceStyle`, and valid splash/icon paths
    - _Requirements: 1.2, 1.7_
  - [ ]* 1.7 Write unit test: theme constants are defined and non-empty
    - Verify COLORS.primary, COLORS.bg, FONTS.sizes, SPACING, RADIUS are all defined
    - _Requirements: 1.1_

- [ ] 2. Layer 2 — Navigation Shell (EAS Build #2)
  - [ ] 2.1 Install navigation dependencies
    - Add to `package.json`: `@react-navigation/native ^7.0.0`, `@react-navigation/native-stack ^7.18.9`, `@react-navigation/bottom-tabs ^7.18.17`
    - Add: `react-native-screens ~4.16.0`, `react-native-safe-area-context ~5.6.0`, `react-native-gesture-handler ~2.28.0`
    - Add: `react-native-reanimated ~4.1.1`, `expo-linear-gradient ~15.0.8`, `@expo/vector-icons ^15.0.3`
    - _Requirements: 2.1, 1.4_
  - [ ] 2.2 Update `babel.config.js` to include `react-native-reanimated/plugin` last in the plugins array
    - _Requirements: 2.7_
  - [ ] 2.3 Create stub screen components for all 8 destinations
    - Create placeholder `Screen.tsx` for: WelcomeScreen, LoginScreen, RegisterScreen, DashboardScreen, SignalsScreen, ChartScreen, AccountsScreen, SettingsScreen
    - Each stub renders a centered Text label with the screen name
    - _Requirements: 2.3, 2.4_
  - [ ] 2.4 Create `src/navigation/AuthNavigator.tsx`
    - Port from `slickai/src/navigation/AuthNavigator.tsx`
    - Stack: Welcome → Login → Register, `animation: 'slide_from_right'`, `headerShown: false`
    - Export `AuthStackParamList` type
    - _Requirements: 2.4, 2.5_
  - [ ] 2.5 Create `src/navigation/MainTabNavigator.tsx`
    - Port from `slickai/src/navigation/MainTabNavigator.tsx`
    - Five tabs: Dashboard, Signals, Charts, Accounts, Settings with Ionicons
    - Apply COLORS.bgCard, COLORS.primary, COLORS.textSecondary, FONTS from theme
    - _Requirements: 2.3, 2.6_
  - [ ] 2.6 Create `src/navigation/RootNavigator.tsx` (simplified)
    - Create a minimal RootNavigator that reads `isAuthenticated` from a simple boolean state
    - Render AuthNavigator when false, MainTabNavigator when true
    - No splash screen or subscription gating yet
    - _Requirements: 2.1, 2.2_
  - [ ] 2.7 Wire RootNavigator into `App.tsx`
    - Wrap in `NavigationContainer` with dark theme using COLORS
    - Wrap in `SafeAreaProvider` and `GestureHandlerRootView`
    - _Requirements: 2.7_
  - [ ]* 2.8 Write property test: auth routing (Property 1)
    - **Property 1: Auth navigation routing**
    - **Validates: Requirements 2.1, 2.2**
    - For `fc.boolean()` → mock isAuthenticated, render RootNavigator, assert correct navigator
    - _Requirements: 2.1, 2.2_

- [ ] 3. Checkpoint — EAS Build #2
  - Trigger EAS Build preview for Android. APK must install and show tab navigation on device.
  - Ensure all tests pass, ask the user if questions arise.

- [ ] 4. Layer 3 — Auth Screens (EAS Build #3)
  - [ ] 4.1 Install auth-related dependencies
    - Add: `expo-local-authentication ~17.0.9`, `expo-haptics ~15.0.8`
    - _Requirements: 3.8, 3.9, 1.4_
  - [ ] 4.2 Create `src/store/authStore.ts` (in-memory only, no SecureStore yet)
    - Port auth store from `slickai/src/store/authStore.ts`
    - Replace all `SecureStore.*` calls with in-memory Map for now (will be replaced in Layer 8)
    - Implement all actions: `login`, `logout`, `register`, `loadStoredAuth`, `incrementFailedAttempts`, `resetFailedAttempts`, `isLockedOut`, `getLockoutRemainingMs`
    - Constants: MAX_FAILED_ATTEMPTS = 3, LOCKOUT_DURATION_MS = 15 min
    - _Requirements: 3.4, 3.5, 5.2_
  - [ ] 4.3 Create `src/services/authService.ts`
    - Port from `slickai/src/services/authService.ts`
    - Create a plain Axios instance (no auth interceptor yet — ApiClient comes in Layer 5)
    - Implement `login`, `register`, `isBiometricAvailable`, `authenticateWithBiometrics`, `refreshToken`
    - Map backend snake_case fields (`access_token`, `refresh_token`) to camelCase
    - _Requirements: 3.2, 3.6, 3.11_
  - [ ] 4.4 Create `src/hooks/useAuth.ts`
    - Port from `slickai/src/hooks/useAuth.ts`
    - Implement `login`, `register`, `logout`, `loginWithBiometrics`
    - Enforce lockout check before login attempt
    - _Requirements: 3.4, 3.5, 3.8, 3.9, 3.13_
  - [ ] 4.5 Create `src/screens/auth/WelcomeScreen.tsx`
    - Port from `slickai/src/screens/auth/WelcomeScreen.tsx`
    - Animated logo, tagline, 3 feature bullets, "Get Started" button
    - Legal disclaimer text
    - _Requirements: 3.1_
  - [ ] 4.6 Create `src/screens/auth/LoginScreen.tsx`
    - Port from `slickai/src/screens/auth/LoginScreen.tsx`
    - Email regex validation: `/^[^\s@]+@[^\s@]+\.[^\s@]+$/`
    - Inline field-level email error, general error banner
    - Failed-attempts counter warning (shows after ≥1 failure)
    - Lockout screen with countdown timer (`formatLockoutTime`)
    - Biometric sign-in button (visible when `biometricAvailable`)
    - No sensitive data logged in any branch
    - _Requirements: 3.2, 3.3, 3.4, 3.5, 3.8, 3.9, 3.12, 3.13, 12.1_
  - [ ] 4.7 Create `src/screens/auth/RegisterScreen.tsx`
    - Same email validation as LoginScreen
    - On success: auto-login using same credentials
    - Error handling for network failures
    - _Requirements: 3.10, 3.11, 3.12_
  - [ ] 4.8 Update `AuthNavigator.tsx` to use real screen components
    - Replace stub screens with actual WelcomeScreen, LoginScreen, RegisterScreen
    - _Requirements: 2.4_
  - [ ] 4.9 Update `RootNavigator.tsx` to use `useAuthStore` for routing
    - Replace boolean state with `isAuthenticated` from authStore
    - Add `loadStoredAuth` call on mount
    - _Requirements: 2.1, 2.2_
  - [ ]* 4.10 Write property test: email validation (Property 2)
    - **Property 2: Email validation rejects all non-email strings**
    - **Validates: Requirements 3.2, 3.3**
    - `fc.string()` filtered to exclude valid patterns → assert no authService.login call
    - _Requirements: 3.2, 3.3_
  - [ ]* 4.11 Write unit test: lockout after 3 failures
    - Call `incrementFailedAttempts` × 3, assert `isLockedOut()` returns true
    - _Requirements: 3.4_

- [ ] 5. Checkpoint — EAS Build #3
  - Trigger EAS Build. APK must show Welcome screen, allow navigation to Login, and validate email on form submit.
  - Ensure all tests pass, ask the user if questions arise.

- [ ] 6. Layer 4 — Onboarding Screen (EAS Build #4)
  - [ ] 6.1 Create `src/screens/onboarding/OnboardingScreen.tsx`
    - Port from `slickai/src/screens/onboarding/OnboardingScreen.tsx`
    - Three slides: AI Trading, Connect Broker, Choose Mode
    - Horizontal FlatList with paging, animated slide content via Reanimated interpolate
    - Progress dots, Skip button (slides 1–2 only), Next/Get Started button
    - Completion flag stored via `SecureStore.setItemAsync('slickai_onboarding_done', 'true')`
    - Export `hasCompletedOnboarding()` utility
    - For Layer 4: stub SecureStore with an in-memory implementation if Layer 8 not yet complete
    - _Requirements: 4.1, 4.2, 4.3, 4.4, 4.5, 4.6_
  - [ ] 6.2 Update `RootNavigator.tsx` to check onboarding completion
    - Call `hasCompletedOnboarding()` on mount
    - Show OnboardingScreen before AuthNavigator if not completed
    - _Requirements: 4.1, 4.4_

- [ ] 7. Layer 5 — Zustand Stores + API Client (EAS Build #5)
  - [ ] 7.1 Install Zustand and Axios
    - Add: `zustand 5.0.5`, `axios ^1.19.0`
    - _Requirements: 5.1, 1.4_
  - [ ] 7.2 Create `src/services/apiClient.ts`
    - Port from `slickai/src/services/apiClient.ts`
    - `createAuthenticatedClient(baseURL)` factory returning Axios instance
    - 401 interceptor: read refresh token from in-memory store → POST /auth/refresh → update store → retry original request
    - Single shared `refreshPromise` to prevent refresh storms (Req 5.7)
    - Double-401 → `useAuthStore.getState().logout()` (dynamic import to avoid circular dep)
    - 15,000 ms default timeout
    - _Requirements: 5.3, 5.4, 5.5, 5.6, 5.7, 5.8, 12.6_
  - [ ] 7.3 Create remaining Zustand stores
    - Create `src/store/accountStore.ts`: accounts array, CRUD actions, subscriptionMode setter
    - Create `src/store/signalStore.ts`: signals array, `addSignal` (dedup by signalId), `markExpiredSignals` (15 min TTL), sorted newest-first
    - Create `src/store/tradeStore.ts`: trades, openPositions, performanceSummary, selectedPeriod actions
    - Create `src/store/subscriptionStore.ts`: `setSubscription(CustomerInfo)` derives `isSubscribed`, `planName`, `expiresAt` from `entitlements.active['pro']`
    - _Requirements: 5.1, 5.2, 11.8_
  - [ ] 7.4 Create all service files wired to ApiClient
    - Create `src/services/accountService.ts`: getAccounts, listDerivAccounts, connectAccount (retry on 429), disconnectAccount, refreshBalance, setSubscriptionMode
    - Create `src/services/signalService.ts`: getSignals
    - Create `src/services/tradeService.ts`: getTrades, getTrade, getOpenPositions, getPerformanceSummary, getEquityCurve; map snake_case → camelCase
    - Update `src/services/authService.ts` to use `createAuthenticatedClient` instead of plain Axios
    - Each service exposes `setAuthToken(token: string)` that sets `apiClient.defaults.headers.common['Authorization']`
    - _Requirements: 5.3, 5.4, 7.9, 7.10, 7.11, 7.12, 7.13_
  - [ ] 7.5 Update `useAuth.ts` to wire token into all services after login
    - After login/register: call `_setTokenOnServices(token)` → accountService, signalService, tradeService, websocketService (stub), notificationService (stub)
    - _Requirements: 5.3_
  - [ ]* 7.6 Write property test: Authorization header on every request (Property 4)
    - **Property 4: ApiClient attaches Authorization header to every request**
    - **Validates: Requirements 5.3**
    - `fc.string()` as token → intercept outgoing request, assert header present
    - _Requirements: 5.3_
  - [ ]* 7.7 Write property test: single refresh call for concurrent 401s (Property 5)
    - **Property 5: Exactly one refresh call for any number of concurrent 401 responses**
    - **Validates: Requirements 5.7**
    - `fc.integer({ min: 1, max: 20 })` as N → simulate N concurrent 401s → assert refresh called exactly once
    - _Requirements: 5.7_
  - [ ]* 7.8 Write property test: subscription derivation (Property 7)
    - **Property 7: Subscription store correctly derives isSubscribed from CustomerInfo**
    - **Validates: Requirements 11.8**
    - `fc.record(...)` with optional 'pro' entitlement → assert isSubscribed matches presence
    - _Requirements: 11.8_

- [ ] 8. Checkpoint — EAS Build #5
  - Trigger EAS Build. APK must start, load stored auth (empty), show auth screens.
  - Ensure all tests pass, ask the user if questions arise.

- [ ] 9. Layer 6 — WebSocket Service (EAS Build #6)
  - [ ] 9.1 Install socket.io-client
    - Add: `socket.io-client ^4.8.3`
    - _Requirements: 6.1, 1.4_
  - [ ] 9.2 Create `src/services/websocketService.ts`
    - Port from `slickai/src/services/websocketService.ts`
    - Singleton class: `connect`, `disconnect`, `pauseReconnect`, `resumeReconnect`
    - Reconnection delay = `3000 × min(attempt, 5)`, stop after 10 attempts
    - Subscribe to `signals`, `trades`, `positions` channels on connect
    - Register listeners for all 4 event types (`signal`, `trade_executed`, `trade_closed`, `position_update`)
    - _Requirements: 6.1, 6.2, 6.7, 6.8, 6.12_
  - [ ] 9.3 Create `src/hooks/useWebSocket.ts`
    - Port from `slickai/src/hooks/useWebSocket.ts`
    - Subscribe to WebSocket events, update Signal_Store and Trade_Store
    - Trigger local notification stubs (real notifications in Layer 10)
    - Stable refs pattern to avoid re-registering listeners on every render
    - _Requirements: 6.3, 6.4, 6.5, 6.6_
  - [ ] 9.4 Create `src/hooks/useAppStateWebSocket.ts`
    - Port from `slickai/src/hooks/useAppStateWebSocket.ts`
    - `AppState.addEventListener('change', ...)` → `pauseReconnect` on background, `resumeReconnect` on active
    - _Requirements: 6.9, 6.10_
  - [ ] 9.5 Update `RootNavigator.tsx` to connect/disconnect WebSocket on auth state change
    - On `isAuthenticated && token`: call `websocketService.setToken(token); websocketService.connect()`
    - On logout: call `websocketService.disconnect()`
    - _Requirements: 6.1_
  - [ ]* 9.6 Write property test: WebSocket reconnection backoff formula (Property 6)
    - **Property 6: WebSocket reconnection delay is bounded by the backoff formula**
    - **Validates: Requirements 6.7, 6.8**
    - `fc.integer({ min: 1, max: 15 })` as attempt → assert delay = 3000 * min(attempt, 5) for ≤10, no schedule for >10
    - _Requirements: 6.7, 6.8_

- [ ] 10. Checkpoint — EAS Build #6
  - Trigger EAS Build. APK must connect to backend WebSocket on login.
  - Ensure all tests pass, ask the user if questions arise.

- [ ] 11. Layer 7 — Core Screens (EAS Build #7)
  - [ ] 11.1 Install remaining UI dependencies
    - Add: `@react-native-community/netinfo 11.4.1`, `expo-crypto ~15.0.9`
    - _Requirements: 7.1, 1.4_
  - [ ] 11.2 Create shared UI components
    - Create `src/components/SkeletonCard.tsx`: animated loading placeholder
    - Create `src/components/LiveDot.tsx`: pulsing green dot indicator
    - Create `src/components/AnimatedNumber.tsx`: animated P&L number using Reanimated
    - Create `src/components/AutomatedBanner.tsx`: banner shown when automated account exists
    - Create `src/components/EquityChart.tsx`: SVG line chart from equity curve data points
    - Create `src/components/TradeCard.tsx`: port from `slickai/src/components/TradeCard.tsx`
    - Create `src/components/SignalCard.tsx`: port from `slickai/src/components/SignalCard.tsx`
    - Create `src/components/ErrorBoundary.tsx`: port from `slickai/src/components/ErrorBoundary.tsx`
    - _Requirements: 7.4, 7.5, 7.8, 12.3, 12.4_
  - [ ] 11.3 Create `src/components/NetworkBanner.tsx`
    - Port from `slickai/src/components/NetworkBanner.tsx`
    - NetInfo listener: show on `isConnected === false`, hide on restore
    - On restore: call `websocketService.resumeReconnect()`
    - Animated slide-up from bottom
    - _Requirements: 6.11, 12.5_
  - [ ] 11.4 Create `src/screens/dashboard/DashboardScreen.tsx`
    - Port from `slickai/src/screens/dashboard/DashboardScreen.tsx`
    - Period tabs (1D, 7D, 30D, ALL), performance summary grid, equity chart, open positions list
    - Pull-to-refresh, animated header, AutomatedBanner for automated accounts
    - _Requirements: 7.1, 7.2, 7.3, 7.4, 7.5_
  - [ ] 11.5 Create `src/screens/signals/SignalsScreen.tsx`
    - Port from `slickai/src/screens/signals/SignalsScreen.tsx`
    - Filter chips (All, BUY, SELL, Active), FlatList of SignalCards
    - `markExpiredSignals` called on mount and every 60 seconds
    - _Requirements: 7.6, 7.7, 7.8_
  - [ ] 11.6 Create `src/screens/accounts/AccountsScreen.tsx`
    - Port from `slickai/src/screens/accounts/AccountsScreen.tsx`
    - List accounts with status bar color, balance, mode badge
    - Two-step modal: PAT entry → Deriv account picker for `broker === 'deriv'`
    - Single-step modal for MT5 (login, password, server)
    - Disconnect via Alert confirmation, balance refresh button
    - secureTextEntry on PAT and MT5 password fields
    - _Requirements: 7.9, 7.10, 7.11, 7.12, 7.13, 12.7, 12.8_
  - [ ] 11.7 Create `src/screens/settings/SettingsScreen.tsx`
    - Port from `slickai/src/screens/settings/SettingsScreen.tsx`
    - Profile card, push notifications toggle, haptic toggle (persisted to SecureStore stub)
    - Subscription mode toggle per account with ModeConfirmModal
    - Version, Privacy Policy, Terms of Service links
    - Sign out button
    - _Requirements: 7.14, 7.15, 7.16, 12.10_
  - [ ] 11.8 Create `src/screens/charts/ChartScreen.tsx` (stub only — no WebView yet)
    - Render symbol picker chips and a placeholder "Charts coming in Layer 9" card
    - _Requirements: 7.17, 7.18_
  - [ ] 11.9 Replace stub screen components in MainTabNavigator with real screens
    - Wire all 5 tab screens to their real implementations
    - Mount `NetworkBanner` and `ErrorBoundary` inside the authenticated app content
    - Mount `useWebSocket()` and `useAppStateWebSocket()` in the app content component
    - _Requirements: 12.3, 12.5_
  - [ ] 11.10 Update `RootNavigator.tsx` to full implementation
    - Add animated SplashScreen component (Reanimated logo scale + fade)
    - Add subscription check state (stub `isSubscribed: true` until Layer 11)
    - Add notification initialization (stub until Layer 10)
    - Handle `onboardingDone` state and conditional rendering
    - Wire notification deep-link handler to navigate to Signals / Dashboard tabs
    - _Requirements: 2.1, 2.2, 4.1, 4.4_

- [ ] 12. Checkpoint — EAS Build #7
  - Trigger EAS Build. APK must show full tab navigation, Dashboard with real API data, Signals list, Accounts list, Settings, and chart placeholder.
  - Ensure all tests pass, ask the user if questions arise.

- [ ] 13. Layer 8 — expo-secure-store Native Integration (EAS Build #8)
  - [ ] 13.1 Add `expo-secure-store ~15.0.8` to `package.json` dependencies
    - _Requirements: 8.1, 1.4_
  - [ ] 13.2 Update `src/store/authStore.ts` to use real SecureStore
    - Replace in-memory Map with `SecureStore.setItemAsync` / `getItemAsync` / `deleteItemAsync`
    - Keys: `SlickAI_auth_token`, `SlickAI_refresh_token`, `SlickAI_auth_user`
    - `loadStoredAuth`: catch SecureStore errors silently, treat as unauthenticated
    - _Requirements: 3.6, 3.7, 8.1, 8.2, 8.3, 8.4, 8.5, 8.6_
  - [ ] 13.3 Update `src/services/apiClient.ts` to read refresh token from SecureStore
    - Replace in-memory refresh token read with `SecureStore.getItemAsync('SlickAI_refresh_token')`
    - Write new access token to `SecureStore.setItemAsync('SlickAI_auth_token', newToken)`
    - _Requirements: 5.4, 5.5, 8.2_
  - [ ] 13.4 Update `OnboardingScreen.tsx` to use real SecureStore
    - Replace in-memory stub with `SecureStore.setItemAsync('slickai_onboarding_done', 'true')`
    - Update `hasCompletedOnboarding()` to use real `SecureStore.getItemAsync`
    - _Requirements: 4.3, 4.4, 8.1_
  - [ ] 13.5 Update SettingsScreen haptics / notifications preferences to use real SecureStore
    - Keys: `slickai_haptics_enabled`, `slickai_notifications_enabled`
    - _Requirements: 7.16_
  - [ ]* 13.6 Write property test: token storage round-trip (Property 3)
    - **Property 3: Token storage round-trip**
    - **Validates: Requirements 3.6, 8.1, 8.2, 8.3**
    - `fc.tuple(fc.string(), fc.string())` as [jwt, refreshToken] → login() → read SecureStore → assert equal
    - _Requirements: 3.6, 8.2, 8.3_
  - [ ]* 13.7 Write unit test: SecureStore failure on loadStoredAuth is silently handled
    - Mock SecureStore.getItemAsync to throw → call loadStoredAuth → assert no throw, isAuthenticated === false
    - _Requirements: 8.6_

- [ ] 14. Checkpoint — EAS Build #8
  - Trigger EAS Build. APK must persist login across app restarts. Confirm SecureStore reads/writes work on physical device.
  - Ensure all tests pass, ask the user if questions arise.

- [ ] 15. Layer 9 — react-native-webview Chart Screen (EAS Build #9)
  - [ ] 15.1 Add `react-native-webview ^14.0.1` to `package.json` dependencies
    - Add `"expo": { "install": { "exclude": ["react-native-webview"] } }` to `package.json` to prevent Expo from overriding the version
    - _Requirements: 9.1, 1.5_
  - [ ] 15.2 Replace `ChartScreen.tsx` stub with full TradingView implementation
    - Port from `slickai/src/screens/charts/ChartScreen.tsx`
    - `buildChartHtml(symbol)` generates the TradingView widget HTML string
    - Pass to WebView via `source={{ html }}` (NOT a data URI — btoa unavailable in Hermes)
    - Symbol picker for 10 symbols (EUR/USD, GBP/USD, XAU/USD, USD/JPY, GBP/JPY, USD/CAD, AUD/USD, NAS100, SP500, BTC/USD)
    - Loading overlay dismissed on `onLoadEnd`
    - `javaScriptEnabled`, `domStorageEnabled`, `androidLayerType="hardware"` required
    - _Requirements: 7.17, 7.18, 7.19, 9.2, 9.3, 9.4_

- [ ] 16. Checkpoint — EAS Build #9
  - Trigger EAS Build. Confirm TradingView chart renders on device without white screen. Verify symbol switching works.
  - Ensure all tests pass, ask the user if questions arise.

- [ ] 17. Layer 10 — expo-notifications Push Service (EAS Build #10)
  - [ ] 17.1 Add `expo-notifications ~0.32.17` and `expo-application ~7.0.8` to dependencies
    - _Requirements: 10.1, 1.4_
  - [ ] 17.2 Create `src/services/notificationService.ts`
    - Port from `slickai/src/services/notificationService.ts`
    - Dynamic `require('expo-notifications')` inside try/catch for Expo Go safety
    - `initialize()`: set notification handler for foreground display
    - `requestPermissions()`: skip in Expo Go (`executionEnvironment === 'storeClient'`), return false
    - `showLocalNotification(payload)`: schedule immediate local notification
    - `registerPushToken(authToken)`: get Expo push token using EAS `projectId`, POST to `/notifications/register`; skip in Expo Go; non-fatal on failure
    - `addNotificationResponseListener(handler)`: returns cleanup function
    - _Requirements: 10.1, 10.2, 10.3, 10.4, 10.5_
  - [ ] 17.3 Update `src/hooks/useWebSocket.ts` to use real local notifications
    - Replace notification stubs with real `notificationService.showLocalNotification()` calls
    - Signal event: title "New Trading Signal", body "{direction} {asset} @ {entryPrice}"
    - Trade executed: title "Trade Executed", body "{direction} {asset} opened"
    - Trade closed: title "Trade Closed", body "{asset} closed. P&L: {profitLoss}"
    - _Requirements: 10.5_
  - [ ] 17.4 Update `RootNavigator.tsx` to initialize notifications and register push token
    - Call `notificationService.initialize()` and `notificationService.requestPermissions()` on mount
    - After login: call `notificationService.registerPushToken(token)` non-blocking
    - Wire `addNotificationResponseListener` to navigate to Signals tab (type: signal) or Dashboard (type: trade)
    - _Requirements: 10.2, 10.3, 10.6, 10.7_

- [ ] 18. Checkpoint — EAS Build #10
  - Trigger EAS Build. Confirm local notifications appear on device when WebSocket signals arrive.
  - Ensure all tests pass, ask the user if questions arise.

- [ ] 19. Layer 11 — react-native-purchases Paywall (EAS Build #11)
  - [ ] 19.1 Add RevenueCat dependencies to `package.json`
    - Add: `react-native-purchases 10.9.1`, `react-native-purchases-ui 10.9.1`
    - Add env variable references: `EXPO_PUBLIC_REVENUECAT_IOS_KEY`, `EXPO_PUBLIC_REVENUECAT_ANDROID_KEY`
    - _Requirements: 11.1, 1.4_
  - [ ] 19.2 Create `src/services/subscriptionService.ts`
    - Port from `slickai/src/services/subscriptionService.ts`
    - Dynamic `require('react-native-purchases')` inside try/catch
    - `configure(userId)`: configure SDK with platform API key; no-op if SDK unavailable
    - `getOfferings()`: return empty offerings if SDK unavailable
    - `purchasePackage(pkg)`: throw "Purchases not available" if SDK unavailable (prevents false success)
    - `restorePurchases()`: return empty CustomerInfo if SDK unavailable
    - `getCustomerInfo()`: return empty CustomerInfo if SDK unavailable
    - `hasActiveEntitlement(info, 'pro')`: pure function, checks `entitlements.active[entitlement]`
    - Export `createEmptyCustomerInfo()` for testing
    - _Requirements: 11.2, 11.4, 11.5, 11.9_
  - [ ] 19.3 Create `src/screens/paywall/PaywallScreen.tsx`
    - Port from `slickai/src/screens/paywall/PaywallScreen.tsx`
    - `buildPlanOptions(offerings)`: extract Monthly, Quarterly, Yearly packages; compute `monthlyEquivalent` and `savingsPercent`
    - Plan cards with radio selection, "BEST VALUE" badge on Quarterly
    - Unavailable card for Expo Go / missing SDK
    - Subscribe, Restore Purchase, Log Out, and Skip (when `onSkip` prop provided)
    - Error and info banners
    - _Requirements: 11.2, 11.3, 11.4, 11.5, 11.6, 11.7_
  - [ ] 19.4 Update `src/store/subscriptionStore.ts` to full implementation
    - `setSubscription(CustomerInfo)`: extract `pro` entitlement, map `productIdentifier` to `planName` ('Monthly' | 'Quarterly' | 'Yearly')
    - `clearSubscription()`: reset all subscription fields
    - _Requirements: 11.8_
  - [ ] 19.5 Update `RootNavigator.tsx` to enforce subscription gate
    - Remove `isSubscribed: true` stub
    - After auth: `subscriptionService.configure(user.userId)`
    - Call `subscriptionService.getCustomerInfo()` → `setSubscription(info)` → determine `showMainApp`
    - Dev bypass: if `__DEV__` and no SDK (empty entitlements + no purchases) → `setDevBypassPaywall(true)`
    - Render: `isSubscribed || devBypassPaywall` → MainTabNavigator, else PaywallScreen with `onSkip`
    - _Requirements: 11.2, 11.5, 11.6_
  - [ ]* 19.6 Write property test: subscription derivation (already in Layer 5 — confirm coverage)
    - **Property 7: Subscription store correctly derives isSubscribed from CustomerInfo**
    - **Validates: Requirements 11.8**
    - Confirm the property test from task 7.8 exercises the full `setSubscription` path with real store

- [ ] 20. Checkpoint — EAS Build #11 (Final)
  - Trigger EAS Build. Full end-to-end: login → onboarding → paywall (or bypass in DEV) → dashboard with live data → signals → charts → accounts → settings.
  - Confirm subscription purchase flow works with RevenueCat sandbox.
  - Ensure all tests pass, ask the user if questions arise.

- [ ] 21. Global error handler
  - [ ] 21.1 Register global JS error handler in `index.js`
    - Add `ErrorUtils.setGlobalHandler((error, isFatal) => { /* log in DEV only */ })` before app registration
    - _Requirements: 12.9_
  - [ ]* 21.2 Write unit test: ErrorBoundary renders error UI on child throw
    - Render ErrorBoundary with a component that throws on mount
    - Assert error title and Restart button are visible
    - _Requirements: 12.3, 12.4_

---

## Notes

- Tasks marked with `*` are optional and can be skipped for a faster initial migration. They validate correctness properties and must be completed before the feature is considered production-ready.
- Each non-starred checkpoint task is mandatory — do not proceed to the next layer without a passing EAS Build.
- All source files should be ported from `slickai/src/` as close to verbatim as possible, with only the minimum changes needed to compile in the new project (import path adjustments, SecureStore stub swaps in early layers).
- Property tests use **fast-check** `^4.9.0`. Each property must run ≥ 100 iterations (`fc.configureGlobal({ numRuns: 100 })`).
- When a Layer build fails, diagnose the root cause before adding any code from the next layer.
- The `.env` file in `SlickApp/` must define `EXPO_PUBLIC_API_BASE_URL`, `EXPO_PUBLIC_WS_URL`, `EXPO_PUBLIC_REVENUECAT_IOS_KEY`, `EXPO_PUBLIC_REVENUECAT_ANDROID_KEY` before Layer 5 is built.

---

## Task Dependency Graph

```json
{
  "waves": [
    { "id": 0, "tasks": ["1.1", "1.2", "1.3", "1.4"] },
    { "id": 1, "tasks": ["1.5", "1.6", "1.7"] },
    { "id": 2, "tasks": ["2.1", "2.2"] },
    { "id": 3, "tasks": ["2.3", "2.4", "2.5"] },
    { "id": 4, "tasks": ["2.6", "2.8"] },
    { "id": 5, "tasks": ["2.7"] },
    { "id": 6, "tasks": ["4.1", "4.2", "4.3"] },
    { "id": 7, "tasks": ["4.4", "4.5", "4.10"] },
    { "id": 8, "tasks": ["4.6", "4.7", "4.11"] },
    { "id": 9, "tasks": ["4.8", "4.9"] },
    { "id": 10, "tasks": ["6.1"] },
    { "id": 11, "tasks": ["6.2"] },
    { "id": 12, "tasks": ["7.1", "7.2"] },
    { "id": 13, "tasks": ["7.3", "7.4"] },
    { "id": 14, "tasks": ["7.5", "7.6", "7.7", "7.8"] },
    { "id": 15, "tasks": ["9.1", "9.2"] },
    { "id": 16, "tasks": ["9.3", "9.4", "9.5"] },
    { "id": 17, "tasks": ["9.6"] },
    { "id": 18, "tasks": ["11.1"] },
    { "id": 19, "tasks": ["11.2", "11.3", "11.4", "11.5"] },
    { "id": 20, "tasks": ["11.6", "11.7", "11.8", "11.9", "11.10"] },
    { "id": 21, "tasks": ["13.1"] },
    { "id": 22, "tasks": ["13.2", "13.3", "13.4", "13.5"] },
    { "id": 23, "tasks": ["13.6", "13.7"] },
    { "id": 24, "tasks": ["15.1"] },
    { "id": 25, "tasks": ["15.2"] },
    { "id": 26, "tasks": ["17.1"] },
    { "id": 27, "tasks": ["17.2"] },
    { "id": 28, "tasks": ["17.3", "17.4"] },
    { "id": 29, "tasks": ["19.1"] },
    { "id": 30, "tasks": ["19.2", "19.3", "19.4"] },
    { "id": 31, "tasks": ["19.5", "19.6"] },
    { "id": 32, "tasks": ["21.1", "21.2"] }
  ]
}
```
