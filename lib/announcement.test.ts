import { describe, test } from 'node:test';
import assert from 'node:assert/strict';
import { isBannerTheme, parseBanner, visibleBanner } from './announcement';

const rows = (entries: Record<string, string>) => Object.entries(entries).map(([key, value]) => ({ key, value }));

describe('parseBanner', () => {
  test('reads all four settings', () => {
    assert.deepEqual(
      parseBanner(
        rows({
          announcement: '  We updated the rules.  ',
          announcement_title: ' Community Guidelines Update ',
          announcement_theme: 'warning',
          announcement_active: 'true',
        }),
      ),
      { message: 'We updated the rules.', title: 'Community Guidelines Update', theme: 'warning', active: true },
    );
  });

  test('a banner written before the switch and theme existed counts as an active Info banner', () => {
    assert.deepEqual(parseBanner(rows({ announcement: 'Scheduled maintenance tonight.' })), {
      message: 'Scheduled maintenance tonight.',
      title: '',
      theme: 'info',
      active: true,
    });
  });

  test('only the exact value "false" switches it off', () => {
    assert.equal(parseBanner(rows({ announcement: 'x', announcement_active: 'false' })).active, false);
    assert.equal(parseBanner(rows({ announcement: 'x', announcement_active: 'true' })).active, true);
    assert.equal(parseBanner(rows({ announcement: 'x', announcement_active: '' })).active, true);
  });

  test('an unknown theme falls back to Info', () => {
    assert.equal(parseBanner(rows({ announcement: 'x', announcement_theme: 'neon' })).theme, 'info');
  });

  test('no rows at all is an empty, active Info banner', () => {
    assert.deepEqual(parseBanner([]), { message: '', title: '', theme: 'info', active: true });
  });
});

describe('visibleBanner', () => {
  test('shows an active banner that has a message', () => {
    assert.equal(visibleBanner(rows({ announcement: 'Hello' }))?.message, 'Hello');
  });

  test('hides a switched-off banner', () => {
    assert.equal(visibleBanner(rows({ announcement: 'Hello', announcement_active: 'false' })), null);
  });

  test('hides a banner with no message, even when switched on', () => {
    assert.equal(visibleBanner(rows({ announcement: '   ', announcement_title: 'Title only', announcement_active: 'true' })), null);
    assert.equal(visibleBanner([]), null);
  });
});

describe('isBannerTheme', () => {
  test('accepts the three themes only', () => {
    assert.equal(isBannerTheme('info'), true);
    assert.equal(isBannerTheme('warning'), true);
    assert.equal(isBannerTheme('critical'), true);
    assert.equal(isBannerTheme('danger'), false);
    assert.equal(isBannerTheme(undefined), false);
    assert.equal(isBannerTheme(3), false);
  });
});
