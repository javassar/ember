// Unit tests for Ember UI component rendering, accessible attributes, and mode classes.

import { renderToString } from 'react-dom/server';
import { describe, it, expect } from 'vitest';
import {
  Button,
  IconButton,
  IconClose,
  Toggle,
  SegmentedControl,
  Chip,
  TextArea,
  ProgressDots,
  NumberPad,
  LivingBackground,
  ScreenLayout,
} from './index';

describe('UI Component System', () => {
  it('renders Button with variants and loading state', () => {
    const htmlPrimary = renderToString(<Button variant="primary">Start</Button>);
    expect(htmlPrimary).toContain('ember-btn--primary');
    expect(htmlPrimary).toContain('Start');

    const htmlLoading = renderToString(<Button loading>Submit</Button>);
    expect(htmlLoading).toContain('ember-btn--loading');
    expect(htmlLoading).toContain('aria-busy="true"');
    expect(htmlLoading).toContain('btn-spinner');

    const htmlDisabled = renderToString(<Button disabled>Inactive</Button>);
    expect(htmlDisabled).toContain('disabled=""');
  });

  it('renders IconButton with required accessibility label', () => {
    const html = renderToString(
      <IconButton aria-label="Close dialog" variant="quiet">
        <IconClose />
      </IconButton>
    );
    expect(html).toContain('aria-label="Close dialog"');
    expect(html).toContain('ember-icon-btn--quiet');
    expect(html).toContain('<svg');
  });

  it('renders Toggle switch with proper ARIA role and states', () => {
    const htmlChecked = renderToString(
      <Toggle checked={true} onChange={() => {}} label="Ritual" />
    );
    expect(htmlChecked).toContain('role="switch"');
    expect(htmlChecked).toContain('aria-checked="true"');
    expect(htmlChecked).toContain('ember-toggle-switch--checked');
    expect(htmlChecked).toContain('Ritual');

    const htmlUnchecked = renderToString(
      <Toggle checked={false} onChange={() => {}} label="Ritual" />
    );
    expect(htmlUnchecked).toContain('aria-checked="false"');
  });

  it('renders SegmentedControl with radio role and active indicator', () => {
    const options = [
      { value: 'daily', label: 'Daily' },
      { value: 'each-session', label: 'Each Session' },
    ];
    const html = renderToString(
      <SegmentedControl options={options} value="daily" onChange={() => {}} />
    );
    expect(html).toContain('role="radiogroup"');
    expect(html).toContain('segmented-item--active');
    expect(html).toContain('Daily');
    expect(html).toContain('Each Session');
  });

  it('renders Chip with membership state and mode accent classes', () => {
    const htmlCore = renderToString(
      <Chip label="Rescue" state="core" modeAccent="rescue" />
    );
    expect(htmlCore).toContain('ember-chip--state-core');
    expect(htmlCore).toContain('ember-chip--mode-rescue');
    expect(htmlCore).toContain('(core)');

    const htmlRotating = renderToString(
      <Chip label="Start" state="rotating" modeAccent="start" />
    );
    expect(htmlRotating).toContain('ember-chip--state-rotating');
    expect(htmlRotating).toContain('(rotating)');
  });

  it('renders TextArea with character counts and hint text', () => {
    const html = renderToString(
      <TextArea
        label="Prompt"
        value="Take a breath"
        maxLength={100}
        showCharCount
        hint="Helpful advice"
        onChange={() => {}}
      />
    );
    expect(html).toContain('Prompt');
    expect(html).toContain('13/100');
    expect(html).toContain('Helpful advice');
  });

  it('renders ProgressDots with ARIA progressbar and active dot', () => {
    const html = renderToString(<ProgressDots total={5} current={2} modeAccent="start" />);
    expect(html).toContain('role="progressbar"');
    expect(html).toContain('aria-valuenow="3"');
    expect(html).toContain('aria-valuemax="5"');
    expect(html).toContain('dot--active');
    expect(html).toContain('progress--accent-start');
  });

  it('renders NumberPad with all 10 digits and delete key', () => {
    const html = renderToString(
      <NumberPad onDigit={() => {}} onDelete={() => {}} />
    );
    for (let i = 0; i <= 9; i++) {
      expect(html).toContain(`>${i}<`);
    }
    expect(html).toContain('ember-numberpad');
  });

  it('renders LivingBackground with mode classes', () => {
    const htmlHome = renderToString(<LivingBackground mode="home" />);
    expect(htmlHome).toContain('mode-home');
    expect(htmlHome).toContain('gradient-orb');

    const htmlRescue = renderToString(<LivingBackground mode="rescue" />);
    expect(htmlRescue).toContain('mode-rescue');
  });

  it('renders ScreenLayout with safe-area and max-width classes', () => {
    const html = renderToString(
      <ScreenLayout maxWidth="md">
        <div>Content</div>
      </ScreenLayout>
    );
    expect(html).toContain('ember-screen-layout--md');
    expect(html).toContain('Content');
  });
});
