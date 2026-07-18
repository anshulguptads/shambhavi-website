/**
 * Count-up animation for stat values ([data-countup] elements).
 *
 * Parses the element's text and animates every numeric token from 0 to its
 * final value on first reveal, preserving prefixes/suffixes/decimals/comma
 * grouping ("< 2s", "60–70%", "1,958", "₹300"). Reduced-motion and non-JS
 * users simply see the final text (it's server-rendered).
 */
import { loadGsap } from './gsap';
import { motionTier } from './tier';
import { onPageReady } from './lifecycle';

interface Token {
  raw: string;
  value: number;
  decimals: number;
  grouped: boolean;
}

function parseTokens(text: string): { parts: string[]; tokens: Token[] } {
  const parts: string[] = [];
  const tokens: Token[] = [];
  const re = /\d[\d,]*(?:\.\d+)?/g;
  let last = 0;
  for (const m of text.matchAll(re)) {
    parts.push(text.slice(last, m.index));
    const raw = m[0];
    tokens.push({
      raw,
      value: parseFloat(raw.replace(/,/g, '')),
      decimals: raw.includes('.') ? raw.split('.')[1].length : 0,
      grouped: raw.includes(','),
    });
    last = m.index! + raw.length;
  }
  parts.push(text.slice(last));
  return { parts, tokens };
}

function format(t: Token, v: number): string {
  const fixed = v.toFixed(t.decimals);
  if (!t.grouped) return fixed;
  const [int, dec] = fixed.split('.');
  const groupedInt = int.replace(/\B(?=(\d{3})+(?!\d))/g, ',');
  return dec ? `${groupedInt}.${dec}` : groupedInt;
}

export function initCountups(): void {
  onPageReady(() => {
    if (motionTier() === 'static') return;
    const els = Array.from(document.querySelectorAll<HTMLElement>('[data-countup]:not([data-counted])'));
    if (els.length === 0) return;

    let disposed = false;
    const cleanups: Array<() => void> = [];

    loadGsap().then(({ gsap, ScrollTrigger }) => {
      if (disposed) return;
      for (const el of els) {
        const original = el.textContent ?? '';
        const { parts, tokens } = parseTokens(original);
        if (tokens.length === 0) continue;
        el.dataset.counted = 'true';

        const st = ScrollTrigger.create({
          trigger: el,
          start: 'top 88%',
          once: true,
          onEnter: () => {
            const proxy = { p: 0 };
            gsap.to(proxy, {
              p: 1,
              duration: 1.3,
              ease: 'power2.out',
              onUpdate: () => {
                let out = '';
                for (let i = 0; i < parts.length; i++) {
                  out += parts[i];
                  if (tokens[i]) out += format(tokens[i], tokens[i].value * proxy.p);
                }
                el.textContent = out;
              },
              onComplete: () => {
                el.textContent = original;
              },
            });
          },
        });
        cleanups.push(() => {
          st.kill();
          el.textContent = original;
          delete el.dataset.counted;
        });
      }
    });

    return () => {
      disposed = true;
      cleanups.forEach((fn) => fn());
    };
  });
}
