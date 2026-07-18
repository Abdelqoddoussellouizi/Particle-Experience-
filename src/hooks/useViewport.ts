import { useEffect, useState } from 'react';
import { clamp } from '../utils/math';

export interface ViewportState {
  width: number;
  height: number;
  dpr: number;
  aspect: number;
  isMobile: boolean;
  isTablet: boolean;
  isTouch: boolean;
}

function readViewport(): ViewportState {
  const width = window.innerWidth;
  const height = window.innerHeight;

  return {
    width,
    height,
    dpr: clamp(window.devicePixelRatio || 1, 1, 2),
    aspect: width / height,
    isMobile: width < 640,
    isTablet: width >= 640 && width < 1024,
    isTouch: typeof window.matchMedia === 'function' && window.matchMedia('(pointer: coarse)').matches,
  };
}

/**
 * Tracks viewport size, capped device pixel ratio (for consistent performance on
 * retina/4K screens), and coarse device-class flags. Resize handling is throttled
 * to one update per animation frame so it never floods React with renders.
 */
export function useViewport(): ViewportState {
  const [viewport, setViewport] = useState<ViewportState>(() =>
    typeof window !== 'undefined'
      ? readViewport()
      : { width: 1920, height: 1080, dpr: 1, aspect: 16 / 9, isMobile: false, isTablet: false, isTouch: false },
  );

  useEffect(() => {
    let frame = 0;

    const handleResize = () => {
      cancelAnimationFrame(frame);
      frame = requestAnimationFrame(() => setViewport(readViewport()));
    };

    window.addEventListener('resize', handleResize);
    window.addEventListener('orientationchange', handleResize);

    return () => {
      cancelAnimationFrame(frame);
      window.removeEventListener('resize', handleResize);
      window.removeEventListener('orientationchange', handleResize);
    };
  }, []);

  return viewport;
}
