import { useEffect } from 'react';

/** Re-selecting a sidebar destination should return to its list, not a nested view. */
export function useNavigationReset(reset: () => void) {
  useEffect(() => {
    window.addEventListener('platform-reset-view', reset);
    return () => window.removeEventListener('platform-reset-view', reset);
  }, [reset]);
}
