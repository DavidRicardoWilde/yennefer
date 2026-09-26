import { join } from 'node:path';
import { defineConfig } from 'wxt';
import { SUPPORTED_MATCHES } from './lib/site-rules';

const chromeBetaBinary =
  process.env.WXT_CHROME_BETA_PATH ??
  '/Applications/Google Chrome Beta.app/Contents/MacOS/Google Chrome Beta';
// Dedicated profiles: Chrome blocks remote debugging on the default profile,
// and Firefox hands off to an already-running instance using its own profile.
const chromeBetaProfile =
  process.env.WXT_CHROME_BETA_PROFILE ?? join(process.cwd(), '.wxt/chrome-profile');
const firefoxProfile =
  process.env.WXT_FIREFOX_PROFILE ?? join(process.cwd(), '.wxt/firefox-profile');

// See https://wxt.dev/api/config.html
export default defineConfig({
  // Visible in Finder (the default `.output` is hidden).
  outDir: 'output',
  modules: ['@wxt-dev/module-vue'],
  webExt: {
    binaries: {
      chrome: chromeBetaBinary,
    },
    chromiumProfile: chromeBetaProfile,
    firefoxProfile,
    keepProfileChanges: true,
  },
  manifest: ({ browser }) => ({
    name: 'Delete Confirm Auto-Filler',
    short_name: 'Delete Filler',
    description:
      'Auto-fill delete confirmation text while leaving final confirmation to you.',
    permissions: ['storage', 'activeTab'],
    host_permissions: SUPPORTED_MATCHES,
    browser_specific_settings: browser === 'firefox' ? {
      gecko: {
        data_collection_permissions: {
          required: ['none'],
        },
      },
    } : browser === 'safari' ? {
      safari: {
        strict_min_version: '15.4',
      },
    } : undefined,
    action: {
      default_title: 'Delete Confirm Auto-Filler',
    },
    commands: {
      'manual-fill': {
        suggested_key: {
          default: 'Alt+D',
          mac: 'Alt+D',
        },
        description: 'Fill the visible delete confirmation input',
      },
    },
  }),
});
