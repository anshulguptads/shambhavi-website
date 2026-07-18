/**
 * Micro-interactions: magnetic buttons ([data-magnetic]) and cursor-tracking
 * tilt + glow cards ([data-tilt]). Full tier + fine pointer only — touch
 * devices and reduced-motion users get the normal hover states.
 */
import { loadGsap } from './gsap';
import { motionTier } from './tier';
import { onPageReady } from './lifecycle';

export function initInteractions(): void {
  onPageReady(() => {
    if (motionTier() !== 'full' || !window.matchMedia('(pointer: fine)').matches) return;

    const magnetics = Array.from(document.querySelectorAll<HTMLElement>('[data-magnetic]'));
    const tilts = Array.from(document.querySelectorAll<HTMLElement>('[data-tilt]'));
    if (magnetics.length === 0 && tilts.length === 0) return;

    let disposed = false;
    const cleanups: Array<() => void> = [];

    loadGsap().then(({ gsap }) => {
      if (disposed) return;

      // ---- Magnetic: the element leans toward the cursor, springs back ----
      for (const el of magnetics) {
        const move = (e: PointerEvent) => {
          const r = el.getBoundingClientRect();
          const dx = e.clientX - (r.left + r.width / 2);
          const dy = e.clientY - (r.top + r.height / 2);
          gsap.to(el, {
            x: gsap.utils.clamp(-6, 6, dx * 0.22),
            y: gsap.utils.clamp(-5, 5, dy * 0.22),
            duration: 0.35,
            ease: 'power2.out',
          });
        };
        const leave = () => {
          gsap.to(el, { x: 0, y: 0, duration: 0.85, ease: 'elastic.out(1, 0.4)' });
        };
        el.addEventListener('pointermove', move);
        el.addEventListener('pointerleave', leave);
        cleanups.push(() => {
          el.removeEventListener('pointermove', move);
          el.removeEventListener('pointerleave', leave);
          gsap.set(el, { clearProps: 'x,y' });
        });
      }

      // ---- Tilt + glow: gentle 3D lean, accent glow follows the cursor ----
      for (const el of tilts) {
        el.classList.add('tilt-glow');
        const move = (e: PointerEvent) => {
          const r = el.getBoundingClientRect();
          const px = (e.clientX - r.left) / r.width - 0.5;
          const py = (e.clientY - r.top) / r.height - 0.5;
          el.style.setProperty('--gx', `${e.clientX - r.left}px`);
          el.style.setProperty('--gy', `${e.clientY - r.top}px`);
          gsap.to(el, {
            rotateY: px * 3.5,
            rotateX: -py * 3.5,
            transformPerspective: 700,
            duration: 0.4,
            ease: 'power2.out',
          });
        };
        const leave = () => {
          gsap.to(el, { rotateY: 0, rotateX: 0, duration: 0.7, ease: 'power3.out' });
        };
        el.addEventListener('pointermove', move);
        el.addEventListener('pointerleave', leave);
        cleanups.push(() => {
          el.removeEventListener('pointermove', move);
          el.removeEventListener('pointerleave', leave);
          el.classList.remove('tilt-glow');
          gsap.set(el, { clearProps: 'transform' });
        });
      }
    });

    return () => {
      disposed = true;
      cleanups.forEach((fn) => fn());
    };
  });
}
