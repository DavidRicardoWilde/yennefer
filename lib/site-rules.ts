export interface SiteRule {
  name: string;
  hosts: string[];
  dialogSelector: string;
  inputSelector: string;
  deleteKeywords: string[];
  extractConfirmText?: (
    dialog: Element,
    input: HTMLInputElement | HTMLTextAreaElement,
  ) => string | null;
}

export const VERIFIED_SUPPORTED_MATCHES = [
  'https://github.com/*',
  'https://gist.github.com/*',
  'https://vercel.com/*',
  'https://dash.cloudflare.com/*',
  'https://app.netlify.com/*',
];

export const EXPERIMENTAL_SUPPORTED_MATCHES = [
  'https://gitlab.com/*',
  'https://*.console.aws.amazon.com/*',
  'https://cloud.digitalocean.com/*',
  'https://dashboard.heroku.com/*',
  'https://console.firebase.google.com/*',
  'https://app.supabase.com/*',
  'https://cloud.mongodb.com/*',
  'https://hub.docker.com/*',
  'https://www.npmjs.com/*',
];

export const SUPPORTED_MATCHES = [
  ...VERIFIED_SUPPORTED_MATCHES,
  ...EXPERIMENTAL_SUPPORTED_MATCHES,
];

const genericDialogSelector = [
  '[role="dialog"]',
  '[aria-modal="true"]',
  'dialog[open]',
  '.modal',
  '.modal-dialog',
  '.Box-overlay',
  '[data-testid*="modal"]',
  '[data-test*="modal"]',
  '.awsui-modal',
  '[role="alertdialog"]',
  '[data-drawer-content]',
  '[data-base-ui-popup]',
  '[data-kumo-component="Dialog"]',
].join(',');

const genericInputSelector = [
  'input[name*="confirm"]',
  'input[name*="verify"]',
  'input[id*="confirm"]',
  'input[id*="verify"]',
  'input[aria-describedby*="confirm"]',
  'input[aria-label*="confirm"]',
  'input[placeholder*="delete"]',
  'input[placeholder*="DELETE"]',
  'input[type="text"]',
  'input[type="url"]',
  'input[type="email"]',
  'input:not([type])',
  'textarea',
].join(',');

export const SITE_RULES: SiteRule[] = [
  {
    name: 'GitHub',
    hosts: ['github.com', 'gist.github.com'],
    dialogSelector: '[role="dialog"], .Box-overlay, details-dialog',
    inputSelector:
      'input[name="verify"], input[name*="confirm"], input[aria-describedby*="confirm"], input[type="text"]',
    deleteKeywords: ['delete', 'remove', 'permanently', 'danger zone'],
    extractConfirmText: (dialog) => {
      const note = dialog.querySelector('.form-control-note, .note, p, label');
      const marked = note?.querySelector('strong, code, b');
      return text(marked ?? null) ?? text(dialog.querySelector('strong, code, b'));
    },
  },
  {
    name: 'GitLab',
    hosts: ['gitlab.com'],
    dialogSelector: '[role="dialog"], .modal, .gl-modal',
    inputSelector:
      'input[data-testid*="confirm"], input[name*="confirm"], input[type="text"]',
    deleteKeywords: ['delete', 'remove', 'permanently', 'archive'],
  },
  {
    name: 'AWS Console',
    hosts: ['*.console.aws.amazon.com'],
    dialogSelector:
      '[role="dialog"], [data-testid*="modal"], .awsui-modal, .awsui-context-content-header',
    inputSelector:
      'input[placeholder*="delete"], input[aria-label*="confirm"], input[type="text"]',
    deleteKeywords: ['delete', 'terminate', 'remove', 'deletion'],
    extractConfirmText: (dialog) => {
      const body = dialog.textContent ?? '';
      if (/\btype\s+delete\b/i.test(body)) return 'delete';
      if (/\btype\s+DELETE\b/.test(body)) return 'DELETE';
      return null;
    },
  },
  {
    name: 'Vercel',
    hosts: ['vercel.com'],
    dialogSelector: genericDialogSelector,
    inputSelector: genericInputSelector,
    deleteKeywords: ['delete', 'remove', 'permanently'],
  },
  {
    name: 'Netlify',
    hosts: ['app.netlify.com'],
    dialogSelector: genericDialogSelector,
    inputSelector: genericInputSelector,
    deleteKeywords: ['delete', 'remove', 'destroy'],
  },
  {
    name: 'Cloudflare',
    hosts: ['dash.cloudflare.com'],
    dialogSelector: genericDialogSelector,
    inputSelector: [
      'input[name="deletionChallenge"]',
      'input[id="deletionChallenge"]',
      'input[data-testid="deletionChallenge"]',
      genericInputSelector,
    ].join(','),
    deleteKeywords: ['delete', 'remove', 'permanently'],
  },
  {
    name: 'Generic',
    hosts: ['*'],
    dialogSelector: genericDialogSelector,
    inputSelector: genericInputSelector,
    deleteKeywords: [
      'delete',
      'remove',
      'destroy',
      'terminate',
      'permanently',
      'deletion',
      '删除',
      '移除',
      '削除',
      'löschen',
      'entfernen',
    ],
  },
];

export function getSiteRule(hostname: string) {
  return (
    SITE_RULES.find((rule) =>
      rule.hosts.some((host) => hostMatches(hostname, host)),
    ) ?? SITE_RULES[SITE_RULES.length - 1]!
  );
}

function hostMatches(hostname: string, pattern: string) {
  const host = hostname.toLowerCase();
  const normalizedPattern = pattern.toLowerCase();

  if (normalizedPattern === '*') return true;
  if (normalizedPattern.startsWith('*.')) {
    const suffix = normalizedPattern.slice(2);
    return host === suffix || host.endsWith(`.${suffix}`);
  }

  return host === normalizedPattern;
}

function text(element: Element | null) {
  const value = element?.textContent?.trim();
  return value && value.length <= 160 ? value : null;
}
