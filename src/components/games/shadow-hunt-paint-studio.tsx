"use client";

import { useEffect, useRef, useState } from "react";
import * as THREE from "three";
import { PalaceInspector } from "./shadow-hunt-inspector";
import { makePaintSurfaces, paintBackupKey, paintDab, readPaintDesign, type PaintDesign, type PaintSurface } from "./shadow-hunt-paint";
import { activatePainting, deletePainting, exportPainting, listPaintings, loadPainting, paintingThumbnails, renamePainting, savePainting, type Painting } from "./shadow-hunt-paint-cloud";
import { createClient } from "@/lib/supabase/client";
import type { AuthChangeEvent, Session } from "@supabase/supabase-js";

type Brush = "Hard" | "Soft" | "Spray" | "Eraser";
type Patch = { surface: PaintSurface; before: ImageData; after: ImageData };
const SWATCHES = ["#ef6851", "#ecb044", "#5dc298", "#398ada", "#ece4d4", "#251c23"];
const errorMessage = (error: unknown) =>
  error && typeof error === "object" && "message" in error ? String(error.message) : "Painting request failed. Try again.";

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
  const [inspecting, setInspecting] = useState(false);
  const [sampled, setSampled] = useState<string[]>([]);
  const [userId, setUserId] = useState<string | null>(null);
  const [rows, setRows] = useState<Painting[]>([]);
  const [thumbs, setThumbs] = useState<Record<string, string>>({});
  const [editing, setEditing] = useState<Painting>();
  const [designName, setDesignName] = useState("Untitled design");
  const [busy, setBusy] = useState("");
  const [deleteId, setDeleteId] = useState("");
  const [legacyAvailable, setLegacyAvailable] = useState(false);
  const owner = useRef<string | null>(null);
  const busyLock = useRef(false);
  const draftId = useRef("");
  const backupTimer = useRef<number | undefined>(undefined);
  const authReady = useRef(false);
  const updateCounts = () => setCounts([undo.current.length, redo.current.length]);

  const snapshot = () => Object.fromEntries(engine.current?.surfaces.map(part =>
    [part.id, part.layer.toDataURL("image/png")]) ?? []);

  const backup = () => {
    window.clearTimeout(backupTimer.current);
    const key = paintBackupKey(owner.current);
    const painting = engine.current;
    backupTimer.current = window.setTimeout(() => {
      if (!painting || engine.current !== painting || !authReady.current) return;
      try {
        localStorage.setItem(key, JSON.stringify(Object.fromEntries(painting.surfaces.map(part =>
          [part.id, part.layer.toDataURL("image/png")]))));
      } catch { setNotice("Local backup could not be written. Use Save to keep the design in the cloud."); }
    }, 850);
  };

  useEffect(() => {
    settings.current = { brush, color: /^#[0-9a-f]{6}$/i.test(hex) ? hex : "#ef6851", size, opacity, brightness };
  }, [brush, hex, size, opacity, brightness]);

  useEffect(() => {
    const viewport = host.current;
    if (!viewport) return;
    let renderer: THREE.WebGLRenderer;
    try { renderer = new THREE.WebGLRenderer({ antialias: true }); }
    catch {
      const report = window.setTimeout(() => setNotice("3D painting requires WebGL. You can return to the game."), 0);
      return () => window.clearTimeout(report);
    }
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
    const client = createClient();
    let initialized = false;
    let generation = 0;
    const restore = async (id: string | null) => {
      if (!active || (initialized && id === owner.current)) return;
      initialized = true;
      authReady.current = true;
      owner.current = id;
      window.clearTimeout(backupTimer.current);
      const revision = ++generation;
      setReady(false);
      setUserId(id);
      setRows([]);
      setThumbs({});
      setEditing(undefined);
      setDeleteId("");
      setLegacyAvailable(!!id && Object.keys(readPaintDesign()).length > 0);
      setDesignName("Untitled design");
      draftId.current = "";
      undo.current = [];
      redo.current = [];
      setCounts([0, 0]);
      const local = readPaintDesign(id);
      await paint.load(local);
      if (!active || revision !== generation) return;
      if (!id) { setReady(true); return; }
      try {
        const designs = await listPaintings(id);
        if (!active || revision !== generation) return;
        setRows(designs);
        const selected = designs.find(row => row.is_active);
        if (selected && !Object.keys(local).length) {
          const design = await loadPainting(selected);
          if (!active || revision !== generation) return;
          await paint.load(design);
          if (!active || revision !== generation) return;
          setEditing(selected);
          setDesignName(selected.design_name);
        }
        setReady(true);
        const images = await paintingThumbnails(designs);
        if (active && revision === generation) setThumbs(images);
      } catch (error) {
        if (active && revision === generation) {
          setReady(true);
          setNotice(errorMessage(error));
        }
      }
    };
    const subscription = client.auth.onAuthStateChange((_event: AuthChangeEvent, session: Session | null) => {
      window.setTimeout(() => { void restore(session?.user.id ?? null); }, 0);
    }).data.subscription;
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
      paintDab(part, hit.uv, settings.current);
      dirty.add(part);
    };
    const flush = () => { dirty.forEach(part => part.refresh()); dirty.clear(); };
    const down = (event: PointerEvent) => {
      if (busyLock.current || pointer || (event.button !== 0 && event.button !== 2)) return;
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
      backup();
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
      subscription.unsubscribe();
      window.clearTimeout(backupTimer.current);
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
    backup();
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
    backup();
  };
  const run = async (message: string, operation: (id: string, current: () => boolean) => Promise<void>) => {
    const id = owner.current;
    if (!id || busyLock.current) return;
    busyLock.current = true;
    setBusy(message);
    const current = () => id === owner.current && !!engine.current;
    try {
      await operation(id, current);
    } catch (error) {
      if (current()) setNotice(errorMessage(error));
    } finally {
      busyLock.current = false;
      setBusy("");
    }
  };
  const refresh = async (id: string, current: () => boolean) => {
    const designs = await listPaintings(id);
    if (!current()) return;
    setRows(designs);
    const images = await paintingThumbnails(designs).catch(() => ({}));
    if (current()) setThumbs(images);
  };
  const saveLocal = (finish: boolean) => {
    try {
      const design = snapshot();
      localStorage.setItem(paintBackupKey(owner.current), JSON.stringify(design));
      if (!owner.current) onSave(design);
      setNotice("Draft backed up on this browser.");
      if (finish) onClose();
    } catch { setNotice("Couldn't write the local backup."); }
  };
  const save = () => {
    if (!engine.current) return;
    if (!userId) { saveLocal(false); return; }
    const name = designName.trim();
    if (!name) { setNotice("Enter a design name."); return; }
    void run("Exporting PNG…", async (id, current) => {
      const engineInstance = engine.current!;
      try { localStorage.setItem(paintBackupKey(id), JSON.stringify(snapshot())); } catch { /* Cloud save can still proceed. */ }
      const files = await exportPainting(engineInstance.surfaces);
      if (!current()) return;
      draftId.current ||= crypto.randomUUID();
      const row = await savePainting(id, editing?.id ?? draftId.current, name, files, editing,
        progress => { if (current()) setBusy(progress); });
      if (!current()) return;
      setEditing(row);
      setNotice(row.is_active ? "Active design updated in the cloud." : "Design saved in the cloud.");
      if (row.is_active) onSave(snapshot());
      await refresh(id, current);
    });
  };
  const restoreDesign = (row: Painting, activate: boolean) => void run("Loading texture…", async (id, current) => {
    const design = await loadPainting(row);
    if (!current()) return;
    if (activate) await activatePainting(row.id);
    if (!current()) return;
    await engine.current?.load(design);
    if (!current()) return;
    setEditing(row);
    setDesignName(row.design_name);
    undo.current = [];
    redo.current = [];
    updateCounts();
    backup();
    if (activate) onSave(design);
    setNotice(activate ? "Active character design set." : "Cloud design loaded.");
    if (activate) await refresh(id, current);
  });
  const swatches = (colors: string[]) => colors.map(color => <button type="button" key={color}
    aria-label={`Use ${color}`} onClick={() => setHex(color)} className="size-7 rounded-full border border-white/25" style={{ background: color }} />);

  return <section role="dialog" aria-modal="true" aria-label="Character paint studio"
    className="absolute inset-0 z-[90] flex flex-col overflow-auto bg-[#19161e] text-[#f5e9df]"
    onKeyDown={event => event.stopPropagation()}>
    <header inert={inspecting} className="flex items-center justify-between border-b border-white/10 p-4">
      <h2 className="text-lg font-semibold">Character paint studio</h2>
      <div className="flex gap-3">
        <button type="button" disabled={!!busy} onClick={() => setInspecting(true)}>Inspect palace</button>
        <button type="button" disabled={!!busy} onClick={() => ready ? saveLocal(true) : onClose()}>Close</button>
      </div>
    </header>
    <div inert={inspecting} className="grid flex-1 gap-3 p-3 md:grid-cols-[9rem_minmax(0,1fr)_15rem]">
      <aside className="flex flex-wrap content-start gap-2 md:flex-col" aria-label="Brush tools">
        {(["Hard", "Soft", "Spray", "Eraser"] as Brush[]).map(tool => <button type="button" key={tool}
          aria-pressed={brush === tool} onClick={() => setBrush(tool)}
          className="rounded-lg bg-white/8 px-3 py-2 aria-pressed:bg-amber-300 aria-pressed:text-black">{tool}</button>)}
        <button type="button" disabled={!counts[0] || !!busy} onClick={() => history(false)} className="disabled:opacity-40">Undo</button>
        <button type="button" disabled={!counts[1] || !!busy} onClick={() => history(true)} className="disabled:opacity-40">Redo</button>
      </aside>
      <div className="relative min-h-72 overflow-hidden rounded-xl bg-[#211d24]">
        <div ref={host} aria-label="Paintable 3D character" className={`absolute inset-0 touch-none cursor-crosshair ${ready ? "" : "pointer-events-none"}`} />
        <div className="absolute inset-x-2 bottom-2 flex flex-wrap justify-center gap-2 text-xs">
          {["Front", "Right", "Back", "Left"].map((side, index) => <button type="button" key={side}
            onClick={() => { view.current.yaw = view.current.spin + index * Math.PI / 2; view.current.pitch = 0.08; }}
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
        {!!sampled.length && <div className="text-xs">Sampled colors<div className="mt-1 flex flex-wrap gap-1">{swatches(sampled)}</div></div>}
        {recent.length > 0 && <div className="text-xs">Recent<div className="mt-1 flex flex-wrap gap-1">{swatches(recent)}</div></div>}
        <button type="button" disabled={!/^#[a-f\d]{6}$/i.test(hex)} onClick={() => setSaved(list => [hex, ...list.filter(color => color !== hex)].slice(0, 12))} className="text-xs underline">Save swatch</button>
        {!!saved.length && <div className="flex flex-wrap gap-1">{swatches(saved)}</div>}
        <label className="block text-xs">Brush size <input type="range" min="3" max="64" value={size} onChange={event => setSize(+event.target.value)} className="block w-full" /></label>
        <label className="block text-xs">Opacity <input type="range" min="5" max="100" value={opacity} onChange={event => setOpacity(+event.target.value)} className="block w-full" /></label>
        <label className="block text-xs">Brightness <input type="range" min="10" max="160" value={brightness} onChange={event => setBrightness(+event.target.value)} className="block w-full" /></label>
      </aside>
    </div>
    <section inert={inspecting} aria-label="Saved designs" className="border-t border-white/10 p-3 text-sm">
      <h3 className="mb-2 font-semibold">Saved designs</h3>
      {!userId ? <p className="text-xs text-white/70">Sign in with a Supabase account to save to the cloud. Local backup is available.</p> : <>
        <div className="mb-2 flex flex-wrap items-center gap-2">
          <input aria-label="Design name" maxLength={80} value={designName} disabled={!!busy}
            onChange={event => setDesignName(event.target.value)} className="rounded bg-white/10 px-2 py-1" />
          <button type="button" disabled={!!busy} onClick={() => {
            setEditing(undefined); setDesignName("Untitled design"); draftId.current = "";
            setNotice("Next Save creates a new copy of the current painting.");
          }}>Save as new</button>
          <button type="button" disabled={!!busy} onClick={() => void run("Loading designs…", refresh)}>Refresh designs</button>
          {legacyAvailable && <button type="button" disabled={!ready || !!busy} onClick={() => void run("Loading browser painting…", async (_id, current) => {
            if (!window.confirm("Replace this draft with the painting previously saved on this browser?")) return;
            const legacy = readPaintDesign();
            await engine.current?.load(legacy);
            if (!current()) return;
            undo.current = [];
            redo.current = [];
            updateCounts();
            setEditing(undefined);
            draftId.current = "";
            setDesignName("Imported painting");
            backup();
            setNotice("Browser painting imported. Save to upload it.");
          })}>Import browser painting</button>}
          {editing && <button type="button" disabled={!!busy || !designName.trim()} onClick={() => void run("Renaming…", async (id, current) => {
            const row = await renamePainting(editing.id, designName.trim());
            if (!current()) return;
            setEditing(row);
            setNotice("Design renamed.");
            await refresh(id, current);
          })}>Rename loaded design</button>}
        </div>
        <ul className="flex max-h-40 flex-wrap gap-2 overflow-auto">
          {rows.map(row => <li key={row.id} className="flex items-center gap-2 rounded-lg bg-white/8 p-2">
            {row.thumbnail_path && thumbs[row.thumbnail_path] &&
              // Private, short-lived signed URLs are loaded directly without image optimization.
              <img src={thumbs[row.thumbnail_path]} alt="" width={48} height={32} loading="lazy" className="rounded" />}
            <div>
              <p>{row.design_name}{row.is_active && <span className="ml-2 text-amber-300">Active</span>}</p>
              <div className="flex flex-wrap gap-2 text-xs">
                <button type="button" disabled={!ready || !!busy} onClick={() => restoreDesign(row, false)}>Load</button>
                <button type="button" disabled={!ready || !!busy || row.is_active} onClick={() => restoreDesign(row, true)}>Set active</button>
                {deleteId === row.id ? <>
                  <button type="button" disabled={!!busy} onClick={() => void run("Deleting design…", async (id, current) => {
                    const cleaned = await deletePainting(row);
                    if (!current()) return;
                    setDeleteId("");
                    if (editing?.id === row.id) { setEditing(undefined); draftId.current = ""; }
                    if (row.is_active) onSave({});
                    setNotice(cleaned ? "Design deleted." : "Design removed. Texture cleanup could not be confirmed.");
                    await refresh(id, current);
                  })}>Confirm delete</button>
                  <button type="button" disabled={!!busy} onClick={() => setDeleteId("")}>Cancel</button>
                </> : <button type="button" disabled={!!busy} onClick={() => setDeleteId(row.id)}>Delete</button>}
              </div>
            </div>
          </li>)}
        </ul>
        {!rows.length && <p className="text-xs text-white/70">No saved designs loaded.</p>}
      </>}
    </section>
    <footer inert={inspecting} className="flex flex-wrap items-center gap-3 border-t border-white/10 p-3 text-sm">
      <span role="status" className="mr-auto text-xs">{busy || notice || "Drag to paint · Shift-drag to orbit · Scroll to zoom"}</span>
      <button type="button" disabled={!ready || !!busy} onClick={clear}>Clear drawing</button>
      <button type="button" disabled={!ready || !!busy} onClick={save}>{editing ? "Update design" : "Save"}</button>
      <button type="button" disabled={!ready || !!busy} onClick={() => saveLocal(true)} className="rounded-lg bg-amber-300 px-3 py-2 text-black">Finish painting</button>
    </footer>
    {inspecting && <PalaceInspector onClose={() => setInspecting(false)} onSample={color => {
      setHex(color);
      setBrightness(100);
      setSampled(list => [color, ...list.filter(item => item !== color)].slice(0, 12));
      setNotice(`Brush color set to ${color.toUpperCase()}`);
    }} />}
  </section>;
}
