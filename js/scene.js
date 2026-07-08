/* ============================================================
   NEURAL SCENE — the 3D orbit board.
   window.NoteScene.init(canvas, { onTap }) then .setNotes(list).
   ============================================================ */
window.NoteScene = (() => {
  let renderer, scene, camera, world, brain;
  let tiles = [], tethers = [];
  let onTapCb = null, colorOfCb = null, labelOfCb = null;
  let velY = 0, velX = 0;
  let dragging = false, lastX = 0, lastY = 0, moved = 0;
  let pinchDist = 0, camZ = 10, resetting = false;
  const _qy = new THREE.Quaternion(), _qx = new THREE.Quaternion();
  const _axisY = new THREE.Vector3(0, 1, 0), _axisX = new THREE.Vector3(1, 0, 0);
  const HOME_Q = new THREE.Quaternion().setFromEuler(new THREE.Euler(-0.12, 0.6, 0));
  function spin(dy, dx) {
    _qy.setFromAxisAngle(_axisY, dy);
    _qx.setFromAxisAngle(_axisX, dx);
    world.quaternion.premultiply(_qy).premultiply(_qx);
  }
  let paused = false, t = 0;
  let orbitR = 5;
  function fitZ() {
    if (!camera) return 10;
    const v = Math.tan((camera.fov * Math.PI / 180) / 2);
    const h = v * camera.aspect;                 // horizontal half-tangent
    const extent = orbitR + 1.5;                 // orbit + tile margin
    return Math.min(30, Math.max(7, (extent / Math.min(v, h)) * 1.12));
  }
  const clampZ = (z) => Math.min(fitZ() * 1.5, Math.max(3.5, z));
  const reduce = matchMedia('(prefers-reduced-motion: reduce)').matches;

  const cssVar = (n) => getComputedStyle(document.documentElement).getPropertyValue(n).trim();
  const tagColor = (tag) => tag ? (cssVar(`--tag-${tag}`) || cssVar('--accent')) : cssVar('--accent');
  const typeColor = (type) => cssVar(`--type-${type}`) || cssVar('--accent');
  const itemColor = (it) => colorOfCb ? colorOfCb(it)
    : ((it.type === 'note' && it.tag) ? tagColor(it.tag) : typeColor(it.type || 'note'));
  const itemLabel = (it) => labelOfCb ? labelOfCb(it) : (it.type || 'note');

  /* ---------- procedural brain ---------- */
  function hash(x, y, z) { const h = Math.sin(x*127.1 + y*311.7 + z*74.7) * 43758.5453; return h - Math.floor(h); }
  function noise(x, y, z) {
    const xi = Math.floor(x), yi = Math.floor(y), zi = Math.floor(z);
    const xf = x-xi, yf = y-yi, zf = z-zi, s = (v) => v*v*(3-2*v);
    let out = 0;
    for (let dx = 0; dx <= 1; dx++) for (let dy = 0; dy <= 1; dy++) for (let dz = 0; dz <= 1; dz++) {
      const w = (dx?s(xf):1-s(xf)) * (dy?s(yf):1-s(yf)) * (dz?s(zf):1-s(zf));
      out += w * hash(xi+dx, yi+dy, zi+dz);
    }
    return out;
  }
  const fbm = (x,y,z) => noise(x,y,z)*0.6 + noise(x*2.3,y*2.3,z*2.3)*0.3 + noise(x*5.1,y*5.1,z*5.1)*0.1;

  /* ---------- REGIONS (anatomy-plausible clusters) ---------- */
  // center positions in brain-local space; brain silhouette is ~[-2..2] x, [-1.4..1.5] y, [-2.4..2.4] z
  const REGIONS = [
    { id:'frontal',    name:'Frontal Lobe',      hue:'#8b7cff', c:[0.0, 0.55, 1.75],  r:1.05,
      fn:'Planning, decisions, and personality.',
      facts:['Doesn\u2019t fully mature until about age 25.','Home to the motor cortex that drives movement.','Damage here can change personality itself.'] },
    { id:'parietal',   name:'Parietal Lobe',     hue:'#56aaff', c:[0.0, 1.05, -0.15], r:1.0,
      fn:'Touch, spatial sense, and navigation.',
      facts:['Builds your sense of where your body is in space.','Lets you feel temperature, pressure, and pain.','Helps you do mental math and read maps.'] },
    { id:'temporal',   name:'Temporal Lobe',     hue:'#2de2e6', c:[1.55, -0.35, 0.55], r:0.95,
      fn:'Hearing, language, and memory.',
      facts:['Processes every sound you hear.','Contains the primary auditory cortex.','Key to understanding spoken language.'] },
    { id:'occipital',  name:'Occipital Lobe',    hue:'#bd8cff', c:[0.0, 0.35, -2.05], r:0.85,
      fn:'Vision and visual recognition.',
      facts:['Turns light into the images you see.','The brain\u2019s smallest lobe.','Sits farthest from your eyes, at the very back.'] },
    { id:'cerebellum', name:'Cerebellum',        hue:'#3dffa2', c:[0.0, -1.05, -1.7], r:0.85,
      fn:'Balance, coordination, and fine motor skills.',
      facts:['Holds over half of all your neurons.','Latin for \u201clittle brain.\u201d','Fine-tunes every smooth, practiced movement.'] },
    { id:'limbic',     name:'Limbic Core',       hue:'#ff6d9d', c:[0.0, -0.05, 0.2], r:0.7,
      fn:'Emotion, memory, and motivation.',
      facts:['The hippocampus here forms new memories.','The amygdala flags fear and threat.','Where emotion and memory intertwine.'] },
    { id:'brainstem',  name:'Brainstem',         hue:'#ffb547', c:[0.0, -1.15, 0.15], r:0.55,
      fn:'Breathing, heartbeat, and alertness.',
      facts:['Keeps you breathing without a thought.','Bridges brain and spinal cord.','Controls heart rate and sleep-wake cycles.'] },
  ];

  let neuralGroup, regionMeshes = [], pulseSys = null, axonMesh = null, DENSITY = null;
  let exploreMode = false, exploreT = 0;
  let onRegionCb = null;
  let activeRegion = null;

  function hex(n){ return new THREE.Color(n); }

  // build one region: soma nodes + branching dendrites, coloured by base identity
  function buildRegion(reg, density) {
    const group = new THREE.Group();
    const center = new THREE.Vector3(...reg.c);
    const base = hex(reg.hue);
    const identity = hex('#8b7cff').lerp(hex('#2de2e6'), Math.random()*0.5); // violet/cyan base

    const nodeCount = Math.round(reg.r * reg.r * density.nodes);
    const somaPos = [], somaCol = [], branchPos = [], branchCol = [];
    const somaWorld = [];

    for (let i = 0; i < nodeCount; i++) {
      // sample inside a squashed sphere to fill the region volume
      let p;
      do {
        p = new THREE.Vector3((Math.random()*2-1), (Math.random()*2-1), (Math.random()*2-1));
      } while (p.length() > 1);
      p.multiplyScalar(reg.r).add(center);
      // clip to overall brain silhouette (ellipsoid)
      const e = (p.x/2.05)**2 + (p.y/1.5)**2 + (p.z/2.45)**2;
      if (e > 1.02) { i--; continue; }
      somaWorld.push(p.clone());
      somaPos.push(p.x, p.y, p.z);
      somaCol.push(identity.r, identity.g, identity.b);

      // dendrites: a few branches wandering outward from the soma
      const branches = density.branches;
      for (let bnch = 0; bnch < branches; bnch++) {
        let cur = p.clone();
        let dir = new THREE.Vector3(Math.random()*2-1, Math.random()*2-1, Math.random()*2-1).normalize().multiplyScalar(0.14);
        const segs = 3 + Math.floor(Math.random()*4);
        for (let s = 0; s < segs; s++) {
          const nxt = cur.clone().add(dir);
          // bias slightly toward region center for cohesion, add jitter for organic look
          dir.add(center.clone().sub(nxt).multiplyScalar(0.03));
          dir.add(new THREE.Vector3(Math.random()*2-1, Math.random()*2-1, Math.random()*2-1).multiplyScalar(0.06));
          dir.clampLength(0.06, 0.16);
          branchPos.push(cur.x, cur.y, cur.z, nxt.x, nxt.y, nxt.z);
          const fade = 0.9 - s*0.12;
          branchCol.push(identity.r*fade, identity.g*fade, identity.b*fade,
                         identity.r*fade, identity.g*fade, identity.b*fade);
          cur = nxt;
        }
      }
    }

    // dendrite lines
    const bGeo = new THREE.BufferGeometry();
    bGeo.setAttribute('position', new THREE.Float32BufferAttribute(branchPos, 3));
    bGeo.setAttribute('color', new THREE.Float32BufferAttribute(branchCol, 3));
    const bMat = new THREE.LineBasicMaterial({ vertexColors: true, transparent: true,
      opacity: 0.34, blending: THREE.AdditiveBlending, depthWrite: false });
    const branchLines = new THREE.LineSegments(bGeo, bMat);
    group.add(branchLines);

    // soma nodes (glowing points)
    const sGeo = new THREE.BufferGeometry();
    sGeo.setAttribute('position', new THREE.Float32BufferAttribute(somaPos, 3));
    sGeo.setAttribute('color', new THREE.Float32BufferAttribute(somaCol, 3));
    const sMat = new THREE.PointsMaterial({ size: 0.055, vertexColors: true, transparent: true,
      opacity: 0.9, blending: THREE.AdditiveBlending, depthWrite: false,
      map: nodeSprite(), sizeAttenuation: true });
    const somaPoints = new THREE.Points(sGeo, sMat);
    group.add(somaPoints);

    group.userData = { reg, base, identity, branchMat: bMat, somaMat: sMat,
      branchLines, somaPoints, somaWorld, center: center.clone(), highlight: 0 };
    return group;
  }

  // soft round sprite for neuron nodes
  let _nodeTex = null;
  function nodeSprite() {
    if (_nodeTex) return _nodeTex;
    const c = document.createElement('canvas'); c.width = c.height = 64;
    const g = c.getContext('2d');
    const grad = g.createRadialGradient(32, 32, 0, 32, 32, 32);
    grad.addColorStop(0, 'rgba(255,255,255,1)');
    grad.addColorStop(0.3, 'rgba(255,255,255,0.7)');
    grad.addColorStop(1, 'rgba(255,255,255,0)');
    g.fillStyle = grad; g.fillRect(0, 0, 64, 64);
    _nodeTex = new THREE.CanvasTexture(c);
    return _nodeTex;
  }

  // long-range axon bundles between regions (the sweeping arcs in the reference)
  function buildAxons(density) {
    const pos = [], col = [];
    const a = hex('#8b7cff'), b = hex('#2de2e6');
    const pairs = [
      [0,1],[1,3],[0,2],[1,5],[5,4],[5,6],[2,5],[1,2],[0,5]
    ];
    for (const [i, j] of pairs) {
      const A = new THREE.Vector3(...REGIONS[i].c), B = new THREE.Vector3(...REGIONS[j].c);
      const strands = density.axons;
      for (let s = 0; s < strands; s++) {
        // curved bundle: quadratic bezier with a lifted control point
        const mid = A.clone().add(B).multiplyScalar(0.5);
        mid.add(new THREE.Vector3((Math.random()*2-1)*0.5, 0.4+Math.random()*0.5, (Math.random()*2-1)*0.5));
        const steps = 14;
        let prev = null;
        for (let k = 0; k <= steps; k++) {
          const u = k/steps;
          const p = A.clone().multiplyScalar((1-u)*(1-u))
            .add(mid.clone().multiplyScalar(2*(1-u)*u))
            .add(B.clone().multiplyScalar(u*u));
          p.x += (Math.random()*2-1)*0.02; p.y += (Math.random()*2-1)*0.02;
          if (prev) {
            pos.push(prev.x, prev.y, prev.z, p.x, p.y, p.z);
            const cc = a.clone().lerp(b, u);
            col.push(cc.r, cc.g, cc.b, cc.r, cc.g, cc.b);
          }
          prev = p;
        }
      }
    }
    const geo = new THREE.BufferGeometry();
    geo.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3));
    geo.setAttribute('color', new THREE.Float32BufferAttribute(col, 3));
    const mat = new THREE.LineBasicMaterial({ vertexColors: true, transparent: true,
      opacity: 0.16, blending: THREE.AdditiveBlending, depthWrite: false });
    return new THREE.LineSegments(geo, mat);
  }

  // travelling pulses along axon pathways
  function buildPulses(density) {
    const count = density.pulses;
    const geo = new THREE.BufferGeometry();
    const pos = new Float32Array(count * 3);
    geo.setAttribute('position', new THREE.BufferAttribute(pos, 3));
    const mat = new THREE.PointsMaterial({ color: 0xffffff, size: 0.11, transparent: true,
      opacity: 0.0, blending: THREE.AdditiveBlending, depthWrite: false,
      map: nodeSprite(), sizeAttenuation: true });
    const points = new THREE.Points(geo, mat);
    const paths = [];
    for (let i = 0; i < count; i++) {
      const i0 = Math.floor(Math.random()*REGIONS.length);
      let i1 = Math.floor(Math.random()*REGIONS.length);
      if (i1 === i0) i1 = (i1+1) % REGIONS.length;
      paths.push({ a: new THREE.Vector3(...REGIONS[i0].c),
                   b: new THREE.Vector3(...REGIONS[i1].c),
                   t: Math.random(), speed: 0.15 + Math.random()*0.35 });
    }
    return { points, geo, mat, paths, pos };
  }

  function buildNeuralBrain() {
    neuralGroup = new THREE.Group();
    regionMeshes = [];
    // density scales down on weaker devices
    const weak = (navigator.hardwareConcurrency || 4) <= 4 || Math.min(innerWidth, innerHeight) < 420;
    const density = weak
      ? { nodes: 26, branches: 1, axons: 2, pulses: 22 }
      : { nodes: 46, branches: 2, axons: 3, pulses: 40 };
    DENSITY = density;

    for (const reg of REGIONS) {
      const g = buildRegion(reg, density);
      neuralGroup.add(g);
      regionMeshes.push(g);
    }
    axonMesh = buildAxons(density);
    neuralGroup.add(axonMesh);
    pulseSys = buildPulses(density);
    neuralGroup.add(pulseSys.points);

    // faint inner glow core
    const core = new THREE.Mesh(
      new THREE.SphereGeometry(0.4, 16, 12),
      new THREE.MeshBasicMaterial({ color: 0x8b7cff, transparent: true, opacity: 0.08,
        blending: THREE.AdditiveBlending, depthWrite: false }));
    neuralGroup.add(core);
    return neuralGroup;
  }


  /* ---------- tile sprite texture ---------- */
  function tileTexture(note) {
    const c = document.createElement('canvas');
    c.width = 460; c.height = 230;
    const g = c.getContext('2d');
    const color = itemColor(note);
    g.beginPath(); g.roundRect(8, 8, c.width-16, c.height-16, 34);
    g.fillStyle = 'rgba(23,30,60,0.94)'; g.fill();
    g.lineWidth = 3; g.strokeStyle = color;
    g.shadowColor = color; g.shadowBlur = 26; g.stroke(); g.shadowBlur = 0;
    g.beginPath(); g.arc(c.width-46, 46, 11, 0, Math.PI*2);
    g.fillStyle = color; g.shadowColor = color; g.shadowBlur = 18; g.fill(); g.shadowBlur = 0;
    g.font = '600 22px Inter, sans-serif';
    g.fillStyle = color;
    g.fillText(itemLabel(note).toUpperCase(), 34, 52);
    g.fillStyle = '#f2f5ff';
    g.font = '600 40px Fraunces, Georgia, serif';
    const title = (note.title || 'Untitled').trim() || 'Untitled';
    const words = title.split(' ');
    let line = '', lines = [];
    for (const w of words) {
      if (g.measureText(line + ' ' + w).width > c.width - 120 && line) {
        lines.push(line); line = w;
        if (lines.length === 2) { line += '…'; break; }
      } else line = line ? line + ' ' + w : w;
    }
    if (lines.length < 2 && line) lines.push(line);
    else if (lines.length === 2 && line && lines[1] !== line) lines[1] = line;
    lines.slice(0, 2).forEach((l, i) => g.fillText(l, 34, 106 + i*50));
    g.font = '500 24px Inter, sans-serif';
    g.fillStyle = '#bcc5e4';
    const d = note.updated_at ? new Date(note.updated_at) : null;
    g.fillText(d ? d.toLocaleDateString([], { month:'short', day:'numeric' }) : '', 34, c.height-40);
    const tex = new THREE.CanvasTexture(c);
    tex.anisotropy = 4;
    return tex;
  }

  /* ---------- orbit management ---------- */
  function clearOrbit() {
    for (const s of tiles) { s.material.map.dispose(); s.material.dispose(); world.remove(s); }
    for (const l of tethers) { l.line.geometry.dispose(); l.line.material.dispose(); world.remove(l.line); }
    tiles = []; tethers = [];
  }

  function setNotes(items) {
    clearOrbit();
    const n = items.length;
    if (!n) return;
    const R = 3.9 + Math.sqrt(n) * 0.35;
    orbitR = R;
    camZ = fitZ();
    const scaleK = Math.max(0.68, 1 - n * 0.012);
    const byId = {};
    // projects sit on an inner shell; everything else on the outer shell
    const projects = items.filter(i => (i.kind || i.type) === 'project');
    const rest = items.filter(i => (i.kind || i.type) !== 'project');

    const place = (list, radius, yFlat) => list.forEach((it, i) => {
      const m = list.length;
      const phi = Math.acos(1 - 2*(i+0.5)/m);
      const theta = Math.PI * (1 + Math.sqrt(5)) * (i+0.5);
      const p = new THREE.Vector3(
        Math.sin(phi)*Math.cos(theta), Math.cos(phi)*yFlat, Math.sin(phi)*Math.sin(theta)
      ).multiplyScalar(radius);
      const big = (it.kind || it.type) === 'project' ? 1.18 : 1;
      const sprite = new THREE.Sprite(new THREE.SpriteMaterial({ map: tileTexture(it), transparent: true, opacity: 1 }));
      sprite.scale.set(2.3*scaleK*big, 1.15*scaleK*big, 1);
      sprite.position.copy(p);
      sprite.userData = { id: it.id, base: p.clone(), seed: Math.random()*Math.PI*2, k: scaleK*big, pulse: 0 };
      world.add(sprite); tiles.push(sprite);
      byId[it.id] = sprite;
    });
    place(projects, Math.max(2.9, R * 0.62), 0.6);
    place(rest, R, 0.8);

    // edges: item -> its project, item -> explicit links; orphans tether to the brain
    const edged = new Set();
    const addEdge = (a, b, color, op) => {
      const line = new THREE.Line(
        new THREE.BufferGeometry().setFromPoints([a.position, b.position]),
        new THREE.LineBasicMaterial({ color: new THREE.Color(color),
          transparent: true, opacity: op, blending: THREE.AdditiveBlending }));
      world.add(line);
      tethers.push({ line, sprite: a, other: b });
      edged.add(a.userData.id); edged.add(b.userData.id);
    };
    for (const it of items) {
      const s = byId[it.id];
      if (it.project_id && byId[it.project_id])
        addEdge(s, byId[it.project_id], typeColor('project'), 0.35);
      for (const lid of (it.links || []))
        if (byId[lid]) addEdge(s, byId[lid], itemColor(it), 0.3);
    }
    for (const it of items) {
      if (edged.has(it.id)) continue;
      const s = byId[it.id];
      const from = s.position.clone().normalize().multiplyScalar(1.75);
      const line = new THREE.Line(
        new THREE.BufferGeometry().setFromPoints([from, s.position]),
        new THREE.LineBasicMaterial({ color: new THREE.Color(itemColor(it)),
          transparent: true, opacity: 0.4, blending: THREE.AdditiveBlending }));
      world.add(line); tethers.push({ line, sprite: s, from });
    }
  }

  function pulse(id) {
    const s = tiles.find(x => x.userData.id === id);
    if (s) s.userData.pulse = 1;
  }

  /* ---------- interaction ---------- */
  let panX = 0, panY = 0;            // Explore-mode pan offset
  function wire(canvas) {
    const pt = (e) => e.touches ? e.touches[0] : e;
    let panning = false, lastPanX = 0, lastPanY = 0;

    const down = (e) => {
      if (e.touches && e.touches.length === 2) {
        pinchDist = Math.hypot(e.touches[0].clientX - e.touches[1].clientX,
                               e.touches[0].clientY - e.touches[1].clientY);
        if (exploreMode) {
          panning = true;
          lastPanX = (e.touches[0].clientX + e.touches[1].clientX) / 2;
          lastPanY = (e.touches[0].clientY + e.touches[1].clientY) / 2;
        }
        return;
      }
      // right-drag = pan on desktop in Explore mode
      if (exploreMode && (e.button === 2 || e.shiftKey)) {
        panning = true; lastPanX = pt(e).clientX; lastPanY = pt(e).clientY;
        e.preventDefault(); return;
      }
      dragging = true; moved = 0;
      lastX = pt(e).clientX; lastY = pt(e).clientY;
    };
    const move = (e) => {
      if (e.touches && e.touches.length === 2) {
        const d = Math.hypot(e.touches[0].clientX - e.touches[1].clientX,
                             e.touches[0].clientY - e.touches[1].clientY);
        camZ = clampZ(camZ * pinchDist / d); resetting = false;
        pinchDist = d;
        if (panning && exploreMode) {
          const mx = (e.touches[0].clientX + e.touches[1].clientX) / 2;
          const my = (e.touches[0].clientY + e.touches[1].clientY) / 2;
          panX += (mx - lastPanX) * 0.01; panY -= (my - lastPanY) * 0.01;
          lastPanX = mx; lastPanY = my;
        }
        return;
      }
      if (panning && exploreMode) {
        const x = pt(e).clientX, y = pt(e).clientY;
        panX += (x - lastPanX) * 0.01; panY -= (y - lastPanY) * 0.01;
        lastPanX = x; lastPanY = y; return;
      }
      if (!dragging) return;
      const x = pt(e).clientX, y = pt(e).clientY;
      const dx = x - lastX, dy = y - lastY;
      moved += Math.abs(dx) + Math.abs(dy);
      resetting = false;
      velY = dx * 0.005; velX = dy * 0.004;
      spin(velY, velX);
      lastX = x; lastY = y;
    };
    const up = (e) => {
      if (panning) { panning = false; return; }
      if (dragging && moved < 8) tap(e);
      dragging = false;
    };

    canvas.addEventListener('mousedown', down);
    canvas.addEventListener('mousemove', move);
    window.addEventListener('mouseup', up);
    canvas.addEventListener('contextmenu', (e) => { if (exploreMode) e.preventDefault(); });
    canvas.addEventListener('touchstart', down, { passive: true });
    canvas.addEventListener('touchmove', move, { passive: true });
    canvas.addEventListener('touchend', up);
    canvas.addEventListener('wheel', (e) => {
      camZ = clampZ(camZ + e.deltaY * 0.01); resetting = false;
    }, { passive: true });
  }

  const ray = new THREE.Raycaster(), ndc = new THREE.Vector2();
  function tap(e) {
    const p = (e.changedTouches ? e.changedTouches[0] : e);
    ndc.x = (p.clientX / innerWidth) * 2 - 1;
    ndc.y = -(p.clientY / innerHeight) * 2 + 1;
    ray.setFromCamera(ndc, camera);

    if (exploreMode) {
      // pick the nearest region centre to the ray
      let best = null, bestD = 0.9;
      for (const g of regionMeshes) {
        const world = g.userData.center.clone().applyMatrix4(neuralGroup.matrixWorld);
        const d = ray.ray.distanceToPoint(world);
        if (d < bestD) { bestD = d; best = g; }
      }
      if (best) {
        activeRegion = best;
        for (const g of regionMeshes) g.userData.target = (g === best) ? 1 : 0;
        if (onRegionCb) onRegionCb(best.userData.reg);
      }
      return;
    }

    const hit = ray.intersectObjects(tiles)[0];
    if (hit && onTapCb) {
      hit.object.userData.pulse = 1;
      onTapCb(hit.object.userData.id);
    }
  }

  /* ---------- loop ---------- */
  function frame() {
    requestAnimationFrame(frame);
    if (paused) return;
    t += 0.016;
    const hz = fitZ();
    if (resetting) {
      world.quaternion.slerp(HOME_Q, 0.12);
      camZ += (hz - camZ) * 0.12;
      panX *= 0.85; panY *= 0.85;
      if (world.quaternion.angleTo(HOME_Q) < 0.005 && Math.abs(camZ - hz) < 0.05) {
        world.quaternion.copy(HOME_Q); camZ = hz; resetting = false;
      }
    } else if (!dragging) {
      velY *= 0.95; velX *= 0.95;
      spin(velY + (reduce ? 0 : (exploreMode ? 0.0009 : 0.0016)), velX);
    }
    camera.position.z += (camZ - camera.position.z) * 0.1;
    // pan the world laterally in explore mode
    world.position.x += (panX - world.position.x) * 0.15;
    world.position.y += (panY - world.position.y) * 0.15;

    // brain idle drift
    neuralGroup.rotation.y = Math.sin(t*0.25) * 0.05;
    neuralGroup.position.y = Math.sin(t*0.6) * 0.04;

    // region highlight easing + neuron shimmer
    const boost = exploreMode ? 1 : 0.55;
    for (const g of regionMeshes) {
      const u = g.userData;
      u.highlight += (((u.target || 0)) - u.highlight) * 0.12;
      const base = (exploreMode ? 0.5 : 0.34);
      const shimmer = reduce ? 0 : Math.sin(t*1.4 + u.center.x*3) * 0.05;
      u.branchMat.opacity = base * boost + u.highlight * 0.4 + shimmer;
      u.somaMat.opacity = (0.7 * boost) + u.highlight * 0.3 + shimmer;
      // reveal region hue on highlight; blend back to violet/cyan identity otherwise
      const col = u.identity.clone().lerp(new THREE.Color(u.reg.hue), u.highlight);
      u.somaMat.color = col;
      u.branchMat.color = col;
      const sc = 1 + u.highlight * 0.06 + shimmer * 0.4;
      g.scale.setScalar(sc);
    }
    if (axonMesh) axonMesh.material.opacity = (exploreMode ? 0.28 : 0.16);

    // travelling pulses
    if (pulseSys && !reduce) {
      const P = pulseSys;
      P.mat.opacity = exploreMode ? 0.95 : 0.6;
      for (let i = 0; i < P.paths.length; i++) {
        const pa = P.paths[i];
        pa.t += pa.speed * 0.016;
        if (pa.t > 1) { pa.t = 0;
          const i0 = Math.floor(Math.random()*REGIONS.length);
          let i1 = Math.floor(Math.random()*REGIONS.length); if (i1===i0) i1=(i1+1)%REGIONS.length;
          pa.a.set(...REGIONS[i0].c); pa.b.set(...REGIONS[i1].c);
        }
        const u = pa.t;
        const x = pa.a.x + (pa.b.x - pa.a.x)*u;
        const y = pa.a.y + (pa.b.y - pa.a.y)*u + Math.sin(u*Math.PI)*0.4;
        const z = pa.a.z + (pa.b.z - pa.a.z)*u;
        P.pos[i*3] = x; P.pos[i*3+1] = y; P.pos[i*3+2] = z;
      }
      P.geo.attributes.position.needsUpdate = true;
    }

    // note tiles (hidden/faded in explore mode)
    for (const s of tiles) {
      if (!reduce) s.position.y = s.userData.base.y + Math.sin(t*1.1 + s.userData.seed) * 0.12;
      if (s.userData.pulse) {
        s.userData.pulse *= 0.92;
        const k = s.userData.k * (1 + s.userData.pulse * 0.25);
        s.scale.set(2.3*k, 1.15*k, 1);
        if (s.userData.pulse < 0.02) s.userData.pulse = 0;
      }
      const tgt = exploreMode ? 0 : 1;
      s.material.opacity += (tgt - (s.material.opacity ?? 1)) * 0.15;
      s.visible = s.material.opacity > 0.02;
    }
    for (const tt of tethers) {
      tt.line.geometry.setFromPoints([tt.other ? tt.other.position : tt.from, tt.sprite.position]);
      const tgt = exploreMode ? 0 : (0.4);
      tt.line.material.opacity += (tgt - tt.line.material.opacity) * 0.15;
    }
    renderer.render(scene, camera);
  }

  /* ---------- init ---------- */
  function init(canvas, { onTap, colorOf, labelOf, onRegion } = {}) {
    onTapCb = onTap || null; colorOfCb = colorOf || null; labelOfCb = labelOf || null;
    onRegionCb = onRegion || null;
    renderer = new THREE.WebGLRenderer({ canvas, antialias: true, alpha: true });
    renderer.setPixelRatio(Math.min(devicePixelRatio, 2));
    scene = new THREE.Scene();
    scene.fog = new THREE.FogExp2(0x010206, 0.015);
    camera = new THREE.PerspectiveCamera(55, 1, 0.1, 100);
    camera.position.set(0, 0.2, 10);
    camera.lookAt(0, 0, 0);
    world = new THREE.Group();
    world.quaternion.copy(HOME_Q);
    scene.add(world);

    brain = buildNeuralBrain();
    world.add(brain);

    // star dust
    const dustN = 240, dustPos = new Float32Array(dustN * 3);
    for (let i = 0; i < dustN; i++) {
      const u = Math.random()*2 - 1, a = Math.random()*Math.PI*2, s = Math.sqrt(1 - u*u);
      const r = 6 + Math.random()*8;
      dustPos.set([s*Math.cos(a)*r, u*r, s*Math.sin(a)*r], i*3);
    }
    const dustGeo = new THREE.BufferGeometry();
    dustGeo.setAttribute('position', new THREE.BufferAttribute(dustPos, 3));
    world.add(new THREE.Points(dustGeo, new THREE.PointsMaterial({
      color: 0x8b94ba, size: 0.03, transparent: true, opacity: 0.6 })));

    const resize = () => {
      renderer.setSize(innerWidth, innerHeight);
      camera.aspect = innerWidth / innerHeight;
      camera.updateProjectionMatrix();
    };
    addEventListener('resize', () => { resize(); if (!dragging) camZ = fitZ(); }); resize();
    wire(canvas);
    frame();
  }

  function setExplore(on) {
    exploreMode = on;
    if (!on) {
      activeRegion = null;
      for (const g of regionMeshes) g.userData.target = 0;
      panX = 0; panY = 0;
      resetting = true;
    }
  }

  return {
    init, setNotes, pulse,
    pause(v) { paused = v; },
    zoom(delta) { camZ = clampZ(camZ + delta); resetting = false; },
    recenter() { resetting = true; velX = velY = 0; panX = 0; panY = 0; },
    setExplore, isExplore: () => exploreMode,
  };
})();
