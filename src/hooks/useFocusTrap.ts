import { useEffect, useRef, type RefObject } from 'react';

const FOCUSABLE_SELECTOR = [
  'a[href]',
  'button:not([disabled])',
  'input:not([disabled]):not([type="hidden"])',
  'select:not([disabled])',
  'textarea:not([disabled])',
  '[tabindex]:not([tabindex="-1"])',
].join(', ');

function getFocusableElements(container: HTMLElement): HTMLElement[] {
  const nodes = Array.from(container.querySelectorAll<HTMLElement>(FOCUSABLE_SELECTOR));
  return nodes.filter((el) => {
    if (el.getAttribute('aria-hidden') === 'true') {
      return false;
    }
    if (el.hasAttribute('disabled')) {
      return false;
    }
    return true;
  });
}

interface UseFocusTrapOptions {
  isActive: boolean;
  containerRef: RefObject<HTMLElement | null>;
  onClose?: () => void;
  initialFocusRef?: RefObject<HTMLElement | null>;
  restoreFocus?: boolean;
}

/**
 * Traps Tab/Shift+Tab cycling within `containerRef` while `isActive` is true,
 * handles Escape closure, and restores focus to the triggering element on close.
 */
export function useFocusTrap({
  isActive,
  containerRef,
  onClose,
  initialFocusRef,
  restoreFocus = true,
}: UseFocusTrapOptions): void {
  const previousFocusedRef = useRef<HTMLElement | null>(null);
  const onCloseRef = useRef(onClose);
  onCloseRef.current = onClose;

  useEffect(() => {
    if (!isActive) {
      return;
    }

    previousFocusedRef.current =
      document.activeElement instanceof HTMLElement ? document.activeElement : null;

    const focusTimer = window.setTimeout(() => {
      const container = containerRef.current;
      if (!container) {
        return;
      }
      const preferred = initialFocusRef?.current;
      if (preferred && container.contains(preferred)) {
        preferred.focus({ preventScroll: true });
        return;
      }
      const focusables = getFocusableElements(container);
      if (focusables.length > 0) {
        focusables[0].focus({ preventScroll: true });
      } else {
        container.focus({ preventScroll: true });
      }
    }, 0);

    const handleKeyDown = (event: KeyboardEvent) => {
      const container = containerRef.current;
      if (!container) {
        return;
      }

      if (event.key === 'Escape') {
        if (onCloseRef.current) {
          event.preventDefault();
          event.stopPropagation();
          onCloseRef.current();
        }
        return;
      }

      if (event.key !== 'Tab') {
        return;
      }

      const focusables = getFocusableElements(container);
      if (focusables.length === 0) {
        event.preventDefault();
        container.focus({ preventScroll: true });
        return;
      }

      const first = focusables[0];
      const last = focusables[focusables.length - 1];
      const active = document.activeElement as HTMLElement | null;

      if (event.shiftKey) {
        if (!active || active === first || !container.contains(active)) {
          event.preventDefault();
          last.focus({ preventScroll: true });
        }
      } else if (!active || active === last || !container.contains(active)) {
        event.preventDefault();
        first.focus({ preventScroll: true });
      }
    };

    window.addEventListener('keydown', handleKeyDown, true);

    return () => {
      window.clearTimeout(focusTimer);
      window.removeEventListener('keydown', handleKeyDown, true);

      if (restoreFocus && previousFocusedRef.current) {
        const toRestore = previousFocusedRef.current;
        previousFocusedRef.current = null;
        if (toRestore.isConnected) {
          toRestore.focus({ preventScroll: true });
        }
      } else {
        previousFocusedRef.current = null;
      }
    };
  }, [isActive, containerRef, initialFocusRef, restoreFocus]);
}
