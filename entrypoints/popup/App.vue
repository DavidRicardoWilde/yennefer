<script lang="ts" setup>
import { computed, onMounted, ref } from 'vue';
import { MANUAL_FILL_MESSAGE, type ManualFillResponse } from '@/lib/messages';
import {
  getSettings,
  isHostAllowed,
  normalizeHostname,
  saveSettings,
  type ExtensionSettings,
} from '@/lib/settings';

const settings = ref<ExtensionSettings | null>(null);
const hostname = ref('');
const status = ref('');
const isBusy = ref(false);

const currentSiteEnabled = computed(() => {
  if (!settings.value || !hostname.value) return false;
  return isHostAllowed(hostname.value, settings.value);
});

onMounted(async () => {
  settings.value = await getSettings();
  hostname.value = await getActiveHostname();
});

async function updateSettings(patch: Partial<ExtensionSettings>) {
  if (!settings.value) return;
  settings.value = { ...settings.value, ...patch };
  await saveSettings(patch);
}

async function toggleCurrentSite() {
  if (!settings.value || !hostname.value) return;

  const host = normalizeHostname(hostname.value);
  const disabledHosts = new Set(settings.value.disabledHosts);

  if (currentSiteEnabled.value) {
    disabledHosts.add(host);
  } else {
    disabledHosts.delete(host);
  }

  await updateSettings({ disabledHosts: Array.from(disabledHosts).sort() });
}

async function runManualFill() {
  isBusy.value = true;
  status.value = '';

  try {
    const [tab] = await browser.tabs.query({ active: true, currentWindow: true });
    if (!tab?.id) {
      status.value = 'No active tab found.';
      return;
    }

    const response = (await browser.tabs.sendMessage(tab.id, {
      type: MANUAL_FILL_MESSAGE,
    })) as ManualFillResponse;

    status.value = response.ok
      ? `Filled ${response.filledTextLength ?? 0} characters on ${response.siteName}.`
      : 'No matching confirmation input found.';
    settings.value = await getSettings();
  } catch {
    status.value = 'This page is not in the built-in supported site list.';
  } finally {
    isBusy.value = false;
  }
}

async function getActiveHostname() {
  const [tab] = await browser.tabs.query({ active: true, currentWindow: true });
  if (!tab?.url) return '';

  try {
    return new URL(tab.url).hostname;
  } catch {
    return '';
  }
}
</script>

<template>
  <main class="popup">
    <header>
      <p class="eyebrow">Delete Confirm</p>
      <h1>Auto-Filler</h1>
      <p class="description">Fills required confirmation text. Never clicks delete.</p>
    </header>

    <section v-if="settings" class="panel">
      <label class="row">
        <span>
          <strong>Enabled</strong>
          <small>Global extension switch</small>
        </span>
        <input
          type="checkbox"
          :checked="settings.enabled"
          @change="updateSettings({ enabled: ($event.target as HTMLInputElement).checked })"
        />
      </label>

      <label class="row" :class="{ muted: !hostname }">
        <span>
          <strong>Current site</strong>
          <small>{{ hostname || 'Unsupported browser page' }}</small>
        </span>
        <input
          type="checkbox"
          :checked="currentSiteEnabled"
          :disabled="!hostname"
          @change="toggleCurrentSite"
        />
      </label>

      <label class="field">
        <span>Fill mode</span>
        <select
          :value="settings.mode"
          @change="updateSettings({ mode: ($event.target as HTMLSelectElement).value as ExtensionSettings['mode'] })"
        >
          <option value="auto">Automatic on supported sites</option>
          <option value="manual">Manual only (Alt+D)</option>
        </select>
      </label>

      <button class="primary" :disabled="isBusy" @click="runManualFill">
        {{ isBusy ? 'Filling…' : 'Fill visible dialog now' }}
      </button>

      <p v-if="status" class="status">{{ status }}</p>
      <p class="stats">Local fills: {{ settings.fillCount }}</p>
    </section>

    <button class="link-button" @click="browser.runtime.openOptionsPage()">
      Open options
    </button>
  </main>
</template>

<style scoped>
.popup {
  width: 340px;
  color: #0f172a;
}

header {
  margin-bottom: 16px;
}

h1,
p {
  margin: 0;
}

h1 {
  font-size: 24px;
}

.eyebrow {
  color: #dc2626;
  font-size: 12px;
  font-weight: 700;
  letter-spacing: 0.08em;
  text-transform: uppercase;
}

.description,
small,
.stats {
  color: #64748b;
}

.panel {
  display: grid;
  gap: 12px;
}

.row {
  align-items: center;
  background: #f8fafc;
  border: 1px solid #e2e8f0;
  border-radius: 12px;
  display: flex;
  justify-content: space-between;
  padding: 12px;
}

.row span {
  display: grid;
}

.muted {
  opacity: 0.55;
}

.field {
  display: grid;
  gap: 6px;
  font-size: 13px;
  font-weight: 600;
}

select,
button {
  border-radius: 10px;
  font: inherit;
}

select {
  border: 1px solid #cbd5e1;
  padding: 8px 10px;
}

.primary {
  background: #dc2626;
  border: 0;
  color: white;
  cursor: pointer;
  font-weight: 700;
  padding: 10px 12px;
}

.primary:disabled {
  cursor: not-allowed;
  opacity: 0.7;
}

.status {
  background: #fef2f2;
  border-radius: 10px;
  color: #991b1b;
  font-size: 13px;
  padding: 8px 10px;
}

.link-button {
  background: transparent;
  border: 0;
  color: #2563eb;
  cursor: pointer;
  margin-top: 14px;
  padding: 0;
}

input[type='checkbox'] {
  height: 18px;
  width: 18px;
}
</style>
