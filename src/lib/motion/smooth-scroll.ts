/**
 * Lenis inertia scrolling — desktop, full tier only, and never on journal
 * articles (reading surfaces keep native scroll). Wired into gsap's ticker
 * so ScrollTrigger pins/scrubs stay in perfect sync.
 */
import { loadGsap } from './gsap';
import { motionTier } from './tier';
import { onPageReady } from './lifecycle';

export function initSmoothScroll(): void {
  onPageReady(() => {
    if (motionTier() !== 'full' || !window.matchMedia('(pointer: fine)').matches) return;
    // Journal posts stay calm — native scroll for reading.
    if (document.querySelector('.article-body')) return;

    let disposed = false;
    let lenis: { raf: (t: number) => void; on: Function; destroy: () => void } | null = null;
    let tickerFn: ((time: number) => void) | null = null;
    let gsapRef: typeof import('gsap').gsap | null = null;

    Promise.all([import('lenis'), loadGsap()]).then(([{ default: Lenis }, { gsap, ScrollTrigger }]) => {
      if (disposed) return;
      gsapRef = gsap;
      lenis = new Lenis({ lerp: 0.115, anchors: true });
      document.documentElement.classList.add('lenis-active');
      lenis.on('scroll', ScrollTrigger.update);
      tickerFn = (time: number) => lenis!.raf(time * 1000);
      gsap.ticker.add(tickerFn);
      gsap.ticker.lagSmoothing(0);
    });

    return () => {
      disposed = true;
      if (tickerFn && gsapRef) gsapRef.ticker.remove(tickerFn);
      lenis?.destroy();
      document.documentElement.classList.remove('lenis-active');
    };
  });
}
