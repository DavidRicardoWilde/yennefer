# Delete Confirm Auto-Filler

WXT + Vue 3 browser extension that detects delete confirmation dialogs and fills the required confirmation text for you. It never clicks destructive buttons; the final delete/remove action always stays under user control.

## MVP features

- Verified support for GitHub, Vercel, Cloudflare, and Netlify. Other built-in host patterns (GitLab, AWS Console, DigitalOcean, Heroku, Firebase, Supabase, MongoDB Atlas, Docker Hub, and npm) are experimental and disabled by default.
- Generic dialog detection on supported host patterns using dialog/modal selectors, delete-intent keywords, marked confirmation text, placeholder hints, and common prompt formats.
- React/Vue-compatible input filling with native value setters and input/change/keyup events. It does not dispatch Enter or click confirmation buttons.
- Popup controls for global enablement, current-site disablement, automatic/manual mode, manual fill, and local fill count.
- Options page for disabled hosts, optional allowlist, fill delay, local stats reset, and restoring defaults.
- Local-only storage; no telemetry, data collection, or network requests.

## Development

```sh
pnpm install
pnpm dev
pnpm build
```

`pnpm dev` launches the development build in Chrome Beta on macOS.

The default executable path is `/Applications/Google Chrome Beta.app/Contents/MacOS/Google Chrome Beta`.
Override it with `WXT_CHROME_BETA_PATH=/path/to/Google\ Chrome\ Beta pnpm dev`.
It reuses the Chrome Beta `Default` profile, so close all Chrome Beta windows before starting it. Override the profile with `WXT_CHROME_BETA_PROFILE=/path/to/profile pnpm dev`.

Other browser targets:

```sh
pnpm build:firefox
pnpm build:edge
pnpm build:safari
```

Manual fill shortcut defaults to `Alt+D`.
