import { describe, it, expect } from 'vitest';
import { formatDateTime, formatDate } from '../lib/time';

describe('time formatting utilities', () => {
  it('formats ISO string to Vietnamese date time with Asia/Ho_Chi_Minh', () => {
    // 2026-11-09T03:30:00Z is 10:30:00 in UTC+7
    const result = formatDateTime('2026-11-09T03:30:00Z');
    expect(result).toContain('09/11/2026');
    expect(result).toContain('10:30');
  });

  it('formats invalid date gracefully', () => {
    expect(formatDateTime('invalid-date')).toBe('—');
    expect(formatDate(null)).toBe('—');
  });
});

