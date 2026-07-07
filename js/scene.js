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

  function hemisphere(sign) {
    const geo = new THREE.SphereGeometry(1.55, 30, 24, sign > 0 ? 0 : Math.PI, Math.PI);
    const pos = geo.attributes.position, v = new THREE.Vector3();
    for (let i = 0; i < pos.count; i++) {
      v.fromBufferAttribute(pos, i);
      const folds = fbm(v.x*1.8+3, v.y*1.8+7, v.z*1.8+1) * 0.34;
      v.normalize().multiplyScalar(1.55 + folds);
      v.x *= 0.92; v.y *= 0.88; v.z *= 1.18;
      v.x += sign * 0.09;
      pos.setXYZ(i, v.x, v.y, v.z);
    }
    return new THREE.Mesh(geo, new THREE.MeshBasicMaterial({
      color: sign > 0 ? 0x8b7cff : 0x2de2e6,
      wireframe: true, transparent: true, opacity: 0.5,
      blending: THREE.AdditiveBlending, depthWrite: false,
    }));
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
      const sprite = new THREE.Sprite(new THREE.SpriteMaterial({ map: tileTexture(it), transparent: true }));
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
  function wire(canvas) {
    const pt = (e) => e.touches ? e.touches[0] : e;
    const down = (e) => {
      if (e.touches && e.touches.length === 2) {
        pinchDist = Math.hypot(e.touches[0].clientX - e.touches[1].clientX,
                               e.touches[0].clientY - e.touches[1].clientY);
        return;
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
        return;
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
    const up = (e) => { if (dragging && moved < 8) tap(e); dragging = false; };

    canvas.addEventListener('mousedown', down);
    canvas.addEventListener('mousemove', move);
    window.addEventListener('mouseup', up);
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
    if (resetting) {
      const hz = fitZ();
      world.quaternion.slerp(HOME_Q, 0.12);
      camZ += (hz - camZ) * 0.12;
      if (world.quaternion.angleTo(HOME_Q) < 0.005 && Math.abs(camZ - hz) < 0.05) {
        world.quaternion.copy(HOME_Q); camZ = hz; resetting = false;
      }
    } else if (!dragging) {
      velY *= 0.95; velX *= 0.95;
      spin(velY + (reduce ? 0 : 0.0016), velX);
    }
    camera.position.z += (camZ - camera.position.z) * 0.1;

    brain.rotation.y = Math.sin(t*0.3) * 0.06;
    brain.position.y = Math.sin(t*0.7) * 0.05;

    for (const s of tiles) {
      if (!reduce) s.position.y = s.userData.base.y + Math.sin(t*1.1 + s.userData.seed) * 0.12;
      if (s.userData.pulse) {
        s.userData.pulse *= 0.92;
        const k = s.userData.k * (1 + s.userData.pulse * 0.25);
        s.scale.set(2.3*k, 1.15*k, 1);
        if (s.userData.pulse < 0.02) s.userData.pulse = 0;
      }
    }
    for (const t of tethers) {
      t.line.geometry.setFromPoints([
        t.other ? t.other.position : t.from, t.sprite.position]);
    }
    renderer.render(scene, camera);
  }

  /* ---------- init ---------- */
  function init(canvas, { onTap, colorOf, labelOf } = {}) {
    onTapCb = onTap || null; colorOfCb = colorOf || null; labelOfCb = labelOf || null;
    renderer = new THREE.WebGLRenderer({ canvas, antialias: true, alpha: true });
    renderer.setPixelRatio(Math.min(devicePixelRatio, 2));
    scene = new THREE.Scene();
    scene.fog = new THREE.FogExp2(0x010206, 0.016);
    camera = new THREE.PerspectiveCamera(55, 1, 0.1, 100);
    camera.position.set(0, 0.2, 10);
    camera.lookAt(0, 0, 0);
    world = new THREE.Group();
    world.quaternion.copy(HOME_Q);
    scene.add(world);

    brain = new THREE.Group();
    brain.add(hemisphere(1), hemisphere(-1));
    brain.add(new THREE.Mesh(
      new THREE.SphereGeometry(0.55, 16, 12),
      new THREE.MeshBasicMaterial({ color: 0x8b7cff, transparent: true, opacity: 0.12,
        blending: THREE.AdditiveBlending, depthWrite: false })));
    world.add(brain);

    // star dust
    const dustN = 260, dustPos = new Float32Array(dustN * 3);
    for (let i = 0; i < dustN; i++) {
      const u = Math.random()*2 - 1, a = Math.random()*Math.PI*2, s = Math.sqrt(1 - u*u);
      const r = 6 + Math.random()*8;
      dustPos.set([s*Math.cos(a)*r, u*r, s*Math.sin(a)*r], i*3);
    }
    const dustGeo = new THREE.BufferGeometry();
    dustGeo.setAttribute('position', new THREE.BufferAttribute(dustPos, 3));
    world.add(new THREE.Points(dustGeo, new THREE.PointsMaterial({
      color: 0x8b94ba, size: 0.035, transparent: true, opacity: 0.7 })));

    const resize = () => {
      renderer.setSize(innerWidth, innerHeight);
      camera.aspect = innerWidth / innerHeight;
      camera.updateProjectionMatrix();
    };
    addEventListener('resize', () => { resize(); if (!dragging) camZ = fitZ(); }); resize();
    wire(canvas);
    frame();
  }

  return {
    init, setNotes, pulse,
    pause(v) { paused = v; },
    zoom(delta) { camZ = clampZ(camZ + delta); resetting = false; },
    recenter() { resetting = true; velX = velY = 0; },
  };
})();
