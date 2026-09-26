import { normalizeText } from './dom';

export function fillInput(
  input: HTMLInputElement | HTMLTextAreaElement,
  value: string,
) {
  const currentValue = normalizeText(input.value);
  const nextValue = value.trim();

  if (!nextValue) return false;
  if (currentValue && currentValue !== nextValue) return false;

  input.focus();
  if (insertViaEditing(input, nextValue)) return true;

  input.dispatchEvent(
    new InputEvent('beforeinput', {
      bubbles: true,
      cancelable: true,
      composed: true,
      data: nextValue,
      inputType: 'insertText',
    }),
  );
  setNativeValue(input, nextValue);
  input.dispatchEvent(
    new InputEvent('input', {
      bubbles: true,
      composed: true,
      data: nextValue,
      inputType: 'insertText',
    }),
  );
  input.dispatchEvent(new Event('change', { bubbles: true }));
  input.dispatchEvent(
    new KeyboardEvent('keyup', {
      bubbles: true,
      key: nextValue.slice(-1),
    }),
  );

  return true;
}

// Real editing commands fire trusted beforeinput/input events, which
// framework-controlled inputs (React, Base UI) always pick up.
function insertViaEditing(
  input: HTMLInputElement | HTMLTextAreaElement,
  value: string,
) {
  try {
    input.select();
    if (!document.execCommand('insertText', false, value)) return false;
    return input.value === value;
  } catch {
    return false;
  }
}

function setNativeValue(
  input: HTMLInputElement | HTMLTextAreaElement,
  value: string,
) {
  const prototype =
    input instanceof HTMLTextAreaElement
      ? window.HTMLTextAreaElement.prototype
      : window.HTMLInputElement.prototype;
  const setter = Object.getOwnPropertyDescriptor(prototype, 'value')?.set;

  if (setter) {
    setter.call(input, value);
  } else {
    input.value = value;
  }
}
