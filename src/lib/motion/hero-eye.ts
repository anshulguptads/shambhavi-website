/**
 * The living eye — a WebGL particle rendition of the brand eye.
 *
 * ~3k additive-blended particles sampled from the same geometry as the SVG
 * fallback (outline Béziers, iris annulus, neural lattice), in the hero's
 * saffron/cream palette. Idle: breathing + per-particle drift + occasional
 * blink. Pointer: the iris gazes toward the cursor. Scroll: the eye dissolves
 * downward, fully gone by the next section.
 *
 * This module (and three.js with it) is ONLY loaded via dynamic import on
 * 'full'-tier devices — never on lite/static tiers, never in the main bundle.
 */
import * as THREE from 'three';

// ---- Eye geometry (same coordinate space as the SVG: 160 × 120) ----
const CX = 80;
const CY = 60;

type Vec2 = [number, number];

function cubicPoint(p0: Vec2, c1: Vec2, c2: Vec2, p3: Vec2, t: number): Vec2 {
  const u = 1 - t;
  const x = u * u * u * p0[0] + 3 * u * u * t * c1[0] + 3 * u * t * t * c2[0] + t * t * t * p3[0];
  const y = u * u * u * p0[1] + 3 * u * u * t * c1[1] + 3 * u * t * t * c2[1] + t * t * t * p3[1];
  return [x, y];
}

// Deterministic PRNG (mulberry32) — stable particle field across visits.
function prng(seed: number) {
  let a = seed >>> 0;
  return () => {
    a |= 0;
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

const SAFFRON_BRIGHT = new THREE.Color('#f5b556');
const SAFFRON = new THREE.Color('#d99133');
const SAFFRON_DEEP = new THREE.Color('#b87627');
const CREAM = new THREE.Color('#faf7ef');

interface ParticleSpec {
  positions: Float32Array;
  colors: Float32Array;
  sizes: Float32Array;
  /** per-particle animation seeds: [phase, driftAmp, fallSpeed] */
  seeds: Float32Array;
  count: number;
}

function buildParticles(): { iris: ParticleSpec; shell: ParticleSpec } {
  const rand = prng(20260718);

  // ---- Iris: annulus around the pupil, dense, saffron radial gradient ----
  const irisBody = 1450;
  const irisRim = 220;
  const pupilRim = 110;
  const sparks = 26;
  const irisCount = irisBody + irisRim + pupilRim + sparks;
  const iris = allocate(irisCount);
  let k = 0;
  for (let i = 0; i < irisBody; i++) {
    const rNorm = Math.sqrt(rand()) * 0.68 + 0.32; // 0.32..1 of iris radius
    const r = rNorm * 16;
    const a = rand() * Math.PI * 2;
    const x = CX + Math.cos(a) * r;
    const y = CY + Math.sin(a) * r * 0.98;
    const color =
      rNorm < 0.55
        ? SAFFRON_BRIGHT.clone().lerp(SAFFRON, rNorm / 0.55)
        : SAFFRON.clone().lerp(SAFFRON_DEEP, (rNorm - 0.55) / 0.45);
    write(iris, k++, x, y, rand() * 1.5 - 0.75, color, 2.4 + rand() * 2.2, rand);
  }
  // luminous outer rim of the iris
  for (let i = 0; i < irisRim; i++) {
    const a = (i / irisRim) * Math.PI * 2 + rand() * 0.05;
    const r = 15.4 + rand() * 1.2;
    write(iris, k++, CX + Math.cos(a) * r, CY + Math.sin(a) * r * 0.98, rand() - 0.5, SAFFRON_BRIGHT, 2.6 + rand() * 1.6, rand);
  }
  // pupil rim — crisp inner edge defining the dark pupil void
  for (let i = 0; i < pupilRim; i++) {
    const a = (i / pupilRim) * Math.PI * 2 + rand() * 0.08;
    const r = 6.2 + rand() * 0.8;
    write(iris, k++, CX + Math.cos(a) * r, CY + Math.sin(a) * r, rand() - 0.5, SAFFRON_BRIGHT.clone().lerp(CREAM, 0.25), 2.2 + rand() * 1.2, rand);
  }
  // bright highlight sparks (the SVG's specular dot at 76,56)
  for (let i = 0; i < sparks; i++) {
    const a = rand() * Math.PI * 2;
    const r = rand() * 2.4;
    write(iris, k++, 76 + Math.cos(a) * r, 56 + Math.sin(a) * r, 1.5, CREAM, 3.0 + rand() * 1.6, rand);
  }

  // ---- Shell: outline curves + lattice + ambient scatter, cream ----
  const outlinePer = 340; // per curve
  const latticeCount = 420;
  const scatterCount = 220;
  const shellCount = outlinePer * 2 + latticeCount + scatterCount;
  const shell = allocate(shellCount);
  let w = 0;

  const top: [Vec2, Vec2, Vec2, Vec2] = [[18, 60], [40, 20], [120, 20], [142, 60]];
  const bottom: [Vec2, Vec2, Vec2, Vec2] = [[142, 60], [120, 100], [40, 100], [18, 60]];
  for (const curve of [top, bottom]) {
    for (let i = 0; i < outlinePer; i++) {
      const t = i / (outlinePer - 1);
      const [x, y] = cubicPoint(...curve, t);
      const jitter = 0.6;
      const c = CREAM.clone().multiplyScalar(0.8 + rand() * 0.2);
      write(shell, w++, x + (rand() - 0.5) * jitter, y + (rand() - 0.5) * jitter, (rand() - 0.5) * 2, c, 1.7 + rand() * 1.4, rand);
    }
  }

  // Lattice: diamond (18,60)→(80,22)→(142,60)→(80,98)→close + cardinal cross
  const segments: Array<[Vec2, Vec2, number]> = [
    [[18, 60], [80, 22], 90],
    [[80, 22], [142, 60], 90],
    [[142, 60], [80, 98], 90],
    [[80, 98], [18, 60], 90],
    [[18, 60], [142, 60], 30],
    [[80, 22], [80, 98], 30],
  ];
  for (const [a, b, n] of segments) {
    for (let i = 0; i < n; i++) {
      const t = i / (n - 1);
      const x = a[0] + (b[0] - a[0]) * t;
      const y = a[1] + (b[1] - a[1]) * t;
      const c = CREAM.clone().multiplyScalar(0.42 + rand() * 0.3);
      write(shell, w++, x + (rand() - 0.5) * 0.5, y + (rand() - 0.5) * 0.5, (rand() - 0.5) * 3, c, 1.1 + rand() * 1.0, rand);
    }
  }

  // Ambient scatter inside the eye white
  for (let i = 0; i < scatterCount; i++) {
    const t = rand();
    const [tx, ty] = cubicPoint(...top, t);
    const [bx, by] = cubicPoint(...bottom, 1 - t);
    const m = rand();
    const x = tx + (bx - tx) * m;
    const y = ty + (by - ty) * m;
    // keep out of the iris disc
    if (Math.hypot(x - CX, y - CY) < 19) { i--; continue; }
    const c = CREAM.clone().multiplyScalar(0.2 + rand() * 0.25);
    write(shell, w++, x, y, (rand() - 0.5) * 4, c, 1.0 + rand() * 1.0, rand);
  }

  return { iris, shell };
}

function allocate(count: number): ParticleSpec {
  return {
    positions: new Float32Array(count * 3),
    colors: new Float32Array(count * 3),
    sizes: new Float32Array(count),
    seeds: new Float32Array(count * 3),
    count,
  };
}

function write(
  spec: ParticleSpec,
  i: number,
  x: number,
  y: number,
  z: number,
  color: THREE.Color,
  size: number,
  rand: () => number
) {
  spec.positions[i * 3] = x - CX;
  spec.positions[i * 3 + 1] = -(y - CY); // flip svg y-down → gl y-up
  spec.positions[i * 3 + 2] = z;
  spec.colors[i * 3] = color.r;
  spec.colors[i * 3 + 1] = color.g;
  spec.colors[i * 3 + 2] = color.b;
  spec.sizes[i] = size;
  spec.seeds[i * 3] = rand() * Math.PI * 2; // phase
  spec.seeds[i * 3 + 1] = 0.25 + rand() * 0.6; // drift amplitude
  spec.seeds[i * 3 + 2] = 0.55 + rand() * 0.9; // dissolve fall speed
}

// Soft round sprite for particles
function makeSprite(): THREE.Texture {
  const c = document.createElement('canvas');
  c.width = c.height = 64;
  const g = c.getContext('2d')!;
  const grad = g.createRadialGradient(32, 32, 0, 32, 32, 32);
  grad.addColorStop(0, 'rgba(255,255,255,1)');
  grad.addColorStop(0.4, 'rgba(255,255,255,0.9)');
  grad.addColorStop(0.7, 'rgba(255,255,255,0.32)');
  grad.addColorStop(1, 'rgba(255,255,255,0)');
  g.fillStyle = grad;
  g.fillRect(0, 0, 64, 64);
  const tex = new THREE.CanvasTexture(c);
  tex.needsUpdate = true;
  return tex;
}

const VERT = /* glsl */ `
  attribute float aSize;
  attribute vec3 aSeed;   // phase, driftAmp, fallSpeed
  varying vec3 vColor;
  varying float vFade;
  uniform float uTime;
  uniform float uDissolve; // 0 = intact, 1 = fully dissolved
  uniform float uPixelScale;

  void main() {
    vColor = color;

    vec3 p = position;
    // idle drift — tiny per-particle orbits
    float ph = aSeed.x + uTime * 0.6;
    p.x += cos(ph) * aSeed.y;
    p.y += sin(ph * 0.8) * aSeed.y;

    // scroll dissolve — particles stream downward at individual speeds
    float d = uDissolve * uDissolve;
    p.y -= d * (52.0 + aSeed.z * 46.0);
    p.x += sin(aSeed.x * 7.0) * d * 14.0;
    vFade = 1.0 - clamp(uDissolve * (0.55 + aSeed.z * 0.6), 0.0, 1.0);

    vec4 mv = modelViewMatrix * vec4(p, 1.0);
    gl_Position = projectionMatrix * mv;
    gl_PointSize = aSize * uPixelScale * (175.0 / -mv.z);
  }
`;

const FRAG = /* glsl */ `
  varying vec3 vColor;
  varying float vFade;
  uniform sampler2D uSprite;
  uniform float uOpacity;

  void main() {
    vec4 s = texture2D(uSprite, gl_PointCoord);
    // Additive blending multiplies rgb by alpha at blend time — keep rgb
    // full-strength and express all attenuation through alpha alone.
    gl_FragColor = vec4(vColor, s.a * uOpacity * vFade);
  }
`;

function makePoints(spec: ParticleSpec, sprite: THREE.Texture, opacity: number) {
  const geo = new THREE.BufferGeometry();
  geo.setAttribute('position', new THREE.BufferAttribute(spec.positions, 3));
  geo.setAttribute('color', new THREE.BufferAttribute(spec.colors, 3));
  geo.setAttribute('aSize', new THREE.BufferAttribute(spec.sizes, 1));
  geo.setAttribute('aSeed', new THREE.BufferAttribute(spec.seeds, 3));
  const mat = new THREE.ShaderMaterial({
    vertexShader: VERT,
    fragmentShader: FRAG,
    uniforms: {
      uTime: { value: 0 },
      uDissolve: { value: 0 },
      uOpacity: { value: opacity },
      uPixelScale: { value: 1 },
      uSprite: { value: sprite },
    },
    vertexColors: true,
    transparent: true,
    depthWrite: false,
    blending: THREE.AdditiveBlending,
  });
  return new THREE.Points(geo, mat);
}

/**
 * Boot the scene on `canvas`. Returns a cleanup function.
 * Calls `onReady` once the first frame has rendered (for the SVG crossfade).
 */
export function initHeroEye(canvas: HTMLCanvasElement, onReady: () => void): () => void {
  const renderer = new THREE.WebGLRenderer({
    canvas,
    alpha: true,
    antialias: false,
    powerPreference: 'low-power',
  });
  const dpr = Math.min(window.devicePixelRatio || 1, 2);
  renderer.setPixelRatio(dpr);

  const scene = new THREE.Scene();
  const camera = new THREE.PerspectiveCamera(32, 4 / 3, 10, 400);
  const halfFovTan = Math.tan(THREE.MathUtils.degToRad(32 / 2));
  const fitCamera = () => {
    // Fit the full eye (±64 wide, ±42 tall incl. drift margin) in view.
    camera.position.z = Math.max(64 / (halfFovTan * camera.aspect), 42 / halfFovTan) + 6;
  };
  fitCamera();

  const sprite = makeSprite();
  const { iris, shell } = buildParticles();
  const irisPoints = makePoints(iris, sprite, 0.95);
  const shellPoints = makePoints(shell, sprite, 0.8);

  const eye = new THREE.Group();
  eye.add(shellPoints);
  eye.add(irisPoints);
  scene.add(eye);

  // ---- state ----
  const t0 = performance.now();
  let rafId = 0;
  let disposed = false;
  let readyFired = false;

  // gaze
  let gazeTX = 0;
  let gazeTY = 0;
  let gazeX = 0;
  let gazeY = 0;

  // blink
  let nextBlink = 4 + Math.random() * 6;
  let blinkStart = -1;

  const pointerMove = (e: PointerEvent) => {
    const rect = canvas.getBoundingClientRect();
    const cx = rect.left + rect.width / 2;
    const cy = rect.top + rect.height / 2;
    const dx = (e.clientX - cx) / Math.max(rect.width, 1);
    const dy = (e.clientY - cy) / Math.max(rect.height, 1);
    const mag = Math.hypot(dx, dy) || 1;
    const norm = Math.min(mag, 1);
    gazeTX = (dx / mag) * norm * 7;
    gazeTY = (dy / mag) * norm * 5;
  };
  window.addEventListener('pointermove', pointerMove, { passive: true });

  const resize = () => {
    const rect = canvas.getBoundingClientRect();
    if (rect.width === 0 || rect.height === 0) return;
    renderer.setSize(rect.width, rect.height, false);
    camera.aspect = rect.width / rect.height;
    fitCamera();
    camera.updateProjectionMatrix();
    const scale = (dpr * rect.width) / 440; // reference design width
    for (const pts of [irisPoints, shellPoints]) {
      (pts.material as THREE.ShaderMaterial).uniforms.uPixelScale.value = scale;
    }
  };
  resize();
  window.addEventListener('resize', resize);

  // scroll dissolve driven by hero scroll progress (no gsap dependency)
  const hero = document.getElementById('hero');
  let dissolve = 0;
  const onScroll = () => {
    if (!hero) return;
    const h = hero.offsetHeight || window.innerHeight;
    dissolve = Math.min(Math.max(window.scrollY / (h * 0.72), 0), 1);
  };
  window.addEventListener('scroll', onScroll, { passive: true });
  onScroll();

  const tick = () => {
    if (disposed) return;
    rafId = requestAnimationFrame(tick);
    // skip work when dissolved away or tab hidden
    if (dissolve >= 1 || document.hidden) {
      if (dissolve >= 1) renderer.clear();
      if (!readyFired) fireReady();
      return;
    }

    const t = (performance.now() - t0) / 1000;

    // breathing
    const breathe = 1 + Math.sin(t * 0.55) * 0.014;

    // blink: squash Y briefly
    let blinkScale = 1;
    if (blinkStart < 0 && t > nextBlink) blinkStart = t;
    if (blinkStart >= 0) {
      const bt = (t - blinkStart) / 0.26;
      if (bt >= 1) {
        blinkStart = -1;
        nextBlink = t + 6 + Math.random() * 7;
      } else {
        blinkScale = 1 - Math.sin(bt * Math.PI) * 0.93;
      }
    }

    eye.scale.set(breathe, breathe * blinkScale, breathe);

    // gaze easing — iris translates, whole eye tilts slightly
    gazeX += (gazeTX - gazeX) * 0.06;
    gazeY += (gazeTY - gazeY) * 0.06;
    irisPoints.position.set(gazeX * 0.85, -gazeY * 0.7, 0);
    eye.rotation.y = gazeX * 0.012;
    eye.rotation.x = -gazeY * 0.01;

    for (const pts of [irisPoints, shellPoints]) {
      const u = (pts.material as THREE.ShaderMaterial).uniforms;
      u.uTime.value = t;
      u.uDissolve.value = dissolve;
    }

    renderer.render(scene, camera);
    if (!readyFired) fireReady();
  };

  const fireReady = () => {
    readyFired = true;
    onReady();
  };

  rafId = requestAnimationFrame(tick);

  return () => {
    disposed = true;
    cancelAnimationFrame(rafId);
    window.removeEventListener('pointermove', pointerMove);
    window.removeEventListener('resize', resize);
    window.removeEventListener('scroll', onScroll);
    irisPoints.geometry.dispose();
    shellPoints.geometry.dispose();
    (irisPoints.material as THREE.Material).dispose();
    (shellPoints.material as THREE.Material).dispose();
    sprite.dispose();
    renderer.dispose();
  };
}
