const TOAST_ID = 'delete-confirm-auto-filler-toast';

export function showSuccess(
  input: HTMLInputElement | HTMLTextAreaElement,
  message = 'Filled delete confirmation',
) {
  const previousOutline = input.style.outline;
  const previousBoxShadow = input.style.boxShadow;

  input.style.outline = '2px solid #22c55e';
  input.style.boxShadow = '0 0 0 4px rgba(34, 197, 94, 0.18)';
  window.setTimeout(() => {
    input.style.outline = previousOutline;
    input.style.boxShadow = previousBoxShadow;
  }, 1200);

  showToast(`✓ ${message}`);
}

export function showFailure(message: string) {
  showToast(`Delete Confirm Auto-Filler: ${message}`);
}

function showToast(message: string) {
  const existing = document.getElementById(TOAST_ID);
  existing?.remove();

  const toast = document.createElement('div');
  toast.id = TOAST_ID;
  toast.textContent = message;
  Object.assign(toast.style, {
    position: 'fixed',
    zIndex: '2147483647',
    right: '16px',
    bottom: '16px',
    maxWidth: '320px',
    padding: '10px 12px',
    borderRadius: '10px',
    background: 'rgba(15, 23, 42, 0.94)',
    color: '#fff',
    font: '13px/1.4 system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif',
    boxShadow: '0 12px 30px rgba(15, 23, 42, 0.25)',
    pointerEvents: 'none',
  });

  document.documentElement.append(toast);
  window.setTimeout(() => toast.remove(), 1800);
}
