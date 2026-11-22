// Unit tests verifying core configuration constants, mode defaults, and app identity.

import { describe, it, expect } from 'vitest';
import {
  APP_NAME,
  LOCK_TIMEOUT_DEFAULT_MS,
  PIN_MIN_LENGTH,
  PIN_MAX_LENGTH,
  PBKDF2_ITERATIONS,
  RITUAL_FULL_MS,
  RITUAL_SHORT_MS,
  DEFAULT_MODE_CONFIGS,
  DEFAULT_SETTINGS,
  COLORS,
  LIGHT_COLORS,
} from './config';

describe('Config Constants', () => {
  it('defines the correct app branding', () => {
    expect(APP_NAME).toBe('Ember');
  });

  it('sets secure PIN parameters', () => {
    expect(PIN_MIN_LENGTH).toBe(4);
    expect(PIN_MAX_LENGTH).toBe(8);
    expect(PBKDF2_ITERATIONS).toBeGreaterThanOrEqual(200_000);
    expect(LOCK_TIMEOUT_DEFAULT_MS).toBe(300_000); // 5 minutes
  });

  it('configures ritual timing', () => {
    expect(RITUAL_FULL_MS).toBe(4_000);
    expect(RITUAL_SHORT_MS).toBe(1_500);
  });

  it('defines all three core modes with their default rules', () => {
    expect(DEFAULT_MODE_CONFIGS.start).toBeDefined();
    expect(DEFAULT_MODE_CONFIGS.charge).toBeDefined();
    expect(DEFAULT_MODE_CONFIGS.rescue).toBeDefined();

    // Start mode defaults
    expect(DEFAULT_MODE_CONFIGS.start.rotatingCount).toBe(2);
    expect(DEFAULT_MODE_CONFIGS.start.rotatingRefresh).toBe('daily');
    expect(DEFAULT_MODE_CONFIGS.start.coreOrder).toBe('fixed');

    // Charge mode defaults
    expect(DEFAULT_MODE_CONFIGS.charge.rotatingCount).toBe(3);
    expect(DEFAULT_MODE_CONFIGS.charge.rotatingRefresh).toBe('each-session');
    expect(DEFAULT_MODE_CONFIGS.charge.coreOrder).toBe('shuffle');

    // Rescue mode defaults
    expect(DEFAULT_MODE_CONFIGS.rescue.rotatingCount).toBe(2);
    expect(DEFAULT_MODE_CONFIGS.rescue.rotatingRefresh).toBe('each-session');
    expect(DEFAULT_MODE_CONFIGS.rescue.coreOrder).toBe('shuffle');
  });

  it('defines theme colors with required contrast and accents', () => {
    expect(COLORS.bgBase).toBe('#0B0B10');
    expect(COLORS.start).toBe('#F0A35B');
    expect(COLORS.charge).toBe('#FF5459');
    expect(COLORS.rescue).toBe('#7B8CE2');

    expect(LIGHT_COLORS.bgBase).toBe('#FAF8F5');
    expect(LIGHT_COLORS.start).toBe('#B85600');
    expect(LIGHT_COLORS.charge).toBe('#CC1B24');
    expect(LIGHT_COLORS.rescue).toBe('#3B42CC');
  });

  it('provides valid default settings', () => {
    expect(DEFAULT_SETTINGS.pin).toBeNull();
    expect(DEFAULT_SETTINGS.openInto).toBe('home');
    expect(DEFAULT_SETTINGS.ritualEnabled).toBe(true);
    expect(DEFAULT_SETTINGS.onboardingDone).toBe(false);
    expect(DEFAULT_SETTINGS.theme).toBe('dark');
  });
});
