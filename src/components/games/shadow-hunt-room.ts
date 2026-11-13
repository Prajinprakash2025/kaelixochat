import * as THREE from "three";

export const PAINTS = { white: 0xfff5e5, coral: 0xb34b42, mint: 0x559574, blue: 0x3f709b };
export type Paint = keyof typeof PAINTS;
export const ZONES = [
  { color: "coral", x: -5.5, label: "Ember" },
  { color: "mint", x: 0, label: "Fern" },
  { color: "blue", x: 5.5, label: "Tide" },
] as const;

type Footprint = { x: number; z: number; w: number; d: number };
export type BodyFootprint = { halfX: number; halfZ: number };
type PropCategory = "Furniture" | "Decorations" | "Paintings" | "Plants" | "Household Objects";
export type MapProp = Footprint & { id: string; name: string; category: PropCategory; model: THREE.Group };
type PropKind = "sofa" | "seat" | "bench" | "cabinet" | "bookshelf" | "plant" | "table" | "lamp";
export type HidingSpot = Footprint & { color: Exclude<Paint, "white">; name: string; kind: PropKind };
const HOUSE = { left: -18, right: 18, back: -17.85, front: 5.86 };
const dividers: Footprint[] = [-9, 9].flatMap(x => [
  { x, z: -3.95, w: 0.36, d: 4.1 },
  { x, z: 3.95, w: 0.36, d: 4.1 },
  { x, z: -16.05, w: 0.36, d: 3.9 },
  { x, z: -7.95, w: 0.36, d: 3.9 },
]);
const crosswalls: Footprint[] = [
  { x: 0, z: -6, w: 18, d: 0.32 },
  ...[-13.5, 13.5].flatMap(x => [-3.3, 3.3].map(offset => ({ x: x + offset, z: -6, w: 2.4, d: 0.32 }))),
];
export const ROOMS = [
  { name: "Lounge", x: -13.5, z: 0 },
  { name: "Gallery", x: 0, z: -2 },
  { name: "Kitchen", x: 13.5, z: 0 },
  { name: "Library", x: -13.5, z: -12 },
  { name: "Conservatory", x: 0, z: -12 },
  { name: "Dining Room", x: 13.5, z: -12 },
] as const;
export function roomAt(x: number, z: number) {
  const column = x < -9 ? 0 : x > 9 ? 2 : 1;
  return ROOMS[column + (z < -6 ? 3 : 0)].name;
}

export const FURNITURE: HidingSpot[] = [
  { x: -15.45, z: -2.65, w: 3.3, d: 1.35, color: "coral", name: "velvet sofa", kind: "sofa" },
  { x: -14.9, z: 2.35, w: 2.1, d: 1.55, color: "blue", name: "reading chair", kind: "seat" },
  { x: -11.3, z: 3.5, w: 1.4, d: 1.1, color: "mint", name: "side table", kind: "table" },
  { x: 15.82, z: -4.55, w: 3.15, d: 1.35, color: "mint", name: "kitchen cabinets", kind: "cabinet" },
  { x: 14.5, z: 1.7, w: 3.55, d: 1.6, color: "blue", name: "kitchen island", kind: "cabinet" },
  { x: 10.8, z: 4.15, w: 2.2, d: 1.12, color: "coral", name: "pantry chest", kind: "cabinet" },
  { x: 0, z: 0.5, w: 2.8, d: 1.1, color: "coral", name: "gallery bench", kind: "bench" },
  { x: -13.5, z: -16.9, w: 6.6, d: 0.95, color: "coral", name: "library bookshelf", kind: "bookshelf" },
  { x: -15.55, z: -11.05, w: 2.1, d: 1.5, color: "blue", name: "library armchair", kind: "seat" },
  { x: -16.95, z: -12.75, w: 0.8, d: 0.8, color: "mint", name: "reading lamp", kind: "lamp" },
  { x: -3.8, z: -13.9, w: 1.65, d: 1.65, color: "mint", name: "potted palm", kind: "plant" },
  { x: 4.1, z: -14.75, w: 1.6, d: 1.6, color: "blue", name: "blue planter", kind: "plant" },
  { x: 0, z: -16.5, w: 3.4, d: 1.05, color: "coral", name: "window seat", kind: "bench" },
  { x: 14.05, z: -13.95, w: 3.8, d: 2.55, color: "blue", name: "dining table", kind: "table" },
  { x: 14, z: -16.75, w: 5.3, d: 1.05, color: "coral", name: "dining sideboard", kind: "cabinet" },
  { x: 16.85, z: -8.65, w: 1.2, d: 1.2, color: "mint", name: "dining planter", kind: "plant" },
];
const sideboards: Footprint[] = [-1, 1].flatMap(side => [
  { x: side * 8.33, z: 3.75, w: 1.18, d: 2.86 },
  { x: side * 8.38, z: -3.25, w: 0.85, d: 2.38 },
]);
const portableProps = [
  { id: "framed-art-west", name: "Framed landscape", category: "Paintings", x: -6.8, z: -2.65, w: 1.22, d: 0.42 },
  { id: "framed-art-east", name: "Framed landscape", category: "Paintings", x: 6.8, z: -2.65, w: 1.22, d: 0.42 },
  { id: "crate-west", name: "Storage crate", category: "Household Objects", x: -16.55, z: -7.85, w: 0.82, d: 0.76 },
  { id: "crate-east", name: "Storage crate", category: "Household Objects", x: 16.75, z: 3.8, w: 0.82, d: 0.76 },
] as const;
const obstacles = [...dividers, ...crosswalls, ...FURNITURE, ...sideboards, ...portableProps];

const BENCH_TOP = 0.785;
const benches = new Set<Footprint>(FURNITURE.filter(prop => prop.kind === "bench"));
const PLAYER_RADIUS = 0.38;

export function groundHeight(x: number, z: number, body?: BodyFootprint) {
  for (const item of benches) {
    if (Math.abs(x - item.x) < item.w / 2 + (body?.halfX ?? PLAYER_RADIUS) &&
        Math.abs(z - item.z) < item.d / 2 + (body?.halfZ ?? PLAYER_RADIUS)) return BENCH_TOP;
  }
  return 0;
}

export function canOccupy(x: number, z: number, padding = PLAYER_RADIUS, feetY = 0, body?: BodyFootprint) {
  const halfX = body?.halfX ?? padding;
  const halfZ = body?.halfZ ?? padding;
  return x > HOUSE.left + halfX && x < HOUSE.right - halfX && z > HOUSE.back + halfZ && z < HOUSE.front - halfZ &&
    !obstacles.some(item => {
      if (feetY >= BENCH_TOP && benches.has(item)) return false;
      return Math.abs(x - item.x) < item.w / 2 + halfX && Math.abs(z - item.z) < item.d / 2 + halfZ;
    });
}

export function propFootprint(prop: Pick<Footprint, "w" | "d">, yaw: number): BodyFootprint {
  const cos = Math.abs(Math.cos(yaw)), sin = Math.abs(Math.sin(yaw));
  return {
    halfX: Math.max(PLAYER_RADIUS, (prop.w * cos + prop.d * sin) / 2),
    halfZ: Math.max(PLAYER_RADIUS, (prop.w * sin + prop.d * cos) / 2),
  };
}

export function distanceToProp(x: number, z: number, prop: Footprint) {
  return Math.hypot(Math.max(0, Math.abs(x - prop.x) - prop.w / 2), Math.max(0, Math.abs(z - prop.z) - prop.d / 2));
}

export function matchingSpot(x: number, z: number, color: Paint) {
  const prop = FURNITURE.find(item => item.color === color && distanceToProp(x, z, item) <= 1.15);
  if (prop) return prop.name;
  const wall = ZONES.find(zone => zone.color === color && Math.abs(x - zone.x) < 2.28 && z < -4.35 && z > -6);
  return wall ? `${wall.label} wall` : "";
}

export function clearRoute(ax: number, az: number, bx: number, bz: number, padding = 0) {
  const samples = Math.ceil(Math.hypot(bx - ax, bz - az) / 0.2);
  for (let step = 1; step < samples; step++) {
    const fraction = step / samples;
    if (!canOccupy(ax + (bx - ax) * fraction, az + (bz - az) * fraction, padding)) return false;
  }
  return true;
}

const NAV_WIDTH = 35;
const navCells = Array.from({ length: NAV_WIDTH * 23 }, (_, index) => ({
  x: index % NAV_WIDTH - 17,
  z: Math.floor(index / NAV_WIDTH) - 17,
})).map(cell => ({ ...cell, open: canOccupy(cell.x, cell.z) }));

export function findSeekerWaypoint(ax: number, az: number, bx: number, bz: number) {
  if (canOccupy(bx, bz) && clearRoute(ax, az, bx, bz, 0.38)) return { x: bx, z: bz };
  const cells = navCells;
  const nearest = (x: number, z: number) => {
    let best = -1, distance = Infinity;
    cells.forEach((cell, i) => {
      const gap = Math.hypot(cell.x - x, cell.z - z);
      if (cell.open && gap < distance && clearRoute(x, z, cell.x, cell.z, 0.38)) {
        distance = gap;
        best = i;
      }
    });
    return best;
  };
  const start = nearest(ax, az), goal = nearest(bx, bz);
  if (start < 0 || goal < 0) return { x: ax, z: az };
  const queue = [start], parents = new Map([[start, -1]]);
  for (let head = 0; head < queue.length; head++) {
    const i = queue[head], cell = cells[i];
    if (i === goal) {
      let next = i;
      while (parents.get(next) !== -1) {
        if (clearRoute(ax, az, cells[next].x, cells[next].z, 0.38)) return cells[next];
        next = parents.get(next)!;
      }
      return cells[start];
    }
    for (const neighbor of [i - NAV_WIDTH, i + NAV_WIDTH, i - 1, i + 1]) {
      const candidate = cells[neighbor];
      if (!candidate || parents.has(neighbor) || Math.abs(candidate.x - cell.x) > 1 ||
        !candidate.open || !clearRoute(cell.x, cell.z, candidate.x, candidate.z, 0.38)) continue;
      parents.set(neighbor, i);
      queue.push(neighbor);
    }
  }
  return { x: ax, z: az };
}

function surface(width: number, height: number, draw: (ctx: CanvasRenderingContext2D) => void) {
  const canvas = document.createElement("canvas");
  canvas.width = width;
  canvas.height = height;
  const ctx = canvas.getContext("2d");
  if (ctx) draw(ctx);
  const map = new THREE.CanvasTexture(canvas);
  map.colorSpace = THREE.SRGBColorSpace;
  map.anisotropy = 4;
  return map;
}

function woodTexture() {
  let seed = 912;
  const random = () => ((seed = (Math.imul(seed, 1664525) + 1013904223) >>> 0) / 4294967296);
  return surface(512, 512, ctx => {
    for (let row = 0; row < 16; row++) {
      const y = row * 32;
      const tone = 23 + random() * 12;
      ctx.fillStyle = `hsl(27 43% ${tone}%)`;
      ctx.fillRect(0, y, 512, 32);
      for (let line = 0; line < 42; line++) {
        ctx.strokeStyle = line % 2 ? "#f8c68817" : "#190d0850";
        const start = random() * 512, dy = y + random() * 31;
        ctx.beginPath();
        ctx.moveTo(start, dy);
        ctx.bezierCurveTo(start + 45, dy - 3, start + 64, dy + 4, start + 160, dy);
        ctx.stroke();
      }
      ctx.fillStyle = "#21130e";
      ctx.fillRect(0, y, 512, 1.5);
      ctx.fillRect((row * 83) % 510, y, 2, 32);
    }
  });
}

function paintingTexture(index: number) {
  const skies = ["#dd965f", "#d8c987", "#8ab3b5"];
  const hills = ["#49242b", "#243d2c", "#243b57"];
  return surface(384, 240, ctx => {
    const sky = ctx.createLinearGradient(0, 0, 0, 240);
    sky.addColorStop(0, skies[index]);
    sky.addColorStop(1, "#e6c59b");
    ctx.fillStyle = sky;
    ctx.fillRect(0, 0, 384, 240);
    ctx.fillStyle = "#ffe4a7";
    ctx.beginPath();
    ctx.arc(257 - 54 * index, 74, 31, 0, Math.PI * 2);
    ctx.fill();
    for (let layer = 0; layer < 4; layer++) {
      ctx.fillStyle = hills[index];
      ctx.globalAlpha = 0.35 + layer * 0.19;
      ctx.beginPath();
      ctx.moveTo(0, 240);
      for (let x = 0; x <= 384; x += 8) {
        const ridge = Math.sin(x * 0.017 + layer + index) * 24 + Math.cos(x * 0.033 + layer) * 10;
        ctx.lineTo(x, 114 + layer * 25 + ridge);
      }
      ctx.lineTo(384, 240);
      ctx.fill();
    }
  });
}

export function furnishRoom(scene: THREE.Scene) {
  const props: MapProp[] = [];
  const material = (color: number) => new THREE.MeshStandardMaterial({ color, roughness: 0.84 });
  const oak = material(0x503021);
  const trim = material(0x2e1b17);
  const plaster = material(0xbd9160);
  const brass = material(0xb27b3d);
  const stone = material(0x83786a);
  const leaves = [material(0x356a4d), material(0x588052), material(0x769659)];
  const bookColors = [0x773e32, 0x435d51, 0x897048, 0x36546a].map(material);
  const lampGlow = new THREE.MeshStandardMaterial({ color: 0xffc37b, emissive: 0xff871f, emissiveIntensity: 1.1 });
  const glass = new THREE.MeshStandardMaterial({ color: 0x8abdc8, emissive: 0x6a9bab, emissiveIntensity: 0.6, roughness: 0.35 });
  const wood = woodTexture();
  wood.wrapS = wood.wrapT = THREE.RepeatWrapping;
  wood.repeat.set(2, 2);
  const floor = new THREE.MeshStandardMaterial({ map: wood, roughness: 0.84 });
  function box(w: number, h: number, d: number, x: number, y: number, z: number, mat: THREE.Material, casts = true) {
    const mesh = new THREE.Mesh(new THREE.BoxGeometry(w, h, d), mat);
    mesh.position.set(x, y, z);
    mesh.castShadow = casts;
    mesh.receiveShadow = true;
    scene.add(mesh);
    return mesh;
  }
  function registerProp(spec: Omit<MapProp, "model">, firstChild: number) {
    const model = new THREE.Group();
    model.position.set(spec.x, 0, spec.z);
    const parts = scene.children.slice(firstChild);
    for (const mesh of parts) {
      if (!(mesh instanceof THREE.Mesh)) continue;
      mesh.position.x -= spec.x;
      mesh.position.z -= spec.z;
      model.add(mesh);
    }
    scene.add(model);
    props.push({ ...spec, model });
  }
  for (const z of [0, -12]) {
    for (const x of [-12, 0, 12]) box(12, 0.32, 12, x, -0.18, z, floor, false);
  }
  box(18, 0.035, 11.6, 0, 0.005, -12.1, stone, false);
  for (let x = -8; x <= 8; x += 2) box(0.045, 0.014, 11.6, x, 0.027, -12.1, trim, false);
  for (let z = -17; z <= -7; z += 2) box(18, 0.014, 0.045, 0, 0.027, z, trim, false);
  box(36, 4.55, 0.3, 0, 2.25, -18, plaster, false);
  box(36, 0.32, 0.2, 0, 0.16, -17.78, trim, false);
  for (const x of [-18, 18]) box(0.3, 3.65, 24, x, 1.82, -6, plaster, false);
  for (const wall of crosswalls) {
    const height = wall.x === 0 ? 4.65 : 2.65;
    box(wall.w, height, wall.d, wall.x, height / 2, wall.z, plaster, false);
  }
  for (const wall of dividers) box(wall.w, 2.42, wall.d, wall.x, 1.21, wall.z, oak, false);
  for (const x of [-13.5, 13.5]) {
    for (const offset of [-2.1, 2.1]) box(0.14, 2.65, 0.4, x + offset, 1.325, -6, trim);
    box(4.2, 0.08, 0.35, x, 0.025, -6, brass, false);
    box(6.65, 0.03, 5.1, x, 0.023, -12.55, material(x < 0 ? 0x513349 : 0x67513b), false);
  }
  for (const x of [-6, -2, 2, 6]) {
    box(3.65, 3.15, 0.13, x, 2.53, -17.76, oak);
    box(3.28, 2.78, 0.06, x, 2.53, -17.66, glass, false);
    box(0.105, 2.78, 0.06, x, 2.53, -17.61, trim, false);
    box(3.28, 0.105, 0.06, x, 2.53, -17.61, trim, false);
  }
  for (const side of [-1, 1]) {
    const x = side * 9;
    for (const z of [-1.91, 1.91]) box(0.4, 2.58, 0.21, x, 1.29, z, trim);
    box(0.34, 0.12, 3.82, x, 0.04, 0, brass, false);
    // Sideboard stays beside the playable area.
    box(1.05, 0.9, 2.7, x - side * 0.67, 0.46, 3.75, oak);
    box(1.18, 0.12, 2.86, x - side * 0.67, 0.98, 3.75, trim);
    for (const z of [2.85, 3.4, 4.05, 4.6]) {
      const jar = new THREE.Mesh(new THREE.CylinderGeometry(0.13, 0.19, 0.38, 12), material(z > 0.4 ? 0x638576 : 0xaf7544));
      jar.position.set(x - side * 0.68, 1.23, z);
      jar.castShadow = true;
      scene.add(jar);
    }
    for (const shelfHeight of [0.65, 1.29, 1.93, 2.55]) {
      box(0.85, 0.11, 2.38, x - side * 0.62, shelfHeight, -3.25, oak);
      if (shelfHeight === 2.55) continue;
      for (let book = 0; book < 6; book++) {
        const bookHeight = 0.26 + (book % 3) * 0.09;
        box(0.37, bookHeight, 0.15, x - side * 0.67, shelfHeight + 0.055 + bookHeight / 2, -4.08 + book * 0.27, bookColors[book % 4]);
      }
    }
    for (const z of [-4.43, -2.07]) box(0.8, 2.04, 0.11, x - side * 0.62, 1.6, z, trim);
  }
  for (const prop of FURNITURE) {
    const firstChild = scene.children.length;
    const upholstery = material(PAINTS[prop.color]);
    const { x, z, w, d } = prop;
    if (prop.kind === "plant") {
      const pot = new THREE.Mesh(new THREE.CylinderGeometry(w * 0.43, w * 0.29, 0.66, 12), upholstery);
      pot.position.set(x, 0.33, z);
      pot.castShadow = true;
      scene.add(pot);
      box(0.085, 1.36, 0.085, x, 1.12, z, oak);
      for (let leaf = 0; leaf < 7; leaf++) {
        const angle = leaf * Math.PI * 2 / 7;
        const mesh = new THREE.Mesh(new THREE.SphereGeometry(1, 8, 6), leaves[leaf % leaves.length]);
        mesh.scale.set(0.16, 0.58, 0.25);
        mesh.rotation.set(Math.cos(angle) * 0.78, 0, Math.sin(angle) * 0.78);
        mesh.position.set(x + Math.sin(angle) * 0.31, 1.63 + leaf % 2 * 0.19, z + Math.cos(angle) * 0.31);
        mesh.castShadow = true;
        scene.add(mesh);
      }
    } else if (prop.kind === "lamp") {
      box(w, 0.1, d, x, 0.05, z, upholstery);
      box(0.08, 1.86, 0.08, x, 0.98, z, brass);
      const shade = new THREE.Mesh(new THREE.CylinderGeometry(0.25, 0.39, 0.45, 16), upholstery);
      shade.position.set(x, 1.94, z);
      shade.castShadow = true;
      scene.add(shade);
      const bulb = new THREE.PointLight(0xffba74, 14, 5);
      bulb.position.set(x, 1.76, z);
      scene.add(bulb);
    } else if (prop.kind === "bookshelf") {
      box(w, 2.9, 0.15, x, 1.45, z - d / 2 + 0.08, upholstery);
      for (const edge of [-1, 0, 1]) box(0.12, 2.9, d, x + edge * (w / 2 - 0.06), 1.45, z, upholstery);
      for (const level of [0.3, 1.06, 1.82, 2.58]) {
        box(w, 0.12, d, x, level, z, upholstery);
        for (let book = 0; book < 14; book++) {
          const height = 0.31 + (book % 4) * 0.085;
          box(0.18, height, 0.34, x - 2.8 + book * 0.43, level + 0.06 + height / 2, z + 0.1, bookColors[book % 4]);
        }
      }
    } else if (prop.kind === "table") {
      box(w, 0.18, d, x, 0.99, z, upholstery);
      for (const side of [-1, 1]) {
        for (const end of [-1, 1]) box(0.14, 0.9, 0.14, x + side * (w / 2 - 0.16), 0.45, z + end * (d / 2 - 0.16), oak);
      }
      if (w > 3) {
        box(w * 0.85, 0.02, 0.66, x, 1.09, z, material(0xa96146), false);
        for (const side of [-1, 1]) {
          for (const place of [-1, 0, 1]) {
            const plate = new THREE.Mesh(new THREE.CylinderGeometry(0.27, 0.23, 0.04, 12), material(0xf0d7b5));
            plate.position.set(x + place * 1.01, 1.12, z + side * 0.72);
            scene.add(plate);
          }
        }
      }
    } else if (prop.kind === "sofa" || prop.kind === "seat" || prop.kind === "bench") {
      box(w - 0.12, 0.46, d - 0.14, x, 0.35, z, upholstery);
      box(w, 0.21, d, x, 0.68, z, upholstery);
      if (prop.kind !== "bench") {
        box(w, 0.77, 0.24, x, 1.03, z - d / 2 + 0.13, upholstery);
        for (const edge of [-1, 1]) box(0.24, 0.48, d, x + edge * (w / 2 - 0.12), 0.81, z, upholstery);
      }
    } else {
      box(w - 0.1, 0.96, d - 0.1, x, 0.49, z, upholstery);
      box(w, 0.13, d, x, 1.03, z, trim);
      for (let knob = 0; knob < Math.floor(w); knob++) {
        box(0.2, 0.06, 0.09, x - w / 2 + 0.55 + knob, 0.72, z + d / 2, brass);
      }
    }
    registerProp({
      x, z, w, d, id: prop.name, name: prop.name,
      category: prop.kind === "plant" ? "Plants" : prop.kind === "lamp" ? "Decorations" :
        prop.kind === "cabinet" ? "Household Objects" : "Furniture",
    }, firstChild);
  }
  const canvasArt = new THREE.MeshStandardMaterial({ map: paintingTexture(1), roughness: 1 });
  for (const spec of portableProps) {
    const firstChild = scene.children.length;
    const { x, z, w, d } = spec;
    if (spec.category === "Paintings") {
      box(w, 0.86, 0.14, x, 0.66, z, oak);
      box(w - 0.1, 0.76, 0.045, x, 0.66, z + 0.075, brass);
      box(w - 0.18, 0.68, 0.035, x, 0.66, z + 0.105, canvasArt, false);
      box(w * 0.55, 0.23, d, x, 0.115, z, trim);
    } else {
      box(w, 0.65, d, x, 0.325, z, oak);
      box(w, 0.075, d, x, 0.66, z, trim);
      for (const offset of [-0.24, 0.24]) box(0.12, 0.66, 0.03, x + offset, 0.34, z + d / 2, brass);
    }
    registerProp(spec, firstChild);
  }
  for (const x of [-13.5, 13.5]) {
    const light = new THREE.PointLight(0xffc78c, 44, 12);
    light.position.set(x, 4.1, -0.4);
    scene.add(light);
    box(4.3, 0.035, 2.6, x, 0.018, 0, material(x < 0 ? 0x693b34 : 0x5e725b), false);
  }
  const windowLight = new THREE.PointLight(0xb9e3ff, 85, 15);
  windowLight.position.set(0, 4.25, -14.35);
  scene.add(windowLight);
  box(18.4, 0.19, 0.23, 0, 4.52, -5.78, trim);
  for (const x of [-8.55, -2.75, 2.75, 8.55]) box(0.23, 4.5, 0.27, x, 2.25, -5.77, oak);
  for (const x of [-2.75, 2.75]) {
    box(0.3, 0.46, 0.09, x, 3.55, -5.55, brass);
    box(0.12, 0.1, 0.38, x, 3.42, -5.36, brass);
    const shade = new THREE.Mesh(new THREE.CylinderGeometry(0.19, 0.32, 0.31, 16), lampGlow);
    shade.position.set(x, 3.62, -5.12);
    scene.add(shade);
  }
  ZONES.forEach((zone, index) => {
    const paint = material(PAINTS[zone.color]);
    box(5.16, 2.05, 0.08, zone.x, 1.03, -5.79, paint, false);
    box(5.18, 0.1, 0.17, zone.x, 2.06, -5.73, oak);
    box(5.18, 0.13, 0.17, zone.x, 0.1, -5.73, trim);
    for (const dx of [-1.7, 0, 1.7]) {
      box(0.045, 1.7, 0.08, zone.x + dx, 1.05, -5.71, paint);
    }
    box(4.56, 0.025, 2.18, zone.x, 0.018, -4.61, paint, false);
    for (const dx of [-2.21, 2.21]) box(0.044, 0.018, 2.11, zone.x + dx, 0.042, -4.61, brass, false);
    for (const z of [-5.65, -3.57]) box(4.45, 0.018, 0.045, zone.x, 0.042, z, brass, false);
    box(2.88, 1.8, 0.13, zone.x, 3.24, -5.74, trim);
    box(2.77, 1.69, 0.11, zone.x, 3.24, -5.65, brass);
    box(2.53, 1.45, 0.05, zone.x, 3.24, -5.57, new THREE.MeshStandardMaterial({ map: paintingTexture(index), roughness: 1 }), false);
    const light = new THREE.PointLight(0xffbc78, 26, 9, 2);
    light.position.set(zone.x, 4.2, -3.9);
    scene.add(light);
  });
  const carpet = material(0x67372a);
  box(6.8, 0.035, 4.6, 0, 0.02, 0.15, carpet, false);
  for (const x of [-3.2, 3.2]) box(0.08, 0.018, 4.25, x, 0.044, 0.15, brass, false);
  for (const z of [-1.97, 2.27]) box(6.4, 0.018, 0.08, 0, 0.044, z, brass, false);
  for (const x of [-2, 0, 2]) {
    const motif = box(0.7, 0.016, 0.7, x, 0.045, 0.15, brass, false);
    motif.rotation.y = Math.PI / 4;
  }
  for (const x of [-2.88, 2.88]) {
    for (let step = 0; step < 8; step++) {
      const stitch = box(0.12, 0.018, 0.12, x, 0.046, -1.6 + step * 0.5, brass, false);
      stitch.rotation.y = Math.PI / 4;
    }
  }
  // The camera looks across this partition from the front of the house.
  const frontPartition = new THREE.Group();
  for (const object of [...scene.children]) {
    if (object instanceof THREE.Mesh && object.position.z >= -6.02 &&
        object.position.z <= -5.08 && object.position.y > 0.13) {
      frontPartition.add(object);
    }
  }
  scene.add(frontPartition);
  return { frontPartition, props };
}
