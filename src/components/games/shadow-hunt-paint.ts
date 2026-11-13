import * as THREE from "three";

const SIZE = 512;
export const PAINT_KEY = "shadow-hunt-freehand-v1";
export type PaintDesign = Record<string, string>;

export function readPaintDesign(): PaintDesign {
  try {
    const data = JSON.parse(localStorage.getItem(PAINT_KEY) ?? "{}");
    if (data && typeof data === "object") {
      return Object.fromEntries(Object.entries(data).filter(([key, value]) =>
        /^[0-5]$/.test(key) && typeof value === "string" && value.startsWith("data:image/png;base64,"),
      )) as PaintDesign;
    }
  } catch { /* An unavailable or invalid local save can be replaced. */ }
  return {};
}

export function makePaintSurfaces(group: THREE.Group) {
  const surfaces = group.children.flatMap((object, index) => {
    if (!(object instanceof THREE.Mesh) || !(object.material instanceof THREE.MeshStandardMaterial)) return [];
    const original = object.material;
    const originalGeometry = object.geometry;
    const geometry: THREE.BufferGeometry = originalGeometry.clone();
    const uv = geometry.getAttribute("uv");
    if (originalGeometry.type === "BoxGeometry") {
      // BoxGeometry gives each face the full UV range. Give every face its own tile.
      const indices = geometry.getIndex()!;
      geometry.groups.forEach(({ start, count }: { start: number; count: number; materialIndex?: number }, face: number) => {
        const vertices = new Set<number>();
        for (let i = start; i < start + count; i++) vertices.add(indices.getX(i));
        for (const vertex of vertices) {
          uv.setXY(vertex, (face % 3 + 0.04 + uv.getX(vertex) * 0.92) / 3,
            (Math.floor(face / 3) + 0.04 + uv.getY(vertex) * 0.92) / 2);
        }
      });
    }
    const layer = document.createElement("canvas");
    layer.width = layer.height = SIZE;
    const ink = layer.getContext("2d", { willReadFrequently: true })!;
    const composite = document.createElement("canvas");
    composite.width = composite.height = SIZE;
    const context = composite.getContext("2d")!;
    const map = new THREE.CanvasTexture(composite);
    map.colorSpace = THREE.SRGBColorSpace;
    const material = original.clone();
    material.map = map;
    material.color.setHex(0xffffff);
    object.material = material;
    object.geometry = geometry;
    const refresh = () => {
      context.fillStyle = "#" + original.color.getHexString();
      context.fillRect(0, 0, SIZE, SIZE);
      context.drawImage(layer, 0, 0);
      map.needsUpdate = true;
    };
    refresh();
    return { id: String(index), mesh: object, layer, ink, refresh, original, originalGeometry, map, material, geometry };
  });
  let disposed = false;
  let revision = 0;
  return {
    surfaces,
    refresh: () => surfaces.forEach(surface => surface.refresh()),
    load: async (design: PaintDesign) => {
      const version = ++revision;
      await Promise.all(surfaces.map(async surface => {
        const image = new Image();
        if (design[surface.id]) {
          image.src = design[surface.id];
          try { await image.decode(); } catch { return; }
        }
        if (disposed || version !== revision) return;
        surface.ink.clearRect(0, 0, SIZE, SIZE);
        if (design[surface.id]) surface.ink.drawImage(image, 0, 0, SIZE, SIZE);
        surface.refresh();
      }));
    },
    dispose: () => {
      disposed = true;
      for (const surface of surfaces) {
        surface.mesh.material = surface.original;
        surface.mesh.geometry = surface.originalGeometry;
        surface.geometry.dispose();
        surface.material.dispose();
        surface.map.dispose();
      }
    },
  };
}

export type PaintSurface = ReturnType<typeof makePaintSurfaces>["surfaces"][number];
