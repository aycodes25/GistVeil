// The site-wide banner is stored as four rows in `settings`. Pure parsing lives here so the public
// feed and the admin settings page read the rows the same way.

export const ANNOUNCEMENT_KEYS = [
  'announcement',
  'announcement_title',
  'announcement_theme',
  'announcement_active',
] as const;

export const BANNER_THEMES = ['info', 'warning', 'critical'] as const;
export type BannerTheme = (typeof BANNER_THEMES)[number];

export const BANNER_THEME_LABELS: Record<BannerTheme, string> = {
  info: 'Info (Primary Purple)',
  warning: 'Warning (Amber)',
  critical: 'Critical (Red)',
};

export interface Banner {
  title: string;
  message: string;
  theme: BannerTheme;
  active: boolean;
}

export interface SettingRow {
  key: string;
  value: string;
}

export function isBannerTheme(value: unknown): value is BannerTheme {
  return typeof value === 'string' && (BANNER_THEMES as readonly string[]).includes(value);
}

// Reads the banner out of settings rows. Missing rows fall back to sensible defaults: an unknown
// theme is Info, and no switch row means ON, so a banner written before the switch existed keeps
// showing.
export function parseBanner(rows: readonly SettingRow[]): Banner {
  const get = (key: string) => rows.find((row) => row.key === key)?.value;
  const theme = get('announcement_theme');
  return {
    message: (get('announcement') ?? '').trim(),
    title: (get('announcement_title') ?? '').trim(),
    theme: isBannerTheme(theme) ? theme : 'info',
    active: get('announcement_active') !== 'false',
  };
}

// What visitors see: only a switched-on banner that has a message.
export function visibleBanner(rows: readonly SettingRow[]): Banner | null {
  const banner = parseBanner(rows);
  return banner.active && banner.message ? banner : null;
}
