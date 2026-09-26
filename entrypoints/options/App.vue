<script lang="ts" setup>
import { computed, onMounted, ref } from 'vue';
import {
  DEFAULT_SETTINGS,
  getSettings,
  normalizeHostList,
  resetSettings,
  saveSettings,
  type ExtensionSettings,
} from '@/lib/settings';

const settings = ref<ExtensionSettings | null>(null);
const disabledHostsText = ref('');
const enabledHostsText = ref('');
const status = ref('');

const lastFill = computed(() => {
  if (!settings.value?.lastFill) return 'No fills yet';
  const record = settings.value.lastFill;
  return `${record.siteName} on ${record.host} (${record.textLength} characters)`;
});

onMounted(load);

async function load() {
  settings.value = await getSettings();
  disabledHostsText.value = settings.value.disabledHosts.join('\n');
  enabledHostsText.value = settings.value.enabledHosts.join('\n');
}

async function save() {
  await saveSettings({
    disabledHosts: parseHosts(disabledHostsText.value),
    enabledHosts: parseHosts(enabledHostsText.value),
    fillDelayMs: settings.value?.fillDelayMs ?? DEFAULT_SETTINGS.fillDelayMs,
    mode: settings.value?.mode ?? DEFAULT_SETTINGS.mode,
    enabled: settings.value?.enabled ?? DEFAULT_SETTINGS.enabled,
  });
  await load();
  status.value = 'Options saved.';
}

async function resetAll() {
  await resetSettings();
  await load();
  status.value = 'Defaults restored.';
}

async function resetStats() {
  await saveSettings({ fillCount: 0, lastFill: null });
  await load();
  status.value = 'Stats reset.';
}

function parseHosts(value: string) {
  return normalizeHostList(
    value
      .split('\n')
      .map((line) => line.trim())
      .filter(Boolean),
  );
}
</script>

<template>
  <main class="options">
    <header>
      <p class="eyebrow">Delete Confirm Auto-Filler</p>
      <h1>Options</h1>
      <p>All configuration is stored locally in your browser.</p>
    </header>

    <section v-if="settings" class="card">
      <h2>Behavior</h2>
      <p>
        Verified sites: GitHub, Vercel, Cloudflare, Netlify. Other built-in sites are
        experimental and stay disabled by default.
      </p>
      <label class="check">
        <input v-model="settings.enabled" type="checkbox" />
        Enable extension
      </label>

      <label class="field">
        <span>Default fill mode</span>
        <select v-model="settings.mode">
          <option value="auto">Automatic on supported sites</option>
          <option value="manual">Manual only (Alt+D)</option>
        </select>
      </label>

      <label class="field">
        <span>Fill delay (ms)</span>
        <input v-model.number="settings.fillDelayMs" min="0" max="3000" type="number" />
      </label>
    </section>

    <section class="grid">
      <label class="field card">
        <span>Disabled hosts</span>
        <textarea
          v-model="disabledHostsText"
          placeholder="example.com&#10;*.example.org"
          rows="8"
        />
        <small>One hostname per line. Subdomains are included automatically.</small>
      </label>

      <label class="field card">
        <span>Enabled hosts allowlist</span>
        <textarea
          v-model="enabledHostsText"
          placeholder="Leave empty to allow all built-in supported hosts"
          rows="8"
        />
        <small>If set, only these hosts run the extension.</small>
      </label>
    </section>

    <section v-if="settings" class="card">
      <h2>Local stats</h2>
      <p>Total fills: {{ settings.fillCount }}</p>
      <p>Last fill: {{ lastFill }}</p>
      <button class="secondary" @click="resetStats">Reset stats</button>
    </section>

    <footer>
      <button class="primary" @click="save">Save options</button>
      <button class="secondary" @click="resetAll">Reset defaults</button>
      <span v-if="status" class="status">{{ status }}</span>
    </footer>
  </main>
</template>
