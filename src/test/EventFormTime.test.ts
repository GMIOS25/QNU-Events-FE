import { describe, it, expect } from 'vitest';
import { toLocalDateTimeInput } from '../lib/time';

describe('toLocalDateTimeInput (BUG-02 timezone conversion)', () => {
  it('converts UTC ISO string to local YYYY-MM-DDTHH:mm and round-trips cleanly', () => {
    const iso = '2026-11-25T09:30:00.000Z';
    const localInput = toLocalDateTimeInput(iso);

    expect(localInput).toMatch(/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}$/);
    // Khi parse lại qua new Date(localInput).toISOString() phải ra đúng thời điểm UTC ban đầu
    expect(new Date(localInput).toISOString()).toBe(iso);
  });

  it('returns empty string for null, undefined or invalid dates', () => {
    expect(toLocalDateTimeInput(null)).toBe('');
    expect(toLocalDateTimeInput(undefined)).toBe('');
    expect(toLocalDateTimeInput('not-a-date')).toBe('');
  });
});
