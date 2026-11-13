/**
 * Motion rules for Furrow (one place, so every screen moves the same way).
 *
 *  - Entrances: fade + 12px rise, 280ms, ease-out, 50ms stagger. First view only.
 *  - Charts: a left-to-right reveal (time reads left to right), 650ms, when a chart first
 *    appears or its data changes. Runs on the UI thread (transform only).
 *  - State changes (segmented pill, bars, list reflow): 220–450ms ease-in-out.
 *  - Press: scale 0.97 in 120ms.
 *  - Tab switches do not animate. Reduced motion: no movement, values appear at once.
 */

import * as Haptics from 'expo-haptics';
import { useEffect, useMemo, useRef, useState } from 'react';
import { Platform } from 'react-native';
import { Easing, useReducedMotion } from 'react-native-reanimated';

export const EASE_OUT = Easing.bezier(0.23, 1, 0.32, 1);
export const EASE_IN_OUT = Easing.bezier(0.77, 0, 0.175, 1);
/**
 * For Reanimated CSS animations/transitions. On iOS/Android a string must be a named curve
 * ('ease-out' etc.); 'cubic-bezier(...)' strings work on web only and crash native.
 */
export const EASE_OUT_CSS = 'ease-out';

export const DURATION = {
  press: 120,
  state: 220,
  bar: 450,
  enter: 280,
  draw: 650,
  count: 550,
} as const;

const ENTER_KEYFRAMES = {
  from: { opacity: 0, transform: [{ translateY: 12 }] },
  to: { opacity: 1, transform: [{ translateY: 0 }] },
};
const FADE_KEYFRAMES = { from: { opacity: 0 }, to: { opacity: 1 } };

/**
 * Entrance for the i-th block on a screen, as a Reanimated CSS animation
 * (plays once on mount; same behaviour on iOS, Android and web).
 */
export function useEntrance(index = 0, kind: 'rise' | 'fade' = 'rise') {
  const reduced = useReducedMotion();
  return useMemo(
    () =>
      reduced
        ? {}
        : {
            animationName: kind === 'rise' ? ENTER_KEYFRAMES : FADE_KEYFRAMES,
            animationDuration: `${DURATION.enter}ms`,
            animationDelay: `${Math.min(index, 8) * 50}ms`,
            animationTimingFunction: EASE_OUT_CSS,
            animationFillMode: 'backwards' as const,
          },
    [index, kind, reduced],
  );
}

/**
 * Counts a number up to `target` when it first appears or changes.
 * A short JS-side tween (≤ 550ms, only on value change), so text can be formatted;
 * never driven by a gesture or scroll.
 */
export function useCountUp(target: number, duration: number = DURATION.count) {
  const reduced = useReducedMotion();
  const [value, setValue] = useState(0);
  const from = useRef(0);
  const skip = reduced || !Number.isFinite(target);
  useEffect(() => {
    if (skip) {
      from.current = target;
      return;
    }
    const start = from.current;
    const t0 = Date.now();
    let raf = 0;
    const tick = () => {
      const p = Math.min((Date.now() - t0) / duration, 1);
      const e = 1 - Math.pow(1 - p, 3); // ease-out cubic
      setValue(start + (target - start) * e);
      if (p < 1) raf = requestAnimationFrame(tick);
      else from.current = target;
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [target, duration, skip]);
  return skip ? target : value;
}

/** One selection tick per user choice (segmented controls, priority levels). */
export function selectionHaptic() {
  if (Platform.OS === 'web') return;
  Haptics.selectionAsync().catch(() => {});
}
