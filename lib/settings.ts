import { EXPERIMENTAL_SUPPORTED_MATCHES } from './site-rules';

export type FillMode = 'auto' | 'manual';

export interface FillRecord {
  at: number;
  host: string;
  mode: FillMode;
  siteName: string;
  textLength: number;
}

export interface ExtensionSettings {
  enabled: boolean;
  mode: FillMode;
  disabledHosts: string[];
  enabledHosts: string[];
  fillDelayMs: number;
  fillCount: number;
  lastFill: FillRecord | null;
}

export const DEFAULT_SETTINGS: ExtensionSettings = {
  enabled: true,
  mode: 'auto',
  disabledHosts: [...EXPERIMENTAL_SUPPORTED_MATCHES],
  enabledHosts: [],
  fillDelayMs: 150,
  fillCount: 0,
  lastFill: null,
};

export const SENSITIVE_HOSTS = [
  'accounts.google.com',
  'login.microsoftonline.com',
  'appleid.apple.com',
  'paypal.com',
  'stripe.com',
  'wise.com',
  'revolut.com',
  '1password.com',
  'lastpass.com',
  'bitwarden.com',
  'dashlane.com',
];

export async function getSettings(): Promise<ExtensionSettings> {
  const stored = (await browser.storage.local.get(
    Object.keys(DEFAULT_SETTINGS) as (keyof ExtensionSettings)[],
  )) as Partial<ExtensionSettings>;

  return normalizeSettings({
    ...DEFAULT_SETTINGS,
    ...stored,
  });
}

export async function saveSettings(patch: Partial<ExtensionSettings>) {
  const current = await getSettings();
  await browser.storage.local.set(normalizeSettings({ ...current, ...patch }));
}

export async function resetSettings() {
  await browser.storage.local.set(DEFAULT_SETTINGS);
}

export async function recordFill(record: FillRecord) {
  const settings = await getSettings();
  await browser.storage.local.set({
    fillCount: settings.fillCount + 1,
    lastFill: record,
  });
}

export function normalizeHostname(hostname: string) {
  return hostname.trim().toLowerCase().replace(/\.$/, '');
}

export function normalizeHostList(value: string[]) {
  return Array.from(
    new Set(
      value
        .map((item) => normalizeHostname(item))
        .filter((item) => item.length > 0),
    ),
  ).sort();
}

export function isHostAllowed(hostname: string, settings: ExtensionSettings) {
  const host = normalizeHostname(hostname);

  if (!settings.enabled || isSensitiveHost(host)) return false;
  if (settings.disabledHosts.some((item) => matchesHostPattern(host, item))) {
    return false;
  }
  if (settings.enabledHosts.length === 0) return true;

  return settings.enabledHosts.some((item) => matchesHostPattern(host, item));
}

export function isSensitiveHost(hostname: string) {
  const host = normalizeHostname(hostname);

  return SENSITIVE_HOSTS.some((item) => matchesHostPattern(host, item));
}

export function matchesHostPattern(hostname: string, pattern: string) {
  const host = normalizeHostname(hostname);
  const normalizedPattern = normalizeHostname(pattern);

  if (normalizedPattern.startsWith('*.')) {
    const suffix = normalizedPattern.slice(2);
    return host === suffix || host.endsWith(`.${suffix}`);
  }

  return host === normalizedPattern || host.endsWith(`.${normalizedPattern}`);
}

function normalizeSettings(settings: ExtensionSettings): ExtensionSettings {
  return {
    enabled: Boolean(settings.enabled),
    mode: settings.mode === 'manual' ? 'manual' : 'auto',
    disabledHosts: normalizeHostList(settings.disabledHosts ?? []),
    enabledHosts: normalizeHostList(settings.enabledHosts ?? []),
    fillDelayMs: clampDelay(settings.fillDelayMs),
    fillCount: Number.isFinite(settings.fillCount) ? settings.fillCount : 0,
    lastFill: settings.lastFill ?? null,
  };
}

function clampDelay(value: number) {
  if (!Number.isFinite(value)) return DEFAULT_SETTINGS.fillDelayMs;
  return Math.min(Math.max(Math.round(value), 0), 3000);
}
