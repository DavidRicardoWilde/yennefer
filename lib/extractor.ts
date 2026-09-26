import { queryAllDeep, normalizeText } from './dom';
import type { SiteRule } from './site-rules';

const FIXED_CONFIRM_WORDS = ['delete', 'DELETE', 'confirm', 'CONFIRM'];

export function extractConfirmText(
  dialog: Element,
  input: HTMLInputElement | HTMLTextAreaElement,
  rule: SiteRule,
) {
  const fromRule = cleanCandidate(rule.extractConfirmText?.(dialog, input));
  if (fromRule) return fromRule;

  const fromInput = extractFromInput(input);
  if (fromInput) return fromInput;

  const fromDescribedBy = extractFromDescribedBy(input);
  if (fromDescribedBy) return fromDescribedBy;

  const fromInputContext = extractFromInputContext(input);
  if (fromInputContext) return fromInputContext;

  const fromMarkedElement = extractFromMarkedElement(dialog);
  if (fromMarkedElement) return fromMarkedElement;

  const text = normalizeText(dialog.textContent ?? '');
  return extractFromText(text);
}

export function hasDeleteIntent(dialog: Element, rule: SiteRule) {
  const text = normalizeText(dialog.textContent ?? '').toLowerCase();
  return rule.deleteKeywords.some((keyword) =>
    text.includes(keyword.toLowerCase()),
  );
}

function extractFromInput(input: HTMLInputElement | HTMLTextAreaElement) {
  const candidates = [
    input.getAttribute('placeholder'),
    input.getAttribute('aria-label'),
    input.getAttribute('title'),
  ];

  for (const candidate of candidates) {
    const fromText = extractFromText(normalizeText(candidate ?? ''));
    if (fromText) return fromText;

    const cleaned = cleanCandidate(candidate);
    if (cleaned && isLikelyLiteralPlaceholder(cleaned)) return cleaned;
  }

  return null;
}

function extractFromDescribedBy(input: HTMLInputElement | HTMLTextAreaElement) {
  const ids = input.getAttribute('aria-describedby')?.split(/\s+/) ?? [];
  const text = ids
    .map((id) => document.getElementById(id)?.textContent ?? '')
    .join(' ');

  return extractFromText(normalizeText(text));
}

function extractFromMarkedElement(dialog: Element) {
  const markedElements = queryAllDeep<HTMLElement>(
    dialog,
    'code, strong, b, kbd',
  );

  for (const element of markedElements) {
    if (element.closest('button, [role="button"]')) continue;

    const value = cleanCandidate(element.textContent);
    if (!value) continue;

    const context = normalizeText(
      element.closest('p, label, div, li')?.textContent ??
        element.parentElement?.textContent ??
        '',
    ).toLowerCase();

    if (
      /type|enter|input|confirm|delete|输入|键入|確認|削除|löschen/.test(
        context,
      )
    ) {
      return value;
    }
  }

  return null;
}

function extractFromInputContext(input: HTMLInputElement | HTMLTextAreaElement) {
  const contexts = [
    extractFromLabelFor(input),
    textByIds(input.getAttribute('aria-labelledby')),
    nearestFieldText(input),
  ];

  for (const context of contexts) {
    const fromText = extractFromText(normalizeText(context ?? ''));
    if (fromText) return fromText;
  }

  return null;
}

function extractFromLabelFor(input: HTMLInputElement | HTMLTextAreaElement) {
  const fromWrappedLabel = input.closest('label')?.textContent;
  if (fromWrappedLabel) return fromWrappedLabel;
  if (!input.id) return null;
  return document.querySelector(`label[for="${CSS.escape(input.id)}"]`)?.textContent;
}

function textByIds(attribute: string | null) {
  const ids = attribute?.split(/\s+/).filter(Boolean) ?? [];
  if (!ids.length) return null;
  return ids.map((id) => document.getElementById(id)?.textContent ?? '').join(' ');
}

function nearestFieldText(input: HTMLInputElement | HTMLTextAreaElement) {
  let current: Element | null = input.parentElement;

  for (let depth = 0; current && depth < 4; depth += 1) {
    const content = normalizeText(current.textContent ?? '');
    if (
      content &&
      content.length <= 280 &&
      /type|enter|input|confirm|delete|project|resource|输入|键入|確認|削除|löschen/i.test(
        content,
      )
    ) {
      return content;
    }

    current = current.parentElement;
  }

  return null;
}

function extractFromText(text: string) {
  if (!text) return null;

  const patterns = [
    /(?:type|enter|input)\s+(?:the\s+)?(?:word|phrase|text|following|value)?\s*["'`“”‘’]([^"'`“”‘’]+)["'`“”‘’]/i,
    /["'`“”‘’]([^"'`“”‘’]+)["'`“”‘’]\s+(?:to|in order to)\s+confirm/i,
    /(?:type|enter|input)\s+(?:in\s+)?(?:the\s+)?(?:word|phrase|text|value|name|domain|project|resource)?\s*["'`“”‘’]?([a-z0-9][a-z0-9._-]{1,})["'`“”‘’]?\s+(?:to|for|in order to)\s+confirm\b/i,
    /(?:type|enter|input)\s+([A-Z][A-Z0-9_-]{1,}|delete|DELETE|confirm|CONFIRM)\s+(?:to|in|below|into|for)\b/i,
    /输入\s*["'`“”‘’]?([^"'`“”‘’。,.，]+?)["'`“”‘’]?\s*(?:以|来)?确认/i,
    /键入\s*["'`“”‘’]?([^"'`“”‘’。,.，]+?)["'`“”‘’]?\s*(?:以|来)?确认/i,
    /(?:確認|削除).*?(?:入力|タイプ)\s*["'`“”‘’]?([^"'`“”‘’。,.，]+?)["'`“”‘’]?/i,
  ];

  for (const pattern of patterns) {
    const match = text.match(pattern);
    const candidate = cleanCandidate(match?.[1]);
    if (candidate) return candidate;
  }

  for (const word of FIXED_CONFIRM_WORDS) {
    const pattern = new RegExp(`\\b(?:type|enter|input)\\s+${word}\\b`, 'i');
    if (pattern.test(text)) return word;
  }

  return null;
}

function cleanCandidate(value: string | null | undefined) {
  const cleaned = normalizeText(value ?? '')
    .replace(/^[:"'`“”‘’\s]+|[:"'`“”‘’\s.。,，!?]+$/g, '')
    .trim();

  if (!cleaned || cleaned.length > 160) return null;
  if (isGenericInstruction(cleaned)) return null;

  return cleaned;
}

function isGenericInstruction(value: string) {
  return /^(the\s+)?(repository|project|resource|name|word|phrase|text|value)$/i.test(
    value,
  );
}

function isLikelyLiteralPlaceholder(value: string) {
  return (
    FIXED_CONFIRM_WORDS.includes(value) ||
    /[/_.-]/.test(value) ||
    /^[A-Z0-9_-]{2,}$/.test(value)
  );
}
