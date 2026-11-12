"use client";

import { useEffect, useRef, useState } from "react";
import * as THREE from "three";
import { ArrowDown, ArrowLeft, ArrowRight, ArrowUp, LogOut, RotateCcw } from "lucide-react";

type Paint = "white" | "coral" | "mint" | "blue";
type Phase = "ready" | "playing" | "won" | "caught";
const COLORS: Record<Paint, number> = { white: 0xffffff, coral: 0xff727a, mint: 0x62d5a0, blue: 0x72a9ff };
const ZONES: { color: Exclude<Paint, "white">; x: number; z: number }[] = [
  { color: "coral", x: -5.5, z: -3.3 }, { color: "mint", x: 0, z: -3.3 },
  { color: "blue", x: 5.5, z: -3.3 },
];

function makeCharacter(paint: Paint, seeker = false) {
  const group = new THREE.Group();
  const bodyMaterial = new THREE.MeshStandardMaterial({ color: seeker ? 0x2a2548 : COLORS[paint], roughness: 0.7 });
  const detailMaterial = new THREE.MeshStandardMaterial({ color: seeker ? 0xf5d45c : 0x202136 });
  const sphere = (radius: number, x: number, y: number, z: number, material = bodyMaterial) => {
    const mesh = new THREE.Mesh(new THREE.SphereGeometry(radius, 16, 12), material);
    mesh.position.set(x, y, z); group.add(mesh); return mesh;
  };
  const limb = (x: number, y: number, rotation: number) => {
    const mesh = new THREE.Mesh(new THREE.CapsuleGeometry(0.17, 0.65, 4, 8), bodyMaterial);
    mesh.position.set(x, y, 0); mesh.rotation.z = rotation; group.add(mesh);
  };
  sphere(0.43, 0, 2.05, 0);
  sphere(0.44, 0, 1.15, 0);
  limb(-0.65, 1.45, -0.9); limb(0.65, 1.45, 0.9);
  limb(-0.23, 0.45, 0); limb(0.23, 0.45, 0);
  sphere(0.045, -0.15, 2.12, 0.39, detailMaterial);
  sphere(0.045, 0.15, 2.12, 0.39, detailMaterial);
  const smile = new THREE.Mesh(new THREE.TorusGeometry(0.14, 0.025, 5, 16, Math.PI), detailMaterial);
  smile.position.set(0, 1.95, 0.4); smile.rotation.z = Math.PI; group.add(smile);
  group.userData.bodyMaterial = bodyMaterial;
  return group;
}

export function HideAndSeekGame({ onExit }: { onExit: () => void }) {
  const mount = useRef<HTMLDivElement>(null);
  const keys = useRef(new Set<string>());
  const player = useRef<THREE.Group | null>(null);
  const seeker = useRef<THREE.Group | null>(null);
  const state = useRef({ phase: "ready" as Phase, paint: "white" as Paint, hidden: false });
  const [phase, setPhase] = useState<Phase>("ready");
  const [paint, setPaint] = useState<Paint>("white");
  const [hidden, setHidden] = useState(false);
  const [remaining, setRemaining] = useState(45);

  useEffect(() => { state.current.phase = phase; state.current.paint = paint; state.current.hidden = hidden; }, [phase, paint, hidden]);

  useEffect(() => {
    if (!mount.current) return;
    const host = mount.current;
    const scene = new THREE.Scene(); scene.background = new THREE.Color(0x101322);
    scene.fog = new THREE.Fog(0x101322, 18, 35);
    const camera = new THREE.PerspectiveCamera(52, 1, 0.1, 80);
    camera.position.set(0, 10, 13); camera.lookAt(0, 0.8, -1);
    const renderer = new THREE.WebGLRenderer({ antialias: true, powerPreference: "low-power" });
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    renderer.shadowMap.enabled = true;
    host.appendChild(renderer.domElement);
    scene.add(new THREE.HemisphereLight(0xdceaff, 0x384334, 2.5));
    const sun = new THREE.DirectionalLight(0xffffff, 2.4);
    sun.position.set(-4, 11, 8); sun.castShadow = true; scene.add(sun);
    const floor = new THREE.Mesh(new THREE.BoxGeometry(18, 0.3, 12), new THREE.MeshStandardMaterial({color:0x424b5e, roughness:0.9}));
    floor.position.y = -0.18; floor.receiveShadow = true; scene.add(floor);
    const sideMaterial = new THREE.MeshStandardMaterial({color:0x79869b});
    for (const x of [-9, 9]) { const wall = new THREE.Mesh(new THREE.BoxGeometry(0.3, 4, 12), sideMaterial); wall.position.set(x, 2, 0); scene.add(wall); }
    const back = new THREE.Mesh(new THREE.BoxGeometry(18, 4, 0.3), sideMaterial); back.position.set(0, 2, -6); scene.add(back);
    for (const zone of ZONES) {
      const wall = new THREE.Mesh(new THREE.BoxGeometry(5.2, 3.7, 0.35), new THREE.MeshStandardMaterial({color:COLORS[zone.color], roughness:0.85}));
      wall.position.set(zone.x, 1.85, -5.72); wall.receiveShadow = true; scene.add(wall);
      const rug = new THREE.Mesh(new THREE.BoxGeometry(5, 0.04, 2.1), new THREE.MeshStandardMaterial({color:COLORS[zone.color], roughness:1}));
      rug.position.set(zone.x, 0.025, -4.55); scene.add(rug);
      const crate = new THREE.Mesh(new THREE.BoxGeometry(1.2, 1.2, 1.2), new THREE.MeshStandardMaterial({color:COLORS[zone.color], roughness:0.9}));
      crate.position.set(zone.x + 1.7, 0.6, -4.8); crate.castShadow = true; scene.add(crate);
    }
    const me = makeCharacter("white"); me.position.set(0, 0, 3.7); scene.add(me); player.current = me;
    const hunter = makeCharacter("white", true); hunter.position.set(-7, 0, 2.7); hunter.rotation.y = Math.PI; scene.add(hunter); seeker.current = hunter;
    const resize = () => { const width = host.clientWidth, height = host.clientHeight; if (!width || !height) return; camera.aspect = width / height; camera.updateProjectionMatrix(); renderer.setSize(width, height); };
    const observer = new ResizeObserver(resize); observer.observe(host); resize();
    const clock = new THREE.Clock(); let frame = 0; let hunterTarget = 0;
    const animate = () => {
      frame = requestAnimationFrame(animate);
      const delta = Math.min(clock.getDelta(), 0.05);
      if (state.current.phase === "playing") {
        let dx = 0, dz = 0;
        if (keys.current.has("a") || keys.current.has("arrowleft")) dx -= 1;
        if (keys.current.has("d") || keys.current.has("arrowright")) dx += 1;
        if (keys.current.has("w") || keys.current.has("arrowup")) dz -= 1;
        if (keys.current.has("s") || keys.current.has("arrowdown")) dz += 1;
        if (dx || dz) { const scale = 4 * delta / Math.hypot(dx, dz); me.position.x = THREE.MathUtils.clamp(me.position.x + dx * scale, -8.2, 8.2); me.position.z = THREE.MathUtils.clamp(me.position.z + dz * scale, -5.1, 5.2); }
        const matching = state.current.paint !== "white" && ZONES.some(zone => zone.color === state.current.paint && Math.abs(me.position.x-zone.x) < 2.25 && me.position.z < -3.5);
        const isHidden = matching && !dx && !dz;
        if (isHidden !== state.current.hidden) { state.current.hidden = isHidden; setHidden(isHidden); }
        if (isHidden) {
          hunterTarget -= delta;
          if (hunterTarget <= 0) { hunterTarget = 2.5; hunter.userData.targetX = (Math.random()-.5)*14; hunter.userData.targetZ = (Math.random()-.5)*8; }
        } else { hunter.userData.targetX = me.position.x; hunter.userData.targetZ = me.position.z; }
        const tx = hunter.userData.targetX ?? me.position.x, tz = hunter.userData.targetZ ?? me.position.z;
        const vx = tx-hunter.position.x, vz = tz-hunter.position.z, distance = Math.hypot(vx,vz);
        if (distance > 0.15) { const pace = Math.min(distance, (isHidden ? 1.35 : 1.85)*delta); hunter.position.x += vx/distance*pace; hunter.position.z += vz/distance*pace; hunter.rotation.y = Math.atan2(vx, vz); }
        if (Math.hypot(hunter.position.x-me.position.x, hunter.position.z-me.position.z) < 0.75) { state.current.phase = "caught"; setPhase("caught"); }
      }
      camera.position.x = THREE.MathUtils.lerp(camera.position.x, me.position.x * 0.3, 0.03);
      camera.lookAt(me.position.x * 0.3, 0.8, -1);
      renderer.render(scene, camera);
    }; animate();
    return () => { cancelAnimationFrame(frame); observer.disconnect(); host.removeChild(renderer.domElement); scene.traverse(object => { if (object instanceof THREE.Mesh) { object.geometry.dispose(); const materials = Array.isArray(object.material) ? object.material : [object.material]; materials.forEach(material => material.dispose()); } }); renderer.dispose(); player.current = null; seeker.current = null; };
  }, []);

  useEffect(() => {
    if (player.current) (player.current.userData.bodyMaterial as THREE.MeshStandardMaterial).color.setHex(COLORS[paint]);
  }, [paint]);

  useEffect(() => {
    const down = (event: KeyboardEvent) => { if (event.key === "Escape") { onExit(); return; } const key = event.key.toLowerCase(); if (["w","a","s","d","arrowup","arrowdown","arrowleft","arrowright"].includes(key)) { event.preventDefault(); keys.current.add(key); } };
    const up = (event: KeyboardEvent) => keys.current.delete(event.key.toLowerCase());
    window.addEventListener("keydown", down); window.addEventListener("keyup", up);
    return () => { window.removeEventListener("keydown", down); window.removeEventListener("keyup", up); };
  }, [onExit]);

  useEffect(() => { if (phase !== "playing") return; const timer = window.setInterval(() => setRemaining(n => { if (n <= 1) { state.current.phase = "won"; setPhase("won"); return 0; } return n-1; }), 1000); return () => window.clearInterval(timer); }, [phase]);

  const start = () => { player.current?.position.set(0,0,3.7); seeker.current?.position.set(-7,0,2.7); setPaint("white"); setHidden(false); setRemaining(45); state.current.phase = "playing"; state.current.paint = "white"; setPhase("playing"); };
  const direction = (key: string, active: boolean) => { if (active) keys.current.add(key); else keys.current.delete(key); };

  return <div role="dialog" aria-modal="true" aria-label="Shadow Hunt 3D game" className="fixed inset-0 z-[100] bg-slate-950 text-white flex flex-col">
    <header className="flex items-center justify-between gap-3 px-4 sm:px-7 py-3 bg-slate-900 border-b border-white/10"><div><h1 className="font-black text-xl">🎨 Shadow Hunt 3D</h1><p className="text-xs text-slate-400">Paint yourself. Blend into the same-color room area.</p></div><div className="flex items-center gap-4"><span className="text-amber-300 font-mono font-bold text-xl">{remaining}s</span><button onClick={onExit} className="bg-white/10 hover:bg-white/20 rounded-xl px-3 py-2 flex items-center gap-2 cursor-pointer"><LogOut size={16}/> Exit</button></div></header>
    <main className="relative flex-1 min-h-0"><div ref={mount} className="absolute inset-0" aria-label="3D hide and seek room" />
      <div className="absolute top-3 left-1/2 -translate-x-1/2 flex gap-2 items-center bg-slate-950/80 rounded-xl p-2 border border-white/15"><span className="text-xs whitespace-nowrap">Paint:</span>{(["white","coral","mint","blue"] as Paint[]).map(color => <button key={color} onClick={() => setPaint(color)} aria-label={`Paint ${color}`} title={color} className={`w-8 h-8 rounded-full border-2 cursor-pointer ${paint === color ? "border-white scale-110" : "border-slate-500"}`} style={{background:`#${COLORS[color].toString(16).padStart(6,"0")}`}} />)}</div>
      <div className={`absolute bottom-4 left-4 rounded-xl px-4 py-2 text-sm font-semibold ${hidden ? "bg-emerald-700/90" : "bg-slate-950/80"}`}>{hidden ? "✓ Blended in — stay still" : "Choose a paint color and stand by its wall"}</div>
      {phase !== "playing" && <div className="absolute inset-0 bg-slate-950/75 flex flex-col items-center justify-center text-center p-5 gap-4"><span className="text-5xl">{phase === "won" ? "🏆" : phase === "caught" ? "🔦" : "🎨"}</span><h2 className="text-3xl font-black">{phase === "won" ? "You survived!" : phase === "caught" ? "The seeker found you!" : "Welcome to the color room"}</h2><p className="max-w-md text-slate-200 text-sm">Move with WASD or arrow keys. Paint your white character, then stand still near the matching wall to blend in. Avoid the seeker for 45 seconds.</p><button onClick={start} className="bg-violet-600 hover:bg-violet-500 rounded-xl px-8 py-3 font-bold cursor-pointer">{phase === "ready" ? "Start game" : <span className="flex items-center gap-2"><RotateCcw size={17}/> Play again</span>}</button></div>}
      <div className="absolute right-3 bottom-3 grid grid-cols-3 gap-1 sm:hidden touch-none"><span/><button onPointerDown={() => direction("w",true)} onPointerUp={() => direction("w",false)} onPointerCancel={() => direction("w",false)} className="p-3 bg-slate-900/80 rounded-lg"><ArrowUp/></button><span/><button onPointerDown={() => direction("a",true)} onPointerUp={() => direction("a",false)} onPointerCancel={() => direction("a",false)} className="p-3 bg-slate-900/80 rounded-lg"><ArrowLeft/></button><button onPointerDown={() => direction("s",true)} onPointerUp={() => direction("s",false)} onPointerCancel={() => direction("s",false)} className="p-3 bg-slate-900/80 rounded-lg"><ArrowDown/></button><button onPointerDown={() => direction("d",true)} onPointerUp={() => direction("d",false)} onPointerCancel={() => direction("d",false)} className="p-3 bg-slate-900/80 rounded-lg"><ArrowRight/></button></div>
    </main>
  </div>;
}
