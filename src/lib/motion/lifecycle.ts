/**
 * ClientRouter-safe script lifecycle.
 *
 * With Astro's <ClientRouter />, component <script> modules execute ONCE per
 * session — not once per page. Register per-page setup through onPageReady so
 * it re-runs after every client-side navigation and cleans up before the DOM
 * is swapped out.
 *
 * Handlers must query the DOM fresh each run and no-op when their target
 * elements aren't on the current page.
 */

type Cleanup = void | (() => void);
type ReadyFn = () => Cleanup;

const registry: ReadyFn[] = [];
const cleanups: Array<() => void> = [];

/** True between a page becoming ready and the next before-swap. */
let pageActive = false;

function runOne(fn: ReadyFn) {
  try {
    const cleanup = fn();
    if (typeof cleanup === 'function') cleanups.push(cleanup);
  } catch (err) {
    console.error('[motion:lifecycle]', err);
  }
}

function fire() {
  if (pageActive) return;
  pageActive = true;
  registry.forEach(runOne);
}

function flush() {
  pageActive = false;
  while (cleanups.length) {
    const cleanup = cleanups.pop()!;
    try {
      cleanup();
    } catch (err) {
      console.error('[motion:lifecycle:cleanup]', err);
    }
  }
}

// astro:page-load fires on initial load AND after each client-side nav.
// DOMContentLoaded is the fallback for pages without the ClientRouter
// (it fires after all deferred module scripts, so registration is complete).
document.addEventListener('astro:page-load', fire);
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', fire);
} // else: astro:page-load handles it (module scripts eval before it fires)
document.addEventListener('astro:before-swap', flush);
document.addEventListener('pagehide', flush);

/**
 * Run `fn` when the current page is ready, and again after every client-side
 * navigation. Return a cleanup from `fn` to undo listeners/observers/tweens;
 * it runs right before the next page swap.
 *
 * Late registration (e.g. from a dynamic import after load) runs immediately
 * for the current page.
 */
export function onPageReady(fn: ReadyFn): void {
  registry.push(fn);
  if (pageActive) runOne(fn);
}
