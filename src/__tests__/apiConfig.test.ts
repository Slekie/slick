/**
 * Unit test: API config constructs correct URLs
 * Validates: Requirements 5.9, 5.10
 */
import { API_BASE_URL, WS_URL, API_TIMEOUT_MS, ENDPOINTS } from '../config/api';

describe('API Configuration', () => {
  test('API_BASE_URL includes /api/v1 suffix', () => {
    expect(API_BASE_URL).toContain('/api/v1');
  });

  test('API_BASE_URL does not have a trailing slash before /api/v1', () => {
    expect(API_BASE_URL).not.toMatch(/\/\/api\/v1/);
  });

  test('WS_URL uses wss:// or ws:// scheme', () => {
    expect(WS_URL).toMatch(/^wss?:\/\//);
  });

  test('API_TIMEOUT_MS is 15000', () => {
    expect(API_TIMEOUT_MS).toBe(15_000);
  });

  test('ENDPOINTS.auth.login is defined', () => {
    expect(ENDPOINTS.auth.login).toBe('/auth/login');
  });

  test('ENDPOINTS.accounts.disconnect is a function returning correct path', () => {
    expect(ENDPOINTS.accounts.disconnect('abc-123')).toBe('/accounts/abc-123');
  });

  test('ENDPOINTS.trades.detail is a function returning correct path', () => {
    expect(ENDPOINTS.trades.detail('trade-456')).toBe('/trades/trade-456');
  });
});
