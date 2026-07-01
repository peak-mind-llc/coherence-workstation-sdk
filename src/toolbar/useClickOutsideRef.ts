import { useEffect, type RefObject } from 'react';

/**
 * Calls `onOutside` when a mousedown occurs outside the ref's element.
 * Used by FilterPill and any other popover-style toolbar primitive.
 */
export function useClickOutsideRef(
  ref: RefObject<HTMLElement | null>,
  onOutside: () => void,
): void {
  useEffect(() => {
    function handler(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) onOutside();
    }
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, [ref, onOutside]);
}
