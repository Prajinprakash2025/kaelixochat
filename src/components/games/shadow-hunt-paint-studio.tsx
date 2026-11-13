"use client";

import { useEffect, useRef, useState } from "react";
import * as THREE from "three";
import { makePaintSurfaces, PAINT_KEY, readPaintDesign, type PaintDesign, type PaintSurface } from "./shadow-hunt-paint";

type Brush = "Hard" | "Soft" | "Spray" | "Eraser";
type Patch = { surface: PaintSurface; before: ImageData; after: ImageData };
const SWATCHES = ["#ef6851", "#ecb044", "#5dc298", "#398ada", "#ece4d4", "#251c23"];

export function PaintStudio({ createModel, onSave, onClose }: {
  createModel: () => THREE.Group;
  onSave: (design: PaintDesign) => void;
  onClose: () => void;
}) {
  const host = useRef<HTMLDivElement>(null);
  const engine = useRef<ReturnType<typeof makePaintSurfaces> | null>(null);
  const view = useRef({ yaw: 0, pitch: 0.08, distance: 3.45, spin: 0 });
  const settings = useRef({ brush: "Hard" as Brush, color: "#ef6851", size: 20, opacity: 100, brightness: 100 });
  const undo = useRef<Patch[][]>([]);
  const redo = useRef<Patch[][]>([]);
  const [brush, setBrush] = useState<Brush>("Hard");
  const [hex, setHex] = useState("#ef6851");
  const [size, setSize] = useState(20);
  const [opacity, setOpacity] = useState(100);
  const [brightness, setBrightness] = useState(100);
  const [recent, setRecent] = useState<string[]>([]);
  const [saved, setSaved] = useState<string[]>([]);
  const [counts, setCounts] = useState([0, 0]);
  const [notice, setNotice] = useState("");
  const [ready, setReady] = useState(false);
  const updateCounts = () => setCounts([undo.current.length, redo.current.length]);

  useEffect(() => {
    settings.current = { brush, color: /^#[0-9a-f]{6}$/i.test(hex) ? hex : "#ef6851", size, opacity, brightness };
  }, [brush, hex, size, opacity, brightness]);

  useEffect(() => {
    const viewport = host.current;
    if (!viewport) return;
    let renderer: THREE.WebGLRenderer;
    try { renderer = new THREE.WebGLRenderer({ antialias: true }); }
    catch { setNotice("3D painting requires WebGL. You can return to the game."); return; }
    renderer.setPixelRatio(Math.min(devicePixelRatio, 1.6));
    viewport.appendChild(renderer.domElement);
    const scene = new THREE.Scene();
    scene.background = new THREE.Color("#211d24");
    const camera = new THREE.PerspectiveCamera(38, 1, 0.03, 20);
    const model = createModel();
    scene.add(model, new THREE.HemisphereLight(0xffffff, 0x81718f, 2));
    const light = new THREE.DirectionalLight(0xffeed9, 2.15);
    light.position.set(3, 4, 5);
    scene.add(light);
    const paint = makePaintSurfaces(model);
    engine.current = paint;
    let active = true;
    void paint.load(readPaintDesign()).then(() => { if (active) setReady(true); });
    const ray = new THREE.Raycaster();
    const byMesh = new Map(paint.surfaces.map(part => [part.mesh, part]));
    const meshes = paint.surfaces.map(part => part.mesh);
    const resize = () => {
      const w = viewport.clientWidth, h = viewport.clientHeight;
      if (!w || !h) return;
      camera.aspect = w / h;
      camera.updateProjectionMatrix();
      renderer.setSize(w, h);
    };
    const observer = new ResizeObserver(resize);
    observer.observe(viewport);
    resize();
    let frame = 0;
    const render = () => {
      const { yaw, pitch, distance, spin } = view.current;
      const radius = Math.cos(pitch) * distance;
      camera.position.set(Math.sin(yaw) * radius, 0.94 + Math.sin(pitch) * distance, Math.cos(yaw) * radius);
      camera.lookAt(0, 0.94, 0);
      model.rotation.y = spin;
      renderer.render(scene, camera);
      frame = requestAnimationFrame(render);
    };
    render();

    let pointer: { id: number; x: number; y: number; orbit: boolean } | null = null;
    const before = new Map<PaintSurface, ImageData>();
    const dirty = new Set<PaintSurface>();
    const dab = (clientX: number, clientY: number) => {
      const bounds = viewport.getBoundingClientRect();
      ray.setFromCamera(new THREE.Vector2(
        (clientX - bounds.left) / bounds.width * 2 - 1,
        1 - (clientY - bounds.top) / bounds.height * 2,
      ), camera);
      const hit = ray.intersectObjects(meshes, false)[0];
      if (!hit?.uv) return;
      const part = byMesh.get(hit.object as THREE.Mesh);
      if (!part) return;
      const { ink, layer } = part;
      if (!before.has(part)) before.set(part, ink.getImageData(0, 0, layer.width, layer.height));
      const x = hit.uv.x * layer.width, y = (1 - hit.uv.y) * layer.height;
      const config = settings.current;
      const radius = config.size / 2;
      const color = config.color.match(/[a-f\d]{2}/gi)!.map(value => Math.min(255, parseInt(value, 16) * config.brightness / 100));
      const rgb = color.join(",");
      ink.save();
      ink.globalCompositeOperation = config.brush === "Eraser" ? "destination-out" : "source-over";
      ink.globalAlpha = config.opacity / 100;
      if (part.geometry.type === "BoxGeometry") {
        const w = layer.width / 3, h = layer.height / 2;
        ink.beginPath();
        ink.rect(Math.floor(x / w) * w, Math.floor(y / h) * h, w, h);
        ink.clip();
      }
      ink.fillStyle = `rgb(${rgb})`;
      if (config.brush === "Soft") {
        const gradient = ink.createRadialGradient(x, y, 0, x, y, radius);
        gradient.addColorStop(0, `rgba(${rgb},0.65)`);
        gradient.addColorStop(1, `rgba(${rgb},0)`);
        ink.fillStyle = gradient;
      }
      if (config.brush === "Spray") {
        ink.globalAlpha *= 0.45;
        for (let i = 0; i < 8; i++) {
          const angle = Math.random() * Math.PI * 2, offset = Math.sqrt(Math.random()) * radius;
          ink.fillRect(x + Math.cos(angle) * offset, y + Math.sin(angle) * offset, 2, 2);
        }
      } else {
        ink.beginPath();
        ink.arc(x, y, radius, 0, Math.PI * 2);
        ink.fill();
      }
      ink.restore();
      dirty.add(part);
    };
    const flush = () => { dirty.forEach(part => part.refresh()); dirty.clear(); };
    const down = (event: PointerEvent) => {
      if (pointer || (event.button !== 0 && event.button !== 2)) return;
      viewport.setPointerCapture(event.pointerId);
      pointer = { id: event.pointerId, x: event.clientX, y: event.clientY, orbit: event.shiftKey || event.button === 2 };
      if (!pointer.orbit) { dab(pointer.x, pointer.y); flush(); }
    };
    const move = (event: PointerEvent) => {
      if (!pointer || event.pointerId !== pointer.id) return;
      const dx = event.clientX - pointer.x, dy = event.clientY - pointer.y;
      if (pointer.orbit) {
        view.current.yaw -= dx * 0.012;
        view.current.pitch = THREE.MathUtils.clamp(view.current.pitch + dy * 0.012, -1.4, 1.4);
      } else {
        const steps = Math.max(1, Math.ceil(Math.hypot(dx, dy) / 2));
        for (let i = 1; i <= steps; i++) dab(pointer.x + dx * i / steps, pointer.y + dy * i / steps);
        flush();
      }
      pointer.x = event.clientX;
      pointer.y = event.clientY;
    };
    const finish = (event: PointerEvent) => {
      if (event.pointerId !== pointer?.id) return;
      pointer = null;
      if (!before.size) return;
      undo.current.push([...before].map(([surface, data]) => ({
        surface, before: data, after: surface.ink.getImageData(0, 0, surface.layer.width, surface.layer.height),
      })));
      if (undo.current.length > 12) undo.current.shift();
      redo.current = [];
      before.clear();
      setCounts([undo.current.length, 0]);
      if (settings.current.brush !== "Eraser") {
        const color = settings.current.color;
        setRecent(list => [color, ...list.filter(item => item !== color)].slice(0, 8));
      }
    };
    const wheel = (event: WheelEvent) => {
      event.preventDefault();
      view.current.distance = THREE.MathUtils.clamp(view.current.distance + event.deltaY * 0.002, 1.2, 6);
    };
    const menu = (event: Event) => event.preventDefault();
    viewport.addEventListener("pointerdown", down);
    viewport.addEventListener("pointermove", move);
    viewport.addEventListener("lostpointercapture", finish);
    viewport.addEventListener("wheel", wheel, { passive: false });
    viewport.addEventListener("contextmenu", menu);
    return () => {
      active = false;
      viewport.removeEventListener("pointerdown", down);
      viewport.removeEventListener("pointermove", move);
      viewport.removeEventListener("lostpointercapture", finish);
      viewport.removeEventListener("wheel", wheel);
      viewport.removeEventListener("contextmenu", menu);
      cancelAnimationFrame(frame);
      observer.disconnect();
      paint.dispose();
      const geometries = new Set<THREE.BufferGeometry>(), materials = new Set<THREE.Material>();
      model.traverse(object => {
        if (!(object instanceof THREE.Mesh)) return;
        geometries.add(object.geometry);
        if (object.material instanceof THREE.Material) materials.add(object.material);
      });
      geometries.forEach(geometry => geometry.dispose());
      materials.forEach(material => material.dispose());
      renderer.dispose();
      renderer.domElement.remove();
      engine.current = null;
      undo.current = [];
      redo.current = [];
    };
  }, [createModel]);

  const history = (forward: boolean) => {
    const from = forward ? redo.current : undo.current;
    const patch = from.pop();
    if (!patch) return;
    for (const item of patch) {
      item.surface.ink.putImageData(forward ? item.after : item.before, 0, 0);
      item.surface.refresh();
    }
    (forward ? undo.current : redo.current).push(patch);
    updateCounts();
  };
  const clear = () => {
    const parts = engine.current?.surfaces;
    if (!parts) return;
    undo.current.push(parts.map(surface => {
      const { ink, layer } = surface;
      const before = ink.getImageData(0, 0, layer.width, layer.height);
      ink.clearRect(0, 0, layer.width, layer.height);
      surface.refresh();
      return { surface, before, after: ink.createImageData(layer.width, layer.height) };
    }));
    if (undo.current.length > 12) undo.current.shift();
    redo.current = [];
    updateCounts();
  };
  const save = (finish: boolean) => {
    if (!engine.current) return;
    const design = Object.fromEntries(engine.current.surfaces.map(part => [part.id, part.layer.toDataURL("image/png")]));
    try {
      localStorage.setItem(PAINT_KEY, JSON.stringify(design));
      onSave(design);
      setNotice("Saved on this browser.");
      if (finish) onClose();
    } catch { setNotice("Couldn't save the painting. Check available browser storage."); }
  };
  const swatches = (colors: string[]) => colors.map(color => <button type="button" key={color}
    aria-label={`Use ${color}`} onClick={() => setHex(color)} className="size-7 rounded-full border border-white/25" style={{ background: color }} />);

  return <section role="dialog" aria-modal="true" aria-label="Character paint studio"
    className="absolute inset-0 z-[90] flex flex-col overflow-auto bg-[#19161e] text-[#f5e9df]"
    onKeyDown={event => event.stopPropagation()}>
    <header className="flex items-center justify-between border-b border-white/10 p-4">
      <h2 className="text-lg font-semibold">Character paint studio</h2>
      <button type="button" onClick={onClose}>Close</button>
    </header>
    <div className="grid flex-1 gap-3 p-3 md:grid-cols-[9rem_minmax(0,1fr)_15rem]">
      <aside className="flex flex-wrap content-start gap-2 md:flex-col" aria-label="Brush tools">
        {(["Hard", "Soft", "Spray", "Eraser"] as Brush[]).map(tool => <button type="button" key={tool}
          aria-pressed={brush === tool} onClick={() => setBrush(tool)}
          className="rounded-lg bg-white/8 px-3 py-2 aria-pressed:bg-amber-300 aria-pressed:text-black">{tool}</button>)}
        <button type="button" disabled={!counts[0]} onClick={() => history(false)} className="disabled:opacity-40">Undo</button>
        <button type="button" disabled={!counts[1]} onClick={() => history(true)} className="disabled:opacity-40">Redo</button>
      </aside>
      <div className="relative min-h-72 overflow-hidden rounded-xl bg-[#211d24]">
        <div ref={host} aria-label="Paintable 3D character" className={`absolute inset-0 touch-none cursor-crosshair ${ready ? "" : "pointer-events-none"}`} />
        <div className="absolute inset-x-2 bottom-2 flex flex-wrap justify-center gap-2 text-xs">
          {["Front", "Right", "Back", "Left"].map((side, index) => <button type="button" key={side}
            onClick={() => { view.current.yaw = index * Math.PI / 2; view.current.pitch = 0.08; }}
            className="rounded bg-black/70 px-2 py-1">{side}</button>)}
          <button type="button" aria-label="Zoom in" onClick={() => { view.current.distance = Math.max(1.2, view.current.distance - 0.35); }}>+</button>
          <button type="button" aria-label="Zoom out" onClick={() => { view.current.distance = Math.min(6, view.current.distance + 0.35); }}>−</button>
          <button type="button" onClick={() => { view.current.spin += Math.PI / 4; }} className="rounded bg-black/70 px-2 py-1">Rotate character</button>
        </div>
      </div>
      <aside className="space-y-3 rounded-xl bg-white/5 p-3">
        <div className="flex items-end gap-2">
          <input type="color" aria-label="Custom RGB color" value={/^#[a-f\d]{6}$/i.test(hex) ? hex : "#ef6851"} onChange={event => setHex(event.target.value)} />
          <label className="min-w-0 text-xs">HEX
            <input maxLength={7} value={hex} onChange={event => setHex(event.target.value)} className="block w-full rounded bg-black/40 p-1.5 font-mono" />
          </label>
        </div>
        <div className="flex flex-wrap gap-1.5">{swatches(SWATCHES)}</div>
        {recent.length > 0 && <div className="text-xs">Recent<div className="mt-1 flex flex-wrap gap-1">{swatches(recent)}</div></div>}
        <button type="button" disabled={!/^#[a-f\d]{6}$/i.test(hex)} onClick={() => setSaved(list => [hex, ...list.filter(color => color !== hex)].slice(0, 12))} className="text-xs underline">Save swatch</button>
        {!!saved.length && <div className="flex flex-wrap gap-1">{swatches(saved)}</div>}
        <label className="block text-xs">Brush size <input type="range" min="3" max="64" value={size} onChange={event => setSize(+event.target.value)} className="block w-full" /></label>
        <label className="block text-xs">Opacity <input type="range" min="5" max="100" value={opacity} onChange={event => setOpacity(+event.target.value)} className="block w-full" /></label>
        <label className="block text-xs">Brightness <input type="range" min="10" max="160" value={brightness} onChange={event => setBrightness(+event.target.value)} className="block w-full" /></label>
      </aside>
    </div>
    <footer className="flex flex-wrap items-center gap-3 border-t border-white/10 p-3 text-sm">
      <span role="status" className="mr-auto text-xs">{notice || "Drag to paint · Shift-drag to orbit · Scroll to zoom"}</span>
      <button type="button" disabled={!ready} onClick={clear}>Clear drawing</button>
      <button type="button" disabled={!ready} onClick={() => save(false)}>Save</button>
      <button type="button" disabled={!ready} onClick={() => save(true)} className="rounded-lg bg-amber-300 px-3 py-2 text-black">Finish painting</button>
    </footer>
  </section>;
}
