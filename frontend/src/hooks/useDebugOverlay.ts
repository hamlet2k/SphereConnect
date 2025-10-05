import { useCallback, useEffect, useState } from 'react';

const isOverlayEnabled = () => {
  const flag = (process.env.REACT_APP_DEBUG_OVERLAY || '').toLowerCase();
  return flag === 'true' || flag === '1';
};

export const DEBUG_OVERLAY_ENABLED = isOverlayEnabled();

interface UseDebugOverlayOptions {
  initialVisible?: boolean;
}

export const useDebugOverlay = (options: UseDebugOverlayOptions = {}) => {
  const { initialVisible = DEBUG_OVERLAY_ENABLED } = options;
  const [isVisible, setIsVisible] = useState<boolean>(initialVisible);

  const toggleVisibility = useCallback(() => {
    setIsVisible((prev) => !prev);
  }, []);

  useEffect(() => {
    if (!DEBUG_OVERLAY_ENABLED) {
      return;
    }

    const handleKeyDown = (event: KeyboardEvent) => {
      if ((event.ctrlKey || event.metaKey) && event.key.toLowerCase() === 'd') {
        event.preventDefault();
        toggleVisibility();
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => {
      window.removeEventListener('keydown', handleKeyDown);
    };
  }, [toggleVisibility]);

  return {
    isVisible,
    setIsVisible,
    toggleVisibility
  };
};

export type UseDebugOverlayReturn = ReturnType<typeof useDebugOverlay>;
