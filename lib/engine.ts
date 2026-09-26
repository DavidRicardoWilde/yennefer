import { isTextInput, queryAllDeep } from './dom';
import { extractConfirmText, hasDeleteIntent } from './extractor';
import { fillInput } from './filler';
import { showFailure, showSuccess } from './feedback';
import { InlineFillButton } from './inline-fill-button';
import {
  getSettings,
  isHostAllowed,
  recordFill,
  type ExtensionSettings,
  type FillMode,
} from './settings';
import { getSiteRule, type SiteRule } from './site-rules';
import type { ManualFillResponse } from './messages';

interface FillAttempt {
  dialog: Element;
  input: HTMLInputElement | HTMLTextAreaElement;
  text: string;
  rule: SiteRule;
}

const INLINE_FILL_BUTTON_ENABLED = false;

export class DeleteConfirmEngine {
  private settings: ExtensionSettings | null = null;
  private observer: MutationObserver | null = null;
  private debounceTimer: number | null = null;
  private retryTimer: number | null = null;
  private pageListenersAttached = false;
  private processedInputs = new WeakMap<
    HTMLInputElement | HTMLTextAreaElement,
    string
  >();
  private readonly hostname = window.location.hostname;
  private readonly rule = getSiteRule(window.location.hostname);
  private readonly inlineFillButton = new InlineFillButton(() => {
    void this.fillFromInlineButton();
  });
  private readonly handlePageVisible = () => {
    if (!this.settings || this.settings.mode !== 'auto') return;
    if (!this.canRun()) return;
    if (document.visibilityState !== 'visible') return;
    void this.scanAndFill('auto');
  };

  async start() {
    this.settings = await getSettings();
    browser.storage.onChanged.addListener((changes, areaName) => {
      if (areaName !== 'local') return;
      if (
        Object.keys(changes).some((key) =>
          [
            'enabled',
            'mode',
            'disabledHosts',
            'enabledHosts',
            'fillDelayMs',
          ].includes(key),
        )
      ) {
        void this.reload();
      }
    });

    if (!this.canRun()) return;
    this.attachPageListeners();
    if (this.settings.mode === 'auto') this.attachObserver();
  }

  async fillManually(): Promise<ManualFillResponse> {
    await this.ensureSettings();
    if (!this.canRun()) {
      showFailure('disabled on this site');
      return { ok: false, reason: 'disabled-on-site' };
    }

    const result = await this.scanAndFill('manual');
    if (!result) {
      showFailure('no matching delete confirmation input found');
      return { ok: false, reason: 'no-match' };
    }

    return result;
  }

  private async reload() {
    this.settings = await getSettings();
    this.detachObserver();
    this.detachRetryTimer();
    this.inlineFillButton.hide();
    this.detachPageListeners();
    if (this.canRun() && this.settings.mode === 'auto') {
      this.attachPageListeners();
      this.attachObserver();
      this.scheduleScan();
    }
  }

  private attachObserver() {
    if (this.observer) return;

    this.observer = new MutationObserver(() => this.scheduleScan());
    this.observer.observe(document.documentElement, {
      childList: true,
      subtree: true,
      characterData: true,
      attributes: true,
      attributeFilter: ['aria-hidden', 'open', 'style', 'class'],
    });

    this.scheduleScan();
  }

  private detachObserver() {
    this.observer?.disconnect();
    this.observer = null;
    if (this.debounceTimer) window.clearTimeout(this.debounceTimer);
    this.debounceTimer = null;
  }

  private detachRetryTimer() {
    if (this.retryTimer) window.clearTimeout(this.retryTimer);
    this.retryTimer = null;
  }

  private attachPageListeners() {
    if (this.pageListenersAttached) return;

    document.addEventListener('visibilitychange', this.handlePageVisible);
    window.addEventListener('focus', this.handlePageVisible);
    window.addEventListener('pageshow', this.handlePageVisible);
    this.pageListenersAttached = true;
  }

  private detachPageListeners() {
    if (!this.pageListenersAttached) return;

    document.removeEventListener('visibilitychange', this.handlePageVisible);
    window.removeEventListener('focus', this.handlePageVisible);
    window.removeEventListener('pageshow', this.handlePageVisible);
    this.pageListenersAttached = false;
  }

  private scheduleScan() {
    if (!this.settings || this.settings.mode !== 'auto') return;
    if (this.debounceTimer) return;

    this.debounceTimer = window.setTimeout(() => {
      this.debounceTimer = null;
      void this.scanAndFill('auto');
    }, this.settings.fillDelayMs);
  }

  private scheduleRetryScan(delayMs = 250) {
    if (!this.settings || this.settings.mode !== 'auto') return;
    if (this.retryTimer) window.clearTimeout(this.retryTimer);

    this.retryTimer = window.setTimeout(() => {
      this.retryTimer = null;
      void this.scanAndFill('auto');
    }, delayMs);
  }

  private async scanAndFill(mode: FillMode): Promise<ManualFillResponse | null> {
    const attempt = this.findFillAttempt();
    if (!attempt) {
      this.inlineFillButton.hide();
      if (mode === 'auto' && this.shouldKeepScanning()) {
        this.scheduleRetryScan();
      }
      return null;
    }

    if (INLINE_FILL_BUTTON_ENABLED) {
      this.inlineFillButton.show(attempt.input, attempt.text);
    } else {
      this.inlineFillButton.hide();
    }
    return this.fillAttempt(attempt, mode);
  }

  private async fillFromInlineButton() {
    if (!INLINE_FILL_BUTTON_ENABLED) return;

    await this.ensureSettings();
    if (!this.canRun()) {
      this.inlineFillButton.hide();
      showFailure('disabled on this site');
      return;
    }

    const attempt = this.findFillAttempt();
    if (!attempt) {
      this.inlineFillButton.hide();
      showFailure('no matching delete confirmation input found');
      return;
    }

    this.inlineFillButton.show(attempt.input, attempt.text);
    const result = await this.fillAttempt(attempt, 'manual', true);
    if (!result) showFailure('could not fill confirmation input');
  }

  private async fillAttempt(
    attempt: FillAttempt,
    mode: FillMode,
    force = false,
  ): Promise<ManualFillResponse | null> {
    const previousText = this.processedInputs.get(attempt.input);
    if (
      !force &&
      previousText === attempt.text &&
      attempt.input.value === attempt.text
    ) {
      return {
        ok: true,
        filledTextLength: attempt.text.length,
        siteName: attempt.rule.name,
      };
    }

    if (!fillInput(attempt.input, attempt.text)) {
      if (mode === 'auto' && this.shouldKeepScanning()) {
        this.scheduleRetryScan();
      }
      return null;
    }

    this.processedInputs.set(attempt.input, attempt.text);
    showSuccess(attempt.input);
    await recordFill({
      at: Date.now(),
      host: this.hostname,
      mode,
      siteName: attempt.rule.name,
      textLength: attempt.text.length,
    });

    return {
      ok: true,
      filledTextLength: attempt.text.length,
      siteName: attempt.rule.name,
    };
  }

  private shouldKeepScanning() {
    if (!this.settings || this.settings.mode !== 'auto') return false;
    return this.findVisibleDialog() !== null;
  }

  private findFillAttempt(): FillAttempt | null {
    const dialogs = this.findDialogs();

    for (const dialog of dialogs) {
      if (!hasDeleteIntent(dialog, this.rule)) continue;

      // findInput only returns visible inputs, so a container that reports no
      // layout box itself (e.g. display: contents) still qualifies.
      const input = this.findInput(dialog);
      if (!input) continue;

      const text = extractConfirmText(dialog, input, this.rule);
      if (!text) continue;

      return {
        dialog,
        input,
        text,
        rule: this.rule,
      };
    }

    return null;
  }

  private findVisibleDialog() {
    const dialogs = this.findDialogs();
    for (const dialog of dialogs) {
      if (!hasDeleteIntent(dialog, this.rule)) continue;
      if (!this.findInput(dialog)) continue;
      return dialog;
    }

    return null;
  }

  private findDialogs() {
    const selectors = Array.from(
      new Set([this.rule.dialogSelector, '[role="dialog"]', '[aria-modal="true"]']),
    ).join(',');
    return queryAllDeep<Element>(document, selectors);
  }

  private findInput(dialog: Element) {
    const candidates = queryAllDeep<Element>(dialog, this.rule.inputSelector)
      .filter(isTextInput)
      .sort((a, b) => scoreInput(b) - scoreInput(a));

    return candidates[0] ?? null;
  }

  private canRun() {
    return Boolean(this.settings && isHostAllowed(this.hostname, this.settings));
  }

  private async ensureSettings() {
    if (!this.settings) this.settings = await getSettings();
  }
}

function scoreInput(input: HTMLInputElement | HTMLTextAreaElement) {
  const attrs = [
    input.name,
    input.id,
    input.getAttribute('aria-label'),
    input.getAttribute('placeholder'),
  ]
    .join(' ')
    .toLowerCase();

  let score = input.value ? 0 : 5;
  if (/confirm|verify/.test(attrs)) score += 10;
  if (/delete|remove|destroy/.test(attrs)) score += 4;
  if (input instanceof HTMLTextAreaElement) score -= 1;

  return score;
}
