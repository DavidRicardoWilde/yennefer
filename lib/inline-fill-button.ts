import { isVisible } from './dom';

const BUTTON_SIZE = 28;
const BUTTON_MARGIN = 8;

export class InlineFillButton {
  private button: HTMLButtonElement | null = null;
  private input: HTMLInputElement | HTMLTextAreaElement | null = null;
  private positionListenersAttached = false;

  constructor(private readonly onClick: () => void) {}

  show(input: HTMLInputElement | HTMLTextAreaElement, value: string) {
    this.input = input;

    const button = this.ensureButton();
    button.title = `Fill "${value}"`;
    button.setAttribute('aria-label', `Fill delete confirmation with ${value}`);
    this.attachPositionListeners();
    this.updatePosition();
  }

  hide() {
    this.button?.remove();
    this.button = null;
    this.input = null;
    this.detachPositionListeners();
  }

  private ensureButton() {
    if (this.button?.isConnected) return this.button;

    const button = document.createElement('button');
    button.type = 'button';
    button.textContent = 'D';
    Object.assign(button.style, {
      position: 'fixed',
      zIndex: '2147483647',
      width: `${BUTTON_SIZE}px`,
      height: `${BUTTON_SIZE}px`,
      padding: '0',
      border: '1px solid rgba(255, 255, 255, 0.35)',
      borderRadius: '999px',
      background: 'rgba(15, 23, 42, 0.94)',
      color: '#fff',
      boxShadow: '0 8px 24px rgba(15, 23, 42, 0.24)',
      cursor: 'pointer',
      font: '600 12px/1 system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif',
      textAlign: 'center',
    });

    button.addEventListener('mousedown', (event) => {
      event.preventDefault();
      event.stopPropagation();
    });
    button.addEventListener('click', (event) => {
      event.preventDefault();
      event.stopPropagation();
      this.onClick();
    });

    document.documentElement.append(button);
    this.button = button;
    return button;
  }

  private readonly updatePosition = () => {
    if (!this.button || !this.input) return;
    if (!this.input.isConnected || !isVisible(this.input)) {
      this.hide();
      return;
    }

    const rect = this.input.getBoundingClientRect();
    const top = clamp(
      rect.top + rect.height / 2 - BUTTON_SIZE / 2,
      BUTTON_MARGIN,
      window.innerHeight - BUTTON_SIZE - BUTTON_MARGIN,
    );
    const insideLeft = rect.right - BUTTON_SIZE - BUTTON_MARGIN;
    const outsideLeft = rect.right + BUTTON_MARGIN;
    const left = clamp(
      rect.width >= BUTTON_SIZE + BUTTON_MARGIN * 2 ? insideLeft : outsideLeft,
      BUTTON_MARGIN,
      window.innerWidth - BUTTON_SIZE - BUTTON_MARGIN,
    );

    this.button.style.top = `${top}px`;
    this.button.style.left = `${left}px`;
  };

  private attachPositionListeners() {
    if (this.positionListenersAttached) return;

    window.addEventListener('resize', this.updatePosition);
    window.addEventListener('scroll', this.updatePosition, true);
    this.positionListenersAttached = true;
  }

  private detachPositionListeners() {
    if (!this.positionListenersAttached) return;

    window.removeEventListener('resize', this.updatePosition);
    window.removeEventListener('scroll', this.updatePosition, true);
    this.positionListenersAttached = false;
  }
}

function clamp(value: number, min: number, max: number) {
  return Math.min(Math.max(value, min), max);
}
