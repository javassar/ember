// Unit tests for the Ritual opening scale computation and auto-scaling rules.

import { describe, it, expect } from 'vitest';
import { computeEffectiveRitualScale } from './Ritual';

describe('Ritual auto-scaling (src/components/Ritual/Ritual.tsx)', () => {
  it('returns "none" when ritualEnabled is false', () => {
    expect(computeEffectiveRitualScale('start', false, 'auto', 1)).toBe('none');
    expect(computeEffectiveRitualScale('charge', false, 'full', 1)).toBe('none');
    expect(computeEffectiveRitualScale('rescue', false, 'short', 1)).toBe('none');
  });

  it('scales automatically across daily sessions for start and charge modes', () => {
    // 1st session of the day: full
    expect(computeEffectiveRitualScale('start', true, 'auto', 1)).toBe('full');
    expect(computeEffectiveRitualScale('charge', true, 'auto', 1)).toBe('full');

    // 2nd session of the day: short
    expect(computeEffectiveRitualScale('start', true, 'auto', 2)).toBe('short');
    expect(computeEffectiveRitualScale('charge', true, 'auto', 2)).toBe('short');

    // 3rd session and later: none
    expect(computeEffectiveRitualScale('start', true, 'auto', 3)).toBe('none');
    expect(computeEffectiveRitualScale('charge', true, 'auto', 5)).toBe('none');
  });

  it('caps Rescue mode at short ritual, never allowing full ritual', () => {
    // 1st session in auto: rescue gets short
    expect(computeEffectiveRitualScale('rescue', true, 'auto', 1)).toBe('short');

    // Even if ritualScale is explicitly set to full, rescue is capped at short
    expect(computeEffectiveRitualScale('rescue', true, 'full', 1)).toBe('short');

    // 2nd session in auto: short
    expect(computeEffectiveRitualScale('rescue', true, 'auto', 2)).toBe('short');

    // 3rd session in auto: none
    expect(computeEffectiveRitualScale('rescue', true, 'auto', 3)).toBe('none');
  });

  it('honors fixed scale settings for start and charge', () => {
    expect(computeEffectiveRitualScale('start', true, 'full', 10)).toBe('full');
    expect(computeEffectiveRitualScale('charge', true, 'short', 1)).toBe('short');
  });
});
