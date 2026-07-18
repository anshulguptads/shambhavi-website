/**
 * Lazy, lifecycle-safe GSAP access.
 *
 * gsap + ScrollTrigger load once (dynamic import, cached) the first time a
 * page actually needs them. Each withGsap scope re-runs per page via
 * onPageReady inside a gsap.context(), and the context is reverted (tweens
 * killed, ScrollTriggers removed, inline styles restored) before the next
 * page swap.
 */
import type { gsap as GsapCore } from 'gsap';
import type { ScrollTrigger as ScrollTriggerType } from 'gsap/ScrollTrigger';

import { onPageReady } from './lifecycle';
import { motionTier, type MotionTier } from './tier';

type Gsap = typeof GsapCore;
type ST = typeof ScrollTriggerType;

let modPromise: Promise<{ gsap: Gsap; ScrollTrigger: ST }> | null = null;

export function loadGsap(): Promise<{ gsap: Gsap; ScrollTrigger: ST }> {
  if (!modPromise) {
    modPromise = Promise.all([import('gsap'), import('gsap/ScrollTrigger')]).then(
      ([g, st]) => {
        g.gsap.registerPlugin(st.ScrollTrigger);
        return { gsap: g.gsap, ScrollTrigger: st.ScrollTrigger };
      }
    );
  }
  return modPromise;
}

interface WithGsapOptions {
  /** Minimum tier for the scope to run at all. Default 'full'. */
  minTier?: Exclude<MotionTier, 'static'>;
}

/**
 * Register a per-page GSAP scope. `scope` runs on every page-ready (when the
 * tier allows), inside a gsap.context(); anything it creates — plus an
 * optional returned cleanup — is undone on page swap.
 */
export function withGsap(
  scope: (gsap: Gsap, ScrollTrigger: ST) => void | (() => void),
  { minTier = 'full' }: WithGsapOptions = {}
): void {
  const order = { lite: 1, full: 2 } as const;

  onPageReady(() => {
    const tier = motionTier();
    if (tier === 'static' || order[tier as 'lite' | 'full'] < order[minTier]) return;

    let cancelled = false;
    let ctx: ReturnType<Gsap['context']> | null = null;
    let innerCleanup: (() => void) | undefined;

    loadGsap().then(({ gsap, ScrollTrigger }) => {
      if (cancelled) return;
      ctx = gsap.context(() => {
        const result = scope(gsap, ScrollTrigger);
        if (typeof result === 'function') innerCleanup = result;
      });
    });

    return () => {
      cancelled = true;
      try {
        innerCleanup?.();
      } finally {
        ctx?.revert();
        ctx = null;
      }
    };
  });
}
