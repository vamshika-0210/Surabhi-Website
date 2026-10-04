// Surabhi Gir Goshala — interactive 3D hero
//
// Performance model (works on phones as well as desktops):
//  * All static geometry is baked into ONE vertex-coloured mesh  -> 1 draw call
//  * Trees and cows are InstancedMesh                               -> 2 draw calls
//  * Whole scene is ~10 draw calls and < 60k triangles
//  * Quality tiers (high / medium / low) pick pixel-ratio, shadows, tree count
//  * Frame-time monitor lowers the pixel ratio automatically if the device struggles
//  * Rendering pauses when the hero is off-screen or the tab is hidden
//  * Honors prefers-reduced-motion and Save-Data; falls back to the poster image
import * as THREE from 'three';

const hero = document.querySelector('.hero-full');
const host = document.getElementById('goshala-360');
const canvas = document.getElementById('goshala-3d');

const clamp = (v, a, b) => Math.max(a, Math.min(b, v));
const lerp = (a, b, t) => a + (b - a) * t;
const easeOutCubic = (t) => 1 - Math.pow(1 - t, 3);
const easeInOut = (t) => (t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2);

function mulberry32(seed) {
  return function () {
    seed |= 0; seed = (seed + 0x6d2b79f5) | 0;
    let t = Math.imul(seed ^ (seed >>> 15), 1 | seed);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

// ---------------------------------------------------------------- capability
function detectTier() {
  const coarse = window.matchMedia('(pointer: coarse)').matches || window.innerWidth < 760;
  const mem = navigator.deviceMemory || 4;
  const cores = navigator.hardwareConcurrency || 4;
  if (coarse && (mem <= 2 || cores <= 4)) return 'low';
  if (coarse) return 'medium';
  return 'high';
}

const TIERS = {
  high:   { dpr: 2,    antialias: true,  shadows: 2048, trees: 54, clouds: 7 },
  medium: { dpr: 1.5,  antialias: false, shadows: 0,    trees: 36,  clouds: 5 },
  low:    { dpr: 1.0,  antialias: false, shadows: 0,    trees: 22,   clouds: 3 }
};

function start() {
  if (!hero || !host || !canvas) return;

  const reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  const saveData = navigator.connection && navigator.connection.saveData;
  if (saveData) return; // keep the lightweight poster

  const tierName = detectTier();
  const tier = TIERS[tierName];

  let renderer;
  try {
    renderer = new THREE.WebGLRenderer({
      canvas,
      antialias: tier.antialias,
      alpha: false,
      powerPreference: 'high-performance',
      stencil: false
    });
  } catch (err) {
    console.warn('WebGL unavailable, using poster image.', err);
    return;
  }
  let pixelRatio = Math.min(window.devicePixelRatio || 1, tier.dpr);
  renderer.setPixelRatio(pixelRatio);
  renderer.outputColorSpace = THREE.SRGBColorSpace;
  renderer.toneMapping = THREE.ACESFilmicToneMapping;
  renderer.toneMappingExposure = 1.05;
  if (tier.shadows) {
    renderer.shadowMap.enabled = true;
    renderer.shadowMap.type = THREE.PCFSoftShadowMap;
  }

  const scene = new THREE.Scene();
  const HORIZON = 0xf3ddb8;
  scene.fog = new THREE.Fog(HORIZON, 140, 420);

  const camera = new THREE.PerspectiveCamera(46, 1, 1, 900);

  // ------------------------------------------------------------- lighting
  const hemi = new THREE.HemisphereLight(0xdff0ff, 0x6a8a4a, 1.25);
  scene.add(hemi);
  const sun = new THREE.DirectionalLight(0xffe0b0, 2.9);
  sun.position.set(-70, 85, 80);
  scene.add(sun);
  if (tier.shadows) {
    sun.castShadow = true;
    sun.shadow.mapSize.set(tier.shadows, tier.shadows);
    const s = sun.shadow.camera;
    s.left = -95; s.right = 95; s.top = 95; s.bottom = -95; s.near = 20; s.far = 280;
    sun.shadow.bias = -0.0005;
    sun.shadow.normalBias = 0.6;
  }

  // ------------------------------------------------------ geometry batching
  const tmpObj = new THREE.Object3D();
  const tmpM = new THREE.Matrix4();
  const baseStack = [new THREE.Matrix4()];
  const rng = mulberry32(2023);

  class Batch {
    constructor() { this.pos = []; this.nor = []; this.col = []; }
    add(geo, color, m, jitter = 0.04) {
      const g = geo.index ? geo.toNonIndexed() : geo.clone();
      if (!g.attributes.normal) g.computeVertexNormals();
      g.applyMatrix4(m);
      const p = g.attributes.position.array, n = g.attributes.normal.array;
      const c = new THREE.Color(color);
      const k = 1 + (rng() - 0.5) * jitter * 2;
      const count = p.length / 3;
      for (let i = 0; i < p.length; i++) { this.pos.push(p[i]); this.nor.push(n[i]); }
      for (let i = 0; i < count; i++) this.col.push(c.r * k, c.g * k, c.b * k);
      g.dispose();
    }
    build() {
      const g = new THREE.BufferGeometry();
      g.setAttribute('position', new THREE.Float32BufferAttribute(this.pos, 3));
      g.setAttribute('normal', new THREE.Float32BufferAttribute(this.nor, 3));
      g.setAttribute('color', new THREE.Float32BufferAttribute(this.col, 3));
      return g;
    }
  }

  const GEO = {
    box: new THREE.BoxGeometry(1, 1, 1),
    cyl6: new THREE.CylinderGeometry(1, 1, 1, 6),
    cyl10: new THREE.CylinderGeometry(1, 1, 1, 10),
    cone8: new THREE.ConeGeometry(1, 1, 8),
    ico0: new THREE.IcosahedronGeometry(1, 0),
    ico1: new THREE.IcosahedronGeometry(1, 1),
    circle: new THREE.CircleGeometry(1, 40),
    ring: new THREE.RingGeometry(0.9, 1, 64),
    plane: new THREE.PlaneGeometry(1, 1)
  };
  GEO.plane.rotateX(-Math.PI / 2);
  GEO.circle.rotateX(-Math.PI / 2);
  GEO.ring.rotateX(-Math.PI / 2);

  function mat(p = [0, 0, 0], r = [0, 0, 0], s = [1, 1, 1]) {
    tmpObj.position.set(p[0], p[1], p[2]);
    tmpObj.rotation.set(r[0], r[1], r[2]);
    tmpObj.scale.set(s[0], s[1], s[2]);
    tmpObj.updateMatrix();
    return tmpM.copy(baseStack[baseStack.length - 1]).multiply(tmpObj.matrix).clone();
  }
  function withBase(p, ry, fn) {
    tmpObj.position.set(p[0], p[1], p[2]);
    tmpObj.rotation.set(0, ry, 0);
    tmpObj.scale.set(1, 1, 1);
    tmpObj.updateMatrix();
    baseStack.push(baseStack[baseStack.length - 1].clone().multiply(tmpObj.matrix));
    fn();
    baseStack.pop();
  }

  const world = new Batch();
  const box = (w, h, d, color, x, y, z, ry = 0, jitter) => world.add(GEO.box, color, mat([x, y, z], [0, ry, 0], [w, h, d]), jitter);
  const cyl = (rt, h, color, x, y, z, seg = 10) => world.add(seg === 6 ? GEO.cyl6 : GEO.cyl10, color, mat([x, y, z], [0, 0, 0], [rt, h, rt]));
  const disc = (r, color, x, y, z, sx = 1, sz = 1) => world.add(GEO.circle, color, mat([x, y, z], [0, 0, 0], [r * sx, 1, r * sz]), 0.03);
  const flat = (w, d, color, x, y, z, ry = 0) => world.add(GEO.plane, color, mat([x, y, z], [0, ry, 0], [w, 1, d]), 0.02);

  // Gable roof prism: ridge along local X, eaves at y=0, ridge at y=rise
  function gableRoof(w, d, rise, color, x, y, z, ry = 0, trim = 0xf6ecd0) {
    const hw = w / 2, hd = d / 2;
    const v = [
      // front slope
      -hw, 0, hd,  hw, 0, hd,  hw, rise, 0,
      -hw, 0, hd,  hw, rise, 0,  -hw, rise, 0,
      // back slope
      hw, 0, -hd,  -hw, 0, -hd,  -hw, rise, 0,
      hw, 0, -hd,  -hw, rise, 0,  hw, rise, 0,
      // underside
      -hw, 0, -hd,  hw, 0, -hd,  hw, 0, hd,
      -hw, 0, -hd,  hw, 0, hd,  -hw, 0, hd
    ];
    const g = new THREE.BufferGeometry();
    g.setAttribute('position', new THREE.Float32BufferAttribute(v, 3));
    g.computeVertexNormals();
    world.add(g, color, mat([x, y, z], [0, ry, 0]), 0.02);
    // gable-end triangles
    const e = [-hw, 0, -hd, -hw, 0, hd, -hw, rise, 0, hw, 0, hd, hw, 0, -hd, hw, rise, 0];
    const ge = new THREE.BufferGeometry();
    ge.setAttribute('position', new THREE.Float32BufferAttribute(e, 3));
    ge.computeVertexNormals();
    world.add(ge, trim, mat([x, y - 0.02, z], [0, ry, 0], [1.001, 1, 1]), 0);
    // ridge cap
    world.add(GEO.box, trim, mat([x, y + rise, z], [0, ry, 0], [w + 0.3, 0.35, 0.6]), 0);
    g.dispose(); ge.dispose();
  }

  const C = {
    brick: 0xb35a3f, brickDark: 0x9a4a33, plaster: 0xeadfc6, cream: 0xf6ecd0, roof: 0xb83f2c, roofMetal: 0x8c97a8,
    wood: 0x8a5a33, glass: 0x2a2f33, gold: 0xf3b82a, grass: 0x7fbf6a, grass2: 0x6fb05c, grass3: 0x92cc78,
    path: 0xd7b47e, soil: 0xa77a4b, hay: 0xe6cf93, white: 0xffffff
  };

  // ----------------------------------------------------------- ground
  disc(520, C.grass2, 0, 0, 0);
  const gr = mulberry32(77);
  for (let i = 0; i < 16; i++) {
    const a = gr() * Math.PI * 2, d = 45 + gr() * 190, r = 18 + gr() * 55;
    disc(r, gr() > 0.5 ? C.grass : C.grass3, Math.cos(a) * d, 0.012 * (i + 1), Math.sin(a) * d, 1, 0.6 + gr() * 0.5);
  }
  disc(46, C.grass3, 0, 0.22, 0);
  world.add(GEO.ring, C.path, mat([0, 0.26, 0], [0, 0, 0], [43, 1, 43]), 0.01);
  flat(9, 30, C.path, 0, 0.28, 24);
  flat(34, 8, C.path, 40, 0.28, -6);
  flat(18, 38, C.path, 60, 0.28, -6);
  flat(34, 8, C.path, -40, 0.28, -6);
  flat(22, 26, C.path, -60, 0.28, -6);

  // ----------------------------------------------------------- main hall (temple)
  (function hall() {
    box(46, 1, 30, C.cream, 0, 0.5, 0);
    box(43, 1, 25, C.plaster, 0, 1.4, 0);
    box(40, 7.8, 20, C.brick, 0, 5.3, 0);
    box(40.8, 0.7, 20.8, C.cream, 0, 9.2, 0);
    box(40.8, 0.5, 20.8, C.cream, 0, 1.9, 0);
    [-11.2, -3.7, 3.7, 11.2].forEach((x) => {
      [10.05, -10.05].forEach((z) => {
        box(2.5, 3.1, 0.3, C.cream, x, 6, z);
        box(1.9, 2.5, 0.4, C.glass, x, 6, z + Math.sign(z) * 0.06);
      });
    });
    [-6.5, 0, 6.5].forEach((z) => [20.05, -20.05].forEach((x) => {
      box(0.3, 3, 2.3, C.cream, x, 6, z);
      box(0.4, 2.4, 1.8, C.glass, x + Math.sign(x) * 0.06, 6, z);
    }));
    // porch + steps
    box(16, 0.5, 8.6, C.plaster, 0, 2.3, 14.3);
    for (let i = 0; i < 4; i++) box(14 - i * 0.4, 0.5, 1.4, C.cream, 0, 0.5 + i * 0.55, 19.8 - i * 1.2);
    [-6.4, 6.4].forEach((x) => cyl(0.5, 5.6, C.cream, x, 5.3, 17.6));
    [-6.4, 6.4].forEach((x) => box(1.3, 0.5, 1.3, C.cream, x, 2.7, 17.6));
    box(17, 0.6, 9, C.roof, 0, 8.3, 14, 0, 0.02);
    box(4.2, 4.6, 0.5, C.cream, 0, 4.5, 10.3);
    box(3.6, 4.2, 0.6, C.glass, 0, 4.4, 10.34);
    gableRoof(45.6, 25.2, 5.6, C.roof, 0, 9.5, 0);
    // spire (shikhara) — the landmark
    box(5.5, 1.2, 5.5, C.cream, 0, 15.6, 0);
    world.add(GEO.cone8, C.gold, mat([0, 19.4, 0], [0, 0, 0], [3.1, 6.6, 3.1]));
    world.add(GEO.ico0, C.gold, mat([0, 23.1, 0], [0, 0, 0], [0.8, 0.8, 0.8]), 0);
    cyl(0.07, 3, 0x5d3b1e, 0, 24.7, 0, 6);
    box(1.6, 1, 0.08, 0xff8a1f, 0.9, 25.6, 0, 0, 0);
    // low garden wall
    box(38, 0.7, 4.8, C.cream, 0, 0.6, 12.2, 0, 0.02);
    box(37, 0.5, 4.2, C.grass2, 0, 1.0, 12.2);
  })();

  // ----------------------------------------------------------- long cow barn (east)
  const barnBase = { p: [60, 0, -6], ry: -Math.PI / 2 }; // open side faces the temple
  (function barn() {
    const L = 44, W = 12;
    withBase(barnBase.p, barnBase.ry, () => {
      box(L + 3, 0.6, W + 3.6, C.cream, 0, 0.3, 0);
      box(L + 1.8, 0.2, W + 1.4, 0xdccfa6, 0, 0.7, 0);
      box(L + 1, 3.8, 0.5, C.brick, 0, 2.6, -W / 2);
      box(0.5, 3.8, W, C.brick, L / 2, 2.6, 0);
      box(0.5, 3.8, W, C.brick, -L / 2, 2.6, 0);
      // roofed back half (posts + roof) with an open feeding yard in front
      for (let i = 0; i <= 8; i++) cyl(0.32, 4.4, C.cream, -L / 2 + 1 + (i * (L - 2)) / 8, 2.9, 2.6, 6);
      box(L + 1, 0.4, 0.55, C.cream, 0, 4.9, 2.6);
      box(L - 8, 0.9, 1.4, 0xbca57a, 0, 1.3, -W / 2 + 1.4);
      box(L - 8, 0.9, 1.0, 0xbca57a, 0, 1.2, 7.4);
      box(L - 8, 0.5, 0.8, C.hay, 0, 1.45, 7.4, 0, 0.1);
      box(L - 6, 0.12, W - 4.5, 0xf3e7c3, 0, 0.85, -0.6, 0, 0.03);
      gableRoof(L + 4, 10.4, 3.4, C.roofMetal, 0, 5.1, -2.6);
    });
    // hay stack beside the barn
    world.add(GEO.cyl10, C.hay, mat([44, 1.1, 14], [0, 0, 0], [2, 2.2, 2]));
    world.add(GEO.cyl10, C.hay, mat([47, 1.1, 16], [0, 0, 0], [2, 2.2, 2]));
  })();

  // ----------------------------------------------------------- staff house (west)
  (function staff() {
    withBase([-60, 0, -6], 0, () => {
      box(20, 0.6, 16, C.cream, 0, 0.3, 0);
      box(16, 3.1, 11, C.plaster, 0, 2.15, 0);
      box(16.4, 0.4, 11.4, C.cream, 0, 3.8, 0);
      box(15, 3.0, 10, C.plaster, 0, 5.5, 0);
      box(14, 0.3, 3.2, C.cream, 0, 4.1, 6.4);
      box(14, 1.0, 0.18, 0xe5e7eb, 0, 4.8, 7.9);
      [-6, -2, 2, 6].forEach((x) => { box(1.6, 1.8, 0.2, C.glass, x, 2.4, 5.55); box(1.6, 1.8, 0.2, C.glass, x, 5.6, 5.05); });
      gableRoof(17.6, 13, 3.4, C.roof, 0, 7, 0);
    });
  })();

  // ----------------------------------------------------------- small details: tulsi platform, lamp posts, fence
  (function details() {
    box(3, 0.9, 3, C.cream, 12, 0.7, 28);
    world.add(GEO.ico1, 0x3f9142, mat([12, 2.0, 28], [0, 0, 0], [1.1, 1.2, 1.1]));
    for (let i = 0; i < 10; i++) {
      const a = (i / 10) * Math.PI * 2;
      const x = Math.cos(a) * 38.5, z = Math.sin(a) * 38.5;
      cyl(0.12, 3.4, 0x4a3a2a, x, 1.9, z, 6);
      world.add(GEO.ico0, 0xffd27a, mat([x, 3.8, z], [0, 0, 0], [0.5, 0.5, 0.5]), 0);
    }
  })();

  const worldMesh = new THREE.Mesh(world.build(), new THREE.MeshLambertMaterial({ vertexColors: true }));
  worldMesh.matrixAutoUpdate = false;
  if (tier.shadows) { worldMesh.castShadow = true; worldMesh.receiveShadow = true; }
  scene.add(worldMesh);

  // temple signboard (one tiny textured plane)
  (function sign() {
    const c = document.createElement('canvas');
    c.width = 1024; c.height = 192;
    const g = c.getContext('2d');
    g.fillStyle = '#f7efd6'; g.fillRect(0, 0, c.width, c.height);
    g.strokeStyle = '#c4912a'; g.lineWidth = 10; g.strokeRect(10, 10, c.width - 20, c.height - 20);
    g.fillStyle = '#10381d'; g.textAlign = 'center'; g.textBaseline = 'middle';
    const label = 'Nitai Gauranga Temple';
    let size = 96;
    do { g.font = `bold ${size}px Georgia, serif`; size -= 4; } while (g.measureText(label).width > c.width - 110 && size > 24); // always fit inside the frame
    g.fillText(label, c.width / 2, c.height / 2 + 4);
    const tex = new THREE.CanvasTexture(c);
    tex.colorSpace = THREE.SRGBColorSpace;
    tex.anisotropy = 4;
    const wood = new THREE.MeshLambertMaterial({ color: 0xe9dcb4 });
    const mats = [wood, wood, wood, wood, new THREE.MeshBasicMaterial({ map: tex }), wood]; // front shows the text, back is a plain blank board
    const m = new THREE.Mesh(new THREE.BoxGeometry(10, 1.875, 0.25), mats);
    m.position.set(-10, 3.6, 31);
    m.scale.setScalar(0.8);
    scene.add(m);
    // posts for the signboard (baked into the world mesh below would be too late, so add tiny meshes)
    const postMat = new THREE.MeshLambertMaterial({ color: 0x6d4c41 });
    [-1, 1].forEach((side) => {
      const post = new THREE.Mesh(GEO.box, postMat);
      post.scale.set(0.4, 4.6, 0.4);
      post.position.set(-10 + side * 4.35, 2.3, 30.65); // outside the board edges, behind its face
      scene.add(post);
    });
  })();

  // ----------------------------------------------------------- mango trees (instanced + wind sway)
  const treeBatch = new Batch();
  (function treeGeo() {
    const add = (g, col, p, s) => treeBatch.add(g, col, new THREE.Matrix4().compose(new THREE.Vector3(...p), new THREE.Quaternion(), new THREE.Vector3(...s)), 0.06);
    add(GEO.cyl6, 0x6d4c41, [0, 1.6, 0], [0.5, 3.2, 0.5]);
    add(GEO.ico1, 0x2a6a31, [0, 5.0, 0], [3.4, 2.9, 3.4]);
    add(GEO.ico1, 0x3a8a3c, [1.9, 4.5, 0.6], [2.3, 2.0, 2.3]);
    add(GEO.ico1, 0x2f7a35, [-1.7, 4.3, -0.9], [2.4, 2.0, 2.4]);
    add(GEO.ico1, 0x4a9d44, [0.2, 6.7, -0.3], [2.1, 1.7, 2.1]);
    [[1.5, 3.7, 2.3], [-2.4, 4.2, 1.4], [0.6, 5.5, 2.9], [-0.9, 3.6, -2.6]].forEach((p) => add(GEO.ico0, 0xf2a541, p, [0.2, 0.2, 0.2]));
  })();
  const treeMat = new THREE.MeshLambertMaterial({ vertexColors: true });
  const timeUniform = { value: 0 };
  treeMat.onBeforeCompile = (shader) => {
    shader.uniforms.uTime = timeUniform;
    shader.vertexShader = shader.vertexShader
      .replace('#include <common>', '#include <common>\nuniform float uTime;')
      .replace('#include <begin_vertex>', `#include <begin_vertex>
        float sway = smoothstep(2.5, 8.5, position.y);
        vec4 ip = instanceMatrix * vec4(0.0, 0.0, 0.0, 1.0);
        transformed.x += sin(uTime * 1.1 + ip.x * 0.35 + ip.z * 0.2) * 0.22 * sway;
        transformed.z += cos(uTime * 0.85 + ip.z * 0.3 + ip.x * 0.1) * 0.16 * sway;`);
  };

  const treeSpots = [];
  (function placeTrees() {
    const r = mulberry32(99);
    const blocked = (x, z) =>
      Math.hypot(x, z) < 46 ||
      (Math.abs(x - 60) < 22 && Math.abs(z + 6) < 26) ||
      (Math.abs(x + 60) < 22 && Math.abs(z + 6) < 20) ||
      (Math.abs(x) < 14 && z > 0 && z < 60);
    const free = (x, z, min) => treeSpots.every((t) => Math.hypot(t.x - x, t.z - z) > min);
    // orchard rows
    [[-60, 22, 3, 4], [34, 36, 2, 4]].forEach(([ox, oz, rows, cols]) => {
      for (let i = 0; i < rows; i++) for (let j = 0; j < cols; j++) {
        const x = ox + j * 13 + (i % 2 ? 6 : 0), z = oz + i * 12;
        if (!blocked(x, z) && treeSpots.length < tier.trees) treeSpots.push({ x, z, s: 0.95 + r() * 0.2, ry: r() * 6.28 });
      }
    });
    let tries = 0;
    while (treeSpots.length < tier.trees && tries++ < 600) {
      const x = (r() - 0.5) * 220, z = (r() - 0.4) * 200;
      if (blocked(x, z) || !free(x, z, 9)) continue;
      treeSpots.push({ x, z, s: 0.85 + r() * 0.45, ry: r() * 6.28 });
    }
  })();
  const trees = new THREE.InstancedMesh(treeBatch.build(), treeMat, treeSpots.length);
  treeSpots.forEach((t, i) => {
    tmpObj.position.set(t.x, 0, t.z); tmpObj.rotation.set(0, t.ry, 0); tmpObj.scale.setScalar(t.s); tmpObj.updateMatrix();
    trees.setMatrixAt(i, tmpObj.matrix);
  });
  trees.instanceMatrix.needsUpdate = true;
  trees.frustumCulled = false;
  if (tier.shadows) { trees.castShadow = true; trees.receiveShadow = true; }
  scene.add(trees);

  // ----------------------------------------------------------- Gir cows (instanced)
  const cowBatch = new Batch();
  (function cowGeo() {
    const add = (g, col, p, s, r = [0, 0, 0]) => {
      const q = new THREE.Quaternion().setFromEuler(new THREE.Euler(r[0], r[1], r[2]));
      cowBatch.add(g, col, new THREE.Matrix4().compose(new THREE.Vector3(...p), q, new THREE.Vector3(...s)), 0);
    };
    const body = 0xc07a52, light = 0xf1e4d0, dark = 0x3b2a1e, horn = 0xe9dccb;
    add(GEO.ico1, body, [0, 1.9, 0], [0.95, 0.95, 1.9]);
    add(GEO.ico1, body, [0, 2.0, 1.0], [0.95, 0.95, 0.95]);
    add(GEO.ico1, body, [0, 2.0, -1.0], [0.98, 0.98, 0.98]);
    add(GEO.ico1, 0xb0693f, [0, 2.95, 0.75], [0.5, 0.55, 0.65]);
    add(GEO.ico1, light, [0, 1.35, 0.1], [0.78, 0.55, 1.5]);
    add(GEO.ico1, light, [0.62, 2.2, -0.5], [0.4, 0.55, 0.9]);
    add(GEO.ico1, light, [-0.6, 2.4, 0.4], [0.4, 0.5, 0.8]);
    add(GEO.ico1, light, [0, 1.75, 1.75], [0.5, 0.9, 0.5]); // dewlap
    add(GEO.cyl10, body, [0, 2.45, 1.8], [0.38, 1.2, 0.38], [Math.PI / 2.9, 0, 0]); // neck
    add(GEO.box, body, [0, 2.45, 2.55], [0.72, 0.72, 0.95], [0.25, 0, 0]); // head
    add(GEO.box, light, [0, 2.25, 3.05], [0.55, 0.5, 0.45], [0.25, 0, 0]); // muzzle
    add(GEO.ico0, dark, [0, 2.2, 3.3], [0.22, 0.14, 0.14]);
    [-1, 1].forEach((s) => {
      add(GEO.cone8, horn, [s * 0.5, 3.0, 2.35], [0.12, 0.7, 0.12], [0, 0, -s * 1.0]);
      add(GEO.ico0, body, [s * 0.62, 2.55, 2.3], [0.1, 0.4, 0.28], [0, 0, -s * 0.5]); // ears
      add(GEO.ico0, dark, [s * 0.34, 2.65, 2.9], [0.07, 0.07, 0.07]); // eyes
    });
    [[-0.5, -1.15], [0.5, -1.15], [-0.5, 1.1], [0.5, 1.1]].forEach(([x, z]) => {
      add(GEO.cyl6, body, [x, 0.8, z], [0.17, 1.4, 0.17]);
      add(GEO.cyl6, dark, [x, 0.12, z], [0.2, 0.25, 0.2]);
    });
    add(GEO.cyl6, 0x8b4a2a, [0, 1.9, -2.1], [0.05, 1.7, 0.05], [0.2, 0, 0]); // tail
    add(GEO.ico0, dark, [0, 1.0, -2.25], [0.18, 0.28, 0.18]);
  })();

  const cowMat = new THREE.MeshLambertMaterial({ vertexColors: true });
  const COW_SCALE = 1.5;
  const herd = [];
  // barn cows (stationary, head toward the trough)
  const L_BARN = 44;
  withBase(barnBase.p, barnBase.ry, () => {
    const count = tierName === 'low' ? 5 : 8;
    for (let i = 0; i < count; i++) {
      const lx = -L_BARN / 2 + 5 + (i * (L_BARN - 10)) / (count - 1);
      const wp = new THREE.Vector3(lx, 0.8, 5.0).applyMatrix4(baseStack[baseStack.length - 1]);
      herd.push({ x: wp.x, z: wp.z, y: 0.8, heading: Math.PI + barnBase.ry, mode: 'idle', phase: i * 1.7, tint: 0.88 + (i % 3) * 0.08 });
    }
  });
  // pasture cows (wander slowly)
  [
    [20, 30], [-28, 26], [38, 22], [-46, -26], [10, -40], [-14, 40], [64, 28], [-64, 26], [30, -44]
  ].slice(0, tierName === 'low' ? 5 : 9).forEach(([x, z], i) => {
    herd.push({ x, z, cx: x, cz: z, rad: 3 + (i % 3) * 2, ang: i * 1.3, speed: 0.07 + (i % 4) * 0.02, heading: 0, mode: i % 3 === 0 ? 'idle' : 'walk', phase: i * 2.1, tint: 0.9 + (i % 4) * 0.06 });
  });
  const cows = new THREE.InstancedMesh(cowBatch.build(), cowMat, herd.length);
  cows.instanceMatrix.setUsage(THREE.DynamicDrawUsage);
  herd.forEach((c, i) => cows.setColorAt(i, new THREE.Color(c.tint, c.tint * 0.98, c.tint * 0.96)));
  cows.instanceColor.needsUpdate = true;
  cows.frustumCulled = false;
  if (tier.shadows) { cows.castShadow = true; }
  scene.add(cows);

  // ----------------------------------------------------------- soft blob shadows for lower tiers
  if (!tier.shadows) {
    const sc = document.createElement('canvas');
    sc.width = sc.height = 64;
    const sg = sc.getContext('2d');
    const grd = sg.createRadialGradient(32, 32, 2, 32, 32, 30);
    grd.addColorStop(0, 'rgba(0,0,0,0.55)'); grd.addColorStop(1, 'rgba(0,0,0,0)');
    sg.fillStyle = grd; sg.fillRect(0, 0, 64, 64);
    const stex = new THREE.CanvasTexture(sc);
    const smat = new THREE.MeshBasicMaterial({ map: stex, transparent: true, depthWrite: false, opacity: 0.55, fog: false });
    const blobCount = treeSpots.length + herd.length + 3;
    const blobs = new THREE.InstancedMesh(GEO.plane, smat, blobCount);
    let bi = 0;
    const put = (x, z, sx, sz) => {
      tmpObj.position.set(x, 0.32, z); tmpObj.rotation.set(0, 0, 0); tmpObj.scale.set(sx, 1, sz); tmpObj.updateMatrix();
      blobs.setMatrixAt(bi++, tmpObj.matrix);
    };
    treeSpots.forEach((t) => put(t.x + 1.5, t.z - 1, 9 * t.s, 9 * t.s));
    herd.forEach((c) => put(c.x, c.z, 5, 5));
    put(0, 0, 66, 50); put(-60, -6, 30, 24); put(60, -6, 30, 62);
    blobs.count = bi;
    blobs.instanceMatrix.needsUpdate = true;
    blobs.frustumCulled = false;
    blobs.renderOrder = 1;
    scene.add(blobs);
  }

  // ----------------------------------------------------------- sky dome, sun glow, clouds
  (function sky() {
    const g = new THREE.SphereGeometry(700, 24, 16);
    const pos = g.attributes.position;
    const colors = new Float32Array(pos.count * 3);
    const top = new THREE.Color(0x4f95dc), mid = new THREE.Color(0xa9d4f0), hor = new THREE.Color(HORIZON);
    const col = new THREE.Color();
    for (let i = 0; i < pos.count; i++) {
      const h = clamp(pos.getY(i) / 700, -0.1, 1);
      if (h < 0.28) col.copy(hor).lerp(mid, clamp(h / 0.28, 0, 1)); else col.copy(mid).lerp(top, clamp((h - 0.28) / 0.6, 0, 1));
      colors[i * 3] = col.r; colors[i * 3 + 1] = col.g; colors[i * 3 + 2] = col.b;
    }
    g.setAttribute('color', new THREE.BufferAttribute(colors, 3));
    const dome = new THREE.Mesh(g, new THREE.MeshBasicMaterial({ vertexColors: true, side: THREE.BackSide, fog: false, depthWrite: false, toneMapped: false }));
    dome.renderOrder = -2;
    scene.add(dome);

    const gc = document.createElement('canvas');
    gc.width = gc.height = 128;
    const gg = gc.getContext('2d');
    const rg = gg.createRadialGradient(64, 64, 0, 64, 64, 64);
    rg.addColorStop(0, 'rgba(255,244,214,1)'); rg.addColorStop(0.18, 'rgba(255,226,160,0.75)'); rg.addColorStop(1, 'rgba(255,214,140,0)');
    gg.fillStyle = rg; gg.fillRect(0, 0, 128, 128);
    const glow = new THREE.Sprite(new THREE.SpriteMaterial({ map: new THREE.CanvasTexture(gc), fog: false, depthWrite: false, blending: THREE.AdditiveBlending }));
    glow.position.copy(sun.position).normalize().multiplyScalar(560);
    glow.scale.setScalar(240);
    glow.renderOrder = -1;
    scene.add(glow);
  })();

  const cloudLayer = new THREE.Group();
  (function clouds() {
    const b = new Batch();
    const r = mulberry32(5);
    for (let i = 0; i < tier.clouds; i++) {
      const a = (i / tier.clouds) * Math.PI * 2 + r(), d = 170 + r() * 160, y = 85 + r() * 55;
      const cx = Math.cos(a) * d, cz = Math.sin(a) * d;
      const puffs = 4 + Math.floor(r() * 3);
      for (let p = 0; p < puffs; p++) {
        const s = 14 + r() * 12;
        b.add(GEO.ico1, p % 2 ? 0xffffff : 0xf0f5fb,
          new THREE.Matrix4().compose(new THREE.Vector3(cx + (p - puffs / 2) * 16, y + r() * 5, cz + (r() - 0.5) * 14), new THREE.Quaternion(), new THREE.Vector3(s * 1.4, s * 0.6, s)), 0);
      }
    }
    const m = new THREE.Mesh(b.build(), new THREE.MeshBasicMaterial({ vertexColors: true, transparent: true, opacity: 0.92, depthWrite: false }));
    cloudLayer.add(m);
    scene.add(cloudLayer);
  })();

  // ----------------------------------------------------------- camera rig
  const FOCUS = {
    overview: { target: [0, 3, 0], radius: 1, az: 0, elev: 0 },
    temple:   { target: [0, 7, 4], radius: 0.7, az: 0, elev: -0.1 },
    barn:     { target: [58, 2, -4], radius: 0.62, az: -1.0, elev: 0.0 },
    orchard:  { target: [-46, 3, 28], radius: 0.62, az: 0.2, elev: -0.05 }
  };
  const rig = {
    target: new THREE.Vector3(0, 3, 2), tTarget: new THREE.Vector3(0, 3, 2),
    az: 0, elev: 0.5, radius: 100, radiusMul: 1, tRadiusMul: 1,
    tAzBase: 0, azBase: 0, tElevOff: 0, elevOff: 0,
    manualAz: 0, manualElev: 0, velAz: 0, velElev: 0, drift: 0, driftT: 0
  };
  let sizeInfo = { w: 1, h: 1, portrait: false };
  function baseElev() { return sizeInfo.portrait ? 0.62 : 0.5; }
  function baseRadius() {
    const a = sizeInfo.w / sizeInfo.h;
    const half = Math.tan(THREE.MathUtils.degToRad(camera.fov) / 2);
    if (a >= 1) return clamp(84 / (half * Math.min(a, 1.9)), 112, 165);
    return clamp(46 / (half * a), 104, 235);
  }
  function applyFocus(name) {
    const f = FOCUS[name] || FOCUS.overview;
    rig.tTarget.set(...f.target);
    rig.tRadiusMul = f.radius;
    rig.tAzBase = f.az;
    rig.tElevOff = f.elev;
    rig.manualAz = 0; rig.manualElev = 0; rig.velAz = 0; rig.velElev = 0;
    wake();
  }
  window.addEventListener('goshala:focus', (e) => {
    applyFocus(e.detail && e.detail.name);
    host.dataset.focus = (e.detail && e.detail.name) || 'overview';
  });

  function placeCamera() {
    const e = clamp(rig.elev, 0.18, 1.1);
    const r = rig.radius * rig.radiusMul;
    camera.position.set(
      rig.target.x + r * Math.sin(rig.az) * Math.cos(e),
      rig.target.y + r * Math.sin(e),
      rig.target.z + r * Math.cos(rig.az) * Math.cos(e)
    );
    camera.lookAt(rig.target);
  }

  // ----------------------------------------------------------- sizing
  function resize() {
    const w = Math.max(1, host.clientWidth), h = Math.max(1, host.clientHeight);
    sizeInfo = { w, h, portrait: h > w };
    renderer.setSize(w, h, false);
    camera.aspect = w / h;
    camera.fov = sizeInfo.portrait ? 50 : 44;
    // lift the scene above the text card in portrait / mid-size
    const wide = w / h > 1.25;
    camera.setViewOffset(w, h, 0, sizeInfo.portrait ? h * 0.2 : (wide ? h * 0.17 : h * 0.1), w, h); // centred, symmetric; lifted above the copy
    camera.updateProjectionMatrix();
    rig.radius = baseRadius();
    wake();
  }
  const ro = new ResizeObserver(() => resize());
  ro.observe(host);

  // ----------------------------------------------------------- input (drag / swipe to orbit)
  let dragging = false, lastX = 0, lastY = 0, lastT = 0, userTouched = false;
  const isTouch = (e) => e.pointerType === 'touch' || e.pointerType === 'pen';
  canvas.style.touchAction = 'pan-y'; // vertical swipes keep scrolling the page
  canvas.addEventListener('pointerdown', (e) => {
    if (e.pointerType === 'mouse' && e.button !== 0) return;
    dragging = true; userTouched = true; lastX = e.clientX; lastY = e.clientY; lastT = performance.now();
    rig.velAz = 0; rig.velElev = 0;
    try { canvas.setPointerCapture(e.pointerId); } catch (_) { /* ignore */ }
    host.classList.add('is-dragging');
    wake();
  });
  canvas.addEventListener('pointermove', (e) => {
    if (!dragging) return;
    if (e.pointerType === 'mouse' && e.buttons === 0) { endDrag(); return; } // button released outside / missed pointerup
    const dx = e.clientX - lastX, dy = e.clientY - lastY;
    const now = performance.now(), dt = Math.max(1, now - lastT);
    lastX = e.clientX; lastY = e.clientY; lastT = now;
    const k = 0.0058;
    rig.manualAz -= dx * k;
    rig.velAz = (-dx * k) / (dt / 1000);
    if (!isTouch(e)) {
      rig.manualElev = clamp(rig.manualElev + dy * 0.004, -0.3, 0.45);
    }
    wake();
  });
  function endDrag() { dragging = false; host.classList.remove('is-dragging'); wake(); }
  canvas.addEventListener('pointerup', endDrag);
  canvas.addEventListener('pointercancel', endDrag);
  window.addEventListener('blur', endDrag);
  canvas.addEventListener('lostpointercapture', endDrag);
  canvas.addEventListener('keydown', (e) => {
    if (e.key === 'ArrowLeft') { rig.manualAz -= 0.2; wake(); }
    if (e.key === 'ArrowRight') { rig.manualAz += 0.2; wake(); }
  });

  // ----------------------------------------------------------- scroll coupling
  let scrollP = 0;
  function onScroll() {
    const hgt = hero.offsetHeight || window.innerHeight;
    scrollP = clamp(window.scrollY / hgt, 0, 1);
    wake();
  }
  window.addEventListener('scroll', onScroll, { passive: true });

  // ----------------------------------------------------------- loop
  let visible = true, pageVisible = !document.hidden, running = false, raf = 0;
  let lastTime = 0, introT = reduceMotion ? 1 : 0, readyShown = false;
  let slowFrames = 0, goodFrames = 0, idleUntil = 0;
  const clock = new THREE.Clock();

  function updateCows(t) {
    for (let i = 0; i < herd.length; i++) {
      const c = herd[i];
      let x = c.x, z = c.z, y = c.y || 0, h = c.heading, bob = 0;
      if (c.mode === 'walk') {
        c.ang += c.speed * 0.016 * (reduceMotion ? 0 : 1);
        x = c.cx + Math.cos(c.ang) * c.rad;
        z = c.cz + Math.sin(c.ang) * c.rad;
        h = -c.ang; // tangent heading
        bob = Math.abs(Math.sin(t * 2.2 + c.phase)) * 0.07;
      } else {
        bob = Math.sin(t * 1.3 + c.phase) * 0.025;
      }
      tmpObj.position.set(x, y + bob, z);
      tmpObj.rotation.set(0, h, 0);
      tmpObj.scale.setScalar(COW_SCALE);
      tmpObj.updateMatrix();
      cows.setMatrixAt(i, tmpObj.matrix);
    }
    cows.instanceMatrix.needsUpdate = true;
  }

  function frame(now) {
    raf = 0;
    if (!visible || !pageVisible) { running = false; return; }
    const dt = Math.min(0.05, clock.getDelta());
    const t = clock.elapsedTime;
    timeUniform.value = t;

    // intro fly-in
    if (introT < 1) introT = Math.min(1, introT + dt / 2.8);
    const ie = easeOutCubic(introT);

    // input inertia
    if (!dragging && Math.abs(rig.velAz) > 0.01) {
      rig.manualAz += rig.velAz * dt;
      rig.velAz *= Math.pow(0.06, dt);
    } else if (!dragging) { rig.velAz = 0; }
    if (!reduceMotion && !dragging) rig.driftT += dt; // slow idle sway
    rig.drift = Math.sin(rig.driftT * 0.13) * 0.3;

    // ease toward focus preset
    const s = 1 - Math.exp(-dt * 3.2);
    rig.target.lerp(rig.tTarget, s);
    rig.radiusMul = lerp(rig.radiusMul, rig.tRadiusMul, s);
    rig.azBase = lerp(rig.azBase, rig.tAzBase, s);
    rig.elevOff = lerp(rig.elevOff, rig.tElevOff, s);

    const p = easeInOut(scrollP);
    rig.az = rig.azBase + rig.manualAz + rig.drift + lerp(-0.9, 0, ie);
    rig.elev = baseElev() + rig.elevOff + rig.manualElev + lerp(0.32, 0, ie);
    rig.radius = baseRadius();
    const savedMul = rig.radiusMul;
    rig.radiusMul = savedMul * lerp(1.55, 1, ie);
    placeCamera();
    rig.radiusMul = savedMul;

    if (!reduceMotion) { updateCows(t); cloudLayer.rotation.y += dt * 0.004; }

    renderer.render(scene, camera);

    if (!readyShown) { readyShown = true; host.classList.add('is-ready'); }

    // adaptive resolution: if the device cannot hold ~40fps, step the pixel ratio down
    if (now && lastTime) {
      const ms = now - lastTime;
      if (ms > 28) { slowFrames++; goodFrames = 0; } else { goodFrames++; slowFrames = Math.max(0, slowFrames - 1); }
      if (slowFrames > 25 && pixelRatio > 0.8) {
        pixelRatio = Math.max(0.75, pixelRatio - 0.25);
        renderer.setPixelRatio(pixelRatio); renderer.setSize(sizeInfo.w, sizeInfo.h, false);
        slowFrames = 0;
      }
    }
    lastTime = now;

    // reduced-motion: render on demand only while something is moving
    const settled = introT >= 1 && !dragging && Math.abs(rig.velAz) < 0.01 && scrollSettled();
    if (reduceMotion && settled) { running = false; return; }
    raf = requestAnimationFrame(frame);
  }
  let lastScrollSeen = -1;
  function scrollSettled() { const ok = lastScrollSeen === scrollP; lastScrollSeen = scrollP; return ok; }

  function wake() {
    if (running || !visible || !pageVisible) return;
    running = true; lastTime = 0; clock.getDelta();
    raf = requestAnimationFrame(frame);
  }
  const io = new IntersectionObserver((entries) => { visible = entries[0].isIntersecting; if (visible) wake(); }, { threshold: 0.01 });
  io.observe(hero);
  document.addEventListener('visibilitychange', () => { pageVisible = !document.hidden; if (pageVisible) wake(); });

  canvas.addEventListener('webglcontextlost', (e) => { e.preventDefault(); running = false; host.classList.remove('is-ready'); });
  canvas.addEventListener('webglcontextrestored', () => { readyShown = false; wake(); });

  resize();
  onScroll();
  wake();
  window.__goshala = { rig, camera, scrollP: () => scrollP, tier: tierName, trees: treeSpots.length, cows: herd.length, calls: () => renderer.info.render.calls, tris: () => renderer.info.render.triangles, pr: () => pixelRatio };
}

// avoid contending with first paint: start after the poster is on screen
const go = () => { try { start(); } catch (err) { console.warn('Goshala 3D failed to start', err); } };
if (document.readyState === 'complete') go(); else window.addEventListener('load', go, { once: true });
