// Scroll-driven 360° Three.js scene for the Goshala
// Uses lightweight primitives to resemble: a temple, a shed (feeding area nearby), and green cover
import * as THREE from 'three';
import { OrbitControls } from '/assets/vendor/three/OrbitControls.js';

function clamp(v, min, max){ return Math.max(min, Math.min(max, v)); }

function showError(msg){
  try{
    const hint = document.createElement('div');
    hint.style.position='absolute';
    hint.style.left='12px';
    hint.style.bottom='12px';
    hint.style.background='rgba(190,0,0,.85)';
    hint.style.color='#fff';
    hint.style.padding='8px 10px';
    hint.style.borderRadius='10px';
    hint.style.fontSize='12px';
    hint.style.zIndex='2';
    hint.textContent=msg;
    document.getElementById('goshala-360')?.appendChild(hint);
  }catch(e){/* noop */}
}

function initGoshala3D(){
  const canvasBg = document.getElementById('goshala-3d');
  const canvasPanel = document.getElementById('goshala-3d-panel');
  const section = document.getElementById('goshala-360');
  if(!canvasBg || !section) return;
  const filterOverlay = document.querySelector('[data-immersive-filter]');

  // Renderers
  const rendererBg = new THREE.WebGLRenderer({ canvas: canvasBg, antialias:true, alpha:false });
  rendererBg.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));
  if(THREE.SRGBColorSpace){ rendererBg.outputColorSpace = THREE.SRGBColorSpace; }

  let rendererPanel = null;
  if(canvasPanel){
    rendererPanel = new THREE.WebGLRenderer({ canvas: canvasPanel, antialias:true, alpha:true });
    rendererPanel.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));
    if(THREE.SRGBColorSpace){ rendererPanel.outputColorSpace = THREE.SRGBColorSpace; }
    rendererPanel.setClearColor(0x000000, 0);
  }

  // Scene & fog
  const scene = new THREE.Scene();
  scene.background = new THREE.Color(0xd7ead9); // soft greenish sky
  scene.fog = new THREE.Fog(0xd7ead9, 80, 220);

  // Camera
  const camera = new THREE.PerspectiveCamera(55, 1, 0.1, 1000);
  camera.position.set(58, 34, 58);
  camera.lookAt(0, 6, 0);
  let cameraBg = camera;
  if(rendererPanel){
    cameraBg = camera.clone();
    cameraBg.position.copy(camera.position);
    cameraBg.lookAt(0, 6, 0);
  }

  // Lights
  const hemi = new THREE.HemisphereLight(0xffffff, 0x88aa88, 0.7);
  scene.add(hemi);
  const ambient = new THREE.AmbientLight(0xffffff, 0.35);
  scene.add(ambient);
  const dir = new THREE.DirectionalLight(0xfff1d0, 0.95);
  dir.position.set(65, 90, 20);
  dir.castShadow = false;
  scene.add(dir);
  const fill = new THREE.DirectionalLight(0xcad9ff, 0.28);
  fill.position.set(-60, 45, -55);
  scene.add(fill);

  // Ground
  const groundMat = new THREE.MeshLambertMaterial({ color: 0x7ac77a });
  const groundGeo = new THREE.PlaneGeometry(600, 600);
  const ground = new THREE.Mesh(groundGeo, groundMat);
  ground.rotation.x = -Math.PI/2;
  ground.receiveShadow = true;
  scene.add(ground);

  const materials = {
    brick: new THREE.MeshLambertMaterial({ color: 0xb7563f }),
    plaster: new THREE.MeshLambertMaterial({ color: 0xe8ddc3 }),
    clayRoof: new THREE.MeshLambertMaterial({ color: 0xb23b2a }),
    highlight: new THREE.MeshLambertMaterial({ color: 0xf3e7ba }),
    wood: new THREE.MeshLambertMaterial({ color: 0x9c6b3b }),
    metalRoof: new THREE.MeshLambertMaterial({ color: 0x9aa3b2 }),
    path: new THREE.MeshLambertMaterial({ color: 0xcfa770, side: THREE.DoubleSide }),
    grassPatch: new THREE.MeshLambertMaterial({ color: 0x8ccf79, side: THREE.DoubleSide }),
    mangoLeaf: new THREE.MeshLambertMaterial({ color: 0x255d2b }),
    mangoLeafSun: new THREE.MeshLambertMaterial({ color: 0x3f8f3a }),
    mangoFruit: new THREE.MeshLambertMaterial({ color: 0xf2a541 }),
    treeBark: new THREE.MeshLambertMaterial({ color: 0x6d4c41 }),
    frame: new THREE.MeshLambertMaterial({ color: 0xf8f3d7 }),
    shade: new THREE.MeshLambertMaterial({ color: 0x2d2a24 }),
    idolCloth: new THREE.MeshLambertMaterial({ color: 0xe35353 }),
    idolAccent: new THREE.MeshLambertMaterial({ color: 0xf5c842 }),
    cowHorn: new THREE.MeshLambertMaterial({ color: 0xe0d2c5 }),
    cowHoof: new THREE.MeshLambertMaterial({ color: 0x3e2c1a }),
    cowTail: new THREE.MeshLambertMaterial({ color: 0x8b4a2a })
  };

  // Layout features inspired by the provided illustration
  buildMainHall();
  buildLongBarn();
  buildStaffHouse();
  buildPaths();
  scatterMangoTrees();
  placeCattle();

  function createSignPlate(text, width = 8, height = 1.6){
    const canvas = document.createElement('canvas');
    canvas.width = 1024;
    canvas.height = 256;
    const ctx = canvas.getContext('2d');
    ctx.fillStyle = '#0b2813';
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    const gradient = ctx.createLinearGradient(0, 0, canvas.width, canvas.height);
    gradient.addColorStop(0, '#f6f8ee');
    gradient.addColorStop(1, '#dbe9d0');
    ctx.fillStyle = gradient;
    ctx.fillRect(16, 16, canvas.width - 32, canvas.height - 32);
    ctx.fillStyle = '#0b2813';
    ctx.font = 'bold 144px "Helvetica Neue", Arial, sans-serif';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText(text, canvas.width / 2, canvas.height / 2);

    const texture = new THREE.CanvasTexture(canvas);
    texture.anisotropy = 4;
    const material = new THREE.MeshBasicMaterial({ map: texture, transparent: true });
    const geometry = new THREE.PlaneGeometry(width, height);
    const mesh = new THREE.Mesh(geometry, material);
    mesh.renderOrder = 5;
    return mesh;
  }

  function buildMainHall(){
    const hall = new THREE.Group();

    const base = new THREE.Mesh(new THREE.BoxGeometry(44, 1, 28), materials.highlight);
    base.position.y = 0.5;
    hall.add(base);

    const plinth = new THREE.Mesh(new THREE.BoxGeometry(42, 0.9, 24), materials.plaster);
    plinth.position.y = 1;
    hall.add(plinth);

    const body = new THREE.Mesh(new THREE.BoxGeometry(40, 7.8, 20), materials.brick);
    body.position.y = 5;
    hall.add(body);

    const band = new THREE.Mesh(new THREE.BoxGeometry(40.6, 0.6, 20.6), materials.highlight);
    band.position.y = 8.6;
    hall.add(band);

    const windowConfig = {
      width: 2.3,
      height: 2.8,
      sillHeight: 4.25,
      inset: 11.3
    };
    const windowY = windowConfig.sillHeight + windowConfig.height / 2;
    const windowOffsets = [-11.2, -3.7, 3.7, 11.2];
    windowOffsets.forEach((x)=>{
      const front = createWindowFrame(windowConfig.width, windowConfig.height, 0.35);
      front.position.set(x, windowY, windowConfig.inset);
      hall.add(front);

      const rear = createWindowFrame(windowConfig.width, windowConfig.height, 0.35);
      rear.position.set(x, windowY, -windowConfig.inset);
      rear.rotation.y = Math.PI;
      hall.add(rear);
    });

    const sideY = windowConfig.sillHeight + windowConfig.height / 2 - 0.2;
    [-6.5, 0, 6.5].forEach((z)=>{
      const east = createWindowFrame(2, 2.6, 0.3);
      east.position.set(20.3, sideY, z);
      east.rotation.y = Math.PI/2;
      hall.add(east);

      const west = createWindowFrame(2, 2.6, 0.3);
      west.position.set(-20.3, sideY, z);
      west.rotation.y = -Math.PI/2;
      hall.add(west);
    });

    const porch = new THREE.Group();
    const steps = new THREE.Mesh(new THREE.BoxGeometry(14, 1.6, 8), materials.highlight);
    steps.position.set(0, 0.8, 15.5);
    steps.rotation.x = THREE.MathUtils.degToRad(-6);
    porch.add(steps);

    const landing = new THREE.Mesh(new THREE.BoxGeometry(16, 0.5, 8.4), materials.plaster);
    landing.position.set(0, 2.1, 13);
    porch.add(landing);

    const canopy = new THREE.Mesh(new THREE.BoxGeometry(16, 0.5, 8.4), materials.clayRoof);
    canopy.position.set(0, 6.8, 13.4);
    canopy.rotation.x = THREE.MathUtils.degToRad(-12);
    canopy.material = materials.clayRoof.clone();
    canopy.material.side = THREE.DoubleSide;
    porch.add(canopy);

    const postGeo = new THREE.CylinderGeometry(0.45, 0.45, 5.6, 16);
    [-6.2, 6.2].forEach((x)=>{
      const post = new THREE.Mesh(postGeo, materials.highlight);
      post.position.set(x, 3, 16.2);
      porch.add(post);
    });
    hall.add(porch);

    const entryFrame = createDoorFrame(4, 4.4, 0.6);
    entryFrame.position.set(0, 3.6, 10.2);
    hall.add(entryFrame);

    const doorway = new THREE.Mesh(new THREE.PlaneGeometry(3.6, 4.4, 1, 1), materials.shade);
    doorway.position.set(0, 3.6, 9.79);
    doorway.rotation.y = Math.PI;
    hall.add(doorway);

    hillockLandscape(hall);

    const roofGroup = createMainRoof();
    hall.add(roofGroup);

    const signage = createSignPlate('Nitai Gauranga Temple', 12, 2.2);
    signage.position.set(0, 6.4, windowConfig.inset + 0.32);
    signage.rotation.set(-THREE.MathUtils.degToRad(88), 0, 0);
    signage.castShadow = false;
    hall.add(signage);

    addTempleInterior(hall);

    hall.position.set(0, 0, 0);
    scene.add(hall);
  }

  function createWindowFrame(width, height, depth){
    const frame = new THREE.Group();
    const thickness = 0.2;
    const sillThickness = 0.3;
    const innerDepth = 0.24;

    const top = new THREE.Mesh(new THREE.BoxGeometry(width, thickness, depth), materials.frame);
    top.position.set(0, height/2, 0);
    frame.add(top);

    const bottom = new THREE.Mesh(new THREE.BoxGeometry(width, sillThickness, depth), materials.frame);
    bottom.position.set(0, -height/2, 0);
    frame.add(bottom);

    const sideGeo = new THREE.BoxGeometry(thickness, height, depth);
    const left = new THREE.Mesh(sideGeo, materials.frame);
    left.position.set(-width/2, 0, 0);
    frame.add(left);
    const right = new THREE.Mesh(sideGeo, materials.frame);
    right.position.set(width/2, 0, 0);
    frame.add(right);

    const shade = new THREE.Mesh(new THREE.PlaneGeometry(width-0.5, height-0.5, 1, 1), materials.shade);
    shade.position.set(0, 0, -innerDepth);
    frame.add(shade);

    return frame;
  }

  function createDoorFrame(width, height, depth){
    const frame = new THREE.Group();
    const thickness = 0.4;

    const lintel = new THREE.Mesh(new THREE.BoxGeometry(width, thickness, depth), materials.highlight);
    lintel.position.y = height/2;
    frame.add(lintel);

    const jambGeo = new THREE.BoxGeometry(thickness, height, depth);
    const jambL = new THREE.Mesh(jambGeo, materials.highlight);
    jambL.position.set(-width/2 + thickness/2, height/2 - thickness/2, 0);
    frame.add(jambL);

    const jambR = new THREE.Mesh(jambGeo, materials.highlight);
    jambR.position.set(width/2 - thickness/2, height/2 - thickness/2, 0);
    frame.add(jambR);

    return frame;
  }

  function hillockLandscape(hall){
    const planter = new THREE.Mesh(new THREE.BoxGeometry(38, 0.6, 5.2), materials.highlight);
    planter.position.set(0, 1.15, 11.6);
    hall.add(planter);

    const soil = new THREE.Mesh(new THREE.BoxGeometry(37, 0.4, 4.6), materials.grassPatch);
    soil.position.set(0, 1.35, 11.6);
    hall.add(soil);
  }

  function createMainRoof(){
    const roof = new THREE.Group();
    const hallWidth = 40;
    const hallDepth = 20;
    const overhangX = 2.8;
    const overhangZ = 2.4;
    const eaveHeight = 8.6;
    const slopeAngle = THREE.MathUtils.degToRad(24);
    const halfWidth = hallWidth / 2 + overhangX;
    const halfDepth = hallDepth / 2 + overhangZ;
    const ridgeHeight = eaveHeight + Math.tan(slopeAngle) * halfDepth;

    const roofPositions = new Float32Array([
      -halfWidth, eaveHeight, halfDepth,
      -halfWidth, eaveHeight, -halfDepth,
      0, ridgeHeight, halfDepth,

      -halfWidth, eaveHeight, -halfDepth,
      0, ridgeHeight, -halfDepth,
      0, ridgeHeight, halfDepth,

      halfWidth, eaveHeight, halfDepth,
      0, ridgeHeight, halfDepth,
      halfWidth, eaveHeight, -halfDepth,

      halfWidth, eaveHeight, -halfDepth,
      0, ridgeHeight, halfDepth,
      0, ridgeHeight, -halfDepth
    ]);
    const roofGeometry = new THREE.BufferGeometry();
    roofGeometry.setAttribute('position', new THREE.Float32BufferAttribute(roofPositions, 3));
    roofGeometry.computeVertexNormals();

    const roofMaterial = materials.clayRoof.clone();
    roofMaterial.side = THREE.DoubleSide;
    roofMaterial.flatShading = true;
    roofMaterial.polygonOffset = true;
    roofMaterial.polygonOffsetFactor = -0.8;
    roofMaterial.polygonOffsetUnits = -4;

    const roofSurface = new THREE.Mesh(roofGeometry, roofMaterial);
    roofSurface.frustumCulled = false;
    roof.add(roofSurface);

    const fasciaMaterial = materials.highlight.clone();
    fasciaMaterial.side = THREE.DoubleSide;

    function createGable(z){
      const gableGeo = new THREE.BufferGeometry();
      gableGeo.setAttribute('position', new THREE.Float32BufferAttribute([
        -halfWidth, eaveHeight, z,
        halfWidth, eaveHeight, z,
        0, ridgeHeight, z
      ], 3));
      gableGeo.computeVertexNormals();
      return new THREE.Mesh(gableGeo, fasciaMaterial);
    }
    roof.add(createGable(halfDepth));
    roof.add(createGable(-halfDepth));

    function createEaveBoard(z){
      const board = new THREE.Mesh(
        new THREE.BoxGeometry(hallWidth + overhangX * 2, 0.35, 0.55),
        fasciaMaterial
      );
      board.position.set(0, eaveHeight - 0.1, z);
      return board;
    }
    roof.add(createEaveBoard(halfDepth - 0.1));
    roof.add(createEaveBoard(-halfDepth + 0.1));

    function createSideEave(sign){
      const board = new THREE.Mesh(
        new THREE.BoxGeometry(0.55, 0.35, hallDepth + overhangZ * 2),
        fasciaMaterial
      );
      board.position.set(sign * (halfWidth - 0.1), eaveHeight - 0.1, 0);
      return board;
    }
    roof.add(createSideEave(1));
    roof.add(createSideEave(-1));

    return roof;
  }

  function addTempleInterior(hall){
    const sanctum = new THREE.Group();

    const dais = new THREE.Mesh(new THREE.BoxGeometry(8, 1.1, 3.4), materials.highlight);
    dais.position.set(0, 1.2, -4.8);
    sanctum.add(dais);

    const backdrop = new THREE.Mesh(new THREE.PlaneGeometry(7.4, 5.4, 1, 1), materials.shade);
    backdrop.position.set(0, 3.9, -7.8);
    sanctum.add(backdrop);

    const idols = createIdolGroup();
    idols.position.set(0, 2.4, -5.2);
    sanctum.add(idols);

    hall.add(sanctum);
  }

  function createIdolGroup(){
    const group = new THREE.Group();
    const base = new THREE.Mesh(new THREE.BoxGeometry(5.2, 0.55, 1.8), materials.highlight);
    base.position.y = 0.28;
    group.add(base);

    const figureData = [
      { x: -1.8, height: 1.65, color: 0xffd1b0 }, // Sita
      { x: -0.5, height: 1.95, color: 0xfcc8a2 }, // Rama
      { x: 1.0, height: 1.85, color: 0xfcc8a2 }, // Lakshmana
      { x: 2.2, height: 1.45, color: 0xffd1b0 }  // Hanuman
    ];

    figureData.forEach((cfg, idx)=>{
      const skinMat = new THREE.MeshLambertMaterial({ color: cfg.color });
      const clothMat = idx === 1 ? materials.idolCloth : new THREE.MeshLambertMaterial({ color: 0xd94745 });
      const accentMat = materials.idolAccent;

      const body = new THREE.Mesh(new THREE.CapsuleGeometry(0.27, cfg.height-0.65, 16, 22), skinMat);
      body.position.set(cfg.x, cfg.height/2 + 0.35, 0);
      group.add(body);

      const head = new THREE.Mesh(new THREE.SphereGeometry(0.27, 18, 14), skinMat);
      head.position.set(cfg.x, cfg.height + 0.22, 0);
      group.add(head);

      const sash = new THREE.Mesh(new THREE.TorusGeometry(0.34, 0.08, 16, 26), clothMat);
      sash.rotation.x = Math.PI/2;
      sash.position.set(cfg.x, cfg.height/2 + 0.48, 0.18);
      group.add(sash);

      if(idx === 1){
        const bow = new THREE.Mesh(new THREE.TorusGeometry(1, 0.06, 18, 38, Math.PI*1.2), accentMat);
        bow.rotation.set(0, Math.PI/2, 0);
        bow.position.set(cfg.x - 0.3, cfg.height + 0.45, 0.25);
        group.add(bow);
      }

      if(idx === 3){
        body.scale.set(0.82, 0.7, 0.82);
        head.position.y -= 0.28;
        const mace = new THREE.Mesh(new THREE.SphereGeometry(0.28, 18, 14), accentMat);
        mace.position.set(cfg.x + 0.45, cfg.height/2 + 0.25, 0.05);
        group.add(mace);
      }
    });

    return group;
  }

  function buildLongBarn(){
    const shed = new THREE.Group();
    const length = 44;
    const width = 12;
    const overhang = 1.6;
    const wallHeight = 3.8;
    const eaveHeight = wallHeight + 0.6;
    const roofRise = 3.2;

    const base = new THREE.Mesh(new THREE.BoxGeometry(length + 2.6, 0.6, width + 3), materials.highlight);
    base.position.y = 0.3;
    shed.add(base);

    const floorMat = new THREE.MeshLambertMaterial({ color: 0xd8c9a3 });
    const floor = new THREE.Mesh(new THREE.BoxGeometry(length + 1.8, 0.2, width + 1.4), floorMat);
    floor.position.y = 0.11;
    shed.add(floor);

    const parapetHeight = 1.9;
    const sideWallGeo = new THREE.BoxGeometry(length, parapetHeight, 0.5);
    const eastWall = new THREE.Mesh(sideWallGeo, materials.brick);
    eastWall.position.set(0, parapetHeight / 2 + 0.6, width / 2);
    shed.add(eastWall);
    const westWall = eastWall.clone();
    westWall.position.z = -width / 2;
    shed.add(westWall);

    const endWallHeight = 1.8;
    const endWallGeo = new THREE.BoxGeometry(0.5, endWallHeight, width);
    const frontWall = new THREE.Mesh(endWallGeo, materials.brick);
    frontWall.position.set(-length / 2, endWallHeight / 2 + 0.6, 0);
    shed.add(frontWall);
    const backWall = frontWall.clone();
    backWall.position.x = length / 2;
    shed.add(backWall);

    const postGeo = new THREE.BoxGeometry(0.45, wallHeight + 0.4, 0.45);
    const postSpacing = length / 6;
    for(let i=0;i<=6;i++){
      const x = -length/2 + i * postSpacing;
      const southPost = new THREE.Mesh(postGeo, materials.highlight);
      southPost.position.set(x, (wallHeight + 0.4)/2 + 0.6, width/2 - 0.35);
      shed.add(southPost);
      const northPost = southPost.clone();
      northPost.position.z = -width/2 + 0.35;
      shed.add(northPost);
    }

    const beam = new THREE.Mesh(new THREE.BoxGeometry(length + 0.8, 0.35, 0.5), materials.highlight);
    beam.position.set(0, eaveHeight, width/2 + 0.1);
    shed.add(beam);
    const beamBack = beam.clone();
    beamBack.position.z = -width/2 - 0.1;
    shed.add(beamBack);

    const feedTroughGeo = new THREE.BoxGeometry(length - 4, 0.6, 0.6);
    const feedTrough = new THREE.Mesh(feedTroughGeo, new THREE.MeshLambertMaterial({ color: 0xbca57a }));
    feedTrough.position.set(0, 0.9, width/2 - 0.9);
    shed.add(feedTrough);

    const bedding = new THREE.Mesh(new THREE.BoxGeometry(length - 6, 0.12, width - 4.5), new THREE.MeshLambertMaterial({ color: 0xf3e7c3 }));
    bedding.position.set(0, 0.22, -0.6);
    shed.add(bedding);

    const roofSegments = 32;
    const span = width + overhang * 2;
    const roofGeo = new THREE.PlaneGeometry(length + overhang * 2, span, roofSegments, 8);
    const pos = roofGeo.attributes.position;
    const halfSpan = span / 2;
    for(let i=0;i<pos.count;i++){
      const x = pos.getX(i);
      const z = pos.getY(i);
      const ratio = Math.min(1, Math.abs(z) / halfSpan);
      const y = eaveHeight + roofRise * (1 - Math.pow(ratio, 1.4));
      pos.setX(i, x);
      pos.setY(i, y);
      pos.setZ(i, z);
    }
    pos.needsUpdate = true;
    roofGeo.computeVertexNormals();
    const roofMat = materials.metalRoof.clone();
    roofMat.side = THREE.DoubleSide;
    roofMat.flatShading = true;
    roofMat.polygonOffset = true;
    roofMat.polygonOffsetFactor = -0.8;
    roofMat.polygonOffsetUnits = -4;
    const roof = new THREE.Mesh(roofGeo, roofMat);
    shed.add(roof);

    const stallCowPalettes = [
      { primary: 0xb8744f, secondary: 0xffffff },
      { primary: 0x8c4c36, secondary: 0xf2e2d0 },
      { primary: 0x9f5b3d, secondary: 0xf4ede2 }
    ];
    const cowCount = 5;
    const laneOffset = width/2 - 2;
    for(let i=0;i<cowCount;i++){
      const cow = createGirCow({
        scale: 0.55,
        grazing: false,
        palette: stallCowPalettes[i % stallCowPalettes.length]
      });
      cow.position.set(-length/2 + 6 + i * (length - 12)/(cowCount - 1), 0, laneOffset);
      cow.rotation.y = Math.PI;
      shed.add(cow);
    }

    const exitRamp = new THREE.Mesh(new THREE.BoxGeometry(4.5, 0.35, 8), materials.highlight);
    exitRamp.position.set(length/2 + 0.9, 0.18, 0);
    shed.add(exitRamp);

    shed.position.set(48, 0, -6);
    shed.rotation.y = Math.PI / 2;
    scene.add(shed);
    plantCowshedBufferTrees(shed.position.x, shed.position.z);
  }

  function buildStaffHouse(){
    const staff = new THREE.Group();
    const footprint = { x: 12, z: 9 };
    const storyHeight = 3.6;
    const levels = 4;
    const plinth = new THREE.Mesh(new THREE.BoxGeometry(footprint.x + 4, 0.6, footprint.z + 4), materials.highlight);
    plinth.position.y = 0.3;
    staff.add(plinth);

    for(let level=0; level<levels; level++){
      const storey = new THREE.Group();
      const yBase = 0.6 + level * storyHeight;
      const body = new THREE.Mesh(new THREE.BoxGeometry(footprint.x, storyHeight - 0.6, footprint.z), materials.brick);
      body.position.y = yBase + (storyHeight - 0.6)/2;
      storey.add(body);

      if(level < levels - 1){
        const slab = new THREE.Mesh(new THREE.BoxGeometry(footprint.x + 0.4, 0.3, footprint.z + 0.4), materials.plaster);
        slab.position.y = yBase + storyHeight - 0.15;
        storey.add(slab);
      }

      const balconyDepth = 2.2;
      const balcony = new THREE.Mesh(new THREE.BoxGeometry(footprint.x - 2.5, 0.28, balconyDepth), materials.highlight);
      balcony.position.set(0, yBase + 1.4, footprint.z/2 + balconyDepth/2 - 0.4);
      storey.add(balcony);

      const railing = new THREE.Mesh(new THREE.BoxGeometry(footprint.x - 2.8, 1.1, 0.2), new THREE.MeshLambertMaterial({ color: 0xe5e7eb }));
      railing.position.set(0, balcony.position.y + 0.7, footprint.z/2 + balconyDepth - 0.6);
      storey.add(railing);

      const postGeo = new THREE.BoxGeometry(0.3, balcony.position.y + 0.3, 0.3);
      [-footprint.x/2 + 1.1, footprint.x/2 - 1.1].forEach((x)=>{
        const post = new THREE.Mesh(postGeo, materials.highlight);
        post.position.set(x, (postGeo.parameters.height)/2 + 0.6, footprint.z/2 + balconyDepth - 0.6);
        storey.add(post);
      });

      storey.position.y = level * 0.05;
      staff.add(storey);
    }

    const roof = new THREE.Group();
    const roofHeight = 0.6 + levels * storyHeight + 0.2;
    const roofSpanX = footprint.x + 2.6;
    const roofSpanZ = footprint.z + 2.6;
    const apexHeight = 3.8;
    const roofGeo = new THREE.PlaneGeometry(roofSpanX, roofSpanZ, 18, 18);
    const pos = roofGeo.attributes.position;
    const halfX = roofSpanX / 2;
    const halfZ = roofSpanZ / 2;
    for(let i=0;i<pos.count;i++){
      const x = pos.getX(i);
      const z = pos.getY(i);
      const nx = Math.abs(x) / halfX;
      const nz = Math.abs(z) / halfZ;
      const y = roofHeight + apexHeight * (1 - Math.max(nx, nz));
      pos.setX(i, x);
      pos.setY(i, y);
      pos.setZ(i, z);
    }
    pos.needsUpdate = true;
    roofGeo.computeVertexNormals();
    const roofMat = materials.clayRoof.clone();
    roofMat.side = THREE.DoubleSide;
    roofMat.flatShading = true;
    roofMat.polygonOffset = true;
    roofMat.polygonOffsetFactor = -0.6;
    roofMat.polygonOffsetUnits = -3;
    const roofMesh = new THREE.Mesh(roofGeo, roofMat);
    roof.add(roofMesh);
    staff.add(roof);

    staff.position.set(-24, 0, -8);
    staff.rotation.y = THREE.MathUtils.degToRad(12);
    scene.add(staff);
  }

  function buildPaths(){
    const loop = new THREE.Mesh(new THREE.RingGeometry(38, 42, 64), materials.path);
    loop.rotation.x = -Math.PI/2;
    loop.position.y = 0.02;
    scene.add(loop);

    const frontPath = new THREE.Mesh(new THREE.PlaneGeometry(8, 26), materials.path);
    frontPath.rotation.x = -Math.PI/2;
    frontPath.position.set(0, 0.01, 20);
    scene.add(frontPath);

    const eastConnector = new THREE.Mesh(new THREE.PlaneGeometry(26, 8), materials.path);
    eastConnector.rotation.x = -Math.PI/2;
    eastConnector.rotation.z = THREE.MathUtils.degToRad(-6);
    eastConnector.position.set(32, 0.01, -6);
    scene.add(eastConnector);

    const barnCourt = new THREE.Mesh(new THREE.PlaneGeometry(14, 40), materials.path);
    barnCourt.rotation.x = -Math.PI/2;
    barnCourt.position.set(48, 0.01, -6);
    scene.add(barnCourt);

    const staffConnector = new THREE.Mesh(new THREE.PlaneGeometry(20, 6), materials.path);
    staffConnector.rotation.x = -Math.PI/2;
    staffConnector.position.set(-12, 0.01, -6);
    staffConnector.rotation.z = THREE.MathUtils.degToRad(22);
    scene.add(staffConnector);

    const staffCourt = new THREE.Mesh(new THREE.PlaneGeometry(16, 20), materials.path);
    staffCourt.rotation.x = -Math.PI/2;
    staffCourt.position.set(-24, 0.01, -8);
    scene.add(staffCourt);

    const innerLawn = new THREE.Mesh(new THREE.CircleGeometry(26, 48), materials.grassPatch);
    innerLawn.rotation.x = -Math.PI/2;
    innerLawn.position.y = 0.015;
    scene.add(innerLawn);
  }

  function plantCowshedBufferTrees(baseX, baseZ){
    const buffer = [
      { x: -12, z: -2, scale: 1.1 },
      { x: -16, z: 3, scale: 0.95 },
      { x: -20, z: -5, scale: 1.05 }
    ];
    buffer.forEach(({ x, z, scale })=>{
      const tree = createMangoTree(scale);
      tree.position.set(baseX + x, 0, baseZ + z);
      scene.add(tree);
    });
  }

  function scatterMangoTrees(){
    const random = (a,b)=> a + Math.random()*(b-a);
    const placed = [];

    function canPlace(x, z, min=6){
      return placed.every((p)=>Math.hypot(p.x - x, p.z - z) > min);
    }

    function addTree(x, z, scale=1){
      if(Math.hypot(x, z) < 22) return false; // keep plaza open
      if(Math.abs(x) < 24 && Math.abs(z) < 18) return false; // main hall buffer
      if(Math.abs(x) < 14 && z > 12) return false; // avoid entry axis
      if(Math.abs(x-48) < 22 && Math.abs(z+6) < 18) return false; // cowshed courtyard
      if(Math.abs(x+24) < 14 && Math.abs(z+8) < 14) return false; // staff house buffer
      if(!canPlace(x, z, 7)) return false;
      const tree = createMangoTree(scale);
      tree.position.set(x, 0, z);
      scene.add(tree);
      placed.push({ x, z });
      return true;
    }

    // structured orchard rows near the barn and entrance
    const orchards = [
      { origin: { x: -42, z: 18 }, rows: 3, cols: 4, spacingX: 13, spacingZ: 11, scale: 1.05 },
      { origin: { x: 32, z: 30 }, rows: 2, cols: 4, spacingX: 12, spacingZ: 11, scale: 1 }
    ];
    orchards.forEach(({ origin, rows, cols, spacingX, spacingZ, scale })=>{
      for(let r=0;r<rows;r++){
        for(let c=0;c<cols;c++){
          const x = origin.x + c*spacingX + (r%2 ? spacingX*0.5 : 0);
          const z = origin.z + r*spacingZ;
          addTree(x, z, scale * random(0.9, 1.08));
        }
      }
    });

    // additional scattered trees around the perimeter for density
    let attempts = 0;
    while(placed.length < 48 && attempts < 220){
      const x = random(-80, 80);
      const z = random(-80, 80);
      if(z < -38) { attempts++; continue; }
      const scale = random(0.9, 1.2);
      if(addTree(x, z, scale)){
        // occasionally add a companion tree for clustered feel
        if(Math.random() < 0.35){
          const offsetAngle = random(0, Math.PI*2);
          const dist = random(6, 9);
          addTree(x + Math.cos(offsetAngle)*dist, z + Math.sin(offsetAngle)*dist, scale * random(0.85, 1.05));
        }
      }
      attempts++;
    }
  }

  function createMangoTree(scale = 1){
    const tree = new THREE.Group();
    const trunkHeight = THREE.MathUtils.lerp(4.6, 6.6, Math.random()) * scale;
    const trunkRadiusTop = 0.28 * scale;
    const trunkRadiusBottom = 0.55 * scale;
    const trunk = new THREE.Mesh(new THREE.CylinderGeometry(trunkRadiusTop, trunkRadiusBottom, trunkHeight, 12), materials.treeBark);
    trunk.position.y = trunkHeight / 2;
    tree.add(trunk);

    const canopy = new THREE.Group();
    const clusterCount = 6 + Math.floor(Math.random()*3);
    for(let i=0;i<clusterCount;i++){
      const radius = THREE.MathUtils.lerp(1.5, 2.4, Math.random()) * scale;
      const geo = new THREE.SphereGeometry(radius, 18, 16);
      const mat = Math.random() > 0.5 ? materials.mangoLeaf : materials.mangoLeafSun;
      const cluster = new THREE.Mesh(geo, mat);
      const angle = Math.random()*Math.PI*2;
      const dist = THREE.MathUtils.lerp(0.2, 1.4, Math.random()) * scale;
      const y = THREE.MathUtils.lerp(-0.3, 0.9, Math.random()) * scale;
      cluster.position.set(Math.cos(angle)*dist, y, Math.sin(angle)*dist);
      canopy.add(cluster);
    }

    canopy.position.y = trunkHeight - 0.5 * scale;
    tree.add(canopy);

    const fruitCount = 6 + Math.floor(Math.random()*6);
    for(let i=0;i<fruitCount;i++){
      const fruit = new THREE.Mesh(new THREE.SphereGeometry(0.18*scale, 10, 10), materials.mangoFruit);
      fruit.scale.set(0.8, 1.3, 0.8);
      const angle = Math.random()*Math.PI*2;
      const elev = THREE.MathUtils.lerp(-0.2, 0.9, Math.random()) * scale;
      const radius = THREE.MathUtils.lerp(1.2, 2.1, Math.random()) * scale;
      fruit.position.set(Math.cos(angle)*radius, canopy.position.y + elev, Math.sin(angle)*radius);
      tree.add(fruit);
    }

    return tree;
  }

  function placeCattle(){
    const palettes = [
      { primary: 0x9f5b3d, secondary: 0xf4ede2 },
      { primary: 0xb8744f, secondary: 0xffffff },
      { primary: 0x8c4c36, secondary: 0xf2e2d0 }
    ];

    const herd = [
      { x: 20, z: 26, rot: Math.PI/9, palette: palettes[0], grazing: true },
      { x: 10, z: -36, rot: Math.PI*1.2, palette: palettes[2], grazing: true },
      { x: -28, z: 20, rot: Math.PI*0.9, palette: palettes[2], grazing: false },
      { x: -40, z: -16, rot: Math.PI*0.65, palette: palettes[1], grazing: true },
      { x: 34, z: -26, rot: Math.PI*1.08, palette: palettes[0], grazing: false },
      { x: -14, z: 34, rot: Math.PI*0.4, palette: palettes[1], grazing: false },
      { x: 42, z: 12, rot: Math.PI*0.18, palette: palettes[1], grazing: false }
    ];

    herd.forEach((cfg, idx)=>{
      const cow = createGirCow({
        palette: cfg.palette || palettes[idx % palettes.length],
        grazing: cfg.grazing,
        scale: THREE.MathUtils.lerp(0.92, 1.07, Math.random())
      });
      cow.position.set(cfg.x, 0, cfg.z);
      cow.rotation.y = cfg.rot;
      scene.add(cow);
    });
  }

  function createGirCow({ palette = { primary: 0x9f5b3d, secondary: 0xf4ede2 }, grazing = false, scale = 1 } = {}){
    const group = new THREE.Group();
    const matBody = new THREE.MeshLambertMaterial({ color: palette.primary });
    const matPatch = new THREE.MeshLambertMaterial({ color: palette.secondary });
    const matHorn = materials.cowHorn;
    const matHoof = materials.cowHoof;
    const matTail = materials.cowTail;
    const matEye = new THREE.MeshLambertMaterial({ color: 0x2b1a12 });

    const torso = new THREE.Mesh(new THREE.CapsuleGeometry(0.95*scale, 2.5*scale, 14, 18), matBody);
    torso.rotation.z = Math.PI/2;
    torso.position.y = 1.65*scale;
    group.add(torso);

    const chest = new THREE.Mesh(new THREE.SphereGeometry(0.9*scale, 18, 16), matBody);
    chest.scale.set(1.15, 0.9, 1.2);
    chest.position.set(-1.2*scale, 1.5*scale, 0);
    group.add(chest);

    const rump = new THREE.Mesh(new THREE.SphereGeometry(0.95*scale, 18, 16), matBody);
    rump.scale.set(1.2, 0.95, 1.25);
    rump.position.set(1.35*scale, 1.6*scale, 0);
    group.add(rump);

    const hump = new THREE.Mesh(new THREE.SphereGeometry(0.55*scale, 16, 12), matBody);
    hump.scale.set(1.4, 1.1, 1.1);
    hump.position.set(-0.35*scale, 2.45*scale, 0);
    group.add(hump);

    const belly = new THREE.Mesh(new THREE.SphereGeometry(0.8*scale, 16, 14), matPatch);
    belly.scale.set(1.6, 0.55, 1.5);
    belly.position.set(0, 1.05*scale, 0);
    group.add(belly);

    const udder = new THREE.Mesh(new THREE.SphereGeometry(0.35*scale, 12, 12), matPatch);
    udder.scale.set(1.1, 0.8, 1.1);
    udder.position.set(0.6*scale, 0.75*scale, 0);
    group.add(udder);

    const neck = new THREE.Group();
    neck.position.set(-1.9*scale, 1.95*scale, 0);
    neck.rotation.z = grazing ? THREE.MathUtils.degToRad(-48) : THREE.MathUtils.degToRad(-15);
    group.add(neck);

    const neckMesh = new THREE.Mesh(new THREE.CapsuleGeometry(0.35*scale, 1.05*scale, 12, 16), matBody);
    neckMesh.rotation.z = Math.PI/2.6;
    neckMesh.position.set(-0.55*scale, 0, 0);
    neck.add(neckMesh);

    const dewlap = new THREE.Mesh(new THREE.SphereGeometry(0.45*scale, 12, 10), matPatch);
    dewlap.scale.set(0.8, 1.6, 0.7);
    dewlap.position.set(-0.45*scale, -0.6*scale, 0);
    neck.add(dewlap);

    const head = new THREE.Group();
    head.position.set(-1.1*scale, grazing ? -0.3*scale : 0, 0);
    if(grazing){
      head.rotation.z = THREE.MathUtils.degToRad(-18);
    }
    neck.add(head);

    const skull = new THREE.Mesh(new THREE.BoxGeometry(0.85*scale, 0.7*scale, 0.6*scale), matBody);
    skull.position.set(-0.45*scale, 0.28*scale, 0);
    head.add(skull);

    const muzzle = new THREE.Mesh(new THREE.CylinderGeometry(0.26*scale, 0.34*scale, 0.55*scale, 16), matPatch);
    muzzle.rotation.z = Math.PI/2;
    muzzle.position.set(-0.95*scale, 0.05*scale, 0);
    head.add(muzzle);

    const nose = new THREE.Mesh(new THREE.SphereGeometry(0.14*scale, 10, 10), new THREE.MeshLambertMaterial({ color: 0x5a2f1e }));
    nose.scale.set(1.4, 0.7, 1);
    nose.position.set(-1.22*scale, 0.05*scale, 0);
    head.add(nose);

    const earGeo = new THREE.SphereGeometry(0.26*scale, 12, 12);
    const earL = new THREE.Mesh(earGeo, matPatch);
    earL.scale.set(0.55, 1.7, 0.35);
    earL.position.set(-0.1*scale, -0.05*scale, 0.62*scale);
    earL.rotation.y = THREE.MathUtils.degToRad(18);
    earL.rotation.z = THREE.MathUtils.degToRad(32);
    head.add(earL);
    const earR = earL.clone();
    earR.position.z *= -1;
    earR.rotation.y *= -1;
    earR.rotation.z *= -1;
    head.add(earR);

    const eyeGeo = new THREE.SphereGeometry(0.07*scale, 8, 8);
    const eyeL = new THREE.Mesh(eyeGeo, matEye);
    eyeL.position.set(-0.35*scale, 0.23*scale, 0.32*scale);
    head.add(eyeL);
    const eyeR = eyeL.clone();
    eyeR.position.z *= -1;
    head.add(eyeR);

    function addHorn(sign){
      const base = new THREE.Mesh(new THREE.CylinderGeometry(0.12*scale, 0.2*scale, 0.32*scale, 10), matHorn);
      base.position.set(-0.1*scale, 0.55*scale, sign*0.28*scale);
      base.rotation.z = Math.PI/2.5;
      base.rotation.x = sign * THREE.MathUtils.degToRad(6);
      head.add(base);

      const tip = new THREE.Mesh(new THREE.CylinderGeometry(0.05*scale, 0.12*scale, 0.55*scale, 10), matHorn);
      tip.position.set(-0.48*scale, 0.72*scale, sign*0.45*scale);
      tip.rotation.z = Math.PI/2.2;
      tip.rotation.x = sign * THREE.MathUtils.degToRad(18);
      head.add(tip);
    }
    addHorn(1);
    addHorn(-1);

    const legUpperGeo = new THREE.CylinderGeometry(0.15*scale, 0.2*scale, 0.95*scale, 10);
    const legLowerGeo = new THREE.CylinderGeometry(0.12*scale, 0.13*scale, 0.75*scale, 10);
    const legPositions = [
      { x: -1.25, z: -0.48 },
      { x: -1.25, z: 0.48 },
      { x: 1.15, z: -0.5 },
      { x: 1.15, z: 0.5 }
    ];
    legPositions.forEach((pos)=>{
      const upper = new THREE.Mesh(legUpperGeo, matBody);
      upper.position.set(pos.x*scale, 1.15*scale, pos.z*scale);
      group.add(upper);

      const lower = new THREE.Mesh(legLowerGeo, matPatch);
      lower.position.set(pos.x*scale, 0.55*scale, pos.z*scale);
      group.add(lower);

      const hoof = new THREE.Mesh(new THREE.CylinderGeometry(0.15*scale, 0.16*scale, 0.24*scale, 10), matHoof);
      hoof.position.set(pos.x*scale, 0.1*scale, pos.z*scale);
      group.add(hoof);
    });

    const tailGroup = new THREE.Group();
    tailGroup.position.set(2.25*scale, 2.15*scale, 0);
    tailGroup.rotation.x = THREE.MathUtils.degToRad(12);
    tailGroup.rotation.z = THREE.MathUtils.degToRad(10);
    const tail = new THREE.Mesh(new THREE.CylinderGeometry(0.05*scale, 0.08*scale, 1.7*scale, 8), matTail);
    tail.position.y = -0.85*scale;
    tailGroup.add(tail);
    const tailTip = new THREE.Mesh(new THREE.SphereGeometry(0.2*scale, 10, 10), matHoof);
    tailTip.position.y = -1.55*scale;
    tailGroup.add(tailTip);
    group.add(tailGroup);

    if(Math.random() < 0.85){
      const patch = new THREE.Mesh(new THREE.SphereGeometry(0.75*scale, 16, 12), matPatch);
      patch.scale.set(1.8, 0.5, 1.3);
      const side = Math.random() > 0.5 ? 1 : -1;
      patch.position.set(-0.4*scale + Math.random()*1.5*scale, 1.5*scale, side * (0.65*scale));
      patch.position.z += side * 0.3*scale;
      group.add(patch);
    }

    return group;
  }

  // Controls
  const controlDom = canvasPanel || canvasBg;
  const controls = new OrbitControls(camera, controlDom);
  controls.target.set(0, 2.8, 0);
  controls.enableDamping = true;
  controls.enablePan = false;
  controls.enableZoom = false;
  controls.dampingFactor = 0.08;
  controls.minDistance = 24;
  controls.maxDistance = 110;
  controls.minPolarAngle = THREE.MathUtils.degToRad(22);
  controls.maxPolarAngle = THREE.MathUtils.degToRad(75);

  if(canvasPanel){
    canvasPanel.addEventListener('wheel', (event)=>{
      if(!controls.enableZoom){ event.stopImmediatePropagation(); }
    }, { passive:true, capture:true });
  }

  let userInteracting = false;
  controls.addEventListener('start', ()=>{ userInteracting = true; });
  controls.addEventListener('end', ()=>{ /* remain true; scrolling will gently resync */ });

  // Size
  function resize(){
    const rectBg = canvasBg.getBoundingClientRect();
    const wBg = Math.max(1, Math.floor(rectBg.width));
    const hBg = Math.max(1, Math.floor(rectBg.height));
    if(canvasBg.width !== wBg || canvasBg.height !== hBg){ rendererBg.setSize(wBg, hBg, false); }
    cameraBg.aspect = wBg / hBg;
    cameraBg.updateProjectionMatrix();

    if(rendererPanel && canvasPanel){
      const rectPanel = canvasPanel.getBoundingClientRect();
      const wPanel = Math.max(1, Math.floor(rectPanel.width));
      const hPanel = Math.max(1, Math.floor(rectPanel.height));
      if(canvasPanel.width !== wPanel || canvasPanel.height !== hPanel){ rendererPanel.setSize(wPanel, hPanel, false); }
      camera.aspect = wPanel / hPanel;
      camera.updateProjectionMatrix();
    } else {
      camera.aspect = wBg / hBg;
      camera.updateProjectionMatrix();
    }
  }
  resize();
  window.addEventListener('resize', resize);

  // Scroll → azimuth mapping
  const baseAzimuth = controls.getAzimuthalAngle ? controls.getAzimuthalAngle() : Math.PI/4;
  const rotationSpan = Math.PI * 1.8; // slightly less than a full turn to match illustration framing
  let desiredAzimuth = baseAzimuth;
  function updateScroll(){
    const doc = document.documentElement;
    const maxScroll = Math.max((doc.scrollHeight - window.innerHeight), 1);
    const scrollTop = window.scrollY || doc.scrollTop || 0;
    const visibleProgress = clamp(scrollTop / maxScroll, 0, 1);
    desiredAzimuth = baseAzimuth + visibleProgress * rotationSpan;
    if(filterOverlay){
      filterOverlay.style.opacity = String(clamp(0.32 + visibleProgress * 0.5, 0.35, 0.9));
    }
  }
  window.addEventListener('scroll', updateScroll, { passive:true });
  updateScroll();

  // Animation loop
  const clock = new THREE.Clock();
  function animate(){
    const dt = clock.getDelta();
    // gently steer azimuth if user is not interacting
    if(!userInteracting){
      const current = (controls.getAzimuthalAngle ? controls.getAzimuthalAngle() : 0);
      const diff = desiredAzimuth - current;
      const step = diff * clamp(dt * 3, 0, 1);
      if(controls.setAzimuthalAngle){
        controls.setAzimuthalAngle(current + step);
      } else if(controls.rotateLeft){
        controls.rotateLeft(-step);
      }
    }
    controls.update();

    if(cameraBg !== camera){
      cameraBg.position.copy(camera.position);
      cameraBg.quaternion.copy(camera.quaternion);
      cameraBg.updateMatrixWorld();
    }

    rendererBg.render(scene, cameraBg);
    if(rendererPanel){
      rendererPanel.render(scene, camera);
    }
    requestAnimationFrame(animate);
  }
  animate();

  // Accessibility: press 'r' to resync to scroll
  window.addEventListener('keydown', (e)=>{
    if(e.key.toLowerCase()==='r'){ userInteracting = false; }
  });
}

// Defer init until DOM is ready for SSR/async safety
if(document.readyState === 'loading'){
  document.addEventListener('DOMContentLoaded', initGoshala3D);
} else {
  initGoshala3D();
}
