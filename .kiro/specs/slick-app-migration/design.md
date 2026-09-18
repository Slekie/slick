# Design Document: Slick App Migration

## Overview

The migration rebuilds the Slick AI trading app inside the clean `SlickApp/` Expo SDK 54 project by porting logic from the broken `slickai/` project layer by layer. Each layer produces a shippable EAS APK build. No layer introduces a native module unless it is the layer specifically designated for that module.

The architecture is a React Native single-page app with a layered structure:

```
App (index.js → App.tsx → RootNavigator)
  └─ Navigation (AuthNavigator | OnboardingScreen | PaywallScreen | MainTabNavigator)
       ├─ Stores (Zustand — Auth, Account, Signal, Trade, Subscription)
       ├─ Services (ApiClient, AuthService, AccountService, SignalService, TradeService,
       │            WebSocketService, NotificationService, SubscriptionService)
       └─ Screens + Components
```

All state changes flow through Zustand stores. All API communication flows through typed Axios instances with a shared 401-refresh interceptor. Real-time events flow through a socket.io-client singleton.

---

## Architecture

### Layer Sequencing

| Layer | Contents | New Dependencies | Build Gate |
|-------|----------|-----------------|-----------|
| 1 | Project config, TypeScript setup, theme, assets | `typescript`, `@types/react` | EAS Build #1 |
| 2 | React Navigation shell (tabs + auth stack) | `@react-navigation/*`, `react-native-screens`, `react-native-safe-area-context`, `react-native-gesture-handler`, `expo-linear-gradient`, `@expo/vector-icons`, `react-native-reanimated` | EAS Build #2 |
| 3 | Auth screens, auth store skeleton, biometric hook | `expo-local-authentication`, `expo-haptics` | EAS Build #3 |
| 4 | Onboarding screen (uses SecureStore for completion flag — pulled from Layer 6 stub if needed, or done after Layer 6) | none beyond Layer 3 | EAS Build #4 |
| 5 | Zustand stores, Axios ApiClient, all service files | `zustand`, `axios`, `expo-constants` | EAS Build #5 |
| 6 | WebSocket service, real-time hooks | `socket.io-client` | EAS Build #6 |
| 7 | Core screens (Dashboard, Signals, Accounts, Settings, Charts skeleton) | `@react-native-community/netinfo` | EAS Build #7 |
| 8 | `expo-secure-store` native integration (replaces in-memory token storage) | `expo-secure-store` | EAS Build #8 |
| 9 | `react-native-webview` (TradingView chart) | `react-native-webview` | EAS Build #9 |
| 10 | `expo-notifications` (push tokens + local notifications) | `expo-notifications`, `expo-application` | EAS Build #10 |
| 11 | `react-native-purchases` (RevenueCat paywall) | `react-native-purchases`, `react-native-purchases-ui` | EAS Build #11 |

> **Onboarding note**: OnboardingScreen uses `expo-secure-store` to persist its completion flag. Since the screen itself contains no native module calls beyond SecureStore, it can be added in Layer 4 with a lightweight in-memory mock of SecureStore (a plain `Map`) for the completion flag, then switched to the real SecureStore implementation in Layer 8 when that module is installed.

### Dependency Version Contract

All native module versions are pinned to values matching Expo SDK 54's `bundledNativeModules.json`. The following exact versions are non-negotiable:

```
react-native-reanimated       ~4.1.1
react-native-screens          ~4.16.0
react-native-safe-area-context ~5.6.0
react-native-gesture-handler  ~2.28.0
react-native-webview          ^14.0.1    (excluded from expo install)
expo-secure-store             ~15.0.8
expo-local-authentication     ~17.0.9
expo-notifications            ~0.32.17
expo-linear-gradient          ~15.0.8
@expo/vector-icons            ^15.0.3
@react-native-community/netinfo 11.4.1
socket.io-client              ^4.8.3
zustand                       5.0.5
axios                         ^1.19.0
react-native-purchases        10.9.1
react-native-purchases-ui     10.9.1
```

`package.json` MUST include:
```json
"expo": {
  "install": {
    "exclude": ["react-native-webview"]
  }
}
```

---

## Components and Interfaces

### Directory Structure

```
SlickApp/
├── App.tsx                        (entry, wraps RootNavigator)
├── index.js
├── babel.config.js
├── app.json
├── eas.json
├── .env
├── assets/
│   ├── icon.png
│   ├── splash-icon.png
│   └── adaptive-icon.png
└── src/
    ├── config/
    │   └── api.ts                 (API_BASE_URL, WS_URL, ENDPOINTS, API_TIMEOUT_MS)
    ├── theme/
    │   └── index.ts               (COLORS, FONTS, SPACING, RADIUS)
    ├── store/
    │   ├── authStore.ts
    │   ├── accountStore.ts
    │   ├── signalStore.ts
    │   ├── tradeStore.ts
    │   └── subscriptionStore.ts
    ├── services/
    │   ├── apiClient.ts           (createAuthenticatedClient factory)
    │   ├── authService.ts
    │   ├── accountService.ts
    │   ├── signalService.ts
    │   ├── tradeService.ts
    │   ├── websocketService.ts
    │   ├── notificationService.ts
    │   └── subscriptionService.ts
    ├── hooks/
    │   ├── useAuth.ts
    │   ├── useWebSocket.ts
    │   └── useAppStateWebSocket.ts
    ├── navigation/
    │   ├── RootNavigator.tsx
    │   ├── AuthNavigator.tsx
    │   └── MainTabNavigator.tsx
    ├── screens/
    │   ├── auth/
    │   │   ├── WelcomeScreen.tsx
    │   │   ├── LoginScreen.tsx
    │   │   └── RegisterScreen.tsx
    │   ├── onboarding/
    │   │   └── OnboardingScreen.tsx
    │   ├── dashboard/
    │   │   └── DashboardScreen.tsx
    │   ├── signals/
    │   │   └── SignalsScreen.tsx
    │   ├── accounts/
    │   │   └── AccountsScreen.tsx
    │   ├── settings/
    │   │   └── SettingsScreen.tsx
    │   ├── charts/
    │   │   └── ChartScreen.tsx
    │   └── paywall/
    │       └── PaywallScreen.tsx
    └── components/
        ├── ErrorBoundary.tsx
        ├── NetworkBanner.tsx
        ├── SignalCard.tsx
        ├── TradeCard.tsx
        ├── EquityChart.tsx
        ├── AnimatedNumber.tsx
        ├── AutomatedBanner.tsx
        ├── LiveDot.tsx
        └── SkeletonCard.tsx
```

### Key Interface Contracts

**Auth Store**
```typescript
interface AuthUser { userId: string; email: string; provider?: 'email' | 'google' | 'apple'; }
interface AuthState {
  user: AuthUser | null; token: string | null; refreshToken: string | null;
  isAuthenticated: boolean; failedAttempts: number; lockedUntil: Date | null; isLoading: boolean;
  login(user, token, refreshToken?): Promise<void>;
  logout(): Promise<void>;
  register(user, token, refreshToken?): Promise<void>;
  loadStoredAuth(): Promise<void>;
  incrementFailedAttempts(): void; resetFailedAttempts(): void;
  isLockedOut(): boolean; getLockoutRemainingMs(): number;
}
```

**Connected Account**
```typescript
interface ConnectedAccount {
  accountId: string; userId: string; broker: string;
  brokerDisplayName: string | null; loginId: string | null;
  metaApiAccountId: string | null; balance: string; currency: string;
  status: 'active' | 'inactive' | 'error' | 'circuit_breaker_active';
  subscriptionMode: 'signal_delivery' | 'automated_trading';
  connectedAt: string; lastSync: string | null;
}
```

**Signal**
```typescript
interface Signal {
  signalId: string; userAccountId: string; asset: string;
  direction: 'BUY' | 'SELL'; entryPrice: string; stopLoss: string;
  takeProfit: string; confidence: number; modelVersion: string;
  generatedAt: string; expiresAt: string;
  status: 'pending' | 'delivered' | 'expired' | 'failed';
}
```

**WebSocket Service (singleton)**
```typescript
class WebSocketService {
  setToken(token: string): void;
  connect(): void; disconnect(): void;
  pauseReconnect(): void; resumeReconnect(): void;
  on(event: WsEventType, listener): void; off(event, listener): void;
  onConnectionChange(listener): void; offConnectionChange(listener): void;
  get isConnected(): boolean;
}
```

**API Configuration**
```typescript
// src/config/api.ts
export const API_BASE_URL: string;  // EXPO_PUBLIC_API_BASE_URL + /api/v1
export const WS_URL: string;        // EXPO_PUBLIC_WS_URL (wss:// scheme)
export const API_TIMEOUT_MS = 15_000;
export const ENDPOINTS = { auth, accounts, settings, signals, trades, performance, notifications };
```

---

## Data Models

### Token Lifecycle

```
Login / Register
    │
    ▼
authService.login() ──► backend returns { access_token, refresh_token }
    │
    ▼
AuthStore.login()  ──► SecureStore.setItem('SlickAI_auth_token', jwt)
                   ──► SecureStore.setItem('SlickAI_refresh_token', refreshToken)
                   ──► SecureStore.setItem('SlickAI_auth_user', JSON.stringify(user))
    │
    ▼                         On 401:
ApiClient sends request ──► interceptor calls POST /auth/refresh
                         ──► success: update SecureStore + AuthStore + retry
                         ──► fail:    AuthStore.logout() → route to AuthNavigator

Logout:
    SecureStore.deleteItem(all 3 keys)
    Clear all Zustand stores
    WebSocket.disconnect()
```

### Signal Expiry

A signal is considered expired when:
- `signal.status === 'expired'`, OR
- `Date.now() - new Date(signal.generatedAt).getTime() > 15 * 60 * 1000`

The `markExpiredSignals()` store action runs every 60 seconds via `setInterval` in `SignalsScreen`.

### Subscription State Machine

```
No subscription (isSubscribed: false)
    │
    ▼ purchase() or restorePurchases()
CustomerInfo received
    │
    ├─► entitlements.active['pro'] exists → isSubscribed: true, derive planName from productIdentifier
    └─► entitlements.active['pro'] absent → isSubscribed: false
```

---

## Correctness Properties

*A property is a characteristic or behavior that should hold true across all valid executions of a system — essentially, a formal statement about what the system should do. Properties serve as the bridge between human-readable specifications and machine-verifiable correctness guarantees.*

### Property 1: Auth navigation routing

*For any* authentication state (authenticated vs. unauthenticated), the RootNavigator SHALL render exactly the correct navigator — AuthNavigator when `isAuthenticated` is false, MainTabNavigator (or Paywall) when true.

**Validates: Requirements 2.1, 2.2**

---

### Property 2: Email validation rejects all non-email strings

*For any* string that does not match the pattern `[^\s@]+@[^\s@]+\.[^\s@]+`, the login and register forms SHALL display a field-level error and SHALL NOT invoke the auth service.

**Validates: Requirements 3.2, 3.3, 10.10**

---

### Property 3: Token storage round-trip

*For any* valid JWT and refresh token pair returned by a login or register response, storing them via `AuthStore.login()` and then reading them back via `SecureStore.getItemAsync` SHALL return the same token values.

**Validates: Requirements 3.6, 8.1, 8.2, 8.3**

---

### Property 4: ApiClient attaches Authorization header to every request

*For any* outgoing API request made after `setAuthToken(token)` is called, the request SHALL include the header `Authorization: Bearer <token>` where `<token>` equals the value passed to `setAuthToken`.

**Validates: Requirements 5.3**

---

### Property 5: Exactly one refresh call for any number of concurrent 401 responses

*For any* number N ≥ 1 of concurrent requests that receive a 401 response, the ApiClient interceptor SHALL issue exactly one call to `POST /auth/refresh` regardless of N.

**Validates: Requirements 5.7**

---

### Property 6: WebSocket reconnection delay is bounded by the backoff formula

*For any* reconnect attempt number between 1 and 10, the delay before the next connection attempt SHALL equal `3000 × min(attempt, 5)` milliseconds, and no further attempts SHALL be scheduled after attempt 10.

**Validates: Requirements 6.7, 6.8**

---

### Property 7: Subscription store correctly derives isSubscribed from CustomerInfo

*For any* RevenueCat `CustomerInfo` object, `setSubscription(info)` SHALL set `isSubscribed` to `true` if and only if `info.entitlements.active['pro']` is defined, and `false` otherwise.

**Validates: Requirements 11.8**

---

## Error Handling

### API Errors

| Condition | Handling |
|-----------|----------|
| HTTP 401 (first time) | Interceptor refreshes token, retries original request |
| HTTP 401 (second time / refresh fails) | Force logout, route to AuthNavigator |
| HTTP 429 on account connect | Exponential backoff: 2 s → 4 s, max 2 retries |
| No HTTP response (network error) | Display "Cannot reach the server" message |
| Non-401 HTTP error | Surface error message from `response.data.message` or generic fallback |

### WebSocket Errors

| Condition | Handling |
|-----------|----------|
| connect_error | Schedule reconnect with backoff |
| disconnect | Schedule reconnect with backoff if `shouldBeConnected` |
| Max retries reached (10) | Stop retrying, show NetworkBanner |
| App backgrounded | `pauseReconnect()` — stop all attempts |
| App foregrounded | `resumeReconnect()` — attempt immediately |
| Network lost | NetworkBanner shown, no reconnect until restored |
| Network restored | `websocketService.resumeReconnect()` |

### Auth Errors

| Condition | Handling |
|-----------|----------|
| Invalid credentials | Show error from server, increment `failedAttempts` |
| 3+ failures | Lock account for 15 min, show countdown screen |
| Biometric hardware unavailable | Hide biometric button silently |
| Biometric prompt cancelled | No error shown |
| SecureStore read failure on startup | Silently treat as logged out |

### Native Module Errors (Expo Go)

All native modules (`expo-notifications`, `react-native-purchases`) are loaded via dynamic `require()` inside `try/catch`. When unavailable (Expo Go), stubs return safe empty/false values without throwing. `__DEV__` warnings are emitted but no user-facing errors are shown.

---

## Testing Strategy

### Unit Tests — Example-Based

Focus on:
- Auth store lockout threshold: 3 failed attempts triggers lockout
- Auth store: `getLockoutRemainingMs` returns 0 when not locked
- `mapBackendResponse`: correctly maps snake_case backend fields to camelCase
- `buildPlanOptions`: correctly computes `monthlyEquivalent` and `savingsPercent`
- `mapOpenPosition`: correctly handles both snake_case and camelCase field names
- Signal expiry: `isSignalExpired` returns true for age > 15 min
- `SubscriptionStore.setSubscription`: correctly sets `planName` from product identifier strings
- `createEmptyCustomerInfo`: returns CustomerInfo with no active entitlements

### Property Tests — Universal

Property tests use **fast-check** (already in `devDependencies` at `^4.9.0`). Each test runs a minimum of 100 iterations.

Tests are tagged with `// Feature: slick-app-migration, Property N: <text>`.

**Property 1 tests** (auth routing):
- `fc.boolean()` → mock isAuthenticated, render RootNavigator, assert correct navigator present

**Property 2 tests** (email validation):
- `fc.string()` filtered to exclude valid emails → submit form, assert no `authService.login` call and error is visible

**Property 3 tests** (token round-trip):
- `fc.tuple(fc.string(), fc.string())` as [accessToken, refreshToken] → call `AuthStore.login()` with mock SecureStore, read back, assert equal

**Property 4 tests** (Authorization header):
- `fc.string()` as token → set on apiClient, intercept axios call, assert header present

**Property 5 tests** (single refresh call):
- `fc.integer({ min: 1, max: 20 })` as N concurrent 401s → assert refresh called exactly once

**Property 6 tests** (backoff formula):
- `fc.integer({ min: 1, max: 10 })` as attempt → compute expected delay, assert scheduleReconnect uses it; beyond 10, assert no call

**Property 7 tests** (subscription derivation):
- `fc.record(...)` generating CustomerInfo with random entitlements → assert isSubscribed matches presence of 'pro' key

### Integration Tests

- EAS Build smoke test per layer (manual verification on device)
- WebSocket connect/disconnect via real backend in staging environment
- Push token registration via Expo push service

### Test Configuration

```json
// jest.config.js / jest-expo preset
{
  "preset": "jest-expo",
  "setupFilesAfterEach": ["@testing-library/react-native/extend-expect"],
  "testEnvironment": "node"
}
```

Property tests do not use watch mode. Run with `jest --run` or `jest --passWithNoTests --forceExit`.
