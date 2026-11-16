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
export type MapProp = Footprint & { y?: number; id: string; name: string; category: PropCategory; model: THREE.Group };
type PropKind = "sofa" | "seat" | "bench" | "cabinet" | "bookshelf" | "plant" | "table" | "lamp" | "range" | "island" | "bed" | "wardrobe" | "barrel" | "crate" | "shelf";
export type HidingSpot = Footprint & { y?: number; color: Exclude<Paint, "white">; name: string; kind: PropKind };
const HOUSE = { left: -18, right: 18, back: -29.85, front: 14.86 };
const ENTRY_WALL = 15;
const HALL_HEIGHT = 6.65;
export const WALL_CLIMBS = [
  { x: -6.2, z: 14.12, top: 4.55, color: "coral", label: "Ember wall" },
  { x: 6.2, z: 14.12, top: 4.55, color: "blue", label: "Tide wall" },
] as const;
export type WallClimb = typeof WALL_CLIMBS[number];
const entryScreens = [-6.2, 6.2].map(x => ({ x, z: 10.4, w: 3.15, d: 0.38 }));

export function nearbyWallClimb(x: number, z: number): WallClimb | undefined {
  return WALL_CLIMBS.find(wall => Math.abs(x - wall.x) <= 0.85 && z >= wall.z - 1.15);
}
const libraryPassage = { x: -13.5, z: -18 };
const rearWalls: Footprint[] = [
  { x: -16.85, z: -18, w: 2.3, d: 0.32 },
  { x: 3.35, z: -18, w: 29.3, d: 0.32 },
  { x: -9, z: -22.65, w: 0.32, d: 9.3 },
];
const stairWidth = 3.1;
const stairDepth = 0.59;
const stairs = Array.from({ length: 11 }, (_, index) => ({
  x: -13.5, z: -21.15 - index * stairDepth, w: stairWidth, d: stairDepth,
  top: (index + 1) * 0.245, step: true,
}));
const UPPER_FLOOR = stairs[10].top;
const libraryLanding = { x: -12.02, z: -28.6, w: 8.36, d: 2.68, top: UPPER_FLOOR, step: true };
const upperWing = { x: 4.5, z: -24, w: 27, d: 12, top: UPPER_FLOOR, step: true };
const upperWalls = [
  ...[-4.5, 4.5, 13.5].flatMap(x => [-3.13, 3.13].map(offset => ({ x: x + offset, z: -26.1, w: 2.74, d: 0.28 }))),
  ...[0, 9].map(x => ({ x, z: -22, w: 0.28, d: 8 })),
];
const upperFurniture: HidingSpot[] = ([
  { x: -6.5, z: -20.6, w: 2.25, d: 3.25, color: "blue", name: "guest bed", kind: "bed" },
  { x: -1.5, z: -21.8, w: 1.4, d: 2.8, color: "coral", name: "oak wardrobe", kind: "wardrobe" },
  { x: -5.4, z: -24, w: 1.1, d: 0.9, color: "mint", name: "bedroom hamper", kind: "barrel" },
  { x: 3, z: -20.2, w: 2.2, d: 3.15, color: "coral", name: "main bedroom bed", kind: "bed" },
  { x: 7.5, z: -22, w: 1.4, d: 2.7, color: "blue", name: "linen wardrobe", kind: "wardrobe" },
  { x: 12, z: -20.3, w: 3.3, d: 1.45, color: "mint", name: "storeroom shelf", kind: "shelf" },
  { x: 16.65, z: -22, w: 1.55, d: 3.25, color: "blue", name: "pantry racks", kind: "shelf" },
  { x: 11.05, z: -23.65, w: 1.35, d: 1.4, color: "coral", name: "provision crates", kind: "crate" },
  { x: 15.35, z: -24.5, w: 1.25, d: 1.25, color: "mint", name: "storage barrel", kind: "barrel" },
] satisfies HidingSpot[]).map(prop => ({ ...prop, y: UPPER_FLOOR }));
const galleryLedges = ZONES.flatMap(zone => [
  { x: zone.x, z: -2.96, w: 1.24, d: 0.9, top: 0.46, step: false, color: zone.color },
  { x: zone.x, z: -4.04, w: 2.62, d: 1.0, top: 1.27, step: false, color: zone.color },
  { x: zone.x, z: -5.03, w: 3.18, d: 1.16, top: 2.16, step: false, color: zone.color },
]);
const galleryPiers = [-4.15, 4.15].map(x => ({ x, z: 1.65, w: 0.82, d: 0.82 }));
const dividers: Footprint[] = [-9, 9].flatMap(x => [
  { x, z: -3.95, w: 0.36, d: 4.1 },
  { x, z: 3.95, w: 0.36, d: 4.1 },
  { x, z: -16.05, w: 0.36, d: 3.9 },
  { x, z: -7.95, w: 0.36, d: 3.9 },
]);
const crosswalls: Footprint[] = [
  { x: 0, z: -6, w: 18, d: 0.32 },
  ...[-13.5, 13.5].flatMap(x => [-3.65, 3.65].map(offset => ({ x: x + offset, z: -6, w: 1.7, d: 0.32 }))),
];
export const ROOMS = [
  { name: "Lounge", x: -13.5, z: 0 },
  { name: "Gallery", x: 0, z: -2 },
  { name: "Kitchen", x: 13.5, z: 0 },
  { name: "Library", x: -13.5, z: -12 },
  { name: "Conservatory", x: 0, z: -12 },
  { name: "Dining Room", x: 13.5, z: -12 },
] as const;
export function roomAt(x: number, z: number, y = 0) {
  if (z < -18 && x > -9 && y >= UPPER_FLOOR - 0.08) {
    return z < -26.24 ? "Upstairs Hall" : x < 0 ? "Guest Bedroom" : x < 9 ? "Main Bedroom" : "Storeroom";
  }
  if (z >= 9.85) return "Grand Foyer";
  if (z < -18) return y >= libraryLanding.top - 0.08 ? "Library Landing" : "Library Stair Hall";
  const column = x < -9 ? 0 : x > 9 ? 2 : 1;
  return ROOMS[column + (z < -6 ? 3 : 0)].name;
}

export const FURNITURE: HidingSpot[] = [
  { x: -15.78, z: -2.65, w: 3.0, d: 1.35, color: "coral", name: "velvet sofa", kind: "sofa" },
  { x: -14.9, z: 2.35, w: 2.1, d: 1.55, color: "blue", name: "reading chair", kind: "seat" },
  { x: -11.3, z: 3.5, w: 1.4, d: 1.1, color: "mint", name: "side table", kind: "table" },
  { x: 16.75, z: -3.95, w: 1.55, d: 2.35, color: "mint", name: "kitchen range", kind: "range" },
  { x: 14.5, z: 1.7, w: 3.55, d: 1.6, color: "blue", name: "kitchen island", kind: "island" },
  { x: 17.1, z: 4.65, w: 1.25, d: 1.35, color: "mint", name: "kitchen crock", kind: "barrel" },
  { x: 10.8, z: 4.15, w: 2.2, d: 1.12, color: "coral", name: "pantry chest", kind: "cabinet" },
  { x: 0, z: 0.5, w: 2.8, d: 1.1, color: "coral", name: "gallery bench", kind: "bench" },
  { x: -7.9, z: 12.6, w: 1.2, d: 1.05, color: "coral", name: "entry trunk", kind: "cabinet" },
  { x: 7.9, z: 12.6, w: 1.2, d: 1.05, color: "blue", name: "entry chest", kind: "cabinet" },
  { x: -14.8, z: 11.6, w: 2.9, d: 1.35, color: "mint", name: "foyer settee", kind: "sofa" },
  { x: 14.8, z: 11.6, w: 2.9, d: 1.35, color: "blue", name: "foyer sofa", kind: "sofa" },
  { x: -17.05, z: -13.75, w: 0.88, d: 3.4, color: "coral", name: "library bookcase", kind: "cabinet" },
  { x: -10.8, z: -11.8, w: 2.7, d: 0.95, color: "coral", name: "library bookshelf", kind: "bookshelf" },
  { x: -16.22, z: -19.85, w: 1.5, d: 0.95, color: "mint", name: "library trunk", kind: "cabinet" },
  { x: -10.5, z: -21.15, w: 1.35, d: 1.1, color: "blue", name: "stair hall chest", kind: "cabinet" },
  { x: -15.55, z: -11.05, w: 2.1, d: 1.5, color: "blue", name: "library armchair", kind: "seat" },
  { x: -16.95, z: -12.75, w: 0.8, d: 0.8, color: "mint", name: "reading lamp", kind: "lamp" },
  { x: -3.8, z: -13.9, w: 1.65, d: 1.65, color: "mint", name: "potted palm", kind: "plant" },
  { x: 4.1, z: -14.75, w: 1.6, d: 1.6, color: "blue", name: "blue planter", kind: "plant" },
  { x: 0, z: -16.5, w: 3.4, d: 1.05, color: "coral", name: "window seat", kind: "bench" },
  { x: 14.05, z: -13.95, w: 3.8, d: 2.55, color: "blue", name: "dining table", kind: "table" },
  { x: 14, z: -16.75, w: 5.3, d: 1.05, color: "coral", name: "dining sideboard", kind: "cabinet" },
  { x: 16.85, z: -8.65, w: 1.2, d: 1.2, color: "mint", name: "dining planter", kind: "plant" },
  ...upperFurniture,
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
const furnitureTops: Partial<Record<PropKind, number>> = { bench: 0.785, cabinet: 1.095, table: 1.08, island: 1.095, range: 1.05, bed: 0.94, barrel: 0.98, crate: 1.03 };
const solidObstacles: (Footprint & { y?: number })[] = [...dividers, ...crosswalls, ...rearWalls, ...galleryPiers, ...sideboards, ...entryScreens,
  ...upperWalls.map(wall => ({ ...wall, y: UPPER_FLOOR })),
  ...FURNITURE.filter(item => furnitureTops[item.kind] === undefined),
  ...portableProps.filter(item => item.category === "Paintings")];

const platforms: (Footprint & { y?: number; top: number; step: boolean })[] = [
  ...galleryLedges, ...stairs, libraryLanding, upperWing,
  ...FURNITURE.flatMap(item => {
    const top = furnitureTops[item.kind];
    return top === undefined ? [] : [{ ...item, top: (item.y ?? 0) + top, step: false }];
  }),
  ...portableProps.filter(item => item.category !== "Paintings").map(item => ({ ...item, top: 0.6975, step: false })),
];
const PLAYER_RADIUS = 0.38;
export const STAIR_STEP = 0.27;

function overlaps(item: Footprint, x: number, z: number, halfX: number, halfZ: number) {
  return Math.abs(x - item.x) < item.w / 2 + halfX && Math.abs(z - item.z) < item.d / 2 + halfZ;
}

export function groundHeight(x: number, z: number, body?: BodyFootprint, maxY = Infinity) {
  let height = 0;
  for (const item of platforms) {
    if (item.top <= maxY && overlaps(item, x, z, body?.halfX ?? PLAYER_RADIUS, body?.halfZ ?? PLAYER_RADIUS)) {
      height = Math.max(height, item.top);
    }
  }
  return height;
}

export function canOccupy(x: number, z: number, padding = PLAYER_RADIUS, feetY = 0, body?: BodyFootprint, stepUp = 0) {
  const halfX = body?.halfX ?? padding;
  const halfZ = body?.halfZ ?? padding;
  return x > HOUSE.left + halfX && x < HOUSE.right - halfX && z > HOUSE.back + halfZ && z < HOUSE.front - halfZ &&
    !solidObstacles.some(item => feetY + 0.08 >= (item.y ?? 0) && overlaps(item, x, z, halfX, halfZ)) &&
    !platforms.some(item => feetY + 0.08 >= (item.y ?? 0) &&
      feetY + (item.step ? stepUp : 0) + 0.001 < item.top && overlaps(item, x, z, halfX, halfZ));
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

export function matchingSpot(x: number, z: number, color: Paint, y = 0) {
  const ledge = galleryLedges.find(item => item.color === color && item.top > 2 && y >= item.top - 0.08 &&
    distanceToProp(x, z, item) < PLAYER_RADIUS);
  if (ledge) return "Painting ledge";
  const prop = FURNITURE.find(item => item.color === color && Math.abs(y - (item.y ?? 0)) < 1.2 && distanceToProp(x, z, item) <= 1.15);
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

const walkableStairs = [...stairs, libraryLanding, upperWing];
function walkableHeight(x: number, z: number) {
  return walkableStairs.findLast(item => overlaps(item, x, z, PLAYER_RADIUS, PLAYER_RADIUS))?.top ?? 0;
}

function walkingRoute(ax: number, az: number, bx: number, bz: number) {
  const samples = Math.max(1, Math.ceil(Math.hypot(bx - ax, bz - az) / 0.2));
  let floor = walkableHeight(ax, az);
  for (let step = 1; step <= samples; step++) {
    const x = ax + (bx - ax) * step / samples, z = az + (bz - az) * step / samples;
    const next = walkableHeight(x, z);
    if (next > floor + STAIR_STEP || !canOccupy(x, z, PLAYER_RADIUS, next)) return false;
    floor = next;
  }
  return true;
}

const NAV_WIDTH = 35;
const navCells = Array.from({ length: NAV_WIDTH * 44 }, (_, index) => ({
  x: index % NAV_WIDTH - 17,
  z: Math.floor(index / NAV_WIDTH) - 29,
})).map(cell => ({ ...cell, open: canOccupy(cell.x, cell.z, PLAYER_RADIUS, walkableHeight(cell.x, cell.z)) }));

export function findSeekerWaypoint(ax: number, az: number, bx: number, bz: number) {
  if (walkingRoute(ax, az, bx, bz)) return { x: bx, z: bz };
  const cells = navCells;
  const nearest = (x: number, z: number) => {
    let best = -1, distance = Infinity;
    cells.forEach((cell, i) => {
      const gap = Math.hypot(cell.x - x, cell.z - z);
      if (cell.open && gap < distance && walkingRoute(x, z, cell.x, cell.z)) {
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
        if (walkingRoute(ax, az, cells[next].x, cells[next].z)) return cells[next];
        next = parents.get(next)!;
      }
      return cells[start];
    }
    for (const neighbor of [i - NAV_WIDTH, i + NAV_WIDTH, i - 1, i + 1]) {
      const candidate = cells[neighbor];
      if (!candidate || parents.has(neighbor) || Math.abs(candidate.x - cell.x) > 1 ||
        !candidate.open || !walkingRoute(cell.x, cell.z, candidate.x, candidate.z)) continue;
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

export function furnishRoom(scene: THREE.Scene, enclosed = false) {
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
  const furnitureWood = new THREE.MeshStandardMaterial({ map: wood, color: 0xbb9677, roughness: 0.77 });
  function box(w: number, h: number, d: number, x: number, y: number, z: number, mat: THREE.Material, casts = true) {
    const mesh = new THREE.Mesh(new THREE.BoxGeometry(w, h, d), mat);
    mesh.position.set(x, y, z);
    mesh.castShadow = casts;
    mesh.receiveShadow = true;
    scene.add(mesh);
    return mesh;
  }
  function roomSign(label: string, x: number, y: number, z: number) {
    const map = surface(384, 72, ctx => {
      ctx.fillStyle = "#36261e";
      ctx.fillRect(0, 0, 384, 72);
      ctx.strokeStyle = "#bfa477";
      ctx.lineWidth = 2;
      ctx.strokeRect(5, 5, 374, 62);
      ctx.fillStyle = "#f1d9af";
      ctx.textAlign = "center";
      ctx.textBaseline = "middle";
      ctx.font = "bold 27px Georgia";
      ctx.fillText(label, 192, 37, 350);
    });
    box(1.8, 0.34, 0.045, x, y, z, new THREE.MeshBasicMaterial({ map }), false);
  }
  function registerProp(spec: Omit<MapProp, "model">, firstChild: number) {
    const model = new THREE.Group();
    model.position.set(spec.x, spec.y ?? 0, spec.z);
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
  for (const x of [-12, 0, 12]) box(12, 0.32, 9, x, -0.18, 10.5, floor, false);
  box(9, 0.32, 12, -13.5, -0.18, -24, floor, false);
  box(upperWing.w, 0.35, upperWing.d, upperWing.x, UPPER_FLOOR - 0.175, upperWing.z, floor, false);
  box(27.3, 5.8, 0.3, 4.5, 2.9, -30, plaster, false);
  box(0.3, 5.8, 12, 18, 2.9, -24, plaster, false);
  for (const wall of upperWalls) {
    box(wall.w, 3.1, wall.d, wall.x, UPPER_FLOOR + 1.55, wall.z, plaster);
    box(wall.w, 0.16, wall.d + 0.04, wall.x, UPPER_FLOOR + 0.08, wall.z, trim);
  }
  for (const x of [-4.5, 4.5, 13.5]) {
    box(3.54, 0.61, 0.28, x, UPPER_FLOOR + 2.795, -26.1, plaster);
    box(3.54, 0.14, 0.4, x, UPPER_FLOOR + 2.44, -26.1, trim);
    for (const dx of [-1.72, 1.72]) box(0.15, 2.5, 0.4, x + dx, UPPER_FLOOR + 1.25, -26.1, oak);
    roomSign(x < 0 ? "Guest Bedroom" : x > 9 ? "Storeroom" : "Main Bedroom", x, UPPER_FLOOR + 2.71, -26.28);
    box(2.58, 1.16, 0.12, x, UPPER_FLOOR + 1.68, -29.76, trim);
    box(2.36, 0.94, 0.065, x, UPPER_FLOOR + 1.68, -29.67,
      new THREE.MeshStandardMaterial({ map: paintingTexture(x < 0 ? 2 : x > 9 ? 1 : 0), roughness: 0.94 }), false);
    box(2.64, 0.022, 1.35, x, UPPER_FLOOR + 0.012, -24.3, material(x > 9 ? 0x5f6258 : 0x635046), false);
    const light = new THREE.PointLight(0xffddb1, 28, 9);
    light.position.set(x, UPPER_FLOOR + 2.7, -24.8);
    scene.add(light);
  }
  box(18, 0.035, 11.6, 0, 0.005, -12.1, stone, false);
  for (let x = -8; x <= 8; x += 2) box(0.045, 0.014, 11.6, x, 0.027, -12.1, trim, false);
  for (let z = -17; z <= -7; z += 2) box(18, 0.014, 0.045, 0, 0.027, z, trim, false);
  for (const wall of rearWalls) {
    box(wall.w, 5.2, wall.d, wall.x, 2.6, wall.z, plaster);
    box(wall.w + 0.12, 0.28, wall.d + 0.12, wall.x, 0.14, wall.z, trim);
  }
  for (const offset of [-2.16, 2.16]) {
    box(0.24, 3.9, 0.5, libraryPassage.x + offset, 1.95, libraryPassage.z, oak);
  }
  box(4.55, 1.35, 0.45, libraryPassage.x, 4.52, libraryPassage.z, oak);
  roomSign("Stairs to Upper Floor", libraryPassage.x, 4.12, libraryPassage.z + 0.25);
  box(0.3, 5.2, 12, -18, 2.6, -24, plaster);
  box(9, 5.8, 0.3, -13.5, 2.9, -30, plaster);
  box(36, HALL_HEIGHT, 0.3, 0, HALL_HEIGHT / 2, ENTRY_WALL, plaster);
  box(36, 0.32, 0.4, 0, 0.16, ENTRY_WALL - 0.18, trim);
  box(29.3, HALL_HEIGHT - 5.2, 0.32, 3.35, (HALL_HEIGHT + 5.2) / 2, -18, plaster, false);
  box(2.3, HALL_HEIGHT - 5.2, 0.32, -16.85, (HALL_HEIGHT + 5.2) / 2, -18, plaster, false);
  box(4.4, HALL_HEIGHT - 5.2, 0.32, -13.5, (HALL_HEIGHT + 5.2) / 2, -18, plaster, false);
  for (const x of [-18, 18]) box(0.3, HALL_HEIGHT, 33, x, HALL_HEIGHT / 2, -1.5, plaster, false);
  if (enclosed) {
    const ceiling = material(0x93745e);
    box(36.2, 0.25, 33.2, 0, HALL_HEIGHT + 0.125, -1.5, ceiling, false);
    box(9.2, 0.25, 12.2, -13.5, 5.72, -24, ceiling, false);
    box(27.2, 0.25, 12.2, 4.5, 5.9, -24, ceiling, false);
    for (const x of [-12, 0, 12]) box(0.21, 0.32, 32.9, x, HALL_HEIGHT - 0.16, -1.5, oak, false);
    for (const z of [-16, -9, -2, 5, 9]) box(35.9, 0.32, 0.21, 0, HALL_HEIGHT - 0.16, z, oak, false);
    box(0.32, 0.52, 9.3, -9, 5.44, -22.65, plaster, false);
    box(0.3, 0.52, 12, -18, 5.44, -24, plaster, false);
  }
  const walnut = material(0x603b29);
  box(4.8, 3.98, 0.19, 0, 1.99, 14.75, trim);
  for (const x of [-1.07, 1.07]) {
    box(2.05, 3.63, 0.12, x, 1.82, 14.62, walnut);
    for (const y of [0.88, 2.52]) {
      box(1.58, 1.28, 0.045, x, y, 14.54, oak);
    }
    box(0.12, 0.28, 0.1, x * 0.18, 1.73, 14.49, brass);
  }
  box(7.4, 0.025, 6.8, 0, 0.011, 10.55, material(0x634039), false);
  for (const x of [-3.55, 3.55]) box(0.06, 0.018, 6.58, x, 0.028, 10.55, brass, false);
  for (const screen of entryScreens) {
    box(screen.w, 2.7, screen.d, screen.x, 1.35, screen.z, walnut);
    box(screen.w - 0.18, 2.38, 0.06, screen.x, 1.35, screen.z + 0.2, oak);
    box(screen.w, 0.12, 0.46, screen.x, 2.67, screen.z, brass);
  }
  for (const wall of WALL_CLIMBS) {
    const panel = material(PAINTS[wall.color]);
    box(3.15, 6.1, 0.17, wall.x, 3.1, 14.68, trim);
    box(2.87, 5.9, 0.08, wall.x, 3.1, 14.55, panel);
    const art = box(2.55, 1.98, 0.065, wall.x, 4.83, 14.49,
      new THREE.MeshStandardMaterial({ map: paintingTexture(wall.color === "coral" ? 0 : 2), roughness: 0.95 }), false);
    art.userData.camouflageZone = wall.color;
    art.name = wall.label + " mural";
    for (const y of [0.48, 1.16, 1.84, 2.52, 3.2, 3.88, 4.56]) {
      box(1.05, 0.07, 0.15, wall.x, y, 14.47, brass);
    }
    const light = new THREE.PointLight(0xffdfb4, 38, 10);
    light.position.set(wall.x, 5.9, 12.2);
    scene.add(light);
  }
  for (const pier of galleryPiers) {
    box(pier.w, 4.25, pier.d, pier.x, 2.125, pier.z, stone);
    for (const y of [0.15, 4.1]) box(pier.w + 0.18, 0.3, pier.d + 0.18, pier.x, y, pier.z, trim);
  }
  const stairRunner = material(0x67372a);
  for (const step of [...stairs, libraryLanding]) {
    box(step.w, step.top - 0.042, step.d, step.x, (step.top - 0.042) / 2, step.z, oak);
    box(step.w, 0.042, step.d, step.x, step.top - 0.021, step.z, trim);
    if (step !== libraryLanding) {
      box(1.55, 0.008, step.d - 0.04, step.x, step.top + 0.004, step.z, stairRunner, false);
    }
  }
  const firstStep = stairs[0], lastStep = stairs[stairs.length - 1];
  for (const side of [-1, 1]) {
    const x = firstStep.x + side * (stairWidth / 2 + 0.1);
    for (const step of stairs.filter((_, index) => index % 2 === 0)) {
      box(0.1, step.top + 0.8, 0.1, x, (step.top + 0.8) / 2, step.z, trim);
    }
    const rise = lastStep.top - firstStep.top, run = firstStep.z - lastStep.z;
    const rail = box(0.16, 0.12, Math.hypot(rise, run) + 0.22, x,
      (firstStep.top + lastStep.top) / 2 + 0.8, (firstStep.z + lastStep.z) / 2, walnut);
    rail.rotation.x = Math.atan2(rise, run);
  }
  const stairLight = new THREE.PointLight(0xffcf95, 36, 13);
  stairLight.position.set(-13.5, 4.65, -25);
  scene.add(stairLight);
  box(4.55, 1.85, 0.12, -13.5, 4.05, -29.77, trim);
  box(4.28, 1.6, 0.06, -13.5, 4.05, -29.67,
    new THREE.MeshStandardMaterial({ map: paintingTexture(1), roughness: 0.9 }), false);
  for (const ledge of galleryLedges) {
    const finish = material(PAINTS[ledge.color]);
    box(ledge.w, ledge.top - 0.085, ledge.d, ledge.x, (ledge.top - 0.085) / 2, ledge.z, finish);
    box(ledge.w, 0.085, ledge.d, ledge.x, ledge.top - 0.043, ledge.z, oak);
    box(ledge.w * 0.82, 0.065, 0.025, ledge.x, ledge.top - 0.19, ledge.z + ledge.d / 2 + 0.013, brass, false);
  }
  for (const wall of crosswalls) {
    const height = wall.x === 0 ? 4.65 : 2.65;
    box(wall.w, height, wall.d, wall.x, height / 2, wall.z, plaster, false);
  }
  for (const wall of dividers) box(wall.w, 2.42, wall.d, wall.x, 1.21, wall.z, oak, false);
  for (const x of [-13.5, 13.5]) {
    for (const offset of [-2.8, 2.8]) box(0.14, 2.65, 0.4, x + offset, 1.325, -6, trim);
    box(5.6, 0.08, 0.35, x, 0.025, -6, brass, false);
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
    if (prop.kind === "range" || prop.kind === "island") {
      const metal = new THREE.MeshStandardMaterial({ color: 0x939b9b, roughness: 0.43, metalness: 0.55 });
      box(w - 0.1, 0.88, d - 0.12, x, 0.48, z, upholstery);
      box(w, 0.115, d, x, 0.99, z, prop.kind === "range" ? metal : stone);
      const front = prop.kind === "range" ? x - w / 2 : z + d / 2;
      if (prop.kind === "range") {
        box(0.09, 0.45, d * 0.65, front, 0.48, z, trim);
        box(0.1, 0.055, d * 0.55, front - 0.07, 0.72, z, metal);
        for (const dx of [-0.35, 0.35]) for (const dz of [-0.55, 0.55]) {
          const burner = new THREE.Mesh(new THREE.CylinderGeometry(0.225, 0.225, 0.04, 20), trim);
          burner.position.set(x + dx, 1.062, z + dz);
          scene.add(burner);
        }
      } else {
        for (const dx of [-1.05, 0, 1.05]) {
          box(0.94, 0.68, 0.035, x + dx, 0.52, front - 0.025, upholstery);
          box(0.31, 0.045, 0.12, x + dx, 0.75, front + 0.01, brass);
        }
        box(0.93, 0.04, 0.65, x - 0.82, 1.06, z, oak);
        const bowl = new THREE.Mesh(new THREE.LatheGeometry([
          new THREE.Vector2(0.09, 0), new THREE.Vector2(0.22, 0.08), new THREE.Vector2(0.27, 0.18),
          new THREE.Vector2(0.24, 0.18), new THREE.Vector2(0.16, 0.07), new THREE.Vector2(0.02, 0.05),
        ], 20), material(0xd5b881));
        bowl.position.set(x + 0.87, 1.05, z);
        scene.add(bowl);
      }
    } else if (prop.kind === "bed") {
      const linen = material(0xe6d7bf);
      box(w, 0.44, d, x, 0.42, z, furnitureWood);
      box(w, 1.22, 0.18, x, 0.65, z + d / 2 - 0.09, furnitureWood);
      box(w - 0.12, 0.27, d - 0.18, x, 0.77, z - 0.04, linen);
      box(w - 0.04, 0.07, d * 0.62, x, 0.905, z - d * 0.14, upholstery);
      for (const dx of [-0.48, 0.48]) {
        const pillow = new THREE.Mesh(new THREE.SphereGeometry(1, 18, 10), linen);
        pillow.scale.set(0.43, 0.14, 0.32);
        pillow.position.set(x + dx, 0.94, z + d * 0.24);
        scene.add(pillow);
      }
    } else if (prop.kind === "wardrobe") {
      box(w - 0.12, 2.45, d - 0.08, x, 1.225, z, furnitureWood);
      box(w, 0.14, d, x, 2.42, z, trim);
      for (const dx of [-w * 0.23, w * 0.23]) {
        box(w * 0.43, 2.17, 0.09, x + dx, 1.21, z - d / 2 + 0.05, upholstery);
        box(w * 0.33, 1.83, 0.05, x + dx, 1.25, z - d / 2, furnitureWood);
        box(0.052, 0.2, 0.09, x + dx * 0.32, 1.13, z - d / 2 - 0.05, brass);
      }
    } else if (prop.kind === "barrel") {
      const profile = [new THREE.Vector2(w * 0.37, 0), new THREE.Vector2(w * 0.49, 0.46), new THREE.Vector2(w * 0.38, 0.98)];
      const barrel = new THREE.Mesh(new THREE.LatheGeometry(profile, 24), upholstery);
      barrel.position.set(x, 0, z);
      barrel.castShadow = true;
      scene.add(barrel);
      for (const [height, radius] of [[0.16, w * 0.422], [0.79, w * 0.422], [0.955, w * 0.393]]) {
        const band = new THREE.Mesh(new THREE.CylinderGeometry(radius, radius, 0.05, 24), trim);
        band.position.set(x, height, z);
        scene.add(band);
      }
      const lid = new THREE.Mesh(new THREE.CylinderGeometry(w * 0.373, w * 0.373, 0.035, 24), oak);
      lid.position.set(x, 0.962, z);
      scene.add(lid);
    } else if (prop.kind === "crate" || prop.kind === "shelf") {
      const levels = prop.kind === "shelf" ? [0.22, 0.94, 1.66] : [0];
      if (prop.kind === "shelf") {
        for (const dx of [-1, 1]) for (const dz of [-1, 1]) {
          box(0.12, 2.35, 0.12, x + dx * (w / 2 - 0.06), 1.175, z + dz * (d / 2 - 0.06), trim);
        }
      }
      for (const y of levels) {
        if (prop.kind === "shelf") box(w, 0.11, d, x, y, z, furnitureWood);
        const height = prop.kind === "shelf" ? 0.42 : 1.03;
        box(w * 0.72, height, d * 0.74, x, y + height / 2 + (y ? 0.055 : 0), z, upholstery);
        for (const dx of [-0.27, 0.27]) box(w * 0.07, height * 0.94, 0.055, x + w * dx,
          y + height / 2 + (y ? 0.055 : 0), z - d * 0.37, oak);
      }
    } else if (prop.kind === "plant") {
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
        const books = Math.floor((w - 0.24) / 0.29);
        for (let book = 0; book < books; book++) {
          const height = 0.31 + (book % 4) * 0.085;
          box(0.18, height, 0.34, x - (books - 1) * 0.145 + book * 0.29, level + 0.06 + height / 2, z + 0.1, bookColors[book % 4]);
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
      x, z, w, d, y: prop.y, id: prop.name, name: prop.name,
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
    const painting = box(2.53, 1.45, 0.05, zone.x, 3.24, -5.57,
      new THREE.MeshStandardMaterial({ map: paintingTexture(index), roughness: 1 }), false);
    painting.name = `${zone.label} landscape painting`;
    painting.userData.camouflageZone = zone.color;
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
  return { props };
}
