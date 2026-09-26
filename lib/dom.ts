export function queryAllDeep<T extends Element>(
  root: Document | DocumentFragment | Element,
  selector: string,
) {
  const results: T[] = [];
  const seen = new Set<Element>();

  function add(element: Element) {
    if (!seen.has(element)) {
      seen.add(element);
      results.push(element as T);
    }
  }

  function visit(node: Document | DocumentFragment | Element) {
    if (node instanceof Element && node.matches(selector)) add(node);

    try {
      node.querySelectorAll(selector).forEach(add);
      node.querySelectorAll('*').forEach((element) => {
        if (element.shadowRoot) visit(element.shadowRoot);
      });
    } catch {
      return;
    }
  }

  visit(root);
  return results;
}

export function isVisible(element: Element) {
  if (element.getAttribute('aria-hidden') === 'true') return false;

  const htmlElement = element as HTMLElement;
  const style = window.getComputedStyle(htmlElement);
  if (style.display === 'none' || style.visibility === 'hidden') return false;

  return element.getClientRects().length > 0;
}

export function normalizeText(value: string) {
  return value.replace(/\s+/g, ' ').trim();
}

export function isTextInput(
  element: Element,
): element is HTMLInputElement | HTMLTextAreaElement {
  if (element instanceof HTMLTextAreaElement) return canFill(element);
  if (!(element instanceof HTMLInputElement)) return false;

  const type = element.type.toLowerCase();
  return (
    canFill(element) &&
    (type === '' ||
      type === 'text' ||
      type === 'search' ||
      type === 'url' ||
      type === 'email')
  );
}

function canFill(element: HTMLInputElement | HTMLTextAreaElement) {
  return !element.disabled && !element.readOnly && isVisible(element);
}
