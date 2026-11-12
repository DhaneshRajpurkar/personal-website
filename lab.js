// The homepage hero: a real-time 3D workshop at night (three.js, loaded from the jsDelivr CDN).
// A cliffside lab on an alien world: glass wall over a sea of clouds with a ringed gas giant in the sky, polished concrete floor with real reflections, LED ceiling
// strips, a workbench with live screens, a solar-system model, a keyboard and mouse, and a hologram table.
//
// Kept light on purpose: it renders only while the hero is on screen and the tab is visible, drops to a slow
// frame rate when nobody is moving the mouse, and lowers its own quality if a computer struggles.
// If WebGL or the CDN is unavailable, the hero simply keeps its painted background.
(function () {
  const host = document.getElementById('lab');
  if (!host) return;
  const root = document.documentElement;
  const reduce = matchMedia('(prefers-reduced-motion: reduce)').matches;
  const T3 = 'https://cdn.jsdelivr.net/npm/three@0.160.0/';

  const begin = () => load().catch(err => { console.warn('3D lab unavailable:', err); host.classList.add('lab-fallback'); });
  // don't compete with the opening scene for the computer's attention: load once it's done
  if (root.classList.contains('reel')) addEventListener('reeldone', () => setTimeout(begin, 300), { once: true });
  else begin();

  async function load() {
    const THREE = await import(T3 + 'build/three.module.js');
    const [{ Reflector }, { EffectComposer }, { RenderPass }, { UnrealBloomPass }, { OutputPass }] = await Promise.all([
      import(T3 + 'examples/jsm/objects/Reflector.js'),
      import(T3 + 'examples/jsm/postprocessing/EffectComposer.js'),
      import(T3 + 'examples/jsm/postprocessing/RenderPass.js'),
      import(T3 + 'examples/jsm/postprocessing/UnrealBloomPass.js'),
      import(T3 + 'examples/jsm/postprocessing/OutputPass.js'),
    ]);
    build(THREE, Reflector, EffectComposer, RenderPass, UnrealBloomPass, OutputPass);
  }

  function build(THREE, Reflector, EffectComposer, RenderPass, UnrealBloomPass, OutputPass) {
    const canvas = document.createElement('canvas');
    canvas.className = 'lab-canvas';
    canvas.setAttribute('aria-hidden', 'true');
    let renderer;
    try { renderer = new THREE.WebGLRenderer({ canvas, antialias: false, powerPreference: 'high-performance' }); }
    catch (e) { host.classList.add('lab-fallback'); return; }
    host.prepend(canvas);
    renderer.toneMapping = THREE.ACESFilmicToneMapping;
    renderer.toneMappingExposure = 1.05;
    renderer.outputColorSpace = THREE.SRGBColorSpace;

    const scene = new THREE.Scene();
    scene.fog = new THREE.Fog(0x05080d, 40, 120);
    const camera = new THREE.PerspectiveCamera(50, 1, 0.05, 200);
    const TEAL = 0x34c5ae, COPPER = 0xe9a24a;

    // ---------- small helpers ----------
    const rnd = (() => { let s = 7; return () => ((s = (s * 16807) % 2147483647) - 1) / 2147483646; })();
    const box = (w, h, d, mat, x, y, z, parent = scene) => { const m = new THREE.Mesh(new THREE.BoxGeometry(w, h, d), mat); m.position.set(x, y, z); parent.add(m); return m; };
    const std = (color, rough = .6, metal = 0, extra = {}) => new THREE.MeshStandardMaterial({ color, roughness: rough, metalness: metal, ...extra });
    const glow = (color, k = 1) => new THREE.MeshBasicMaterial({ color: new THREE.Color(color).multiplyScalar(k), toneMapped: false });
    function canvasTex(w, h, draw) {
      const c = document.createElement('canvas'); c.width = w; c.height = h;
      const g = c.getContext('2d'); draw(g, w, h);
      const t = new THREE.CanvasTexture(c); t.colorSpace = THREE.SRGBColorSpace; t.anisotropy = 4;
      t.userData = { c, g, w, h, draw }; return t;
    }
    function concreteTex(base, seams) {
      return canvasTex(512, 512, (g, w, h) => {
        g.fillStyle = base; g.fillRect(0, 0, w, h);
        for (let i = 0; i < 9000; i++) { const v = rnd(); g.fillStyle = `rgba(${v < .5 ? '0,0,0' : '255,255,255'},${rnd() * .05})`; g.fillRect(rnd() * w, rnd() * h, 1 + rnd() * 2, 1 + rnd() * 2); }
        for (let i = 0; i < 14; i++) { const x = rnd() * w, y = rnd() * h, r = 30 + rnd() * 90; const gr = g.createRadialGradient(x, y, 0, x, y, r);
          gr.addColorStop(0, `rgba(0,0,0,${rnd() * .07})`); gr.addColorStop(1, 'rgba(0,0,0,0)'); g.fillStyle = gr; g.fillRect(x - r, y - r, r * 2, r * 2); }
        if (seams) { g.strokeStyle = 'rgba(0,0,0,.35)'; g.lineWidth = 2; g.strokeRect(1, 1, w - 2, h - 2);
          g.fillStyle = 'rgba(0,0,0,.4)'; for (const [x, y] of [[40, 40], [w - 40, 40], [40, h - 40], [w - 40, h - 40]]) { g.beginPath(); g.arc(x, y, 5, 0, 7); g.fill(); } }
      });
    }

    // ---------- the room (meters; camera stands near z = 3, looking toward the glass wall at z = -10) ----------
    const W = 16, D = 14, Hh = 5, Z0 = -10, Z1 = 4;
    const floorTex = concreteTex('#3a3d42', false); floorTex.wrapS = floorTex.wrapT = THREE.RepeatWrapping; floorTex.repeat.set(4, 4);
    const wallTex = concreteTex('#55585e', true); wallTex.wrapS = wallTex.wrapT = THREE.RepeatWrapping; wallTex.repeat.set(5, 2);

    // floor: a real mirror underneath, with a semi-transparent polished-concrete layer on top
    let mirror = null;
    const makeMirror = res => {
      if (mirror) { scene.remove(mirror); mirror.getRenderTarget().dispose(); }
      mirror = new Reflector(new THREE.PlaneGeometry(W, D), { textureWidth: res, textureHeight: Math.round(res * D / W), color: 0x6a7280, clipBias: .003 });
      mirror.rotation.x = -Math.PI / 2; mirror.position.set(0, 0, (Z0 + Z1) / 2); scene.add(mirror);
      // the giant planet reflected in the floor reads as a blob next to the text: leave it out of the reflection
      const draw = mirror.onBeforeRender;
      mirror.onBeforeRender = function (...a) { giant.visible = ring.visible = false; draw.apply(this, a); giant.visible = ring.visible = true; };
    };
    const floor = new THREE.Mesh(new THREE.PlaneGeometry(W, D), std(0xffffff, .55, .05, { map: floorTex, transparent: true, opacity: .78 }));
    floor.rotation.x = -Math.PI / 2; floor.position.set(0, .002, (Z0 + Z1) / 2); scene.add(floor);

    const wallMat = std(0xffffff, .9, 0, { map: wallTex });
    const left = new THREE.Mesh(new THREE.PlaneGeometry(D, Hh), wallMat); left.rotation.y = Math.PI / 2; left.position.set(-W / 2, Hh / 2, (Z0 + Z1) / 2); scene.add(left);
    const right = left.clone(); right.rotation.y = -Math.PI / 2; right.position.x = W / 2; scene.add(right);
    const back = new THREE.Mesh(new THREE.PlaneGeometry(W, Hh), wallMat); back.rotation.y = Math.PI; back.position.set(0, Hh / 2, Z1); scene.add(back);
    const ceil = new THREE.Mesh(new THREE.PlaneGeometry(W, D), std(0x0c0d10, .95)); ceil.rotation.x = Math.PI / 2; ceil.position.set(0, Hh, (Z0 + Z1) / 2); scene.add(ceil);

    // ceiling light strips + LED cove where the walls meet the floor
    const stripMat = glow(0xfff1dd, 1.3);
    for (const x of [-4.5, 0, 4.5]) box(.12, .03, D - 1.5, stripMat, x, Hh - .02, (Z0 + Z1) / 2 + .2);
    const coveMat = glow(TEAL, 1.6);
    for (const s of [-1, 1]) box(.03, .03, D, coveMat, s * (W / 2 - .02), .03, (Z0 + Z1) / 2);
    box(W, .03, .03, coveMat, 0, .03, Z0 + .02);

    // glass wall: mullions, a transom, and slightly tinted glass
    const steel = std(0x1c1f24, .35, .8);
    for (let i = 0; i <= 8; i++) box(.08, Hh, .12, steel, -W / 2 + i * W / 8, Hh / 2, Z0);
    box(W, .1, .14, steel, 0, 3.7, Z0); box(W, .14, .16, steel, 0, .07, Z0);
    const glass = new THREE.Mesh(new THREE.PlaneGeometry(W, Hh), new THREE.MeshPhysicalMaterial({ color: 0x9fb8c8, transparent: true, opacity: .035, roughness: .05, metalness: 0 }));
    glass.position.set(0, Hh / 2, Z0 - .02); scene.add(glass);

    // ---------- outside: night on an alien world. A ringed gas giant fills the sky, rock islands float above a sea of clouds ----------
    const SKY_HAZE = new THREE.Color(0x1a2438);
    const skyMat = new THREE.ShaderMaterial({
      side: THREE.BackSide, depthWrite: false, fog: false,
      uniforms: { t: { value: 0 } },
      vertexShader: 'varying vec3 v; void main(){ v = normalize(position); gl_Position = projectionMatrix * modelViewMatrix * vec4(position,1.); }',
      fragmentShader: `varying vec3 v; uniform float t;
        float h(vec2 p){ return fract(sin(dot(p, vec2(127.1,311.7))) * 43758.5453); }
        float n(vec2 p){ vec2 i = floor(p), f = fract(p); f = f*f*(3.-2.*f);
          return mix(mix(h(i), h(i+vec2(1,0)), f.x), mix(h(i+vec2(0,1)), h(i+vec2(1,1)), f.x), f.y); }
        float fbm(vec2 p){ float a = .5, s = 0.; for (int i = 0; i < 5; i++){ s += a * n(p); p *= 2.03; a *= .5; } return s; }
        void main(){
          float y = clamp(v.y, -.3, 1.);
          vec3 c = mix(vec3(.05,.09,.18), vec3(.004,.008,.03), smoothstep(-.02, .6, y));     // night: navy at the horizon, near-black up high
          c += vec3(.08,.11,.2) * exp(-abs(y - .02) * 16.);                                  // a faint glow along the horizon
          vec3 sp = floor(v * 420.); float st = fract(sin(dot(sp, vec3(12.9898,78.233,45.164))) * 43758.5453);
          float tw = .55 + .45 * sin(t * (1. + fract(st * 7.) * 3.) + st * 40.);
          c += vec3(1.) * step(.9965, st) * tw * smoothstep(.0, .2, y);                      // stars
          float band = exp(-pow(dot(v, normalize(vec3(.35,.6,-.7))) * 3.2, 2.));
          c += vec3(.16,.16,.26) * band * .35 * smoothstep(.05, .5, y);                       // milky way
          vec2 uv = v.xz / max(.12, v.y + .25) * 1.6 + vec2(t * .006, 0.);
          float cl = smoothstep(.56, .82, fbm(uv * 1.3)) * (1. - smoothstep(.05, .4, y)) * smoothstep(-.06, .04, y);
          c = mix(c, vec3(.12,.15,.24), cl * .7);                                             // dim, moonlit cloud banks
          gl_FragColor = vec4(c, 1.);
        }`,
    });
    const sky = new THREE.Mesh(new THREE.SphereGeometry(190, 40, 20), skyMat); scene.add(sky);

    // the gas giant: banded, softly lit from the sun on the right, with a thin ring
    const giantPos = new THREE.Vector3(30, 66, -185);
    const giant = new THREE.Mesh(new THREE.SphereGeometry(44, 64, 40), new THREE.ShaderMaterial({
      fog: false, transparent: true, depthWrite: false,
      uniforms: { t: { value: 0 }, sun: { value: new THREE.Vector3(-.45, .25, .85).normalize() } },
      vertexShader: 'varying vec3 n; varying vec3 o; void main(){ n = normalize(normalMatrix * normal); o = position; gl_Position = projectionMatrix * modelViewMatrix * vec4(position,1.); }',
      fragmentShader: `varying vec3 n; varying vec3 o; uniform float t; uniform vec3 sun;
        float h(vec2 p){ return fract(sin(dot(p, vec2(127.1,311.7))) * 43758.5453); }
        float nz(vec2 p){ vec2 i = floor(p), f = fract(p); f = f*f*(3.-2.*f);
          return mix(mix(h(i), h(i+vec2(1,0)), f.x), mix(h(i+vec2(0,1)), h(i+vec2(1,1)), f.x), f.y); }
        void main(){
          vec3 p = normalize(o); float lat = p.y, lon = atan(p.z, p.x);
          float w = nz(vec2(lon * 3. + t * .01, lat * 9.)) * .35;
          float b = sin((lat + w * .12) * 26.) * .5 + .5;                     // the bands
          vec3 c = mix(vec3(.93,.86,.74), vec3(.80,.62,.46), b);              // cream and amber
          c = mix(c, vec3(.62,.72,.80), smoothstep(.55, .85, abs(lat)));      // bluish poles
          float storm = smoothstep(.12, .0, length(vec2(lon - .9, (lat + .28) * 2.2)));
          c = mix(c, vec3(.78,.45,.32), storm * .8);                          // one big storm
          float lit = clamp(dot(p, normalize(sun)) * .75 + .55, 0., 1.15);
          float rim = pow(1. - abs(n.z), 3.);
          vec3 col = c * lit + vec3(.55,.75,1.) * rim * .3;
          gl_FragColor = vec4(col * .55, 1.);                                // night: lit by its sun, but dimmer against the dark sky
        }`,
    }));
    giant.position.copy(giantPos); giant.rotation.z = .32; scene.add(giant);
    const ringTex = canvasTex(512, 8, (g, w) => { for (let x = 0; x < w; x++) { const u = x / w; const a = (.25 + .55 * Math.abs(Math.sin(u * 40))) * (u > .08 && u < .92 ? 1 : 0) * (Math.abs(u - .55) < .03 ? .15 : 1);
      g.fillStyle = `rgba(235,222,200,${a * .55})`; g.fillRect(x, 0, 1, 8); } });
    const ringGeo = new THREE.RingGeometry(56, 86, 128, 1);
    { const uv = ringGeo.attributes.uv, pos = ringGeo.attributes.position; for (let i = 0; i < uv.count; i++) { const r = Math.hypot(pos.getX(i), pos.getY(i)); uv.setXY(i, (r - 56) / 30, .5); } }
    const ring = new THREE.Mesh(ringGeo, new THREE.MeshBasicMaterial({ map: ringTex, transparent: true, side: THREE.DoubleSide, depthWrite: false, fog: false }));
    ring.position.copy(giantPos); ring.rotation.set(Math.PI / 2 - .22, .1, .32); scene.add(ring);
    const smallMoon = new THREE.Mesh(new THREE.SphereGeometry(3.2, 24, 16), new THREE.MeshBasicMaterial({ color: new THREE.Color(0xeef4ff).multiplyScalar(1.3), fog: false, toneMapped: false }));
    smallMoon.position.set(-22, 44, -185); scene.add(smallMoon);

    // a sea of clouds far below the house
    const cloudSea = new THREE.Mesh(new THREE.PlaneGeometry(600, 400, 1, 1), new THREE.ShaderMaterial({
      fog: false, uniforms: { t: { value: 0 } },
      vertexShader: 'varying vec3 w; void main(){ vec4 p = modelMatrix * vec4(position,1.); w = p.xyz; gl_Position = projectionMatrix * viewMatrix * p; }',
      fragmentShader: `varying vec3 w; uniform float t;
        float h(vec2 p){ return fract(sin(dot(p, vec2(127.1,311.7))) * 43758.5453); }
        float n(vec2 p){ vec2 i = floor(p), f = fract(p); f = f*f*(3.-2.*f);
          return mix(mix(h(i), h(i+vec2(1,0)), f.x), mix(h(i+vec2(0,1)), h(i+vec2(1,1)), f.x), f.y); }
        float fbm(vec2 p){ float a = .5, s = 0.; for (int i = 0; i < 5; i++){ s += a * n(p); p *= 2.02; a *= .5; } return s; }
        void main(){
          vec2 p = w.xz * .035 + vec2(t * .01, t * .004);
          float f = fbm(p), d = clamp(-w.z / 300., 0., 1.);
          vec3 c = mix(vec3(.03,.05,.09), vec3(.20,.24,.34), smoothstep(.35, .75, f));   // dark hollows → moonlit tops
          c = mix(c, vec3(.06,.09,.17), d * .6);                                    // fades into the night
          gl_FragColor = vec4(c, 1.);
        }`,
    }));
    cloudSea.rotation.x = -Math.PI / 2; cloudSea.position.set(0, -26, -150); scene.add(cloudSea);

    // floating rock islands in the distance: jagged rock underneath, grass and trees on top; they bob very slowly
    const islands = new THREE.Group(); scene.add(islands);
    const rockMat = new THREE.MeshLambertMaterial({ vertexColors: true, fog: false });
    const grassMat = new THREE.MeshLambertMaterial({ color: 0x4f8a3c, fog: false });
    const leafMats = [0x3f7a34, 0x5c9440, 0x2f6a3a].map(c => new THREE.MeshLambertMaterial({ color: c, fog: false }));
    const trunkMat = new THREE.MeshLambertMaterial({ color: 0x4a3a2a, fog: false });
    const island = (x, y, z, r, seed) => {
      const g = new THREE.Group(); g.position.set(x, y, z); g.rotation.y = seed; islands.add(g);
      // rock body: an upside-down, lumpy cone
      const geo = new THREE.ConeGeometry(r, r * 1.6, 16, 10); geo.rotateX(Math.PI); geo.translate(0, -r * .8, 0);
      const pos = geo.attributes.position, col = [];
      for (let i = 0; i < pos.count; i++) {
        const px = pos.getX(i), py = pos.getY(i), pz = pos.getZ(i), a = Math.atan2(pz, px), k = -py / (r * 1.6);   // 0 top → 1 tip
        const bump = 1 + .22 * Math.sin(a * 4 + seed + k * 6) + .12 * Math.sin(a * 9 + k * 15 + seed * 2);
        pos.setXYZ(i, px * bump, py * (1 + .18 * Math.sin(a * 3 + seed)), pz * bump);
        const sh = .5 + .2 * Math.sin(a * 13 + k * 25 + seed) + .15 * (1 - k);
        col.push(.62 * sh, .58 * sh, .52 * sh);
      }
      geo.setAttribute('color', new THREE.Float32BufferAttribute(col, 3)); geo.computeVertexNormals();
      const body = new THREE.Mesh(geo, rockMat); g.add(body);
      // grassy top
      const top = new THREE.Mesh(new THREE.CylinderGeometry(r * 1.02, r * .96, r * .14, 18), grassMat); top.position.y = 0; g.add(top);
      // trees: a trunk and two or three rounded crowns each
      const n = 3 + Math.floor(r / 2.2);
      for (let i = 0; i < n; i++) {
        const a = rnd() * 6.28, d = rnd() * r * .75, tx = Math.cos(a) * d, tz = Math.sin(a) * d, th = r * (.35 + rnd() * .35);
        const trunk = new THREE.Mesh(new THREE.CylinderGeometry(r * .03, r * .05, th, 6), trunkMat); trunk.position.set(tx, th / 2, tz); g.add(trunk);
        for (let j = 0; j < 3; j++) { const c = new THREE.Mesh(new THREE.IcosahedronGeometry(r * (.13 + rnd() * .1), 1), leafMats[(i + j) % 3]);
          c.position.set(tx + (rnd() - .5) * r * .2, th + (rnd() - .2) * r * .15, tz + (rnd() - .5) * r * .2); g.add(c); }
      }
      // a few loose rocks drifting under it
      for (let i = 0; i < 3; i++) { const b = new THREE.Mesh(new THREE.DodecahedronGeometry(r * (.08 + rnd() * .1), 0), rockMat);
        b.position.set((rnd() - .5) * r * 1.4, -r * (1.9 + rnd() * .8), (rnd() - .5) * r); g.add(b); }
      g.userData = { y, seed, r, body };
    };
    [[-70, 14, -120, 7, 1], [-34, 26, -165, 6, 2], [-4, 6, -150, 9, 3], [34, 18, -125, 5, 4], [70, 8, -170, 8, 5],
     [110, 24, -200, 10, 6], [-115, 30, -210, 9, 7], [150, 6, -180, 6, 8], [12, 34, -220, 7, 9], [-150, 4, -190, 7, 10]].forEach(a => island(...a));
    // swap the simple rock bodies for the sculpted floating-mountain model (media/island.json) once it has loaded
    fetch('media/island.json').then(r => r.ok ? r.json() : Promise.reject()).then(j => {
      const bin = atob(j.data), buf = new Uint8Array(bin.length).buffer, u8 = new Uint8Array(buf);
      for (let i = 0; i < bin.length; i++) u8[i] = bin.charCodeAt(i);
      const [nv, ni] = new Uint32Array(buf, 0, 2);
      const pos = new Float32Array(buf, 8, nv * 3), idx = new Uint32Array(buf, 8 + nv * 12, ni);
      const geo = new THREE.BufferGeometry();
      geo.setAttribute('position', new THREE.BufferAttribute(pos, 3)); geo.setIndex(new THREE.BufferAttribute(idx, 1));
      geo.computeVertexNormals(); geo.computeBoundingBox();
      const { min, max } = geo.boundingBox, nrm = geo.attributes.normal, col = new Float32Array(nv * 3);
      for (let i = 0; i < nv; i++) {                    // rock colour, with moss on the top and on ledges that face up
        const k = (pos[i * 3 + 1] - min.y) / (max.y - min.y), up = nrm.getY(i);
        const moss = Math.min(1, Math.max(0, (k - .62) * 3) + Math.max(0, up - .55) * 1.4 * (k > .2 ? 1 : 0));
        const sh = .42 + .2 * k + .08 * Math.sin(pos[i * 3] * 9 + pos[i * 3 + 2] * 7);
        col.set([.58 * sh * (1 - moss) + .27 * moss, .54 * sh * (1 - moss) + .46 * moss, .48 * sh * (1 - moss) + .22 * moss], i * 3);
      }
      geo.setAttribute('color', new THREE.BufferAttribute(col, 3));
      for (const g of islands.children) {
        const { r, body } = g.userData; g.remove(body);
        const m = new THREE.Mesh(geo, rockMat); m.scale.set(r * 1.08, r * 1.25, r * 1.08); m.position.y = -max.y * r * 1.25 + r * .05; g.add(m);
      }
      dirty = true;
    }).catch(() => {});                                   // offline / opened from a file: keep the simple rocks


    // ---------- lights ----------
    scene.add(new THREE.HemisphereLight(0x8fa6c8, 0x14100c, .45));                       // daylight bouncing in through the glass
    const dayLight = new THREE.DirectionalLight(0xbfd2ff, .7);   // moonlight dayLight.position.set(9, 12, -14); scene.add(dayLight);
    for (const x of [-4.5, 0, 4.5]) { const l = new THREE.PointLight(0xffe8cf, 9, 10, 2); l.position.set(x, Hh - 1.4, -3.2); scene.add(l); }
    const benchLamp = new THREE.SpotLight(0xfff0dc, 40, 9, .6, .5, 2); benchLamp.position.set(3.7, 3.4, -3.0); benchLamp.target.position.set(4.0, .9, -4.1); scene.add(benchLamp, benchLamp.target);
    const holoLight = new THREE.PointLight(TEAL, 10, 6, 2); holoLight.position.set(1.9, 1.6, -5.3); scene.add(holoLight);

    // ---------- workbench (left) ----------
    const wood = std(0x5a3d26, .7); const darkMetal = std(0x2a2e35, .45, .7); const black = std(0x0d0f12, .5, .3);
    const bench = new THREE.Group(); bench.position.set(4.0, 0, -4.1); bench.rotation.y = -.5; scene.add(bench);
    box(2.8, .06, 1, wood, 0, .92, 0, bench);
    for (const [x, z] of [[-1.32, -.42], [1.32, -.42], [-1.32, .42], [1.32, .42]]) box(.06, .9, .06, darkMetal, x, .45, z, bench);
    box(2.7, .04, .9, darkMetal, 0, .25, 0, bench);                                           // lower shelf
    box(2.8, 1.3, .04, std(0x23262c, .8, .2), 0, 1.6, -.5, bench);                             // pegboard
    for (let i = 0; i < 9; i++) box(.03, .22 + rnd() * .25, .03, darkMetal, -1.2 + i * .3, 1.75, -.46, bench); // hanging tools
    // screens with live content
    function screenTex(kind) {
      return canvasTex(512, 320, (g, w, h) => {
        g.fillStyle = '#04110f'; g.fillRect(0, 0, w, h);
        if (kind === 'pcb') {
          g.strokeStyle = '#34c5ae'; g.lineWidth = 3;
          for (let i = 0; i < 26; i++) { let x = 30 + rnd() * (w - 60), y = 30 + rnd() * (h - 60); g.beginPath(); g.moveTo(x, y);
            for (let k = 0; k < 4; k++) { if (rnd() < .5) x += (rnd() - .5) * 160; else y += (rnd() - .5) * 110; g.lineTo(x, y); } g.stroke();
            g.fillStyle = '#e9a24a'; g.beginPath(); g.arc(x, y, 5, 0, 7); g.fill(); }
          g.fillStyle = '#e9a24a'; g.font = '600 18px monospace'; g.fillText('SHARK-TAG  rev C', 20, h - 18);
        } else {
          g.font = '15px monospace';
          const lines = ['void loop() {', '  float v = adc.read(PIN_V);', '  if (v < BROWNOUT) sleep();', '  imu.update(&state);', '  logger.push(state);', '}', '', 'def forecast(track):', '    x = model(track)', '    return x.cone(72h)', '', '> build ok · 0 warnings', '> flashing rp2350 …'];
          lines.forEach((l, i) => { g.fillStyle = l.startsWith('>') ? '#e9a24a' : i % 3 ? '#9fe8da' : '#34c5ae'; g.fillText(l, 18, 30 + i * 21); });
        }
      });
    }
    const screen = (tex, x, z, ry) => {
      const s = new THREE.Group(); s.position.set(x, .95, z); s.rotation.y = ry; bench.add(s);
      box(.06, .32, .06, darkMetal, 0, .16, 0, s);
      box(.86, .54, .03, black, 0, .62, 0, s);
      const face = new THREE.Mesh(new THREE.PlaneGeometry(.8, .48), new THREE.MeshBasicMaterial({ map: tex, toneMapped: false }));
      face.position.set(0, .62, .017); s.add(face); return s;
    };
    const codeTex = screenTex('code');
    screen(screenTex('pcb'), -.5, -.18, .12); screen(codeTex, .48, -.2, -.12);
    // oscilloscope with a live trace
    const scopeTex = canvasTex(256, 160, () => {});
    const scope = new THREE.Group(); scope.position.set(1.05, .95, .15); scope.rotation.y = -.35; bench.add(scope);
    box(.42, .26, .3, std(0x30343b, .5, .4), 0, .13, 0, scope);
    const scopeFace = new THREE.Mesh(new THREE.PlaneGeometry(.24, .16), new THREE.MeshBasicMaterial({ map: scopeTex, toneMapped: false })); scopeFace.position.set(-.06, .14, .151); scope.add(scopeFace);
    // a little dev board + soldering station
    box(.22, .02, .12, std(0x146b45, .5), -.72, .96, .25, bench); box(.06, .015, .06, black, -.74, .975, .25, bench);
    box(.2, .1, .14, std(0x8a1f1f, .5, .2), -1.12, .97, .3, bench);
    // keyboard + mouse in front of the screens
    const keysTex = canvasTex(512, 168, (g, w, h) => {
      g.fillStyle = '#0b0d10'; g.fillRect(0, 0, w, h);
      const rows = [14, 14, 13, 12, 9], kw = w / 15.2, kh = h / 5.4;
      rows.forEach((n, r) => {
        let x = 6 + (r === 4 ? kw * 3 : r * kw * .25);
        for (let i = 0; i < n; i++) {
          const ww = r === 4 && i === 3 ? kw * 4.6 : kw * .9;                    // the space bar
          g.fillStyle = '#3a414b'; g.fillRect(x, 6 + r * kh, ww, kh * .82);
          g.fillStyle = 'rgba(52,197,174,.55)'; g.fillRect(x, 6 + r * kh + kh * .78, ww, 2);   // a hint of backlight
          x += ww + kw * .1;
        }
      });
    });
    const kb = new THREE.Group(); kb.position.set(-.05, .95, .24); kb.rotation.set(.22, .06, 0); kb.scale.setScalar(1.25); bench.add(kb);
    box(.46, .022, .16, std(0x15181c, .5, .5), 0, .011, 0, kb);
    const keyTop = new THREE.Mesh(new THREE.PlaneGeometry(.44, .145), std(0xffffff, .7, .1, { map: keysTex, emissive: 0xffffff, emissiveMap: keysTex, emissiveIntensity: .5 }));
    keyTop.rotation.x = -Math.PI / 2; keyTop.position.y = .0225; kb.add(keyTop);
    const mouse = new THREE.Mesh(new THREE.SphereGeometry(.5, 24, 14), std(0x1b1e23, .35, .4));
    mouse.scale.set(.07, .04, .115); mouse.position.set(.4, .965, .27); bench.add(mouse);
    const mouseLed = new THREE.Mesh(new THREE.BoxGeometry(.004, .002, .02), glow(TEAL, 3)); mouseLed.position.set(.4, .985, .235); bench.add(mouseLed);
    box(.28, .004, .24, std(0x0f2a27, .95), .4, .952, .27, bench);                            // mouse pad

    // ---------- solar-system model (orrery) on a pedestal ----------
    const orrery = new THREE.Group(); orrery.position.set(-4.7, 0, -5.0); orrery.rotation.y = .55; orrery.scale.setScalar(1.3); scene.add(orrery);
    { const p = new THREE.Mesh(new THREE.CylinderGeometry(.32, .42, .9, 32), darkMetal); p.position.y = .45; orrery.add(p);
      const top = new THREE.Mesh(new THREE.CylinderGeometry(.45, .45, .05, 48), steel); top.position.y = .925; orrery.add(top);
      const lip = new THREE.Mesh(new THREE.TorusGeometry(.45, .012, 8, 64), glow(COPPER, 1.6)); lip.rotation.x = Math.PI / 2; lip.position.y = .95; orrery.add(lip);
      const rod = new THREE.Mesh(new THREE.CylinderGeometry(.012, .012, .36, 8), steel); rod.position.y = 1.12; orrery.add(rod); }
    const SUN_Y = 1.3;
    const sys = new THREE.Group(); sys.position.y = SUN_Y; sys.rotation.x = .38; orrery.add(sys);   // tilted toward you, like a desk orrery
    const sun = new THREE.Mesh(new THREE.SphereGeometry(.13, 32, 20), glow(0xffc46b, 3.2)); sys.add(sun);
    { const hc = document.createElement('canvas'); hc.width = hc.height = 128; const hg = hc.getContext('2d');
      const gr = hg.createRadialGradient(64, 64, 0, 64, 64, 64); gr.addColorStop(0, 'rgba(255,200,120,.9)'); gr.addColorStop(.35, 'rgba(255,170,80,.25)'); gr.addColorStop(1, 'rgba(255,170,80,0)');
      hg.fillStyle = gr; hg.fillRect(0, 0, 128, 128);
      const halo = new THREE.Sprite(new THREE.SpriteMaterial({ map: new THREE.CanvasTexture(hc), blending: THREE.AdditiveBlending, depthWrite: false, transparent: true }));
      halo.scale.setScalar(.75); sys.add(halo); }
    const sunLight = new THREE.PointLight(0xffc073, 8, 4, 2); sys.add(sunLight);
    const orbitMat = new THREE.MeshBasicMaterial({ color: 0x8fa3b5, transparent: true, opacity: .35, depthWrite: false });
    // [orbit radius, planet radius, colour, speed]
    const PLANETS = [[.22, .018, 0x9c8f84, 1.6], [.3, .028, 0xd9b77a, 1.2], [.39, .03, 0x3f7fd0, 1.0], [.47, .022, 0xc1543a, .8],
                     [.6, .07, 0xd8b48c, .45], [.75, .06, 0xe3cf98, .34], [.87, .042, 0x8fd6e0, .24], [.97, .04, 0x4a6fe0, .19]];
    const planets = PLANETS.map(([r, size, col, speed], i) => {
      const ring = new THREE.Mesh(new THREE.TorusGeometry(r, .0025, 4, 96), orbitMat); ring.rotation.x = Math.PI / 2; sys.add(ring);
      const pivot = new THREE.Group(); pivot.rotation.y = rnd() * 6.28; sys.add(pivot);
      const arm = new THREE.Mesh(new THREE.CylinderGeometry(.003, .003, r, 4), steel); arm.rotation.z = Math.PI / 2; arm.position.x = r / 2; pivot.add(arm);
      const planet = new THREE.Mesh(new THREE.SphereGeometry(size, 24, 16), std(col, .6, .05, { emissive: col, emissiveIntensity: .35 })); planet.position.x = r; pivot.add(planet);
      if (i === 2) { const moonP = new THREE.Group(); planet.add(moonP);                                  // Earth's moon
        const m = new THREE.Mesh(new THREE.SphereGeometry(.009, 12, 8), std(0xcfcfcf, .9)); m.position.x = .055; moonP.add(m); planet.userData.moon = moonP; }
      if (i === 5) { const sr = new THREE.Mesh(new THREE.RingGeometry(size * 1.35, size * 2.2, 48), std(0xd9c49a, .8, 0, { side: THREE.DoubleSide, transparent: true, opacity: .75 }));
        sr.rotation.x = -Math.PI / 2 + .45; planet.add(sr); }                                          // Saturn's rings
      return { pivot, planet, speed };
    });

    // ---------- hologram table (center) ----------
    const holo = new THREE.Group(); holo.position.set(1.9, 0, -5.6); scene.add(holo);
    box(1.6, .08, 1.6, darkMetal, 0, .8, 0, holo).geometry = new THREE.CylinderGeometry(.8, .8, .08, 48);
    const ped = new THREE.Mesh(new THREE.CylinderGeometry(.28, .38, .8, 24), darkMetal); ped.position.y = .4; holo.add(ped);
    const emitter = new THREE.Mesh(new THREE.TorusGeometry(.72, .015, 8, 64), glow(TEAL, 2.4)); emitter.rotation.x = Math.PI / 2; emitter.position.y = .85; holo.add(emitter);
    const holoMat = (o = .55) => new THREE.MeshBasicMaterial({ color: TEAL, transparent: true, opacity: o, blending: THREE.AdditiveBlending, depthWrite: false, wireframe: true, toneMapped: false });
    const cone = new THREE.Mesh(new THREE.CylinderGeometry(.62, .7, 1.4, 48, 1, true), new THREE.MeshBasicMaterial({ color: TEAL, transparent: true, opacity: .05, blending: THREE.AdditiveBlending, depthWrite: false, side: THREE.DoubleSide }));
    cone.position.y = 1.55; holo.add(cone);
    const core = new THREE.Group(); core.position.y = 1.62; holo.add(core);
    const ico = new THREE.Mesh(new THREE.IcosahedronGeometry(.32, 1), holoMat(.5)); core.add(ico);
    const rings = [0, 1, 2].map(i => { const r = new THREE.Mesh(new THREE.TorusGeometry(.48 + i * .09, .006, 6, 96), new THREE.MeshBasicMaterial({ color: i === 1 ? COPPER : TEAL, transparent: true, opacity: .8, blending: THREE.AdditiveBlending, depthWrite: false, toneMapped: false }));
      r.rotation.set(rnd() * 3, rnd() * 3, 0); core.add(r); return r; });
    const label = canvasTex(1024, 256, (g, w, h) => {
      g.clearRect(0, 0, w, h); g.textAlign = 'center';
      g.font = '300 96px ui-sans-serif, system-ui, "Segoe UI", sans-serif'; g.fillStyle = '#9ff3e4'; g.fillText('D · R', w / 2, 120);
      g.font = '600 34px "JetBrains Mono", monospace'; g.fillStyle = '#e9a24a'; g.fillText('ELECTRICAL ENGINEERING · UCF', w / 2, 200);
    });
    const tag = new THREE.Mesh(new THREE.PlaneGeometry(1.9, .475), new THREE.MeshBasicMaterial({ map: label, transparent: true, opacity: .9, blending: THREE.AdditiveBlending, depthWrite: false, toneMapped: false }));
    tag.position.y = 2.45; holo.add(tag);

    // a couple of stools and a crate so the room feels lived-in
    for (const [x, z] of [[3.2, -2.6], [5.3, -2.9]]) { const s = new THREE.Group(); s.position.set(x, 0, z); scene.add(s);
      const seat = new THREE.Mesh(new THREE.CylinderGeometry(.2, .2, .05, 20), black); seat.position.y = .7; s.add(seat);
      const leg = new THREE.Mesh(new THREE.CylinderGeometry(.025, .025, .7, 8), darkMetal); leg.position.y = .35; s.add(leg); }
    box(.6, .45, .6, std(0x3b3226, .8), -6.4, .225, -3.2).rotation.y = .4;

    // ---------- post-processing: a soft bloom so the lights and screens glow ----------
    const composer = new EffectComposer(renderer);
    composer.addPass(new RenderPass(scene, camera));
    const bloom = new UnrealBloomPass(new THREE.Vector2(256, 256), .6, .5, .85);
    composer.addPass(bloom);
    composer.addPass(new OutputPass());

    // ---------- quality tiers (picked automatically from how fast this computer renders) ----------
    const tiers = [
      { pr: 1, bloom: false, mirror: 0 },          // 0: low
      { pr: 1, bloom: true, mirror: 512 },         // 1: medium
      { pr: 1.25, bloom: true, mirror: 1024 },     // 2: high
    ];
    let tier = 2;
    function applyTier() {
      const q = tiers[tier];
      renderer.setPixelRatio(Math.min(q.pr, window.devicePixelRatio || 1));
      bloom.enabled = q.bloom;
      if (q.mirror) makeMirror(q.mirror); else if (mirror) { scene.remove(mirror); mirror = null; floor.material.opacity = 1; }
      if (q.mirror) floor.material.opacity = .78;
      resize();
    }
    function resize() {
      const w = host.clientWidth, h = host.clientHeight;
      if (!w || !h) return;
      renderer.setSize(w, h, false); composer.setSize(w, h);
      bloom.resolution.set(w / 2, h / 2);
      camera.aspect = w / h;
      narrow = w / h < .9;
      camera.fov = narrow ? 64 : 50;                    // phones: a wider lens so the room still reads
      camera.updateProjectionMatrix();
      dirty = true;
      if (typeof kick === 'function') kick();
    }

    // ---------- camera: a slow drift, and it looks toward the mouse ----------
    const look = { x: 0, y: 0 }, cur = { x: 0, y: 0 };
    let lastInput = performance.now(), dirty = true, narrow = false;   // start awake, so the speed check sees real frames
    host.addEventListener('pointermove', e => {
      const r = host.getBoundingClientRect();
      look.x = ((e.clientX - r.left) / r.width) * 2 - 1; look.y = ((e.clientY - r.top) / r.height) * 2 - 1;
      lastInput = performance.now();
    });
    host.addEventListener('pointerleave', () => { look.x = look.y = 0; lastInput = performance.now(); });

    // ---------- run only when it matters ----------
    let visible = true, raf = 0, last = 0, t = 0, codeT = 0, still = false, samples = [], sampleFrom = 0, sampledIdle = false, drawn = 0;
    // pause once less than ~15% of the room is on screen (the rotunda leaves a sliver of it showing at the top)
    const io = new IntersectionObserver(es => { visible = es[0].intersectionRatio >= .15; if (visible) kick(); }, { threshold: [0, .15, .3] });
    io.observe(host);
    document.addEventListener('visibilitychange', () => { if (!document.hidden) kick(); });
    addEventListener('resize', resize);
    const kick = () => { if (!raf) { last = performance.now(); raf = requestAnimationFrame(loop); } };

    function loop(now) {
      raf = 0;
      if (!visible || document.hidden || root.classList.contains('reel')) { samples = []; return; }   // asleep until needed again
      const idle = now - lastInput > 5000;
      const minGap = reduce || still ? 1e9 : idle ? 1000 / 24 : 1000 / 60;         // 24 fps when nobody's moving the mouse
      if (now - last < minGap - 2 && !dirty) { raf = requestAnimationFrame(loop); return; }
      const gap = now - last, dt = Math.min(.1, gap / 1000); last = now; t += dt; dirty = false; drawn++;

      // animate
      cur.x += (look.x - cur.x) * Math.min(1, dt * 3); cur.y += (look.y - cur.y) * Math.min(1, dt * 3);
      const sway = Math.sin(t * .15) * .25;
      if (narrow) {                                      // phones: lower and further back, aimed so the room sits above the text
        camera.position.set(.6 + sway * .5, 1.25, 5.2);
        camera.lookAt(1.7, -1.1, -6);
      } else {
        camera.position.set(-.4 + sway + cur.x * .5, 1.7 - cur.y * .15, 3.6);
        camera.lookAt(.15 + cur.x * 2.6, 1.45 - cur.y * 1.1, -6);
      }
      skyMat.uniforms.t.value = t; cloudSea.material.uniforms.t.value = t; giant.material.uniforms.t.value = t;
      core.rotation.y = t * .5; ico.rotation.x = t * .3;
      rings.forEach((r, i) => { r.rotation.x += dt * (.3 + i * .2); r.rotation.y += dt * (.2 - i * .1); });
      tag.position.y = 2.45 + Math.sin(t * 1.3) * .03; tag.material.opacity = .82 + Math.sin(t * 9) * .04 + (Math.random() < .01 ? -.3 : 0);
      islands.children.forEach(g => { g.position.y = g.userData.y + Math.sin(t * .25 + g.userData.seed) * .6; });
      planets.forEach(p => { p.pivot.rotation.y += dt * p.speed * .35; p.planet.rotation.y += dt; if (p.planet.userData.moon) p.planet.userData.moon.rotation.y += dt * 2.4; });
      holoLight.intensity = 9 + Math.sin(t * 3) * 1.5;
      // live screens: scope trace every frame, code screen a few times a second
      { const { g, w, h } = scopeTex.userData; g.fillStyle = '#031210'; g.fillRect(0, 0, w, h);
        g.strokeStyle = 'rgba(52,197,174,.25)'; g.lineWidth = 1; for (let x = 0; x < w; x += 32) { g.beginPath(); g.moveTo(x, 0); g.lineTo(x, h); g.stroke(); }
        g.strokeStyle = '#7ff5df'; g.lineWidth = 3; g.beginPath();
        for (let x = 0; x <= w; x += 4) g.lineTo(x, h / 2 + Math.sin(x * .07 + t * 6) * 34 * Math.sin(t * .7 + x * .01));
        g.stroke(); scopeTex.needsUpdate = true; }
      if (t - codeT > .5) { codeT = t; const { g, w, h } = codeTex.userData; const img = g.getImageData(0, 21, w, h - 21); g.putImageData(img, 0, 0);
        g.fillStyle = '#04110f'; g.fillRect(0, h - 22, w, 22); g.fillStyle = Math.random() < .3 ? '#e9a24a' : '#9fe8da'; g.font = '15px monospace';
        const pool = ['> test pass 42/42', '  pid.step(err, dt);', '  ring.glow(1.0);', '> uplink nominal', '  door.unlock();', '  servo.write(92);'];
        g.fillText(pool[Math.floor(Math.random() * pool.length)], 18, h - 6); codeTex.needsUpdate = true; }

      if (bloom.enabled) composer.render(); else renderer.render(scene, camera);

      // self-tuning, by time: watch real frame times for ~1.5 s while running full speed; if they're slow, step the
      // quality down and check again. If even the lowest setting can't manage ~10 fps, freeze on a still image.
      if (!reduce) {                                 // (also while idle: there the target is the slower idle pace)
        if (samples.length && idle !== sampledIdle) samples = [];   // don't mix the two paces
        sampledIdle = idle;
        if (!samples.length) sampleFrom = now;
        samples.push(gap);
        if (now - sampleFrom > 1500 && samples.length >= 4) {
          const med = samples.slice(1).sort((x, y) => x - y)[Math.floor((samples.length - 1) / 2)];
          if (med > Math.max(1000 / 40, minGap * 1.3) && tier > 0) { tier--; applyTier(); }
          else if (med > 100 && tier === 0) { still = true; host.dataset.quality = 'still'; }
          samples = [];
        }
      }
      if (!still) host.dataset.quality = ['low', 'medium', 'high'][tier];
      if (!reduce && !still) raf = requestAnimationFrame(loop);
    }

    applyTier();
    host.classList.add('lab-live');
    kick();
    window.__lab = { get tier() { return tier; }, get drawn() { return drawn; }, get still() { return still; }, setTier(n) { tier = n; applyTier(); }, render: () => { dirty = true; kick(); } };   // for testing
  }
})();
