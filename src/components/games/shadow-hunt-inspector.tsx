"use client";

import { useEffect, useRef, useState } from "react";
import * as THREE from "three";
import { OrbitControls } from "three/addons/controls/OrbitControls.js";
import { furnishRoom } from "./shadow-hunt-room";
import { sampleSurface } from "./shadow-hunt-sample";

export function PalaceInspector({ onSample, onClose }: { onSample: (hex: string) => void; onClose: () => void }) {
  const viewport = useRef<HTMLDivElement>(null);
  const action = useRef<"inspect" | "sample">("inspect");
  const commands = useRef<{ reset: () => void; zoom: (factor: number) => void; sample: () => void } | null>(null);
  const [tool, setTool] = useState<"inspect" | "sample">("inspect");
  const [name, setName] = useState("");
  const [status, setStatus] = useState("");
  const pick = useRef(onSample);
  useEffect(() => { pick.current = onSample; }, [onSample]);

  useEffect(() => {
    const host = viewport.current;
    if (!host) return;
    let renderer: THREE.WebGLRenderer;
    try { renderer = new THREE.WebGLRenderer({ antialias: true }); }
    catch {
      const timer = window.setTimeout(() => setStatus("Object inspection requires WebGL."), 0);
      return () => window.clearTimeout(timer);
    }
    renderer.setPixelRatio(Math.min(devicePixelRatio, 1.5));
    renderer.domElement.className = "touch-none";
    host.appendChild(renderer.domElement);
    const scene = new THREE.Scene();
    scene.background = new THREE.Color("#231913");
    const { props } = furnishRoom(scene);
    const names = new Map(props.map(prop => [prop.model, prop.name]));
    const objects: THREE.Mesh[] = [];
    scene.traverse(object => { if (object instanceof THREE.Mesh) objects.push(object); });
    const light = new THREE.DirectionalLight(0xffead2, 2);
    light.position.set(3, 10, 8);
    scene.add(light, new THREE.HemisphereLight(0xfff8e9, 0x99694d, 1.75));
    const camera = new THREE.PerspectiveCamera(45, 1, 0.04, 150);
    const home = new THREE.Vector3(0, 27, 30), center = new THREE.Vector3(0, 0, -6);
    camera.position.copy(home);
    const controls = new OrbitControls(camera, renderer.domElement);
    controls.target.copy(center);
    controls.enableDamping = true;
    controls.minDistance = 0.45;
    controls.maxDistance = 95;
    controls.maxPolarAngle = Math.PI * 0.49;
    controls.update();
    const highlight = new THREE.BoxHelper(new THREE.Object3D(), 0xffd17a);
    highlight.visible = false;
    scene.add(highlight);
    const ray = new THREE.Raycaster();
    let selection: THREE.Intersection<THREE.Mesh> | null = null;
    let transition: { position: THREE.Vector3; target: THREE.Vector3 } | null = null;
    const sample = () => {
      if (!selection) return;
      const color = sampleSurface(selection);
      if (!color) { setStatus("This surface color could not be read."); return; }
      setStatus(`Sampled ${color.hex.toUpperCase()} · RGB ${color.rgb.join(", ")}`);
      pick.current(color.hex);
    };
    commands.current = {
      sample,
      reset: () => {
        selection = null;
        highlight.visible = false;
        setName("");
        setStatus("");
        transition = { position: home.clone(), target: center.clone() };
      },
      zoom: factor => {
        const offset = camera.position.clone().sub(controls.target);
        offset.setLength(THREE.MathUtils.clamp(offset.length() * factor, controls.minDistance, controls.maxDistance));
        transition = { position: controls.target.clone().add(offset), target: controls.target.clone() };
      },
    };
    let start: { x: number; y: number; pointer: number } | null = null;
    const down = (event: PointerEvent) => {
      transition = null;
      if (event.button === 0) start = { x: event.clientX, y: event.clientY, pointer: event.pointerId };
    };
    const up = (event: PointerEvent) => {
      if (!start || start.pointer !== event.pointerId || Math.hypot(event.clientX - start.x, event.clientY - start.y) > 6) return;
      start = null;
      const rect = renderer.domElement.getBoundingClientRect();
      ray.setFromCamera(new THREE.Vector2(
        (event.clientX - rect.left) / rect.width * 2 - 1, 1 - (event.clientY - rect.top) / rect.height * 2,
      ), camera);
      const hit = ray.intersectObjects<THREE.Mesh>(objects, false)[0];
      if (!hit) return;
      selection = hit;
      const prop = hit.object.parent instanceof THREE.Group ? hit.object.parent : null;
      const named = prop ? names.get(prop) : undefined;
      setName(named ?? hit.object.name ?? "");
      if (action.current === "sample") {
        sample();
        return;
      }
      setStatus("");
      const focus = named && prop ? prop : hit.object;
      const bounds = new THREE.Box3().setFromObject(focus);
      highlight.setFromObject(focus);
      highlight.visible = true;
      const extent = bounds.getSize(new THREE.Vector3());
      const target = extent.length() > 8 ? hit.point.clone() : bounds.getCenter(new THREE.Vector3());
      const distance = THREE.MathUtils.clamp(extent.length() * 1.65, 1.2, 7);
      const from = camera.position.clone().sub(controls.target).setLength(distance);
      transition = { position: target.clone().add(from), target };
    };
    renderer.domElement.addEventListener("pointerdown", down);
    renderer.domElement.addEventListener("pointerup", up);
    controls.addEventListener("start", () => { transition = null; });
    const resize = () => {
      if (!host.clientWidth || !host.clientHeight) return;
      camera.aspect = host.clientWidth / host.clientHeight;
      camera.updateProjectionMatrix();
      renderer.setSize(host.clientWidth, host.clientHeight);
    };
    const observer = new ResizeObserver(resize);
    observer.observe(host);
    resize();
    renderer.setAnimationLoop(() => {
      if (transition) {
        camera.position.lerp(transition.position, 0.13);
        controls.target.lerp(transition.target, 0.13);
        if (camera.position.distanceTo(transition.position) < 0.006) {
          camera.position.copy(transition.position);
          controls.target.copy(transition.target);
          transition = null;
        }
      }
      controls.update();
      renderer.render(scene, camera);
    });
    return () => {
      commands.current = null;
      observer.disconnect();
      renderer.setAnimationLoop(null);
      controls.dispose();
      highlight.dispose();
      const materials = new Set<THREE.Material>();
      const geometries = new Set<THREE.BufferGeometry>();
      objects.forEach(object => {
        geometries.add(object.geometry);
        (Array.isArray(object.material) ? object.material : [object.material]).forEach(material => materials.add(material));
      });
      geometries.forEach(geometry => geometry.dispose());
      materials.forEach(material => {
        if (material instanceof THREE.MeshStandardMaterial) material.map?.dispose();
        material.dispose();
      });
      renderer.dispose();
      renderer.domElement.remove();
    };
  }, []);

  const choose = (mode: "inspect" | "sample") => { action.current = mode; setTool(mode); };
  return <section className="absolute inset-0 z-30 flex flex-col bg-[#19161e]" aria-label="Palace object inspection">
    <div className="flex flex-wrap items-center gap-2 border-b border-white/10 p-3 text-sm">
      <button type="button" aria-pressed={tool === "inspect"} onClick={() => choose("inspect")} className="rounded-lg border border-white/15 px-2 py-1 aria-pressed:bg-amber-300 aria-pressed:text-black">Inspect</button>
      <button type="button" aria-pressed={tool === "sample"} onClick={() => choose("sample")} className="rounded-lg border border-white/15 px-2 py-1 aria-pressed:bg-amber-300 aria-pressed:text-black">Eyedropper</button>
      <button type="button" onClick={() => commands.current?.sample()}>Sample color</button>
      <button type="button" aria-label="Zoom in on palace" onClick={() => commands.current?.zoom(0.8)}>+</button>
      <button type="button" aria-label="Zoom out on palace" onClick={() => commands.current?.zoom(1.25)}>−</button>
      <button type="button" onClick={() => commands.current?.reset()}>Reset camera</button>
      <button type="button" className="ml-auto" onClick={onClose}>Close inspection</button>
    </div>
    <div ref={viewport} aria-label="Palace viewport" className="min-h-0 flex-1 cursor-crosshair" />
    <p role="status" className="p-3 text-xs">{name && `${name} · `}{status || (tool === "inspect" ? "Click an object to inspect. Drag to orbit." : "Click the exact spot to sample.")}</p>
  </section>;
}
