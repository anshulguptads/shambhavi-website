/**
 * Post-build shim for the legacy deploy pipeline.
 *
 * The production deploy command (from the static-site era) uploads ./dist as
 * static assets and refuses a dist that contains a _worker.js directory.
 * Until the deploy command is switched to the full worker config
 * (docs/DYNAMIC-SETUP.md step 0), the default build ships static-only.
 *
 *   npm run build         → strips dist/_worker.js + _routes.json (static-only)
 *   npm run build:worker  → keeps them (full worker + assets output)
 */
import { rm, stat } from 'node:fs/promises';

const keepWorker = process.argv.includes('--keep-worker');

async function exists(p) {
  try {
    await stat(p);
    return true;
  } catch {
    return false;
  }
}

if (keepWorker) {
  console.log('[postbuild] keeping dist/_worker.js (full worker build)');
} else {
  for (const p of ['dist/_worker.js', 'dist/_routes.json']) {
    if (await exists(p)) {
      await rm(p, { recursive: true, force: true });
      console.log(`[postbuild] removed ${p} (static-only deploy; use build:worker to keep)`);
    }
  }
}
