/**
 * Capability tiering for motion.
 *
 *  'static' — prefers-reduced-motion: every effect swaps to its static equivalent.
 *  'lite'   — Save-Data, low memory, small touch devices, or no WebGL2:
 *             CSS-level motion only (reveals, existing product visuals);
 *             no WebGL, no Lenis, no pinned scroll stories.
 *  'full'   — everything.
 *
 * The audience includes entry-level Android phones and school computers —
 * when in doubt, tier down. The wow must never cost a lead.
 */

export type MotionTier = 'static' | 'lite' | 'full';

let capabilityTier: Exclude<MotionTier, 'static'> | null = null;

function computeCapabilityTier(): Exclude<MotionTier, 'static'> {
  const nav = navigator as Navigator & {
    connection?: { saveData?: boolean };
    deviceMemory?: number;
  };

  if (nav.connection?.saveData === true) return 'lite';
  if (typeof nav.deviceMemory === 'number' && nav.deviceMemory < 4) return 'lite';

  // Small touch devices (entry-level phones) get the lite experience.
  const coarseSmall =
    window.matchMedia('(pointer: coarse)').matches &&
    Math.min(window.screen.width, window.screen.height) < 768;
  if (coarseSmall) return 'lite';

  try {
    const canvas = document.createElement('canvas');
    if (!canvas.getContext('webgl2')) return 'lite';
  } catch {
    return 'lite';
  }

  return 'full';
}

export function motionTier(): MotionTier {
  // Reduced motion is checked live — users can toggle it mid-session.
  if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return 'static';
  if (capabilityTier === null) capabilityTier = computeCapabilityTier();
  return capabilityTier;
}

const ORDER: Record<MotionTier, number> = { static: 0, lite: 1, full: 2 };

/** True when the current tier is at least `tier` (static < lite < full). */
export function tierAtLeast(tier: MotionTier): boolean {
  return ORDER[motionTier()] >= ORDER[tier];
}
