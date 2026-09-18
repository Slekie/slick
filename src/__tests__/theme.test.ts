/**
 * Unit test: theme constants are defined and non-empty
 * Validates: Requirement 1.1 (foundational configuration)
 */
import { COLORS, FONTS, SPACING, RADIUS } from '../theme';

describe('Theme constants', () => {
  test('COLORS.primary is the brand green', () => {
    expect(COLORS.primary).toBe('#00C851');
  });

  test('COLORS.bg is the dark background', () => {
    expect(COLORS.bg).toBe('#080B14');
  });

  test('All COLORS values are non-empty strings', () => {
    (Object.entries(COLORS) as [string, string | readonly string[]][]).forEach(([key, value]) => {
      if (typeof value === 'string') {
        expect(value.length).toBeGreaterThan(0);
      } else {
        // gradient array
        expect(Array.isArray(value)).toBe(true);
        expect((value as readonly string[]).length).toBeGreaterThan(0);
      }
    });
  });

  test('FONTS.sizes has all required size keys', () => {
    const required = ['xs', 'sm', 'md', 'lg', 'xl', '2xl', '3xl', '4xl'] as const;
    required.forEach(key => {
      expect(FONTS.sizes[key]).toBeGreaterThan(0);
    });
  });

  test('FONTS.weights has all required weight keys', () => {
    const required = ['regular', 'medium', 'semibold', 'bold', 'extrabold'] as const;
    required.forEach(key => {
      expect(FONTS.weights[key]).toBeDefined();
    });
  });

  test('SPACING values are all positive numbers', () => {
    (Object.values(SPACING) as number[]).forEach(v => {
      expect(typeof v).toBe('number');
      expect(v).toBeGreaterThan(0);
    });
  });

  test('RADIUS values are all positive numbers', () => {
    (Object.values(RADIUS) as number[]).forEach(v => {
      expect(typeof v).toBe('number');
      expect(v).toBeGreaterThan(0);
    });
  });
});
