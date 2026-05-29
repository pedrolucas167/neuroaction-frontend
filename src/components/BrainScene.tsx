import React, { useRef, useEffect, useState } from 'react';
import * as THREE from 'three';
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls';
import HUD from './HUD';

/* ===================================================================
 *  CONFIGURAÇÃO — ajustável para performance
 * =================================================================*/
const NUM_NEURONS       = 1000;
const NUM_SYNAPSES      = 800;
const SYNAPSE_PTS       = 10;
const PULSE_PARTICLES   = 120;
const BG_PARTICLES      = 200;
const API_URL           = 'http://localhost:8080/brain/state';
const THOUGHT_API_URL   = 'http://localhost:8080/brain/thought';

/* ===================================================================
 *  INTERFACE DO BACKEND
 * =================================================================*/
interface NeuronAPI {
  id: number;
  membranePotential: number;
  threshold: number;
  restingPotential: number;
  fired: boolean;
}

/* ===================================================================
 *  PALETAS
 * =================================================================*/
const SYNAPSE_COLORS = [
  new THREE.Color('#00ddff'),
  new THREE.Color('#00ffaa'),
  new THREE.Color('#3388ff'),
  new THREE.Color('#66ffcc'),
  new THREE.Color('#00aaff'),
];
const ACTIVE_COLORS = [
  new THREE.Color('#ff6633'),
  new THREE.Color('#ff3344'),
  new THREE.Color('#ffaa00'),
  new THREE.Color('#ff5577'),
];
const COL_REST    = new THREE.Color('#00ccaa');
const COL_LOW     = new THREE.Color('#006644');
const COL_MID     = new THREE.Color('#00ffcc');
const COL_WARM    = new THREE.Color('#ffff00');
const COL_HOT     = new THREE.Color('#ff6633');

/* ===================================================================
 *  GEOMETRIA
 * =================================================================*/
function brainPosition(i: number, total: number): THREE.Vector3 {
  const hemi = i < total / 2 ? -1 : 1;
  const gap = 1.2, a = 9, b = 7, c = 8;
  const phi   = Math.acos(2 * Math.random() - 1);
  const theta = 2 * Math.PI * Math.random();
  const r     = Math.cbrt(Math.random());
  const shell = 0.7 + 0.3 * r;

  let x = shell * a * Math.sin(phi) * Math.cos(theta);
  let y = shell * b * Math.sin(phi) * Math.sin(theta);
  let z = shell * c * Math.cos(phi);

  const freq = 3 + Math.random() * 2;
  x += 0.4 * Math.sin(freq * y) * Math.cos(freq * z);
  y += 0.4 * Math.sin(freq * z) * Math.cos(freq * x);
  x = hemi * (gap + Math.abs(x));

  return new THREE.Vector3(x, y, z);
}

/* ===================================================================
 *  COMPONENTE
 * =================================================================*/
const BrainScene = () => {
  const mountRef      = useRef(null as HTMLDivElement | null);
  const pausedRef     = useRef(false);
  const speedRef      = useRef(1);
  const neuronDataRef = useRef([] as NeuronAPI[]);
  
  // Controle de polling manual
  const manualOverrideRef = useRef(false);
  const overrideTimeoutRef = useRef(null);

  const [paused, setPaused]             = useState(false);
  const [speed, setSpeed]               = useState(1);
  const [spikeRate, setSpikeRate]       = useState(0);
  const [activityRate, setActivityRate] = useState(0);
  const [thought, setThought]           = useState('...');

  useEffect(() => { pausedRef.current = paused; }, [paused]);
  useEffect(() => { speedRef.current  = speed;  }, [speed]);

  /* ---------------------------------------------------------------
   *  FUNCIONALIDADE: ALTERAR ESTADO MENTAL
   * -------------------------------------------------------------*/
  const handleSetThought = async (newThought: string) => {
    // 1. Bloqueia o polling temporariamente
    if (overrideTimeoutRef.current) clearTimeout(overrideTimeoutRef.current);
    manualOverrideRef.current = true;
    
    // 2. Atualiza UI imediatamente
    setThought(newThought);
    
    // 3. Define timeout para liberar o polling (5 segundos)
    overrideTimeoutRef.current = setTimeout(() => {
      manualOverrideRef.current = false;
    }, 5000);

    // 4. Envia ao backend
    try {
      await fetch(THOUGHT_API_URL, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ thought: newThought })
      });
      // Se sucesso, mantemos o estado. O polling voltará em 5s.
    } catch (e) {
      console.error("Error setting thought", e);
      setThought("Network Error");
      // Se erro, libera polling imediatamente para tentar recuperar
      manualOverrideRef.current = false;
    }
  };

  /* ---------------------------------------------------------------
   *  INICIALIZAÇÃO
   * -------------------------------------------------------------*/
  useEffect(() => {
    if (!mountRef.current) return;

    /* --- Renderer --- */
    const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: false, powerPreference: 'high-performance' });
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    renderer.setSize(window.innerWidth, window.innerHeight);
    renderer.toneMapping = THREE.ACESFilmicToneMapping;
    renderer.toneMappingExposure = 1.2;
    mountRef.current.appendChild(renderer.domElement);

    const scene  = new THREE.Scene();
    scene.background = new THREE.Color('#050510');
    scene.fog = new THREE.FogExp2('#050510', 0.012);

    const camera = new THREE.PerspectiveCamera(60, window.innerWidth / window.innerHeight, 0.1, 500);
    camera.position.set(0, 5, 35);

    const controls = new OrbitControls(camera, renderer.domElement);
    controls.enableDamping = true;
    controls.dampingFactor = 0.08;
    controls.autoRotate = true;
    controls.autoRotateSpeed = 0.4;
    controls.minDistance = 15;
    controls.maxDistance = 80;

    /* --- Iluminação --- */
    scene.add(new THREE.AmbientLight('#334466', 0.6));
    const kl = new THREE.PointLight('#88ccff', 1.5, 100);
    kl.position.set(10, 15, 20);
    scene.add(kl);
    const fl = new THREE.PointLight('#4466aa', 0.8, 80);
    fl.position.set(-15, -5, -10);
    scene.add(fl);
    const rl = new THREE.PointLight('#00ffaa', 0.5, 60);
    rl.position.set(0, -10, 15);
    scene.add(rl);

    /* --- Neurônios --- */
    const positions: THREE.Vector3[] = [];
    for (let i = 0; i < NUM_NEURONS; i++) positions.push(brainPosition(i, NUM_NEURONS));

    const neuronGeo = new THREE.SphereGeometry(0.12, 8, 8);
    const neuronMat = new THREE.MeshStandardMaterial({
      color: '#00ccaa', emissive: '#00ffcc', emissiveIntensity: 0.6,
      roughness: 0.3, metalness: 0.1,
    });
    const neuronMesh = new THREE.InstancedMesh(neuronGeo, neuronMat, NUM_NEURONS);
    neuronMesh.instanceMatrix.setUsage(THREE.DynamicDrawUsage);

    const dummy = new THREE.Object3D();
    const tmpCol = new THREE.Color();
    const tmpCol2 = new THREE.Color();

    for (let i = 0; i < NUM_NEURONS; i++) {
      dummy.position.copy(positions[i]);
      dummy.scale.setScalar(1);
      dummy.updateMatrix();
      neuronMesh.setMatrixAt(i, dummy.matrix);
      neuronMesh.setColorAt(i, tmpCol.copy(COL_REST));
    }
    neuronMesh.instanceMatrix.needsUpdate = true;
    if (neuronMesh.instanceColor) neuronMesh.instanceColor.needsUpdate = true;

    /* --- Glow --- */
    const glowTex = generateGlowTexture();
    const glowGeo = new THREE.PlaneGeometry(1, 1);
    const glowMat = new THREE.MeshBasicMaterial({
      map: glowTex, transparent: true, opacity: 0.15,
      blending: THREE.AdditiveBlending, depthWrite: false, side: THREE.DoubleSide,
    });
    const glowMesh = new THREE.InstancedMesh(glowGeo, glowMat, NUM_NEURONS);
    glowMesh.instanceMatrix.setUsage(THREE.DynamicDrawUsage);
    const glowColors = new Float32Array(NUM_NEURONS * 3);
    for (let i = 0; i < NUM_NEURONS; i++) {
      dummy.position.copy(positions[i]);
      dummy.scale.setScalar(0.6);
      dummy.updateMatrix();
      glowMesh.setMatrixAt(i, dummy.matrix);
      glowColors[i * 3]     = COL_REST.r;
      glowColors[i * 3 + 1] = COL_REST.g;
      glowColors[i * 3 + 2] = COL_REST.b;
      glowMesh.setColorAt(i, tmpCol.copy(COL_REST));
    }
    glowMesh.instanceMatrix.needsUpdate = true;
    if (glowMesh.instanceColor) glowMesh.instanceColor.needsUpdate = true;

    /* --- Sinapses --- */
    const pairs = generateSynapsePairs(positions, NUM_SYNAPSES);
    interface SynInfo { from: number; to: number; startIdx: number; baseColor: THREE.Color; baseOpacity: number; sampledPts: THREE.Vector3[]; }
    const synInfos: SynInfo[] = [];
    const allLineVerts: number[] = [];
    const allLineColors: number[] = [];

    pairs.forEach(([from, to]) => {
      const p1 = positions[from], p2 = positions[to];
      const dist = p1.distanceTo(p2);
      const numCtrl = dist > 8 ? 4 : 3;
      const ctrlPts: THREE.Vector3[] = [p1.clone()];
      for (let k = 1; k < numCtrl - 1; k++) {
        const t = k / (numCtrl - 1);
        const pt = p1.clone().lerp(p2, t);
        pt.x += (Math.random() - 0.5) * dist * 0.3;
        pt.y += (Math.random() - 0.5) * dist * 0.3;
        pt.z += (Math.random() - 0.5) * dist * 0.3;
        ctrlPts.push(pt);
      }
      ctrlPts.push(p2.clone());

      const curve = new THREE.CatmullRomCurve3(ctrlPts);
      const pts = curve.getPoints(SYNAPSE_PTS);
      const baseColor = SYNAPSE_COLORS[Math.floor(Math.random() * SYNAPSE_COLORS.length)];
      const baseOpacity = 0.08 + Math.random() * 0.12;
      const startIdx = allLineVerts.length / 3;
      for (let k = 0; k < pts.length - 1; k++) {
        allLineVerts.push(pts[k].x, pts[k].y, pts[k].z);
        allLineVerts.push(pts[k + 1].x, pts[k + 1].y, pts[k + 1].z);
        const c = baseColor.clone().multiplyScalar(baseOpacity * 5);
        allLineColors.push(c.r, c.g, c.b);
        allLineColors.push(c.r, c.g, c.b);
      }
      synInfos.push({ from, to, startIdx, baseColor, baseOpacity, sampledPts: pts });
    });

    const synGeo = new THREE.BufferGeometry();
    const synVerts  = new Float32Array(allLineVerts);
    const synColors = new Float32Array(allLineColors);
    synGeo.setAttribute('position', new THREE.BufferAttribute(synVerts, 3));
    synGeo.setAttribute('color',    new THREE.BufferAttribute(synColors, 3));
    const synMat = new THREE.LineBasicMaterial({ vertexColors: true, transparent: true, opacity: 1, blending: THREE.AdditiveBlending, depthWrite: false });
    const synLines = new THREE.LineSegments(synGeo, synMat);

    /* --- Adjacência --- */
    const adjacency = new Map<number, number[]>();
    synInfos.forEach((s, idx) => {
      if (!adjacency.has(s.from)) adjacency.set(s.from, []);
      adjacency.get(s.from)!.push(idx);
      if (!adjacency.has(s.to)) adjacency.set(s.to, []);
      adjacency.get(s.to)!.push(idx);
    });

    /* --- Partículas --- */
    const pulseGeo  = new THREE.BufferGeometry();
    const pPos   = new Float32Array(PULSE_PARTICLES * 3);
    const pColor = new Float32Array(PULSE_PARTICLES * 3);
    const pSize  = new Float32Array(PULSE_PARTICLES);
    for (let i = 0; i < PULSE_PARTICLES; i++) {
      pPos[i * 3] = pPos[i * 3 + 1] = pPos[i * 3 + 2] = 9999;
      pSize[i] = 0;
    }
    pulseGeo.setAttribute('position', new THREE.BufferAttribute(pPos, 3));
    pulseGeo.setAttribute('color',    new THREE.BufferAttribute(pColor, 3));
    pulseGeo.setAttribute('size',     new THREE.BufferAttribute(pSize, 1));
    const pulseMat = new THREE.PointsMaterial({ size: 0.3, vertexColors: true, transparent: true, opacity: 0.9, blending: THREE.AdditiveBlending, sizeAttenuation: true, depthWrite: false, map: glowTex });
    const pulsePoints = new THREE.Points(pulseGeo, pulseMat);

    interface Pulse { synIdx: number; t: number; speed: number; color: THREE.Color; active: boolean; }
    const pulses: Pulse[] = Array.from({ length: PULSE_PARTICLES }, () => ({ synIdx: 0, t: 0, speed: 0, color: new THREE.Color(), active: false }));

    /* --- Background --- */
    const bgGeo = new THREE.BufferGeometry();
    const bgPos = new Float32Array(BG_PARTICLES * 3);
    for (let i = 0; i < BG_PARTICLES; i++) {
      bgPos[i * 3] = (Math.random() - 0.5) * 80; bgPos[i * 3 + 1] = (Math.random() - 0.5) * 80; bgPos[i * 3 + 2] = (Math.random() - 0.5) * 80;
    }
    bgGeo.setAttribute('position', new THREE.BufferAttribute(bgPos, 3));
    const bgMat = new THREE.PointsMaterial({ size: 0.08, color: '#224466', transparent: true, opacity: 0.4, blending: THREE.AdditiveBlending, depthWrite: false });

    /* --- Cena Global --- */
    const brainGroup = new THREE.Group();
    brainGroup.add(neuronMesh); brainGroup.add(glowMesh); brainGroup.add(synLines); brainGroup.add(pulsePoints);
    scene.add(brainGroup); scene.add(new THREE.Points(bgGeo, bgMat));

    /* =============================================================
     *  FETCH
     * ===========================================================*/
    let fetchInterval: ReturnType<typeof setInterval>;
    let spikeInterval: ReturnType<typeof setInterval>;
    let thoughtInterval: ReturnType<typeof setInterval>;

    const startFetching = () => {
      let spikesInWindow = 0;
      fetchInterval = setInterval(async () => {
        if (pausedRef.current) return;
        try {
          const res  = await fetch(API_URL);
          const data: NeuronAPI[] = await res.json();
          neuronDataRef.current = data;
          const fired = data.filter((n: NeuronAPI) => n.fired).length;
          spikesInWindow += fired;
          setActivityRate(data.length > 0 ? fired / data.length : 0);
        } catch { /* offline */ }
      }, Math.round(200 / speedRef.current));

      spikeInterval = setInterval(() => {
        setSpikeRate(spikesInWindow * (5 * speedRef.current));
        spikesInWindow = 0;
      }, 1000);

      thoughtInterval = setInterval(async () => {
        // Se estiver em override manual (usuário acabou de clicar), não atualiza
        if (pausedRef.current || manualOverrideRef.current) return;
        try {
          const res = await fetch(THOUGHT_API_URL);
          const data = await res.json();
          if (data.thought) {
            setThought(data.thought);
          }
        } catch {
          setThought('Offline');
        }
      }, 2000);
    };
    startFetching();

    /* =============================================================
     *  LOOP
     * ===========================================================*/
    let animId: number;
    const clock = new THREE.Clock();
    const _v = new THREE.Vector3();

    const animate = () => {
      animId = requestAnimationFrame(animate);
      const t = clock.getElapsedTime();
      controls.update();
      brainGroup.scale.setScalar(1 + 0.015 * Math.sin(t * 1.2));

      const api = neuronDataRef.current;
      const synColArr = synGeo.attributes.color.array as Float32Array;
      let synDirty = false;

      for (let i = 0; i < NUM_NEURONS; i++) {
        const n = api[i];
        let scale = 1;
        if (n) {
          if (n.fired) {
            tmpCol.copy(ACTIVE_COLORS[i & 3]);
            scale = 1.4 + 0.2 * Math.sin(t * 15 + i);
            emitPulse(i);
          } else {
            const range = n.threshold - n.restingPotential;
            const ratio = range > 0 ? Math.min(1, Math.max(0, (n.membranePotential - n.restingPotential) / range)) : 0;
            if (ratio > 0.6) tmpCol.copy(COL_WARM).lerp(tmpCol2.copy(COL_HOT), (ratio - 0.6) * 2.5);
            else tmpCol.copy(COL_LOW).lerp(tmpCol2.copy(COL_MID), ratio * 1.667);
            scale = 1 + 0.08 * Math.sin(t * 2 + i * 0.5);
          }
        } else {
          tmpCol.copy(COL_REST);
          scale = 1 + 0.06 * Math.sin(t * 2 + i * 0.3);
        }
        dummy.position.copy(positions[i]);
        dummy.scale.setScalar(scale);
        dummy.updateMatrix();
        neuronMesh.setMatrixAt(i, dummy.matrix);
        neuronMesh.setColorAt(i, tmpCol);
        
        dummy.scale.setScalar(n?.fired ? 1.2 : 0.5);
        dummy.lookAt(camera.position);
        dummy.updateMatrix();
        glowMesh.setMatrixAt(i, dummy.matrix);
        glowMesh.setColorAt(i, tmpCol);
      }
      neuronMesh.instanceMatrix.needsUpdate = true;
      if (neuronMesh.instanceColor) neuronMesh.instanceColor.needsUpdate = true;
      glowMesh.instanceMatrix.needsUpdate = true;
      if (glowMesh.instanceColor) glowMesh.instanceColor.needsUpdate = true;

      for (let si = 0; si < synInfos.length; si++) {
        const info = synInfos[si];
        const fFrom = api[info.from];
        const fTo   = api[info.to];
        const active = !!(fFrom?.fired || fTo?.fired);
        const segCount = (info.sampledPts.length - 1) * 2;
        const base = info.startIdx;
        if (active) {
          const ac = ACTIVE_COLORS[(si & 3)];
          for (let v = 0; v < segCount; v++) {
            const off = (base + v) * 3;
            synColArr[off] = ac.r * 0.8; synColArr[off + 1] = ac.g * 0.8; synColArr[off + 2] = ac.b * 0.8;
          }
          synDirty = true;
        } else {
          const bc = info.baseColor; const m = info.baseOpacity * 5;
          for (let v = 0; v < segCount; v++) {
            const off = (base + v) * 3;
            synColArr[off] += (bc.r * m - synColArr[off]) * 0.05;
            synColArr[off + 1] += (bc.g * m - synColArr[off + 1]) * 0.05;
            synColArr[off + 2] += (bc.b * m - synColArr[off + 2]) * 0.05;
          }
          synDirty = true;
        }
      }
      if (synDirty) synGeo.attributes.color.needsUpdate = true;

      const posA = pulseGeo.attributes.position.array as Float32Array;
      const colA = pulseGeo.attributes.color.array    as Float32Array;
      const sizA = pulseGeo.attributes.size.array      as Float32Array;
      for (let i = 0; i < PULSE_PARTICLES; i++) {
        const p = pulses[i];
        if (!p.active) { posA[i*3]=posA[i*3+1]=posA[i*3+2]=9999; sizA[i]=0; continue; }
        p.t += p.speed * speedRef.current;
        if (p.t < 0 || p.t > 1) { p.active = false; continue; }
        const info = synInfos[p.synIdx];
        if (!info) { p.active = false; continue; }
        const idx = p.t * (info.sampledPts.length - 1);
        const lo = Math.floor(idx); const hi = Math.min(lo + 1, info.sampledPts.length - 1); const frac = idx - lo;
        _v.lerpVectors(info.sampledPts[lo], info.sampledPts[hi], frac);
        posA[i*3]=_v.x; posA[i*3+1]=_v.y; posA[i*3+2]=_v.z;
        colA[i*3]=p.color.r; colA[i*3+1]=p.color.g; colA[i*3+2]=p.color.b;
        sizA[i] = 0.2 + 0.15 * Math.sin(p.t * 3.1416);
      }
      pulseGeo.attributes.position.needsUpdate = true; pulseGeo.attributes.color.needsUpdate = true; pulseGeo.attributes.size.needsUpdate = true;
      renderer.render(scene, camera);
    };

    let nextPulse = 0;
    const emitPulse = (neuronIdx: number) => {
      const connected = adjacency.get(neuronIdx);
      if (!connected || connected.length === 0) return;
      const pick = connected[Math.floor(Math.random() * connected.length)];
      const p = pulses[nextPulse % PULSE_PARTICLES];
      nextPulse++;
      p.active = true; p.synIdx = pick;
      const info = synInfos[pick];
      p.t = info.from === neuronIdx ? 0 : 1;
      p.speed = (0.01 + Math.random() * 0.01) * (info.from === neuronIdx ? 1 : -1);
      p.color.copy(ACTIVE_COLORS[Math.floor(Math.random() * 4)]);
    };

    animate();
    const handleResize = () => { camera.aspect = window.innerWidth / window.innerHeight; camera.updateProjectionMatrix(); renderer.setSize(window.innerWidth, window.innerHeight); };
    window.addEventListener('resize', handleResize);

    return () => {
      cancelAnimationFrame(animId);
      clearInterval(fetchInterval);
      clearInterval(spikeInterval);
      clearInterval(thoughtInterval);
      if (overrideTimeoutRef.current) clearTimeout(overrideTimeoutRef.current);
      window.removeEventListener('resize', handleResize);
      if (mountRef.current && renderer.domElement.parentNode === mountRef.current) mountRef.current.removeChild(renderer.domElement);
      renderer.dispose();
      neuronGeo.dispose(); neuronMat.dispose(); glowGeo.dispose(); glowMat.dispose(); glowTex.dispose();
      synGeo.dispose(); synMat.dispose(); pulseGeo.dispose(); pulseMat.dispose(); bgGeo.dispose(); bgMat.dispose();
    };
  }, []);

  return (
    <div ref={mountRef} style={{ width: '100vw', height: '100vh', position: 'relative', background: '#050510' }}>
      <HUD
        neuronCount={NUM_NEURONS} spikeRate={spikeRate} activityRate={activityRate}
        thought={thought} paused={paused} onPauseToggle={() => setPaused((p: boolean) => !p)}
        onSpeedChange={setSpeed} speed={speed} onSetThought={handleSetThought}
      />
    </div>
  );
};

/* ===================================================================
 *  HELPERS
 * =================================================================*/
function generateGlowTexture(): THREE.Texture {
  const s = 64, canvas = document.createElement('canvas');
  canvas.width = canvas.height = s;
  const ctx = canvas.getContext('2d')!;
  const g = ctx.createRadialGradient(s/2,s/2,0,s/2,s/2,s/2);
  g.addColorStop(0,'rgba(255,255,255,1)'); g.addColorStop(0.3,'rgba(255,255,255,0.4)'); g.addColorStop(1,'rgba(255,255,255,0)');
  ctx.fillStyle = g; ctx.fillRect(0,0,s,s);
  const tex = new THREE.CanvasTexture(canvas); tex.needsUpdate = true; return tex;
}
function generateSynapsePairs(positions: THREE.Vector3[], count: number): [number, number][] {
  const pairs: [number, number][] = []; const used = new Set<string>(); const n = positions.length; const localCount = Math.floor(count * 0.8);
  for (let att = 0; pairs.length < localCount && att < localCount * 5; att++) {
    const i = Math.floor(Math.random() * n); let bestJ = -1, bestD = Infinity;
    for (let k = 0; k < 10; k++) { const j = Math.floor(Math.random() * n); if (j === i) continue; const d = positions[i].distanceTo(positions[j]); if (d < bestD && d < 6) { bestD = d; bestJ = j; } }
    if (bestJ < 0) continue; const key = Math.min(i, bestJ) + '-' + Math.max(i, bestJ); if (used.has(key)) continue; used.add(key); pairs.push([i, bestJ]);
  }
  while (pairs.length < count) { const i = Math.floor(Math.random() * n); const j = Math.floor(Math.random() * n); if (i === j) continue; const key = Math.min(i,j)+'-'+Math.max(i,j); if (used.has(key)) continue; used.add(key); pairs.push([i, j]); }
  return pairs;
}

export default BrainScene;
