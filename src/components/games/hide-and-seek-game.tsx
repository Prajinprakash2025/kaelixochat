"use client";

import { useCallback, useEffect, useRef, useState, type PointerEvent as ReactPointerEvent } from "react";
import * as THREE from "three";
import {
  AlertCircle,
  ArrowDown,
  ArrowLeft,
  ArrowRight,
  ArrowUp,
  Check,
  CheckCircle2,
  Clock,
  Compass,
  Pipette,
  Copy,
  Crosshair,
  EyeOff,
  Flame,
  HelpCircle,
  Info,
  Loader2,
  LogOut,
  Palette,
  Paintbrush,
  RotateCcw,
  Scan,
  Shield,
  Snowflake,
  Sparkles,
  Target,
  Trophy,
  User,
  Users,
} from "lucide-react";
import { canOccupy, distanceToProp, findSeekerWaypoint, furnishRoom, groundHeight, matchingSpot, nearbyWallClimb, propFootprint, roomAt, STAIR_STEP, PAINTS as COLORS, ZONES, type MapProp, type Paint, type WallClimb } from "./shadow-hunt-room";
import { newMotion, stepMotion, stepWallClimb, WALK_SPEED } from "./shadow-hunt-motion";
import { createTagRaycast } from "./shadow-hunt-tag";
import { makePaintSurfaces, paintBackupKey, paintDab, readPaintDesign, type BrushSettings, type PaintDesign, type PaintSurface } from "./shadow-hunt-paint";
import { sampleSurface } from "./shadow-hunt-sample";
import { activePainting, loadPainting } from "./shadow-hunt-paint-cloud";
import type { AuthChangeEvent, Session } from "@supabase/supabase-js";
import { PaintStudio } from "./shadow-hunt-paint-studio";
import { createClient } from "@/lib/supabase/client";
import {
  type ShadowHuntRoom,
  type ShadowHuntPlayer,
  type ShadowHuntState,
  createShadowHuntRoom,
  joinShadowHuntRoom,
  startShadowHuntRound,
  submitShadowHuntTag,
  resolveShadowHuntTimeout,
  leaveShadowHuntRoom,
  ShadowHuntChannelManager,
} from "./shadow-hunt-mp";

type Phase = "ready" | "playing" | "won" | "found" | "caught" | "lost";
type Role = "hider" | "seeker";
type GameMode = "solo" | "mp";

const PALETTE = [{ color: "white", label: "Ivory" }, ...ZONES] as const;
const BRUSH_CURSOR = "cursor-[url('data:image/svg+xml,%3Csvg%20xmlns=%22http://www.w3.org/2000/svg%22%20width=%2224%22%20height=%2224%22%20viewBox=%220%200%2024%2024%22%3E%3Cpath%20d=%22M3%2020c0-4%202-6%205-5l9-11c2-2%205%200%203%202L10%2017c0%203-3%204-7%203Z%22%20fill=%22%23f7c56d%22%20stroke=%22%2316100d%22%20stroke-width=%222%22/%3E%3C/svg%3E')_3_20,crosshair]";
const ROUND_SECONDS = 70;
const HEAD_START = 12;
const SEEKER_COUNTDOWN = 4;
const DEFAULT_PITCH = 0.14;
const PAINT_PITCH = 0.32;
const CHASE_RADIUS = 4.65;
const PAINT_RADIUS = 3.95;
const HIDER_SCALE = 0.83;
const SEEKER_SCALE = 1.08;
const PROP_RANGE = 3.15;
const PROP_SETTLE_MS = 700;
const PROP_CATEGORIES = ["Furniture", "Decorations", "Paintings", "Plants", "Household Objects"] as const;
type Disguise = { source: MapProp; mesh: THREE.Group; yaw: number; frozen: boolean; stillSince: number; hitHeight: number };
const TAG_RANGE = 12;
const TAG_COOLDOWN = 520;
const HEAD_HEIGHT = 1.94;
const POSES = [
  { id: "stand", label: "Stand", icon: "M12 8v7m-4-5 4-2 4 2m-4 5-3 5m3-5 3 5" },
  { id: "sit", label: "Sit", icon: "M12 8v7l6 1v4m-6-5-4 2-2 3m6-10 5 4m-5-4-4 4" },
  { id: "curl", label: "Curl", icon: "M12 8l-5 6 5 5 6-2m-6-8 4 5-6 2m2 3 4-6 3 6" },
  { id: "lie", label: "Lie down", icon: "M8 13h8l5 2m-5-2 5-2m-10 2 3-4m-3 4 3 4" },
  { id: "reach", label: "Reach up", icon: "M12 9v7m0-7L7 5V2m5 7 5-4V2m-5 14-3 5m3-5 3 5" },
] as const;
type Pose = typeof POSES[number]["id"];
const POSE_SHAPES: Record<Pose, { height: number; tilt: number; legs: number; arms: number; spread: number; bend: number }> = {
  stand: { height: 0, tilt: 0, legs: 0, arms: 0, spread: 0.17, bend: 0.12 },
  sit: { height: -0.43, tilt: -0.12, legs: -1.18, arms: -0.41, spread: 0.18, bend: 0.7 },
  curl: { height: -0.4, tilt: 0.55, legs: -0.95, arms: -0.9, spread: 0.13, bend: 1 },
  lie: { height: 0.32, tilt: -Math.PI / 2, legs: 0, arms: -0.13, spread: 0.23, bend: 0.15 },
  reach: { height: 0, tilt: -0.04, legs: 0, arms: -2.83, spread: 0.26, bend: 0.42 },
};
const BRUSH_COLORS = ["#fffaf3", "#25221f", "#bd5147", "#e4a84c", "#63865b", "#4b80ad", "#855994"];
const BRUSH_TYPES: BrushSettings["brush"][] = ["Hard", "Soft", "Spray", "Eraser"];
const DEFAULT_BRUSH: BrushSettings = { brush: "Hard", color: "#fffaf3", size: 26, opacity: 100, brightness: 100 };

function wheelColor(event: ReactPointerEvent<HTMLDivElement>) {
  const rect = event.currentTarget.getBoundingClientRect();
  const x = (event.clientX - rect.left - rect.width / 2) / (rect.width / 2);
  const y = (event.clientY - rect.top - rect.height / 2) / (rect.height / 2);
  const hue = ((Math.atan2(x, -y) / (2 * Math.PI)) + 1) % 1;
  const radius = Math.min(1, Math.hypot(x, y));
  return "#" + new THREE.Color().setHSL(hue, 1, 1 - radius / 2, THREE.SRGBColorSpace).getHexString();
}

function wheelMarker(hex: string) {
  const color = new THREE.Color(hex);
  const { h } = color.getHSL({ h: 0, s: 0, l: 0 }, THREE.SRGBColorSpace);
  const { r, g, b } = color.getRGB({ r: 0, g: 0, b: 0 }, THREE.SRGBColorSpace);
  const max = Math.max(r, g, b);
  const angle = h * Math.PI * 2;
  const radius = max > 0 ? (1 - Math.min(r, g, b) / max) * 46 : 0;
  return { left: `${50 + Math.sin(angle) * radius}%`, top: `${50 - Math.cos(angle) * radius}%` };
}
const BOT_SPOTS = [
  { prop: "gallery bench", x: 4.9, z: 1.4, yaw: 0 },
  { prop: "framed-art-west", x: -4.65, z: -3.1, yaw: 0 },
  { prop: "reading chair", x: -16.3, z: 0, yaw: 0.4 },
  { prop: "crate-east", x: 16.4, z: -0.55, yaw: 0 },
  { prop: "reading lamp", x: -16.65, z: -14.35, yaw: 0 },
  { prop: "potted palm", x: -5.9, z: -15.55, yaw: 0 },
  { prop: "dining planter", x: 16.3, z: -10.7, yaw: 0 },
];
const PATROL = [
  new THREE.Vector3(-14, 0, 1.4),
  new THREE.Vector3(-14, 0, -11.5),
  new THREE.Vector3(0, 0, -11.5),
  new THREE.Vector3(14, 0, -11.5),
  new THREE.Vector3(14, 0, 1.4),
  new THREE.Vector3(0, 0, 1.4),
];

interface RemotePlayerRecord {
  userId: string;
  displayName: string;
  role: Role;
  isAlive: boolean;
  model: THREE.Group;
  character: ReturnType<typeof makeCharacter>;
  propMesh?: THREE.Group | null;
  currentPropId?: string | null;
  targetPos: THREE.Vector3;
  targetYaw: number;
  targetGait: number;
  climbing: boolean;
  targetPropYaw: number;
  targetFrozen: boolean;
  paint: Paint;
  lastSeen: number;
}

// Round a subdivided cube into a capsule. Keep BoxGeometry's six face groups
// and UVs so existing paintings still map to the same sides.
function toyCapsule(width: number, height: number, depth: number) {
  const geometry = new THREE.BoxGeometry(width, height, depth, 16, 24, 16);
  const position = geometry.getAttribute("position");
  const normal = geometry.getAttribute("normal");
  const radius = width / 2;
  const axial = Math.max(0, height / 2 - radius);
  const depthScale = depth / width;
  const direction = new THREE.Vector3();
  const smoothNormal = new THREE.Vector3();
  for (let i = 0; i < position.count; i++) {
    const y = position.getY(i);
    const center = THREE.MathUtils.clamp(y, -axial, axial);
    direction.set(position.getX(i), y - center, position.getZ(i) / depthScale).normalize();
    position.setXYZ(i, direction.x * radius, center + direction.y * radius, direction.z * radius * depthScale);
    smoothNormal.set(direction.x, direction.y, direction.z / depthScale).normalize();
    normal.setXYZ(i, smoothNormal.x, smoothNormal.y, smoothNormal.z);
  }
  return geometry;
}

function makeCharacter(paint: Paint, seeker = false) {
  const group = new THREE.Group();
  const bodyMaterial = new THREE.MeshStandardMaterial({
    color: seeker ? 0x493934 : paint === "white" ? 0xfffaf3 : COLORS[paint],
    roughness: 0.7,
    metalness: 0,
  });
  const darkMetal = new THREE.MeshStandardMaterial({ color: 0x1f1f23, roughness: 0.4, metalness: 0.6 });
  const trim = new THREE.MeshStandardMaterial({
    color: seeker ? 0xeb5e28 : 0x2b211a,
    roughness: 0.35,
    metalness: seeker ? 0.4 : 0.1,
  });
  const head = new THREE.Mesh(new THREE.SphereGeometry(0.445, 48, 32), bodyMaterial);
  head.scale.set(1, 1.04, 0.98);
  head.position.y = HEAD_HEIGHT;
  head.castShadow = true;
  group.add(head);

  if (seeker) {
    const visor = new THREE.Mesh(
      new THREE.BoxGeometry(0.38, 0.11, 0.22),
      new THREE.MeshStandardMaterial({ color: 0xff3b1d, emissive: 0xff3b1d, emissiveIntensity: 1.2, roughness: 0.18 })
    );
    visor.position.set(0, 0.035, 0.445);
    head.add(visor);
    const brow = new THREE.Mesh(new THREE.BoxGeometry(0.42, 0.08, 0.26), trim);
    brow.position.set(0, 0.127, 0.405);
    head.add(brow);
  }

  const torso = new THREE.Mesh(toyCapsule(0.79, 1.13, 0.59), bodyMaterial);
  torso.position.y = 1.085;
  torso.castShadow = true;
  torso.receiveShadow = true;
  group.add(torso);

  const armGeom = toyCapsule(0.322, 0.89, 0.33);
  armGeom.translate(0, -0.285, 0);
  const armPositions = armGeom.getAttribute("position");
  const armNormals = armGeom.getAttribute("normal");
  const bentPositions = new Float32Array(armPositions.count * 3);
  const bentNormals = new Float32Array(armNormals.count * 3);
  for (let i = 0; i < armPositions.count; i++) {
    const y = armPositions.getY(i), z = armPositions.getZ(i);
    const offset = Math.max(0, -y - 0.25);
    const angle = Math.min(1, offset * 2.7);
    const sin = Math.sin(angle), cos = Math.cos(angle);
    bentPositions.set([armPositions.getX(i), y + offset * (1 - cos) + z * sin, z * cos + offset * sin], i * 3);
    bentNormals.set([armNormals.getX(i), armNormals.getY(i) * cos + armNormals.getZ(i) * sin,
      armNormals.getZ(i) * cos - armNormals.getY(i) * sin], i * 3);
  }
  armGeom.morphAttributes.position = [new THREE.BufferAttribute(bentPositions, 3)];
  armGeom.morphAttributes.normal = [new THREE.BufferAttribute(bentNormals, 3)];
  const leftArm = new THREE.Mesh(armGeom, bodyMaterial);
  leftArm.position.set(-0.352, 1.38, 0);
  leftArm.rotation.z = -0.17;
  leftArm.castShadow = true;
  const rightArm = new THREE.Mesh(armGeom, bodyMaterial);
  rightArm.position.set(0.352, 1.38, 0);
  rightArm.rotation.z = 0.17;
  rightArm.castShadow = true;
  group.add(leftArm, rightArm);
  const arms: THREE.Mesh[] = [leftArm, rightArm];

  const legGeom = toyCapsule(0.365, 0.89, 0.395);
  legGeom.translate(0, -0.235, 0);
  const leftLeg = new THREE.Mesh(legGeom, bodyMaterial);
  leftLeg.position.set(-0.19, 0.68, 0.02);
  leftLeg.castShadow = true;
  const rightLeg = new THREE.Mesh(legGeom, bodyMaterial);
  rightLeg.position.set(0.19, 0.68, 0.02);
  rightLeg.castShadow = true;
  group.add(leftLeg, rightLeg);
  const legs: THREE.Mesh[] = [leftLeg, rightLeg];

  if (seeker) {
    const blaster = new THREE.Group();
    blaster.position.set(0.38, 0.98, 0.28);
    const shell = new THREE.Mesh(new THREE.BoxGeometry(0.12, 0.16, 0.52), darkMetal);
    shell.castShadow = true;
    const tip = new THREE.Mesh(
      new THREE.CylinderGeometry(0.045, 0.055, 0.14, 12),
      new THREE.MeshStandardMaterial({ color: 0xff4d29, emissive: 0xff4d29, emissiveIntensity: 1.5 })
    );
    tip.rotation.x = Math.PI / 2;
    tip.position.set(0, 0.015, 0.32);
    const grip = new THREE.Mesh(new THREE.BoxGeometry(0.09, 0.22, 0.1), trim);
    grip.position.set(0, -0.12, -0.06);
    const powerCell = new THREE.Mesh(
      new THREE.CylinderGeometry(0.038, 0.038, 0.22, 10),
      new THREE.MeshStandardMaterial({ color: 0x8cffe7, emissive: 0x8cffe7, emissiveIntensity: 1.1 })
    );
    powerCell.rotation.z = Math.PI / 2;
    powerCell.position.set(0, 0.085, 0.31);
    blaster.add(shell, tip, grip, powerCell);
    group.add(blaster);
  }
  group.userData.bodyMaterial = bodyMaterial;
  group.scale.setScalar(seeker ? SEEKER_SCALE : HIDER_SCALE);
  return { group, arms, legs, head, torso, seeker };
}

const createStudioCharacter = () => {
  const { group } = makeCharacter("white");
  group.scale.setScalar(1);
  return group;
};

export function HideAndSeekGame({
  onExit,
  currentUser,
}: {
  onExit: () => void;
  currentUser?: {
    id: string;
    name: string;
    email?: string;
    avatar?: string;
  };
}) {
  const mount = useRef<HTMLDivElement>(null);
  const keys = useRef(new Set<string>());
  const touchDirections = useRef(new Map<number, string>());
  const motion = useRef(newMotion());
  const jumpUntil = useRef(0);
  const climbRequested = useRef(false);
  const wallGrip = useRef<WallClimb | null>(null);
  const [climbHint, setClimbHint] = useState<"near" | "grip" | null>(null);
  const view = useRef({ yaw: 0, pitch: DEFAULT_PITCH });
  const drag = useRef<{ id: number; x: number; y: number; distance: number } | null>(null);
  const player = useRef<THREE.Group | null>(null);
  const seeker = useRef<THREE.Group | null>(null);
  const avatar = useRef<THREE.Group | null>(null);
  const avatarPaint = useRef<ReturnType<typeof makePaintSurfaces> | null>(null);
  const [brushOn, setBrushOn] = useState(false);
  const brushEnabled = useRef(false);
  const brushSettings = useRef<BrushSettings>(DEFAULT_BRUSH);
  const [paintControls, setPaintControls] = useState(DEFAULT_BRUSH);
  const [eyedropper, setEyedropper] = useState(false);
  const eyedropperOnly = useRef(false);
  const [poseOpen, setPoseOpen] = useState(false);
  const [selectedPose, setSelectedPose] = useState<Pose>("stand");
  const poseChoice = useRef<Pose>("stand");
  const paintZoom = useRef(PAINT_RADIUS);
  const paintView = useRef({ yaw: 0, pitch: PAINT_PITCH });
  const brushCamouflage = useRef<Paint>("white");
  const sampledCamouflage = useRef<{ hex: string; zone: Paint } | null>(null);
  const brushDot = useRef<HTMLSpanElement>(null);
  const brushDotUntil = useRef(0);
  const brushPointer = useRef<{ id: number; x: number; y: number } | null>(null);
  const brushAction = useRef<((x: number, y: number, endX?: number, endY?: number) => "paint" | "sample" | undefined) | null>(null);
  const brushBackup = useRef<(() => void) | null>(null);
  const backupTimer = useRef<number | undefined>(undefined);
  const roundDraft = useRef<{ owner: string | null; design: PaintDesign } | null>(null);
  const [studioOpen, setStudioOpen] = useState(false);
  const changeBrush = (settings: Partial<BrushSettings>) => {
    brushSettings.current = { ...brushSettings.current, ...settings };
    setPaintControls(brushSettings.current);
  };
  const selectPose = useCallback((pose: Pose) => {
    poseChoice.current = pose;
    setSelectedPose(pose);
    setPoseOpen(false);
  }, []);
  const switchRole = useRef<((role: Role) => number) | null>(null);
  const mapProps = useRef<MapProp[]>([]);
  const disguise = useRef<Disguise | null>(null);
  const seekerReleaseAt = useRef(0);
  const aim = useRef(new THREE.Vector2());
  const aimDot = useRef<HTMLSpanElement>(null);
  const fireRequested = useRef(false);
  const audio = useRef<AudioContext | null>(null);
  const state = useRef({ phase: "ready" as Phase, role: "hider" as Role, paint: "white" as Paint, hidden: "" });

  // Game UI State
  const [phase, setPhase] = useState<Phase>("ready");
  const [role, setRole] = useState<Role>("hider");
  const [hidersLeft, setHidersLeft] = useState(1);
  const [totalHiders, setTotalHiders] = useState(1);
  const [shotFeedback, setShotFeedback] = useState("");
  const [feedbackTier, setFeedbackTier] = useState<"hit" | "blocked" | "range" | "miss">("miss");
  const [paint, setPaint] = useState<Paint>("white");
  const [hidden, setHidden] = useState("");
  const [remaining, setRemaining] = useState(ROUND_SECONDS);
  const [room, setRoom] = useState<ReturnType<typeof roomAt>>("Gallery");
  const [running, setRunning] = useState(false);
  const [nearbyProps, setNearbyProps] = useState<MapProp[]>([]);
  const [propName, setPropName] = useState("");
  const [frozen, setFrozen] = useState(false);
  const [propDegrees, setPropDegrees] = useState(0);
  const [propNotice, setPropNotice] = useState("");
  const [blasterCharge, setBlasterCharge] = useState(100);

  // Phase 7 Lobby Settings & Polish State
  const [gameMode, setGameMode] = useState<GameMode>("solo");
  const [roundDuration, setRoundDuration] = useState(70);
  const [headStartSec, setHeadStartSec] = useState(12);
  const [isGuestReady, setIsGuestReady] = useState(false);
  const [showControlsGuide, setShowControlsGuide] = useState(false);
  const [matchElapsed, setMatchElapsed] = useState(0);

  // Multiplayer Room State
  const [mpRoom, setMpRoom] = useState<ShadowHuntRoom | null>(null);
  const [mpPlayers, setMpPlayers] = useState<ShadowHuntPlayer[]>([]);
  const [mpJoinCode, setMpJoinCode] = useState("");
  const [mpLoading, setMpLoading] = useState(false);
  const [mpError, setMpError] = useState("");
  const [mpCopied, setMpCopied] = useState(false);
  const [currentUserId, setCurrentUserId] = useState("");

  // References for Three.js scene & multiplayer sync
  const sceneRef = useRef<THREE.Scene | null>(null);
  const channelManager = useRef<ShadowHuntChannelManager | null>(null);
  const remotePlayersRef = useRef<Map<string, RemotePlayerRecord>>(new Map());
  const localUserId = useRef<string>("");
  const lastShotTimestamp = useRef<number>(0);
  const supabase = createClient();

  // Resolve consistent local user ID for multiplayer
  useEffect(() => {
    supabase.auth.getSession().then(({ data }: any) => {
      let resolvedId = "";
      if (data?.session?.user?.id) {
        resolvedId = data.session.user.id;
      } else if (currentUser?.id) {
        resolvedId = currentUser.id;
      } else {
        const stored = sessionStorage.getItem("shadow_hunt_uid");
        if (stored) {
          resolvedId = stored;
        } else {
          resolvedId = crypto.randomUUID ? crypto.randomUUID() : `guest-${Date.now()}`;
          sessionStorage.setItem("shadow_hunt_uid", resolvedId);
        }
      }
      localUserId.current = resolvedId;
      setCurrentUserId(resolvedId);
    });
  }, [currentUser, supabase]);

  useEffect(() => {
    state.current.phase = phase;
    state.current.paint = paint;
    state.current.hidden = hidden;
  }, [phase, paint, hidden]);

  // Clean up remote player meshes
  const clearRemotePlayers = useCallback(() => {
    remotePlayersRef.current.forEach(remote => {
      remote.model.removeFromParent();
    });
    remotePlayersRef.current.clear();
  }, []);

  // Set up Three.js World
  useEffect(() => {
    if (!mount.current) return;
    const host = mount.current;
    const scene = new THREE.Scene();
    sceneRef.current = scene;
    scene.background = new THREE.Color(0x20130e);
    scene.fog = new THREE.FogExp2(0x2a1810, 0.016);
    const camera = new THREE.PerspectiveCamera(53, 1, 0.1, 80);
    const renderer = new THREE.WebGLRenderer({ antialias: true, powerPreference: "low-power" });
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 1.65));
    renderer.shadowMap.enabled = true;
    renderer.shadowMap.type = THREE.PCFShadowMap;
    renderer.toneMapping = THREE.ACESFilmicToneMapping;
    renderer.toneMappingExposure = 1.24;
    host.appendChild(renderer.domElement);
    scene.add(new THREE.HemisphereLight(0xffefd7, 0x96694c, 1.75));
    const sun = new THREE.DirectionalLight(0xffdbac, 2.1);
    sun.position.set(-5, 13, 3);
    sun.castShadow = true;
    sun.shadow.mapSize.set(2048, 2048);
    sun.shadow.camera.near = 0.5;
    sun.shadow.camera.far = 40;
    const span = 25;
    sun.shadow.camera.left = -span;
    sun.shadow.camera.right = span;
    sun.shadow.camera.top = span;
    sun.shadow.camera.bottom = -span;
    sun.shadow.bias = -0.0004;
    scene.add(sun);
    const { props } = furnishRoom(scene, true);
    const scenery: THREE.Mesh[] = [];
    scene.traverse(object => { if (object instanceof THREE.Mesh) scenery.push(object); });
    scene.updateMatrixWorld(true);
    mapProps.current = props;
    const me = new THREE.Group();
    me.position.set(0, 0, 3.7);
    const hiderModel = makeCharacter("white");
    const seekerModel = makeCharacter("white", true);
    seekerModel.group.visible = false;
    avatar.current = hiderModel.group;
    let paintGeneration = 0;
    const applySavedPaint = (design: PaintDesign) => {
      if (avatar.current !== hiderModel.group) return;
      if (!Object.keys(design).length && !avatarPaint.current) return;
      avatarPaint.current ??= makePaintSurfaces(hiderModel.group);
      void avatarPaint.current.load(design);
    };
    let paintOwner: string | null | undefined;
    let paintedHere = false;
    brushBackup.current = () => {
      if (paintOwner === undefined || !avatarPaint.current || !paintedHere) return;
      const design = Object.fromEntries(avatarPaint.current.surfaces.map(part =>
        [part.id, part.layer.toDataURL("image/png")]));
      roundDraft.current = { owner: paintOwner, design };
      try { localStorage.setItem(paintBackupKey(paintOwner), JSON.stringify(design)); }
      catch { /* Keep the current design in memory if storage is full. */ }
    };
    const restoreActive = async (id: string | null) => {
      if (avatar.current !== hiderModel.group || paintOwner === id) return;
      window.clearTimeout(backupTimer.current);
      brushBackup.current?.();
      paintOwner = id;
      paintedHere = false;
      const request = ++paintGeneration;
      if (roundDraft.current?.owner === id) { applySavedPaint(roundDraft.current.design); return; }
      if (!id) { applySavedPaint(readPaintDesign()); return; }
      applySavedPaint({});
      try {
        const row = await activePainting(id);
        const design = row ? await loadPainting(row) : {};
        if (request === paintGeneration && !paintedHere) applySavedPaint(design);
      } catch { /* Cloud errors are shown in Paint Studio. */ }
    };
    const paintAuth = supabase.auth.onAuthStateChange((_event: AuthChangeEvent, session: Session | null) => {
      window.setTimeout(() => { void restoreActive(session?.user.id ?? null); }, 0);
    }).data.subscription;
    me.add(hiderModel.group, seekerModel.group);
    scene.add(me);
    player.current = me;
    const hunter = new THREE.Group();
    hunter.position.set(-7, 0, 2.7);
    const hunterModel = makeCharacter("white", true);
    hunter.add(hunterModel.group);
    scene.add(hunter);
    seeker.current = hunter;
    const bots: { id: number; model: THREE.Object3D }[] = [];
    const castTag = createTagRaycast((scene.userData.blockers as THREE.Mesh[] | undefined) ?? scenery);
    const cameraRay = new THREE.Raycaster();
    const cameraObstacles = scenery.filter(mesh => {
      const bounds = new THREE.Box3().setFromObject(mesh);
      return bounds.max.y - bounds.min.y > 0.22;
    });
    const brushRay = new THREE.Raycaster();
    const coordinates = new THREE.Vector2();
    const environment = new Set(scenery);
    const visible = (object: THREE.Object3D): boolean => object.visible && (!object.parent || visible(object.parent));
    brushAction.current = (x, y, endX, endY) => {
      if (!brushEnabled.current || state.current.phase !== "playing" || state.current.role !== "hider" ||
          !hiderModel.group.visible || disguise.current || paintOwner === undefined) return;
      const bounds = host.getBoundingClientRect();
      if (!bounds.width || !bounds.height) return;
      const own = new Set<THREE.Mesh>();
      hiderModel.group.traverseVisible(object => { if (object instanceof THREE.Mesh) own.add(object); });
      const surfaces = [...scenery.filter(visible), ...own];
      const occluders = [hunter, ...bots.map(bot => bot.model), ...Array.from(remotePlayersRef.current.values(), remote => remote.model)];
      occluders.forEach(group => group.traverseVisible(object => {
        if (object instanceof THREE.Mesh) surfaces.push(object);
      }));
      const find = (px: number, py: number) => {
        coordinates.set((px - bounds.left) / bounds.width * 2 - 1, 1 - (py - bounds.top) / bounds.height * 2);
        brushRay.setFromCamera(coordinates, camera);
        return brushRay.intersectObjects<THREE.Mesh>(surfaces, false)[0];
      };
      const hit = endX === undefined ? find(x, y) : undefined;
      if (endX === undefined && endY === undefined && hit && environment.has(hit.object)) {
        const sampled = sampleSurface(hit);
        if (sampled) {
          const zone = ZONES.find(item => item.color === hit.object.userData.camouflageZone);
          sampledCamouflage.current = zone ? { hex: sampled.hex, zone: zone.color } : null;
          brushSettings.current = { ...brushSettings.current, color: sampled.hex, brightness: 100 };
          setPaintControls(brushSettings.current);
          eyedropperOnly.current = false;
          setEyedropper(false);
          brushDotUntil.current = performance.now() + 1250;
          if (brushDot.current) brushDot.current.style.backgroundColor = sampled.hex;
          return "sample";
        }
      }
      if (eyedropperOnly.current || (endX === undefined && (!hit?.uv || !own.has(hit.object)))) return;
      avatarPaint.current ??= makePaintSurfaces(hiderModel.group);
      const parts = new Map(avatarPaint.current.surfaces.map(part => [part.mesh, part]));
      const changed = new Set<PaintSurface>();
      const config = brushSettings.current;
      const dx = (endX ?? x) - x, dy = (endY ?? y) - y;
      const steps = Math.min(96, Math.max(1, Math.ceil(Math.hypot(dx, dy) / 2)));
      for (let step = 1; step <= steps; step++) {
        const point = find(x + dx * step / steps, y + dy * step / steps);
        const part = point?.uv && parts.get(point.object);
        if (!part || !point?.uv) continue;
        paintDab(part, point.uv, config);
        changed.add(part);
      }
      if (!changed.size) return;
      changed.forEach(part => part.refresh());
      paintedHere = true;
      const sampled = sampledCamouflage.current;
      brushCamouflage.current = config.brush === "Eraser" || config.brightness !== 100 ? "white"
        : sampled?.hex === config.color ? sampled.zone
        : PALETTE.find(({ color }) => COLORS[color] === Number.parseInt(config.color.slice(1), 16))?.color ?? "white";
      window.clearTimeout(backupTimer.current);
      backupTimer.current = window.setTimeout(() => brushBackup.current?.(), 750);
      return "paint";
    };
    const tagFlash = new THREE.Mesh(
      new THREE.CylinderGeometry(0.045, 0.045, 1, 10),
      new THREE.MeshBasicMaterial({ color: 0x8cffe7, transparent: true, opacity: 0 })
    );
    scene.add(tagFlash);
    const impact = new THREE.Mesh(
      new THREE.SphereGeometry(0.18, 12, 10),
      new THREE.MeshBasicMaterial({ color: 0x8cffe7, transparent: true, opacity: 0 })
    );
    scene.add(impact);
    const screenRay = new THREE.Raycaster();
    const shotOrigin = new THREE.Vector3();
    const shotDirection = new THREE.Vector3();
    const flashStart = new THREE.Vector3();
    const flashEnd = new THREE.Vector3();
    const flashAxis = new THREE.Vector3(0, 1, 0);
    let nextShot = 0, feedbackUntil = 0;

    const playTagSound = (hit: boolean) => {
      const ctx = audio.current;
      if (!ctx || ctx.state !== "running") return;
      try {
        const time = ctx.currentTime;
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();
        osc.type = hit ? "triangle" : "sawtooth";
        osc.frequency.setValueAtTime(hit ? 580 : 320, time);
        osc.frequency.exponentialRampToValueAtTime(hit ? 920 : 180, time + (hit ? 0.22 : 0.16));
        gain.gain.setValueAtTime(0.24, time);
        gain.gain.exponentialRampToValueAtTime(0.0001, time + (hit ? 0.24 : 0.18));
        osc.connect(gain);
        gain.connect(ctx.destination);
        osc.start(time);
        osc.stop(time + (hit ? 0.25 : 0.19));
      } catch { /* Silent */ }
    };

    const showTag = (from: THREE.Vector3, to: THREE.Vector3, hit: boolean, surface: boolean) => {
      const length = Math.max(0.1, from.distanceTo(to));
      tagFlash.position.copy(from).lerp(to, 0.5);
      tagFlash.scale.y = length;
      tagFlash.quaternion.setFromUnitVectors(flashAxis, flashEnd.copy(to).sub(from).normalize());
      tagFlash.material.color.setHex(hit ? 0x8cffe7 : 0xffbd68);
      tagFlash.material.opacity = 0.95;
      impact.position.copy(to);
      impact.material.color.copy(tagFlash.material.color);
      impact.material.opacity = surface ? 0.92 : 0;
      playTagSound(hit);
    };

    switchRole.current = nextRole => {
      for (const bot of bots) bot.model.removeFromParent();
      bots.length = 0;
      hiderModel.group.visible = nextRole === "hider";
      seekerModel.group.visible = nextRole === "seeker";
      hunter.visible = gameMode === "solo" && nextRole === "hider";
      nextShot = 0;
      feedbackUntil = 0;
      tagFlash.material.opacity = 0;
      impact.material.opacity = 0;
      if (nextRole === "hider" || gameMode === "mp") return 1;
      const placements = [BOT_SPOTS[Math.floor(Math.random() * 2)], BOT_SPOTS[2 + Math.floor(Math.random() * (BOT_SPOTS.length - 2))]];
      for (const placement of placements) {
        const source = props.find(p => p.id === placement.prop);
        if (!source || !canOccupy(placement.x, placement.z, 0.38, 0, propFootprint(source, placement.yaw))) continue;
        const model = source.model.clone(true);
        model.position.set(placement.x, 0, placement.z);
        model.rotation.y = placement.yaw;
        scene.add(model);
        bots.push({ id: bots.length + 1, model });
      }
      return bots.length;
    };

    const resize = () => {
      const width = host.clientWidth, height = host.clientHeight;
      if (!width || !height) return;
      camera.aspect = width / height;
      camera.updateProjectionMatrix();
      renderer.setSize(width, height);
    };
    const observer = new ResizeObserver(resize);
    observer.observe(host);
    resize();

    let lastFrame = performance.now(), frame = 0, tagTime = 0;
    let patrolIndex = 0, nextRouteAt = 0, waypoint: { x: number; z: number } = PATROL[0];
    let activeRoom = roomAt(me.position.x, me.position.z);
    let activeClimbHint: "near" | "grip" | null = null;
    let nextPropScan = 0, propListKey = "";
    let isRunning = false;
    let cameraYaw = 0, cameraPitch = DEFAULT_PITCH, cameraRadius = CHASE_RADIUS, shoulder = 0.56;
    let movementYaw: number | null = null;
    const cameraTarget = new THREE.Vector3(0, 1.05, me.position.z - 0.4);
    const cameraAnchor = new THREE.Vector3();
    const cameraOffset = new THREE.Vector3();

    const moveOnFloor = (position: THREE.Vector3, x: number, z: number) => {
      if (canOccupy(position.x + x, position.z, 0.38, position.y, undefined, STAIR_STEP)) position.x += x;
      if (canOccupy(position.x, position.z + z, 0.38, position.y, undefined, STAIR_STEP)) position.z += z;
      position.y = groundHeight(position.x, position.z, undefined, position.y + STAIR_STEP + 0.001);
    };

    const poseStates = new WeakMap<THREE.Group, { cycle: number; airborne: boolean; landing: number }>();
    const animateStride = (model: ReturnType<typeof makeCharacter>, delta: number, gait: number, airborne = false, lean = 0, crouch = false, stance: Pose = "stand", climbing = false) => {
      let pose = poseStates.get(model.group);
      if (!pose) {
        pose = { cycle: 0, airborne, landing: 0 };
        poseStates.set(model.group, pose);
      }
      if (pose.airborne && !airborne) pose.landing = 1;
      pose.airborne = airborne;
      pose.landing *= Math.exp(-11 * delta);
      pose.cycle = (pose.cycle + delta * (4.5 + gait * 11)) % (Math.PI * 2);
      const stride = Math.sin(pose.cycle);
      const swing = stride * gait * 1.04;
      const bounce = Math.abs(stride) * gait * 0.095;
      const ease = 1 - Math.exp(-19 * delta);
      const move = THREE.MathUtils.lerp;
      const dip = pose.landing * 0.14 + (crouch ? 0.18 : 0);
      const shape = POSE_SHAPES[climbing ? "stand" : stance];
      model.group.position.y = move(model.group.position.y, bounce - dip + shape.height, ease);
      model.group.rotation.x = move(model.group.rotation.x, shape.tilt, ease);
      model.group.rotation.z = move(model.group.rotation.z, lean * 0.1 + Math.cos(pose.cycle) * gait * 0.045, ease);
      model.torso.scale.y = move(model.torso.scale.y, 1 - dip * 0.55, ease);
      model.torso.rotation.x = move(model.torso.rotation.x, airborne ? 0.12 : -gait * 0.13, ease);
      const breath = Math.sin(performance.now() * 0.0035);
      model.head.position.y = move(model.head.position.y, HEAD_HEIGHT + breath * 0.014 - pose.landing * 0.065, ease);
      model.head.rotation.x = move(model.head.rotation.x, -swing * 0.12 - (stance === "curl" ? 0.35 : 0), ease);
      model.head.rotation.z = move(model.head.rotation.z, -lean * 0.045, ease);
      model.legs[0].rotation.x = move(model.legs[0].rotation.x, climbing ? -0.28 + swing : airborne ? -0.48 : shape.legs + swing - pose.landing * 0.24, ease);
      model.legs[1].rotation.x = move(model.legs[1].rotation.x, climbing ? -0.28 - swing : airborne ? 0.52 : shape.legs - swing - pose.landing * 0.24, ease);
      if (!model.seeker) {
        model.arms.forEach((arm, index) => {
          const side = index === 0 ? -1 : 1;
          const armSwing = side * Math.sin(pose.cycle - 0.22) * gait * 0.97;
          arm.rotation.x = move(arm.rotation.x, climbing ? -2.42 + side * 0.12 + armSwing : airborne ? -0.49 + side * 0.18 : shape.arms + armSwing + breath * 0.035, ease);
          arm.rotation.z = move(arm.rotation.z, side * (airborne ? 0.55 : shape.spread + gait * 0.12) + lean * 0.06, ease);
          arm.rotation.y = move(arm.rotation.y, side * 0.1 + armSwing * 0.2, ease);
          const bend = arm.morphTargetInfluences;
          if (bend) bend[0] = move(bend[0], airborne ? 0.75 : Math.min(1, shape.bend + gait * 0.65 - armSwing * 0.35), ease);
        });
      }
    };

    const animate = () => {
      frame = requestAnimationFrame(animate);
      const now = performance.now();
      const delta = Math.min((now - lastFrame) / 1000, 0.05);
      lastFrame = now;
      tagFlash.material.opacity = Math.max(0, tagFlash.material.opacity - delta * 2.8);
      impact.material.opacity = Math.max(0, impact.material.opacity - delta * 4.8);

      // Phase 7: Calculate Blaster Recharge percentage
      if (lastShotTimestamp.current > 0) {
        const elapsedSinceShot = now - lastShotTimestamp.current;
        const charge = Math.min(100, Math.round((elapsedSinceShot / TAG_COOLDOWN) * 100));
        setBlasterCharge(charge);
      }

      if (feedbackUntil && now >= feedbackUntil) {
        feedbackUntil = 0;
        setShotFeedback("");
      }

      if (state.current.phase === "playing") {
        const seeking = state.current.role === "seeker";
        const activeProp = disguise.current;
        const touch = touchDirections.current.size ? new Set(touchDirections.current.values()) : null;
        const pressed = (key: string) => keys.current.has(key) || (touch?.has(key) ?? false);
        const dx = activeProp?.frozen ? 0 : Number(pressed("d") || pressed("arrowright")) - Number(pressed("a") || pressed("arrowleft"));
        const dz = activeProp?.frozen ? 0 : Number(pressed("s") || pressed("arrowdown")) - Number(pressed("w") || pressed("arrowup"));
        const crouch = !activeProp && pressed("control");
        const run = pressed("shift") && !crouch;
        const wall = !seeking && !activeProp ? nearbyWallClimb(me.position.x, me.position.z) : undefined;
        if (climbRequested.current || activeProp || seeking) {
          if (wallGrip.current || activeProp || seeking) wallGrip.current = null;
          else if (wall && me.position.y < wall.top) {
            wallGrip.current = wall;
            view.current.yaw = Math.PI;
            paintView.current.yaw = Math.PI;
          }
          climbRequested.current = false;
        }
        if (wallGrip.current && jumpUntil.current > now) {
          wallGrip.current = null;
          jumpUntil.current = 0;
        }
        const grip = wallGrip.current;
        const hint = grip ? "grip" : wall && me.position.y < 0.8 ? "near" : null;
        if (hint !== activeClimbHint) {
          activeClimbHint = hint;
          setClimbHint(hint);
        }
        const jump = !activeProp?.frozen && jumpUntil.current > now && motion.current.grounded;
        if (jump) jumpUntil.current = 0;
        const followingMovement = !grip && !brushEnabled.current && !drag.current && !seeking;
        if (!followingMovement || (!dx && !dz)) movementYaw = null;
        else movementYaw ??= view.current.yaw;
        const inputYaw = movementYaw ?? view.current.yaw;
        const cos = Math.cos(inputYaw), sin = Math.sin(inputYaw);
        const climbSpeed = grip ? stepWallClimb(me.position, motion.current, grip, -dz, delta) : 0;
        const moved = grip ? { x: 0, z: 0 } : stepMotion(me.position, motion.current, {
          x: dx * cos + dz * sin,
          z: dz * cos - dx * sin,
          run,
          jump,
          crouch,
        }, delta, activeProp ? propFootprint(activeProp.source, activeProp.yaw) : undefined);
        const distanceMoved = Math.hypot(moved.x, moved.z);
        if (grip) {
          const turn = Math.atan2(Math.sin(-me.rotation.y), Math.cos(-me.rotation.y));
          me.rotation.y += turn * (1 - Math.exp(-20 * delta));
        } else if (distanceMoved > 0.0005) {
          const heading = Math.atan2(moved.x, moved.z);
          const turn = Math.atan2(Math.sin(heading - me.rotation.y), Math.cos(heading - me.rotation.y));
          if (!activeProp) me.rotation.y += turn * (1 - Math.exp(-20 * delta));
          if (followingMovement) view.current.yaw = heading + Math.PI;
        }
        const sprint = run && !!(dx || dz) && distanceMoved > WALK_SPEED * delta;
        if (sprint !== isRunning) {
          isRunning = sprint;
          setRunning(sprint);
        }
        const gait = grip ? Math.min(0.7, Math.abs(climbSpeed) * 0.24) : delta > 0 ? Math.min(0.7, (distanceMoved / delta) * 0.12) : 0;
        const playerModel = seeking ? seekerModel : hiderModel;
        if (poseChoice.current !== "stand" && (dx || dz || jump || activeProp || seeking)) selectPose("stand");
        animateStride(playerModel, delta, gait, !grip && !motion.current.grounded, grip ? 0 : dx,
          motion.current.grounded && crouch, poseChoice.current, !!grip);
        const still = grip ? Math.abs(climbSpeed) < 0.01
          : !dx && !dz && motion.current.grounded && Math.hypot(motion.current.vx, motion.current.vz) < 0.17;
        if (activeProp) {
          if (!still) activeProp.stillSince = now;
          activeProp.mesh.scale.setScalar(THREE.MathUtils.lerp(activeProp.mesh.scale.x, 1, 1 - Math.exp(-20 * delta)));
        }
        const isHidden = !seeking && still
          ? grip ? (grip.color === brushCamouflage.current ? grip.label : "")
            : activeProp ? (now - activeProp.stillSince >= PROP_SETTLE_MS ? activeProp.source.name : "")
            : matchingSpot(me.position.x, me.position.z, brushCamouflage.current, me.position.y)
          : "";
        if (isHidden !== state.current.hidden) {
          state.current.hidden = isHidden;
          setHidden(isHidden);
        }
        if (!seeking && now >= nextPropScan) {
          const currentRoomName = roomAt(me.position.x, me.position.z, me.position.y);
          const nearby = props
            .filter(prop => roomAt(prop.x, prop.z, prop.y ?? 0) === currentRoomName && distanceToProp(me.position.x, me.position.z, prop) <= PROP_RANGE)
            .sort((a, b) => distanceToProp(me.position.x, me.position.z, a) - distanceToProp(me.position.x, me.position.z, b));
          const key = nearby.map(prop => prop.id).join("|");
          if (key !== propListKey) {
            propListKey = key;
            setNearbyProps(nearby);
          }
          nextPropScan = now + 160;
        }

        // Multiplayer: Broadcast local pose
        if (gameMode === "mp" && channelManager.current) {
          channelManager.current.broadcastPose({
            x: me.position.x,
            y: me.position.y,
            z: me.position.z,
            yaw: me.rotation.y,
            velocity: Math.hypot(motion.current.vx, motion.current.vz),
            gait,
            climbing: !!grip,
            propId: activeProp ? activeProp.source.id : null,
            propYaw: activeProp ? activeProp.yaw : 0,
            frozen: activeProp ? activeProp.frozen : false,
            paint: state.current.paint,
          });
        }

        // Solo Mode: AI Hunter (Only in solo hider practice!)
        if (gameMode === "solo") {
          if (seeking || now < seekerReleaseAt.current) {
            tagTime = 0;
            nextRouteAt = 0;
          } else {
            const hiderDistance = Math.hypot(me.position.x - hunter.position.x, me.position.z - hunter.position.z);
            shotOrigin.copy(hunter.position);
            shotOrigin.y += 1.37;
            shotDirection.copy(me.position);
            shotDirection.y += activeProp?.hitHeight ?? 1.35 * HIDER_SCALE;
            shotDirection.sub(shotOrigin).normalize();
            const visible = hiderDistance < 2.5 &&
              castTag(shotOrigin, shotDirection, TAG_RANGE, [{ id: 0, model: me }]).targetId === 0;
            const closeEnough = !isHidden && visible && hiderDistance < 2.5 && Math.abs(me.position.y - hunter.position.y) < 1.35;
            tagTime = closeEnough ? tagTime + delta : 0;
            if (now >= nextRouteAt) {
              let target = isHidden ? PATROL[patrolIndex] : me.position;
              if (isHidden && Math.hypot(target.x - hunter.position.x, target.z - hunter.position.z) < 0.7) {
                patrolIndex = (patrolIndex + 1) % PATROL.length;
                target = PATROL[patrolIndex];
              }
              waypoint = findSeekerWaypoint(hunter.position.x, hunter.position.z, target.x, target.z);
              nextRouteAt = now + 340;
            }
            const target = closeEnough ? me.position : waypoint;
            const vx = target.x - hunter.position.x, vz = target.z - hunter.position.z;
            const distance = Math.hypot(vx, vz);
            if (distance > 0.15) {
              hunter.rotation.y = Math.atan2(vx, vz);
              if (!closeEnough) {
                const pace = Math.min(distance, (isHidden ? 1.35 : 1.85) * delta);
                moveOnFloor(hunter.position, (vx / distance) * pace, (vz / distance) * pace);
              }
            }
            animateStride(hunterModel, delta, closeEnough ? 0 : 0.38);
            if ((tagTime >= 0.6 || (visible && hunter.position.distanceTo(me.position) < 0.75)) && now >= nextShot) {
              nextShot = now + TAG_COOLDOWN;
              flashStart.set(0.21, 1.37, 1.23);
              hunter.localToWorld(flashStart);
              shotOrigin.set(0.21, 1.37, 0.34);
              hunter.localToWorld(shotOrigin);
              const height = activeProp?.hitHeight ?? 1.35 * HIDER_SCALE;
              shotDirection.set(me.position.x - shotOrigin.x, me.position.y + height - shotOrigin.y, me.position.z - shotOrigin.z).normalize();
              const hit = castTag(shotOrigin, shotDirection, TAG_RANGE, [{ id: 0, model: me }]);
              showTag(flashStart, hit.point, hit.targetId === 0, hit.hitSurface);
              if (hit.targetId === 0) {
                state.current.phase = "caught";
                setHidersLeft(0);
                setPhase("caught");
              }
            }
          }
        }
      }

      // Multiplayer: Smooth Remote Players Movement & Model Updates
      if (gameMode === "mp") {
        remotePlayersRef.current.forEach(remote => {
          if (!remote.isAlive) {
            remote.model.visible = false;
            return;
          }
          remote.model.visible = true;
          remote.model.position.lerp(remote.targetPos, 1 - Math.exp(-14 * delta));
          const turn = Math.atan2(Math.sin(remote.targetYaw - remote.model.rotation.y), Math.cos(remote.targetYaw - remote.model.rotation.y));
          remote.model.rotation.y += turn * (1 - Math.exp(-14 * delta));
          const { x, y, z } = remote.targetPos;
          animateStride(remote.character, delta, remote.targetGait,
            !remote.climbing && y > groundHeight(x, z, undefined, y + 0.01) + 0.08, 0, false, "stand", remote.climbing);

          if (remote.currentPropId !== remote.propMesh?.userData?.propId) {
            if (remote.propMesh) {
              remote.propMesh.removeFromParent();
              remote.propMesh = null;
            }
            if (remote.currentPropId) {
              const source = props.find(p => p.id === remote.currentPropId);
              if (source) {
                const cloned = source.model.clone(true);
                cloned.userData.propId = remote.currentPropId;
                remote.model.add(cloned);
                remote.propMesh = cloned;
                remote.character.group.visible = false;
              }
            } else {
              remote.character.group.visible = true;
            }
          }
          if (remote.propMesh) {
            remote.propMesh.rotation.y = remote.targetPropYaw;
          }
        });
      }

      const framing = THREE.MathUtils.clamp((1.1 - camera.aspect) * 4, 0, 3.5);
      const currentRoomName = roomAt(me.position.x, me.position.z, me.position.y);
      if (currentRoomName !== activeRoom) {
        activeRoom = currentRoomName;
        setRoom(currentRoomName);
      }
      const follow = 1 - Math.exp(-6 * delta);
      const closePaint = brushEnabled.current && state.current.phase === "playing" && state.current.role === "hider" && !disguise.current;
      const cameraView = closePaint ? paintView.current : view.current;
      const yawDelta = cameraView.yaw - cameraYaw;
      cameraYaw += Math.atan2(Math.sin(yawDelta), Math.cos(yawDelta)) * follow;
      cameraPitch = THREE.MathUtils.lerp(cameraPitch, cameraView.pitch, follow);
      const eyeHeight = state.current.role === "seeker" ? 1.78 : 1.39;
      const lowered = keys.current.has("control") ? 0.27 : 0;
      cameraTarget.x = me.position.x;
      cameraTarget.y = THREE.MathUtils.lerp(cameraTarget.y, me.position.y + (closePaint ? 0.98 : eyeHeight - lowered), follow);
      cameraTarget.z = me.position.z;
      cameraRadius = THREE.MathUtils.lerp(cameraRadius, closePaint ? paintZoom.current + framing * 0.45 : CHASE_RADIUS + framing * 0.24, follow);
      shoulder = THREE.MathUtils.lerp(shoulder, closePaint ? 0 : 0.56, follow);
      const horizontal = Math.cos(cameraPitch) * cameraRadius;
      const sinYaw = Math.sin(cameraYaw), cosYaw = Math.cos(cameraYaw);
      cameraAnchor.set(me.position.x, me.position.y + (closePaint ? 0.98 : eyeHeight - lowered), me.position.z);
      cameraOffset.set(cameraTarget.x + sinYaw * horizontal + cosYaw * shoulder,
        cameraTarget.y + Math.sin(cameraPitch) * cameraRadius,
        cameraTarget.z + cosYaw * horizontal - sinYaw * shoulder).sub(cameraAnchor);
      const cameraDistance = cameraOffset.length();
      cameraRay.set(cameraAnchor, cameraOffset.normalize());
      cameraRay.far = cameraDistance;
      const obstruction = cameraRay.intersectObjects(cameraObstacles, false)[0];
      const safeDistance = obstruction ? Math.max(0.04, obstruction.distance - 0.22) : cameraDistance;
      camera.position.copy(cameraAnchor).addScaledVector(cameraOffset, safeDistance);
      cameraTarget.x += cosYaw * shoulder * 0.8;
      cameraTarget.z -= sinYaw * shoulder * 0.8;
      camera.lookAt(cameraTarget);

      // Seeker Tag Fire
      if (fireRequested.current) {
        fireRequested.current = false;
        if (state.current.phase === "playing" && state.current.role === "seeker" &&
            now >= seekerReleaseAt.current && now >= nextShot) {
          nextShot = now + TAG_COOLDOWN;
          lastShotTimestamp.current = now;
          setBlasterCharge(0);
          camera.updateMatrixWorld();
          screenRay.setFromCamera(aim.current, camera);

          if (gameMode === "solo") {
            const aimedAt = castTag(screenRay.ray.origin, screenRay.ray.direction, 70, bots, true);
            const angle = Math.atan2(aimedAt.point.x - me.position.x, aimedAt.point.z - me.position.z);
            me.rotation.y = angle;
            shotOrigin.set(0.21, 1.37, 0.34);
            me.localToWorld(shotOrigin);
            flashStart.set(0.21, 1.37, 1.23);
            me.localToWorld(flashStart);
            shotDirection.copy(aimedAt.point).sub(shotOrigin).normalize();
            const hit = castTag(shotOrigin, shotDirection, TAG_RANGE, bots);
            const tagged = bots.findIndex(bot => bot.id === hit.targetId);
            showTag(flashStart, hit.point, tagged >= 0, hit.hitSurface);
            if (tagged >= 0) {
              bots[tagged].model.removeFromParent();
              bots.splice(tagged, 1);
              setHidersLeft(bots.length);
              setShotFeedback("Hider tagged!");
              setFeedbackTier("hit");
              if (!bots.length) {
                state.current.phase = "found";
                setPhase("found");
              }
            } else {
              if (aimedAt.targetId !== undefined) {
                if (shotOrigin.distanceTo(aimedAt.point) > TAG_RANGE) {
                  setShotFeedback("Out of range (>12m)");
                  setFeedbackTier("range");
                } else {
                  setShotFeedback("Shot blocked by obstacle");
                  setFeedbackTier("blocked");
                }
              } else {
                setShotFeedback(hit.hitSurface ? "No hider there" : "Missed!");
                setFeedbackTier("miss");
              }
            }
          } else {
            const remoteHiderTargets = Array.from(remotePlayersRef.current.values())
              .filter(p => p.role === "hider" && p.isAlive)
              .map((p, idx) => ({ id: idx + 1000, model: p.propMesh || p.model, userId: p.userId }));

            const aimedAt = castTag(screenRay.ray.origin, screenRay.ray.direction, 70, remoteHiderTargets, true);
            const angle = Math.atan2(aimedAt.point.x - me.position.x, aimedAt.point.z - me.position.z);
            me.rotation.y = angle;
            shotOrigin.set(0.21, 1.37, 0.34);
            me.localToWorld(shotOrigin);
            flashStart.set(0.21, 1.37, 1.23);
            me.localToWorld(flashStart);
            shotDirection.copy(aimedAt.point).sub(shotOrigin).normalize();
            const hit = castTag(shotOrigin, shotDirection, TAG_RANGE, remoteHiderTargets);
            const hitTarget = remoteHiderTargets.find(t => t.id === hit.targetId);

            showTag(flashStart, hit.point, !!hitTarget, hit.hitSurface);

            if (hitTarget && mpRoom) {
              const distance = shotOrigin.distanceTo(hit.point);
              submitShadowHuntTag(supabase, mpRoom.id, hitTarget.userId, distance)
                .then(updatedState => {
                  setShotFeedback("🎯 Hider Tagged!");
                  setFeedbackTier("hit");
                  setMpRoom(updatedState.room);
                  setMpPlayers(updatedState.players);
                  setHidersLeft(updatedState.room.alive_hiders);
                  if (updatedState.room.status === "finished") {
                    state.current.phase = "found";
                    setPhase("found");
                  }
                })
                .catch(err => {
                  setShotFeedback(err.message || "Tag rejected");
                  setFeedbackTier("miss");
                });
            } else {
              if (aimedAt.targetId !== undefined) {
                if (shotOrigin.distanceTo(aimedAt.point) > TAG_RANGE) {
                  setShotFeedback("Out of range (>12m)");
                  setFeedbackTier("range");
                } else {
                  setShotFeedback("Shot blocked by furniture");
                  setFeedbackTier("blocked");
                }
              } else {
                setShotFeedback(hit.hitSurface ? "No hider there" : "Missed!");
                setFeedbackTier("miss");
              }
            }
          }
          feedbackUntil = now + 1250;
        }
      }
      if (brushDot.current && now >= brushDotUntil.current) brushDot.current.style.opacity = "0";
      renderer.render(scene, camera);
    };
    animate();

    return () => {
      cancelAnimationFrame(frame);
      observer.disconnect();
      renderer.domElement.remove();
      paintAuth.unsubscribe();
      paintGeneration++;
      window.clearTimeout(backupTimer.current);
      brushBackup.current?.();
      brushBackup.current = null;
      brushAction.current = null;
      brushPointer.current = null;
      avatarPaint.current?.dispose();
      avatarPaint.current = null;
      const materials = new Set<THREE.Material>();
      scene.traverse(object => {
        if (object instanceof THREE.Mesh) {
          object.geometry.dispose();
          (Array.isArray(object.material) ? object.material : [object.material]).forEach(material => materials.add(material));
        }
      });
      for (const material of materials) {
        if (material instanceof THREE.MeshStandardMaterial) material.map?.dispose();
        material.dispose();
      }
      sun.shadow.dispose();
      renderer.dispose();
      clearRemotePlayers();
      player.current = null;
      seeker.current = null;
      avatar.current = null;
      switchRole.current = null;
      mapProps.current = [];
      disguise.current = null;
      sceneRef.current = null;
    };
  }, [clearRemotePlayers, gameMode, mpRoom, selectPose, supabase]);

  useEffect(() => {
    if (avatar.current) {
      (avatar.current.userData.bodyMaterial as THREE.MeshStandardMaterial).color.setHex(paint === "white" ? 0xfffaf3 : COLORS[paint]);
      avatarPaint.current?.refresh();
    }
  }, [paint]);

  // Restore avatar from disguise
  const restoreAvatar = useCallback(() => {
    const me = player.current;
    if (!me || !disguise.current) return;
    disguise.current.mesh.removeFromParent();
    disguise.current = null;
    if (avatar.current) avatar.current.visible = true;
    setPropName("");
    setFrozen(false);
    setPropDegrees(0);
    setPropNotice("");
  }, []);

  // Transform into a nearby prop
  const transformInto = useCallback((propId: string) => {
    const me = player.current;
    if (!me || state.current.phase !== "playing" || state.current.role !== "hider") return;
    const source = mapProps.current.find(p => p.id === propId);
    if (!source) return;
    restoreAvatar();
    const yaw = Math.round(me.rotation.y / (Math.PI / 4)) * (Math.PI / 4);
    if (!canOccupy(me.position.x, me.position.z, 0.38, me.position.y, propFootprint(source, yaw))) {
      setPropNotice("Not enough clearance here to take that shape.");
      return;
    }
    const mesh = source.model.clone(true);
    mesh.rotation.y = yaw;
    mesh.scale.setScalar(0.7);
    me.add(mesh);
    if (avatar.current) avatar.current.visible = false;
    const box = new THREE.Box3().setFromObject(mesh);
    const hitHeight = THREE.MathUtils.clamp((box.max.y - box.min.y) * 0.75, 0.55, 1.8);
    disguise.current = { source, mesh, yaw, frozen: false, stillSince: performance.now(), hitHeight };
    setPropName(source.name);
    setFrozen(false);
    setPropDegrees(Math.round(((yaw % (Math.PI * 2)) * 180) / Math.PI));
    setPropNotice("");
  }, [restoreAvatar]);

  const turnProp = useCallback((direction: -1 | 1) => {
    const me = player.current, prop = disguise.current;
    if (!me || !prop || prop.frozen || state.current.phase !== "playing") return;
    const angle = (direction * Math.PI) / 4;
    for (const fraction of [0.5, 1]) {
      if (!canOccupy(me.position.x, me.position.z, 0.38, me.position.y, propFootprint(prop.source, prop.yaw + angle * fraction))) {
        setPropNotice("There's not enough room to turn here.");
        return;
      }
    }
    prop.yaw += angle;
    prop.mesh.rotation.y = prop.yaw;
    prop.stillSince = performance.now();
    setPropDegrees(Math.round(((prop.yaw % (Math.PI * 2)) * 180) / Math.PI));
    setPropNotice("");
  }, []);

  const toggleFreeze = useCallback(() => {
    const prop = disguise.current;
    if (!prop || state.current.phase !== "playing" || !motion.current.grounded) return;
    prop.frozen = !prop.frozen;
    if (prop.frozen) {
      motion.current.vx = 0;
      motion.current.vz = 0;
      jumpUntil.current = 0;
    }
    setFrozen(prop.frozen);
    setPropNotice("");
  }, []);

  // Keyboard controls
  const stopBrush = useCallback(() => {
    brushEnabled.current = false;
    brushPointer.current = null;
    eyedropperOnly.current = false;
    setEyedropper(false);
    if (brushDot.current) brushDot.current.style.opacity = "0";
    setBrushOn(false);
  }, []);

  const toggleBrush = useCallback(() => {
    if (state.current.phase !== "playing" || state.current.role !== "hider" || disguise.current) return;
    if (brushEnabled.current) {
      stopBrush();
      return;
    }
    paintView.current = { yaw: view.current.yaw, pitch: PAINT_PITCH };
    paintZoom.current = PAINT_RADIUS;
    brushEnabled.current = true;
    fireRequested.current = false;
    drag.current = null;
    setBrushOn(true);
  }, [stopBrush]);

  useEffect(() => {
    const down = (event: KeyboardEvent) => {
      if (studioOpen) return;
      if (event.key === "Escape") {
        if (poseOpen) setPoseOpen(false);
        else if (brushEnabled.current) stopBrush();
        else onExit();
        return;
      }
      if (event.target instanceof Element && event.target.closest("input, select, textarea, [contenteditable=true]")) return;
      if (state.current.phase !== "playing") return;
      if (event.code === "Space" && !(event.target instanceof HTMLButtonElement)) {
        event.preventDefault();
        if (!event.repeat) jumpUntil.current = performance.now() + 115;
        return;
      }
      const key = event.key.toLowerCase();
      if (key === "control") keys.current.add(key);
      if (key === "c") {
        view.current = { yaw: 0, pitch: DEFAULT_PITCH };
        paintView.current = { yaw: 0, pitch: PAINT_PITCH };
        paintZoom.current = PAINT_RADIUS;
      }
      if (!event.repeat) {
        if (key === "f" && state.current.role === "seeker") {
          fireRequested.current = true;
          return;
        }
        if (key === "q") turnProp(-1);
        if (key === "e") turnProp(1);
        if (key === "g") climbRequested.current = true;
        if (key === "f") {
          if (disguise.current) toggleFreeze();
          else toggleBrush();
        }
        if (key === "x" && state.current.role === "hider" && !disguise.current) setPoseOpen(open => !open);
        if (key === "r" && disguise.current) restoreAvatar();
      }
      if (["w","a","s","d","arrowup","arrowdown","arrowleft","arrowright","shift"].includes(key)) {
        event.preventDefault();
        keys.current.add(key);
      }
    };
    const up = (event: KeyboardEvent) => keys.current.delete(event.key.toLowerCase());
    const clear = () => {
      keys.current.clear();
      touchDirections.current.clear();
      jumpUntil.current = 0;
      climbRequested.current = false;
      drag.current = null;
      brushPointer.current = null;
    };
    const visibilityChanged = () => { if (document.hidden) clear(); };
    window.addEventListener("keydown", down);
    window.addEventListener("keyup", up);
    window.addEventListener("blur", clear);
    document.addEventListener("visibilitychange", visibilityChanged);
    return () => {
      window.removeEventListener("keydown", down);
      window.removeEventListener("keyup", up);
      window.removeEventListener("blur", clear);
      document.removeEventListener("visibilitychange", visibilityChanged);
    };
  }, [onExit, poseOpen, restoreAvatar, toggleFreeze, turnProp, studioOpen, stopBrush, toggleBrush]);

  useEffect(() => {
    const host = mount.current;
    if (!host || !brushOn || phase !== "playing" || propName) return;
    const zoom = (event: WheelEvent) => {
      event.preventDefault();
      paintZoom.current = THREE.MathUtils.clamp(paintZoom.current + event.deltaY * 0.006, 2.65, 13);
    };
    host.addEventListener("wheel", zoom, { passive: false });
    return () => host.removeEventListener("wheel", zoom);
  }, [brushOn, phase, propName]);

  // Solo mode local countdown timer
  useEffect(() => {
    if (phase !== "playing" || gameMode === "mp") return;
    const timer = window.setInterval(() => setRemaining(n => {
      setMatchElapsed(e => e + 1);
      if (n > 1) return n - 1;
      if (state.current.phase === "playing") {
        const outcome = state.current.role === "seeker" ? "lost" : "won";
        state.current.phase = outcome;
        setPhase(outcome);
      }
      return 0;
    }), 1000);
    return () => window.clearInterval(timer);
  }, [gameMode, phase]);

  // Multiplayer authoritative timer synchronization
  useEffect(() => {
    if (phase !== "playing" || gameMode !== "mp" || !mpRoom) return;
    const updateMpTimer = () => {
      if (!mpRoom.ends_at || !mpRoom.hunt_starts_at) return;
      const now = Date.now();
      const endsTime = new Date(mpRoom.ends_at).getTime();
      const startTime = mpRoom.started_at ? new Date(mpRoom.started_at).getTime() : endsTime - 70000;
      const rem = Math.max(0, Math.ceil((endsTime - now) / 1000));
      const elapsed = Math.max(0, Math.floor((now - startTime) / 1000));
      setRemaining(rem);
      setMatchElapsed(elapsed);

      if (rem <= 0 && mpRoom.status === "playing") {
        resolveShadowHuntTimeout(supabase, mpRoom.id)
          .then(newState => {
            setMpRoom(newState.room);
            const myRole = state.current.role;
            const won = newState.room.winner === myRole;
            const finalPhase = myRole === "seeker" ? (won ? "found" : "lost") : (won ? "won" : "caught");
            state.current.phase = finalPhase;
            setPhase(finalPhase);
          })
          .catch(console.warn);
      }
    };

    updateMpTimer();
    const interval = window.setInterval(updateMpTimer, 500);
    return () => window.clearInterval(interval);
  }, [gameMode, mpRoom, phase, supabase]);

  useEffect(() => () => {
    void audio.current?.close().catch(() => {});
    audio.current = null;
  }, []);

  // Solo Mode Start
  const startSolo = () => {
    stopBrush();
    selectPose("stand");
    brushCamouflage.current = "white";
    restoreAvatar();
    clearRemotePlayers();
    setRoom("Gallery");
    player.current?.position.set(0, 0, 3.7);
    if (player.current) player.current.rotation.y = Math.PI;
    seeker.current?.position.set(-7, 0, 2.7);
    seekerReleaseAt.current = performance.now() + (role === "seeker" ? SEEKER_COUNTDOWN : headStartSec) * 1000;
    const botsCount = switchRole.current?.(role) ?? 1;
    setHidersLeft(botsCount);
    setTotalHiders(botsCount);
    setShotFeedback("");
    setMatchElapsed(0);
    aim.current.set(0, 0);
    fireRequested.current = false;
    try {
      if (typeof AudioContext !== "undefined") {
        audio.current ??= new AudioContext();
        void audio.current.resume().catch(() => {});
      }
    } catch { /* Tagging remains playable without audio. */ }
    motion.current = newMotion();
    wallGrip.current = null;
    climbRequested.current = false;
    setClimbHint(null);
    jumpUntil.current = 0;
    keys.current.clear();
    touchDirections.current.clear();
    view.current = { yaw: 0, pitch: DEFAULT_PITCH };
    drag.current = null;
    setPaint("white");
    setHidden("");
    setRemaining(roundDuration);
    setRunning(false);
    state.current = { phase: "playing", role, paint: "white", hidden: "" };
    setPhase("playing");
    if (document.activeElement instanceof HTMLElement) document.activeElement.blur();
  };

  // ---------------------------------------------------------------------------
  // Multiplayer Channel & Event Management
  // ---------------------------------------------------------------------------

  const setupMpChannel = useCallback((roomState: ShadowHuntState) => {
    if (!sceneRef.current) return;
    const scene = sceneRef.current;
    const uid = localUserId.current;

    if (channelManager.current) {
      channelManager.current.unsubscribe();
    }

    const mgr = new ShadowHuntChannelManager(supabase, roomState.room.id, uid, {
      onPoseUpdate: pose => {
        let remote = remotePlayersRef.current.get(pose.userId);
        if (!remote) {
          const playerRecord = roomState.players.find(p => p.user_id === pose.userId);
          const isSeeker = playerRecord?.role === "seeker";
          const char = makeCharacter((pose.paint as Paint) || "white", isSeeker);
          const modelGroup = new THREE.Group();
          modelGroup.add(char.group);
          modelGroup.position.set(pose.x, pose.y, pose.z);
          scene.add(modelGroup);

          remote = {
            userId: pose.userId,
            displayName: playerRecord?.display_name || "Player",
            role: isSeeker ? "seeker" : "hider",
            isAlive: playerRecord?.is_alive ?? true,
            model: modelGroup,
            character: char,
            targetPos: new THREE.Vector3(pose.x, pose.y, pose.z),
            targetYaw: pose.yaw,
            targetGait: pose.gait,
            climbing: pose.climbing === true,
            targetPropYaw: pose.propYaw || 0,
            targetFrozen: pose.frozen || false,
            paint: (pose.paint as Paint) || "white",
            lastSeen: Date.now(),
          };
          remotePlayersRef.current.set(pose.userId, remote);
        } else {
          remote.targetPos.set(pose.x, pose.y, pose.z);
          remote.targetYaw = pose.yaw;
          remote.targetGait = pose.gait;
          remote.climbing = pose.climbing === true;
          remote.currentPropId = pose.propId;
          remote.targetPropYaw = pose.propYaw || 0;
          remote.targetFrozen = pose.frozen || false;
          remote.lastSeen = Date.now();
        }
      },
      onStateUpdate: updatedState => {
        setMpRoom(updatedState.room);
        setMpPlayers(updatedState.players);
        setHidersLeft(updatedState.room.alive_hiders);
      },
      onRoundStarted: startedState => {
        stopBrush();
        selectPose("stand");
        setMpRoom(startedState.room);
        setMpPlayers(startedState.players);
        setHidersLeft(startedState.room.alive_hiders);
        setTotalHiders(startedState.players.filter(p => p.role === "hider").length);
        setMatchElapsed(0);

        const meInRoom = startedState.players.find(p => p.user_id === uid);
        const myRole: Role = meInRoom?.role || "hider";
        setRole(myRole);
        state.current.role = myRole;

        restoreAvatar();
        clearRemotePlayers();
        motion.current = newMotion();
        wallGrip.current = null;
        climbRequested.current = false;
        setClimbHint(null);
        player.current?.position.set(0, 0, 3.7);
        if (player.current) player.current.rotation.y = Math.PI;
        seekerReleaseAt.current = performance.now() + (myRole === "seeker" ? SEEKER_COUNTDOWN : HEAD_START) * 1000;
        switchRole.current?.(myRole);

        setPhase("playing");
        state.current.phase = "playing";
      },
      onPlayerTagged: payload => {
        setMpRoom(payload.state.room);
        setMpPlayers(payload.state.players);
        setHidersLeft(payload.remaining_hiders);

        if (payload.target_user_id === uid) {
          state.current.phase = "caught";
          setPhase("caught");
        } else {
          const taggedRemote = remotePlayersRef.current.get(payload.target_user_id);
          if (taggedRemote) {
            taggedRemote.isAlive = false;
            taggedRemote.model.visible = false;
          }
          setShotFeedback("🎯 A hider was caught!");
          setFeedbackTier("hit");
        }
      },
      onRoundFinished: payload => {
        setMpRoom(payload.state.room);
        setMpPlayers(payload.state.players);
        const myRole = state.current.role;
        const won = payload.winner === myRole;
        const finalPhase = myRole === "seeker" ? (won ? "found" : "lost") : (won ? "won" : "caught");
        state.current.phase = finalPhase;
        setPhase(finalPhase);
      },
    });

    mgr.subscribe({
      displayName: currentUser?.name || "Player",
      avatarUrl: currentUser?.avatar,
    });
    channelManager.current = mgr;
  }, [clearRemotePlayers, currentUser, restoreAvatar, selectPose, stopBrush, supabase]);

  useEffect(() => {
    return () => {
      if (channelManager.current) {
        channelManager.current.unsubscribe();
        channelManager.current = null;
      }
      clearRemotePlayers();
    };
  }, [clearRemotePlayers]);

  const handleCreateRoom = async () => {
    setMpLoading(true);
    setMpError("");
    try {
      const stateData = await createShadowHuntRoom(supabase, currentUser?.name || "Player", currentUser?.avatar);
      setMpRoom(stateData.room);
      setMpPlayers(stateData.players);
      setupMpChannel(stateData);
    } catch (e: any) {
      setMpError(e.message || "Failed to create room");
    } finally {
      setMpLoading(false);
    }
  };

  const handleJoinRoom = async () => {
    if (!mpJoinCode.trim()) {
      setMpError("Please enter a room code");
      return;
    }
    setMpLoading(true);
    setMpError("");
    try {
      const stateData = await joinShadowHuntRoom(supabase, mpJoinCode.trim(), currentUser?.name || "Player", currentUser?.avatar);
      setMpRoom(stateData.room);
      setMpPlayers(stateData.players);
      setupMpChannel(stateData);
    } catch (e: any) {
      setMpError(e.message || "Failed to join room");
    } finally {
      setMpLoading(false);
    }
  };

  const handleStartMpRound = async () => {
    if (!mpRoom) return;
    setMpLoading(true);
    setMpError("");
    try {
      const stateData = await startShadowHuntRound(supabase, mpRoom.id);
      setMpRoom(stateData.room);
      setMpPlayers(stateData.players);
    } catch (e: any) {
      setMpError(e.message || "Failed to start match");
    } finally {
      setMpLoading(false);
    }
  };

  const handleLeaveMpRoom = async () => {
    if (mpRoom) {
      await leaveShadowHuntRoom(supabase, mpRoom.id).catch(() => {});
    }
    if (channelManager.current) {
      channelManager.current.unsubscribe();
      channelManager.current = null;
    }
    clearRemotePlayers();
    setMpRoom(null);
    setMpPlayers([]);
    setIsGuestReady(false);
    setPhase("ready");
  };

  const copyCode = () => {
    if (mpRoom?.code) {
      void navigator.clipboard.writeText(mpRoom.code);
      setMpCopied(true);
      setTimeout(() => setMpCopied(false), 2000);
    }
  };

  const isHost = mpRoom?.host_id === currentUserId;

  // Pointer & Drag handling
  const positionBrushDot = (event: ReactPointerEvent<HTMLDivElement>) => {
    if (!brushDot.current || performance.now() >= brushDotUntil.current) return;
    brushDot.current.style.transform = `translate(${event.clientX + 14}px, ${event.clientY + 14}px)`;
    brushDot.current.style.opacity = "1";
  };
  const beginDrag = (event: ReactPointerEvent<HTMLDivElement>) => {
    if (phase !== "playing" || drag.current || brushPointer.current) return;
    if (brushEnabled.current && role === "hider" && !propName && event.button === 0 && !event.shiftKey) {
      const action = brushAction.current?.(event.clientX, event.clientY);
      if (action === "sample") positionBrushDot(event);
      if (action === "paint") {
        event.currentTarget.setPointerCapture(event.pointerId);
        brushPointer.current = { id: event.pointerId, x: event.clientX, y: event.clientY };
      }
      return;
    }
    if (event.button !== 0 && event.button !== 2) return;
    event.currentTarget.setPointerCapture(event.pointerId);
    drag.current = { id: event.pointerId, x: event.clientX, y: event.clientY, distance: 0 };
  };
  const aimAt = (event: ReactPointerEvent<HTMLDivElement>) => {
    const bounds = event.currentTarget.getBoundingClientRect();
    const x = THREE.MathUtils.clamp((event.clientX - bounds.left) / bounds.width, 0, 1);
    const y = THREE.MathUtils.clamp((event.clientY - bounds.top) / bounds.height, 0, 1);
    aim.current.set(x * 2 - 1, 1 - y * 2);
    if (aimDot.current) {
      aimDot.current.style.left = `${x * 100}%`;
      aimDot.current.style.top = `${y * 100}%`;
    }
  };
  const rotateCamera = (event: ReactPointerEvent<HTMLDivElement>) => {
    if (brushEnabled.current && phase === "playing" && role === "hider" && !propName) {
      positionBrushDot(event);
      const stroke = brushPointer.current;
      if (stroke?.id === event.pointerId) {
        brushAction.current?.(stroke.x, stroke.y, event.clientX, event.clientY);
        stroke.x = event.clientX;
        stroke.y = event.clientY;
        return;
      }
    }
    if (role === "seeker" && phase === "playing") aimAt(event);
    const pointer = drag.current;
    if (!pointer || pointer.id !== event.pointerId) return;
    pointer.distance += Math.hypot(event.clientX - pointer.x, event.clientY - pointer.y);
    const painting = brushEnabled.current && !propName;
    const cameraView = painting ? paintView.current : view.current;
    const yaw = cameraView.yaw - (event.clientX - pointer.x) * 0.006;
    cameraView.yaw = yaw;
    cameraView.pitch = THREE.MathUtils.clamp(cameraView.pitch + (event.clientY - pointer.y) * 0.004,
      painting ? 0.04 : -0.22, painting ? 1.18 : 0.78);
    pointer.x = event.clientX;
    pointer.y = event.clientY;
  };
  const endDrag = (event: ReactPointerEvent<HTMLDivElement>) => {
    if (drag.current?.id === event.pointerId) drag.current = null;
    if (brushPointer.current?.id === event.pointerId) brushPointer.current = null;
  };
  const finishPointer = (event: ReactPointerEvent<HTMLDivElement>) => {
    if (brushPointer.current?.id === event.pointerId) { endDrag(event); return; }
    const pointer = drag.current;
    if (!pointer || pointer.id !== event.pointerId) return;
    if (role === "seeker" && phase === "playing" && event.button === 0 && pointer.distance < 7) {
      aimAt(event);
      if (event.pointerType === "mouse") fireRequested.current = true;
    }
    endDrag(event);
  };
  const holdControl = (event: ReactPointerEvent<HTMLButtonElement>) => {
    const key = event.currentTarget.dataset.control;
    if (!key) return;
    event.currentTarget.setPointerCapture(event.pointerId);
    touchDirections.current.set(event.pointerId, key);
  };
  const releaseControl = (event: ReactPointerEvent<HTMLButtonElement>) => {
    touchDirections.current.delete(event.pointerId);
  };

  const countdown = Math.max(0, remaining - ((gameMode === "mp" && mpRoom ? mpRoom.round_seconds : roundDuration) - (role === "seeker" ? SEEKER_COUNTDOWN : (gameMode === "mp" && mpRoom ? mpRoom.head_start_seconds : headStartSec))));
  const hiding = phase === "playing" && countdown > 0;
  const isTimerCritical = remaining <= 15 && phase === "playing";

  // Current Prop Orientation Display (in degrees)
  const normalizedDegrees = (propDegrees + 360) % 360;

  return (
    <div role="dialog" aria-modal="true" aria-label="Shadow Hunt 3D game" className="fixed inset-0 z-[100] overflow-hidden bg-[#20130e] text-[#fff2d8] select-none">
      <main inert={studioOpen} className="absolute inset-0">
        <div
          ref={mount}
          className={`absolute inset-0 touch-none ${brushOn && phase === "playing" && role === "hider" && !propName ? BRUSH_CURSOR : phase === "playing" && role === "seeker" ? "cursor-crosshair" : "cursor-grab active:cursor-grabbing"}`}
          aria-label="3D hide and seek room"
          onPointerDown={beginDrag}
          onPointerMove={rotateCamera}
          onPointerUp={finishPointer}
          onLostPointerCapture={endDrag}
          onContextMenu={event => { if (phase === "playing") event.preventDefault(); }}
        />
        <span ref={brushDot} aria-hidden="true" data-brush-swatch
          className="pointer-events-none fixed left-0 top-0 z-30 size-2.5 rounded-full border border-white/75 opacity-0 shadow" />
        <div aria-hidden="true" className="pointer-events-none absolute inset-0 bg-linear-to-b from-black/55 via-transparent to-black/75" />

        {/* =========================================================================
            TOP POLISHED HUD: Room Banner, Urgency Timer, Hiders & Seeker Count
            ========================================================================= */}
        <header className="pointer-events-none absolute inset-x-0 top-0 z-20 flex items-start justify-between gap-2 p-3 sm:p-5">
          {/* Room Location & Title */}
          <div className="hidden items-center gap-2.5 rounded-2xl border border-amber-200/20 bg-[#1a0f0a]/85 px-4 py-2 backdrop-blur-md shadow-lg sm:flex">
            <EyeOff size={19} className="text-amber-400" />
            <div>
              <h1 className="text-sm font-black tracking-wide text-amber-100 uppercase">Shadow Hunt</h1>
              <span className="text-[11px] font-semibold text-amber-200/75">
                🏛️ {room} {gameMode === "mp" && mpRoom ? `· Room ${mpRoom.code}` : ""}
              </span>
            </div>
          </div>

          {/* Central Arcade Scoreboard & Timer */}
          <div className="flex items-stretch overflow-hidden rounded-2xl border border-amber-200/30 bg-[#160c07]/95 shadow-2xl backdrop-blur-md sm:absolute sm:left-1/2 sm:-translate-x-1/2">
            {/* Hiders Left Meter */}
            <div className="flex min-w-18 flex-col items-center justify-center border-r border-amber-200/15 bg-[#17302c]/90 px-3.5 py-1.5">
              <div className="flex items-center gap-1">
                <Shield size={13} className="text-emerald-400" />
                <strong className="font-mono text-base font-black text-emerald-200" aria-label="Hiders remaining">
                  {hidersLeft}
                </strong>
              </div>
              <span className="text-[8px] font-black uppercase tracking-wider text-emerald-200/70">
                {hidersLeft === 1 ? "Hider Left" : "Hiders Left"}
              </span>
            </div>

            {/* Pulsing Urgency Timer */}
            <div className={`flex min-w-24 flex-col items-center justify-center px-4 py-1.5 transition-colors ${isTimerCritical ? "bg-rose-950/80 animate-pulse text-rose-200" : "bg-[#25150e]/90"}`}>
              <div className="flex items-center gap-1.5">
                <Clock size={13} className={isTimerCritical ? "text-rose-400" : "text-amber-300"} />
                <strong className={`font-mono text-xl font-black leading-none ${isTimerCritical ? "text-rose-300" : "text-amber-200"}`}>
                  {remaining}s
                </strong>
              </div>
              <span className="text-[8px] font-black uppercase tracking-wider text-amber-100/70">
                {hiding ? (role === "seeker" ? "Blinded" : "Head Start") : "Round Time"}
              </span>
            </div>

            {/* Seeker Count Meter */}
            <div className="flex min-w-18 flex-col items-center justify-center border-l border-amber-200/15 bg-[#422019]/90 px-3.5 py-1.5">
              <div className="flex items-center gap-1">
                <Flame size={13} className="text-orange-400" />
                <strong className="font-mono text-base font-black text-orange-200">1</strong>
              </div>
              <span className="text-[8px] font-black uppercase tracking-wider text-orange-200/70">Seeker</span>
            </div>
          </div>

          {/* Quick Exit / Menu Button */}
          <button
            onClick={onExit}
            className="pointer-events-auto flex cursor-pointer items-center gap-1.5 rounded-xl border border-amber-100/25 bg-[#25170f]/90 px-3.5 py-2 text-xs font-bold text-amber-100 shadow-md transition hover:bg-[#41271a] hover:border-amber-200/50"
          >
            <LogOut size={14} /> Exit
          </button>
        </header>

        {/* Seeker Blindfold / Head Start Overlay */}
        {phase === "playing" && role === "seeker" && hiding && (
          <div className="pointer-events-none absolute inset-0 z-15 flex flex-col items-center justify-center bg-black/60 backdrop-blur-[2px]">
            <div className="flex flex-col items-center gap-2 rounded-2xl border border-amber-200/30 bg-[#22130b]/95 p-6 shadow-2xl">
              <EyeOff size={36} className="text-amber-400 animate-pulse" />
              <h3 className="text-lg font-black tracking-wide text-amber-100 uppercase">Seeker Blinded</h3>
              <p className="text-xs text-amber-200/80">Hiders are taking disguised prop positions in the mansion...</p>
              <div className="mt-2 font-mono text-3xl font-black text-amber-300">{countdown}s</div>
            </div>
          </div>
        )}

        {/* =========================================================================
            HIDER HUD: Disguise Dial, Blend Meter, Nearby Props & Paint
            ========================================================================= */}
        {phase === "playing" && role === "hider" && (
          <>
            {/* Blend Meter & Disguise Notification Pill */}
            <div className="pointer-events-none absolute inset-x-0 top-18 flex justify-center sm:top-20 z-10">
              <div className="flex items-center gap-2 rounded-full border border-amber-200/20 bg-[#160d08]/90 px-4 py-1.5 shadow-xl backdrop-blur-md">
                {hidden ? (
                  <>
                    <span className="size-2 rounded-full bg-emerald-400 animate-ping" />
                    <Sparkles size={14} className="text-emerald-400" />
                    <span className="text-xs font-bold text-emerald-200">
                      100% Camouflage · {propName ? `Disguised as ${propName}` : `Blended in (${hidden})`}
                    </span>
                  </>
                ) : (
                  <>
                    <span className="size-2 rounded-full bg-amber-400" />
                    <span className="text-xs font-semibold text-amber-100/85">
                      {propName ? `Disguised as ${propName} (Stay still to blend)` : hiding ? `Seeker starts in ${countdown}s · Find a prop!` : "Stay still or match a wall color to blend"}
                    </span>
                  </>
                )}
                {frozen && (
                  <span className="flex items-center gap-1 rounded bg-cyan-950/80 border border-cyan-400/40 px-2 py-0.5 text-[10px] font-black uppercase text-cyan-300">
                    <Snowflake size={11} /> Frozen
                  </span>
                )}
              </div>
            </div>

            {/* Hider Bottom Action Deck */}
            <div className="absolute inset-x-0 bottom-4 flex justify-center max-sm:bottom-28 z-10">
              <div className="flex max-w-[96vw] flex-wrap items-center justify-center gap-2.5 rounded-2xl border border-amber-200/25 bg-[#1b0e09]/95 px-4 py-2.5 shadow-2xl backdrop-blur-md">
                {/* Nearby Prop Selector */}
                {climbHint && !propName && (
                  <button type="button" onClick={event => {
                    climbRequested.current = true;
                    event.currentTarget.blur();
                  }} title={climbHint === "grip" ? "W / S to climb · G or Space to drop" : "Grab the wall (G)"}
                    className="h-9 rounded-lg border border-amber-300/60 bg-amber-300/15 px-2.5 text-xs font-bold text-amber-100 hover:bg-amber-300/25">
                    {climbHint === "grip" ? "Drop · W/S to climb" : "Climb wall (G)"}
                  </button>
                )}
                <select
                  aria-label="Nearby props"
                  value=""
                  disabled={!nearbyProps.length || climbHint === "grip"}
                  onChange={event => {
                    transformInto(event.target.value);
                    event.currentTarget.blur();
                  }}
                  className="max-w-48 rounded-xl border border-amber-100/25 bg-[#2a170d] px-3 py-2 text-xs font-semibold text-amber-100 shadow-inner disabled:opacity-50"
                >
                  <option value="" disabled>
                    {nearbyProps.length ? `Select Nearby Prop (${nearbyProps.length})` : "No props in range"}
                  </option>
                  {PROP_CATEGORIES.map(category => {
                    const items = nearbyProps.filter(prop => prop.category === category);
                    return items.length ? (
                      <optgroup key={category} label={category}>
                        {items.map(prop => (
                          <option key={prop.id} value={prop.id}>
                            {prop.name}
                          </option>
                        ))}
                      </optgroup>
                    ) : null;
                  })}
                </select>

                {/* Disguise Controls */}
                {propName ? (
                  <div className="flex items-center gap-1.5">
                    {/* Orientation Dial */}
                    <div className="flex items-center gap-1 rounded-xl border border-amber-100/20 bg-[#25150d] px-2.5 py-1.5 text-xs text-amber-200">
                      <Compass size={13} className="text-amber-400" />
                      <span className="font-mono font-bold">{normalizedDegrees}°</span>
                    </div>

                    <button
                      onClick={() => turnProp(-1)}
                      disabled={frozen}
                      aria-label="Rotate prop left"
                      title="Rotate Left (Q)"
                      className="rounded-xl border border-amber-100/20 bg-[#2a170d] px-3 py-2 text-xs font-bold text-amber-100 shadow hover:bg-[#3d2214] disabled:opacity-40"
                    >
                      ↶ Q
                    </button>
                    <button
                      onClick={() => turnProp(1)}
                      disabled={frozen}
                      aria-label="Rotate prop right"
                      title="Rotate Right (E)"
                      className="rounded-xl border border-amber-100/20 bg-[#2a170d] px-3 py-2 text-xs font-bold text-amber-100 shadow hover:bg-[#3d2214] disabled:opacity-40"
                    >
                      ↷ E
                    </button>
                    <button
                      onClick={toggleFreeze}
                      aria-pressed={frozen}
                      title="Freeze Position (F)"
                      className={`flex items-center gap-1 rounded-xl border px-3 py-2 text-xs font-bold transition shadow ${frozen ? "border-cyan-400 bg-cyan-950/80 text-cyan-200" : "border-amber-100/20 bg-[#2a170d] text-amber-100 hover:bg-[#3d2214]"}`}
                    >
                      <Snowflake size={12} />
                      {frozen ? "Unfreeze (F)" : "Freeze (F)"}
                    </button>
                    <button
                      onClick={restoreAvatar}
                      title="Restore Character (R)"
                      className="rounded-xl border border-amber-100/20 bg-[#2a170d] px-3 py-2 text-xs font-bold text-amber-100 hover:bg-[#3d2214]"
                    >
                      Restore (R)
                    </button>
                  </div>
                ) : (
                  <>
                    <button type="button" aria-label="In-game paintbrush" aria-pressed={brushOn} title="Paint Mode (F)"
                      onClick={toggleBrush}
                      className="flex h-9 items-center gap-2 rounded-lg border border-amber-100/25 px-2.5 text-xs font-semibold text-amber-100 hover:bg-white/10 aria-pressed:border-amber-300 aria-pressed:bg-amber-300 aria-pressed:text-stone-950">
                      <Paintbrush size={15} /> <span>Paint</span> <kbd className="text-[10px] opacity-65 max-sm:hidden">F</kbd>
                    </button>
                    <button type="button" aria-label="Pose wheel" aria-expanded={poseOpen} title="Pose wheel (X)"
                      onClick={() => setPoseOpen(open => !open)}
                      className="flex h-9 items-center gap-2 rounded-lg border border-amber-100/25 px-2.5 text-xs font-semibold text-amber-100 hover:bg-white/10 aria-expanded:bg-white/10">
                      <User size={15} /> <span>{selectedPose === "stand" ? "Pose" : POSES.find(pose => pose.id === selectedPose)?.label}</span>
                      <kbd className="text-[10px] opacity-65 max-sm:hidden">X</kbd>
                    </button>
                  </>
                )}
              </div>
            </div>

            {brushOn && !propName && (
              <section aria-label="Live paint controls" className="absolute left-4 top-28 z-20 max-h-[calc(100%-14rem)] w-52 overflow-y-auto rounded-2xl border border-amber-100/25 bg-stone-950/90 p-3 text-xs text-amber-50 shadow-2xl backdrop-blur-md sm:left-6 sm:w-60 sm:p-4">
                <div className="mb-3 flex items-center justify-between gap-2">
                  <h2 className="flex items-center gap-2 font-bold"><Paintbrush size={14} className="text-amber-300" /> Paint Mode</h2>
                  <button type="button" onClick={stopBrush} className="rounded-md border border-white/20 px-2 py-1 hover:bg-white/10">Done</button>
                </div>
                <div className="flex items-center justify-between gap-2">
                  <div aria-hidden="true"
                    className="relative aspect-square w-24 shrink-0 cursor-crosshair touch-none rounded-full border border-white/20 bg-[radial-gradient(circle_closest-side,white,transparent),conic-gradient(red,yellow,lime,cyan,blue,magenta,red)] sm:w-28"
                    onPointerDown={event => {
                      event.currentTarget.setPointerCapture(event.pointerId);
                      changeBrush({ color: wheelColor(event), brightness: 100 });
                    }}
                    onPointerMove={event => {
                      if (event.currentTarget.hasPointerCapture(event.pointerId)) changeBrush({ color: wheelColor(event), brightness: 100 });
                    }}>
                    <span style={{ ...wheelMarker(paintControls.color), background: paintControls.color }}
                      className="pointer-events-none absolute size-3 -translate-x-1/2 -translate-y-1/2 rounded-full border-2 border-white shadow-[0_0_0_1px_#21170f]" />
                  </div>
                  <div className="grid min-w-0 flex-1 gap-2">
                    <label className="flex items-center justify-between gap-1 rounded-md border border-white/20 p-1">
                      <input type="color" aria-label="Brush color" value={paintControls.color}
                        className="size-6 shrink-0 cursor-pointer rounded bg-transparent"
                        onChange={event => changeBrush({ color: event.target.value, brightness: 100 })} />
                      <span className="truncate font-mono text-[9px] uppercase sm:text-[10px]">{paintControls.color}</span>
                    </label>
                    <button type="button" aria-pressed={eyedropper}
                      onClick={() => {
                        eyedropperOnly.current = !eyedropperOnly.current;
                        setEyedropper(eyedropperOnly.current);
                      }}
                      className="flex items-center justify-center gap-1.5 rounded-md border border-white/20 p-1.5 hover:bg-white/10 aria-pressed:border-amber-300 aria-pressed:text-amber-300">
                      <Pipette size={13} /> Sample
                    </button>
                  </div>
                </div>
                <div className="my-3 flex justify-between gap-1" aria-label="Paint swatches">
                  {BRUSH_COLORS.map(color => (
                    <button key={color} type="button" aria-label={`Use ${color}`} aria-pressed={paintControls.color === color}
                      onClick={() => changeBrush({ color, brightness: 100 })}
                      style={{ background: color }}
                      className="size-5 rounded-full border border-white/30 aria-pressed:outline aria-pressed:outline-offset-2 aria-pressed:outline-amber-200 sm:size-6" />
                  ))}
                </div>
                <div className="grid grid-cols-4 gap-0.5 rounded-lg bg-white/5 p-1" aria-label="Brush type">
                  {BRUSH_TYPES.map(brush => (
                    <button key={brush} type="button" aria-pressed={paintControls.brush === brush}
                      onClick={() => changeBrush({ brush })}
                      className="rounded-md py-1.5 text-[10px] hover:bg-white/10 aria-pressed:bg-amber-300 aria-pressed:font-bold aria-pressed:text-stone-950">{brush}</button>
                  ))}
                </div>
                <div className="mt-3 grid gap-2">
                  {([
                    ["size", "Brush size", 4, 90, "px"],
                    ["opacity", "Opacity", 10, 100, "%"],
                    ["brightness", "Brightness", 20, 150, "%"],
                  ] as const).map(([setting, label, min, max, unit]) => (
                    <label key={setting} className="grid gap-1">
                      <span className="flex justify-between text-amber-50/85">{label}<span className="font-mono">{paintControls[setting]}{unit}</span></span>
                      <input type="range" min={min} max={max} value={paintControls[setting]} className="w-full accent-amber-300"
                        onChange={event => changeBrush({ [setting]: Number(event.target.value) })} />
                    </label>
                  ))}
                </div>
                <p className="mt-3 border-t border-white/15 pt-2 leading-relaxed text-amber-50/70">
                  {eyedropper ? "Click scenery to sample a color." : "Drag on yourself to paint. Shift-drag or right-drag to orbit. Scroll to zoom."}
                </p>
              </section>
            )}

            {poseOpen && !propName && (
              <section aria-label="Character poses" className="pointer-events-none absolute inset-0 z-30 grid place-items-center">
                <div className="pointer-events-auto relative size-[min(19rem,80vw)] rounded-full border border-amber-200/35 bg-stone-950/85 shadow-2xl backdrop-blur-sm">
                  <div aria-hidden="true" className="absolute inset-1 rounded-full"
                    style={{ background: "repeating-conic-gradient(from -36deg, #fef3c748 0deg 0.65deg, transparent 0.65deg 72deg)", maskImage: "radial-gradient(transparent 31%, black 32%)" }} />
                  {POSES.map(({ id, label, icon }, index) => {
                    const angle = index * Math.PI * 2 / POSES.length - Math.PI / 2;
                    return (
                      <button key={id} type="button" aria-pressed={selectedPose === id} onClick={() => selectPose(id)}
                        style={{ left: `${50 + Math.cos(angle) * 33}%`, top: `${50 + Math.sin(angle) * 33}%` }}
                        className="absolute flex size-16 -translate-x-1/2 -translate-y-1/2 flex-col items-center justify-center gap-1 rounded-full border border-white/20 bg-white/5 text-[10px] font-semibold hover:border-amber-300 hover:bg-white/15 aria-pressed:border-amber-300 aria-pressed:bg-amber-300 aria-pressed:text-stone-950 sm:size-[4.5rem]">
                        <svg aria-hidden="true" width="25" height="25" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                          <circle cx={id === "lie" ? 4 : 12} cy={id === "lie" ? 13 : 4.5} r="2" fill="currentColor" stroke="none" />
                          <path d={icon} />
                        </svg>
                        {label}
                      </button>
                    );
                  })}
                  <button type="button" aria-label="Close pose wheel" onClick={() => setPoseOpen(false)}
                    className="absolute left-1/2 top-1/2 flex size-16 -translate-x-1/2 -translate-y-1/2 flex-col items-center justify-center gap-1 rounded-full border border-white/25 text-[10px] font-semibold hover:bg-white/10">
                    <Scan size={20} /> Close
                  </button>
                </div>
              </section>
            )}

            {running && (
              <span className="absolute bottom-5 left-5 rounded-full border border-amber-300/30 bg-[#21150f]/95 px-3.5 py-1 text-xs font-black uppercase text-amber-300 shadow max-sm:bottom-28">
                ⚡ Sprinting
              </span>
            )}
          </>
        )}

        {/* =========================================================================
            SEEKER HUD: Precision Crosshair, Blaster Charge & Tag Feedback
            ========================================================================= */}
        {phase === "playing" && role === "seeker" && (
          <>
            {/* Dynamic Reticle with Blaster Recharge Status */}
            <span
              ref={aimDot}
              aria-hidden="true"
              className={`pointer-events-none absolute left-1/2 top-1/2 z-10 -translate-x-1/2 -translate-y-1/2 drop-shadow-md transition-transform ${feedbackTier === "hit" ? "text-emerald-300 scale-125" : feedbackTier === "blocked" ? "text-orange-400" : "text-amber-100"}`}
            >
              <Target size={30} className={blasterCharge < 100 ? "opacity-60" : "opacity-100"} />
            </span>

            {/* Tag Feedback Banner */}
            <div className="pointer-events-none absolute inset-x-0 top-18 flex justify-center sm:top-20 z-10">
              <div
                className={`flex items-center gap-2 rounded-full border px-4 py-1.5 text-xs font-black uppercase tracking-wide shadow-xl backdrop-blur-md ${feedbackTier === "hit" ? "border-emerald-500/40 bg-emerald-950/80 text-emerald-200" : feedbackTier === "blocked" ? "border-orange-500/40 bg-orange-950/80 text-orange-200" : feedbackTier === "range" ? "border-amber-500/40 bg-amber-950/80 text-amber-200" : "border-amber-100/20 bg-[#170e09]/90 text-amber-100"}`}
              >
                {hiding ? (
                  `Hunt begins in ${countdown}s`
                ) : shotFeedback ? (
                  shotFeedback
                ) : (
                  <>
                    <Crosshair size={13} className="text-amber-400" />
                    Aim at suspicious props & tag them (Click or F)
                  </>
                )}
              </div>
            </div>

            {/* Blaster Cooldown Gauge & Manual Tag Button */}
            <div className="absolute bottom-28 left-1/2 -translate-x-1/2 flex flex-col items-center gap-2 sm:bottom-6 z-10">
              {blasterCharge < 100 && (
                <div className="flex items-center gap-2 rounded-full bg-black/60 px-3 py-1 text-[10px] font-bold text-amber-200 backdrop-blur-sm">
                  <span>Recharging Blaster</span>
                  <div className="w-16 h-1.5 rounded-full bg-white/20 overflow-hidden">
                    <div className="h-full bg-amber-400 transition-all duration-75" style={{ width: `${blasterCharge}%` }} />
                  </div>
                </div>
              )}
              <button
                onClick={() => {
                  fireRequested.current = true;
                }}
                disabled={hiding || blasterCharge < 100}
                className="flex items-center gap-2 rounded-2xl bg-linear-to-r from-amber-400 to-amber-300 px-7 py-3 text-sm font-black text-[#25170f] shadow-2xl transition hover:brightness-110 active:scale-95 disabled:opacity-40 cursor-pointer"
              >
                <Crosshair size={16} /> TAG PROP
              </button>
            </div>
          </>
        )}

        {/* =========================================================================
            LOBBY & POST-ROUND MODAL (PHASE 7 REFINED STYLING)
            ========================================================================= */}
        {phase !== "playing" && (
          <div className="absolute inset-0 z-30 grid items-center justify-center bg-black/60 p-4 backdrop-blur-sm sm:p-8">
            <div className="w-full max-w-lg rounded-3xl border border-amber-200/25 bg-[#22130b]/98 p-6 shadow-2xl sm:p-8">
              {/* Header: Mode Selector & Title */}
              <div className="mb-4 flex items-center justify-between border-b border-amber-100/10 pb-4">
                <div className="flex items-center gap-2">
                  <EyeOff className="text-amber-400" size={24} />
                  <div>
                    <h2 className="text-base font-black tracking-tight text-amber-100 uppercase">Shadow Hunt 3D</h2>
                    <span className="text-[10px] text-amber-200/70">Prop Hunt & Camouflage</span>
                  </div>
                </div>
                <div className="flex rounded-xl border border-amber-100/20 bg-[#160b06] p-1">
                  <button
                    type="button"
                    onClick={() => {
                      setGameMode("solo");
                      setMpError("");
                    }}
                    className={`rounded-lg px-3 py-1.5 text-xs font-black transition ${gameMode === "solo" ? "bg-amber-300 text-[#25170f] shadow" : "text-amber-100/70 hover:text-white"}`}
                  >
                    Solo
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      setGameMode("mp");
                      setMpError("");
                    }}
                    className={`rounded-lg px-3 py-1.5 text-xs font-black transition ${gameMode === "mp" ? "bg-amber-300 text-[#25170f] shadow" : "text-amber-100/70 hover:text-white"}`}
                  >
                    Multiplayer
                  </button>
                </div>
              </div>

              {/* POST-ROUND RESULTS BANNER (When game finished) */}
              {phase !== "ready" && (
                <div className="mb-5 rounded-2xl border border-amber-200/20 bg-[#180d07] p-4 text-center">
                  <div className="flex justify-center mb-2">
                    {phase === "won" || phase === "found" ? (
                      <Trophy size={36} className="text-amber-400 animate-bounce" />
                    ) : (
                      <AlertCircle size={36} className="text-rose-400" />
                    )}
                  </div>
                  <h3 className="text-xl font-black text-amber-100 sm:text-2xl">
                    {phase === "won"
                      ? "🏆 You Survived The Round!"
                      : phase === "found"
                        ? "🎯 Seeker Clean Sweep!"
                        : phase === "lost"
                          ? "⏳ The Hiders Escaped!"
                          : "⚡ The Seeker Tagged You!"}
                  </h3>
                  <div className="mt-3 grid grid-cols-3 gap-2 rounded-xl bg-black/30 p-2.5 text-xs">
                    <div>
                      <span className="text-[9px] uppercase tracking-wider text-amber-200/50">Your Role</span>
                      <div className="font-bold capitalize text-amber-200">{role}</div>
                    </div>
                    <div>
                      <span className="text-[9px] uppercase tracking-wider text-amber-200/50">Time Taken</span>
                      <div className="font-bold text-amber-200">{matchElapsed}s</div>
                    </div>
                    <div>
                      <span className="text-[9px] uppercase tracking-wider text-amber-200/50">Hiders Left</span>
                      <div className="font-bold text-amber-200">
                        {hidersLeft} / {totalHiders}
                      </div>
                    </div>
                  </div>
                </div>
              )}

              {/* 1. SOLO PRACTICE LOBBY */}
              {gameMode === "solo" && (
                <div className="space-y-4">
                  {phase === "ready" && (
                    <>
                      <div className="rounded-xl border border-amber-100/15 bg-[#1a0e08] p-3 text-xs text-[#e6c8a6]">
                        Practice alone against AI before hosting a multiplayer room. Choose your role below:
                      </div>

                      <div className="flex gap-2">
                        <button
                          type="button"
                          aria-pressed={role === "hider"}
                          onClick={() => setRole("hider")}
                          className="flex-1 rounded-xl border border-amber-100/20 py-2.5 text-xs font-bold transition aria-pressed:bg-amber-300 aria-pressed:text-[#25170f]"
                        >
                          Hider (Practice Disguise)
                        </button>
                        <button
                          type="button"
                          aria-pressed={role === "seeker"}
                          onClick={() => setRole("seeker")}
                          className="flex-1 rounded-xl border border-amber-100/20 py-2.5 text-xs font-bold transition aria-pressed:bg-amber-300 aria-pressed:text-[#25170f]"
                        >
                          Seeker (Hunt 2 AI Props)
                        </button>
                      </div>

                      {/* Match Duration & Head Start Controls */}
                      <div className="grid grid-cols-2 gap-2 text-xs">
                        <div className="rounded-xl border border-amber-100/15 bg-[#180d07] p-2.5">
                          <label className="text-[10px] font-bold uppercase tracking-wider text-amber-200/60 block mb-1">
                            Round Length
                          </label>
                          <select
                            value={roundDuration}
                            onChange={e => setRoundDuration(Number(e.target.value))}
                            className="w-full rounded-lg bg-[#27150c] border border-amber-100/20 px-2 py-1 text-xs text-amber-100 font-mono"
                          >
                            <option value={60}>60 Seconds</option>
                            <option value={70}>70 Seconds (Default)</option>
                            <option value={90}>90 Seconds</option>
                            <option value={120}>120 Seconds</option>
                          </select>
                        </div>
                        <div className="rounded-xl border border-amber-100/15 bg-[#180d07] p-2.5">
                          <label className="text-[10px] font-bold uppercase tracking-wider text-amber-200/60 block mb-1">
                            Head Start
                          </label>
                          <select
                            value={headStartSec}
                            onChange={e => setHeadStartSec(Number(e.target.value))}
                            className="w-full rounded-lg bg-[#27150c] border border-amber-100/20 px-2 py-1 text-xs text-amber-100 font-mono"
                          >
                            <option value={10}>10 Seconds</option>
                            <option value={12}>12 Seconds (Default)</option>
                            <option value={15}>15 Seconds</option>
                          </select>
                        </div>
                      </div>
                    </>
                  )}

                  <button
                    onClick={startSolo}
                    className="flex w-full items-center justify-center gap-2 rounded-2xl bg-amber-300 py-3 text-sm font-black text-[#25170f] shadow-lg transition hover:bg-amber-200 cursor-pointer"
                  >
                    {phase === "ready" ? "Start Solo Practice" : <><RotateCcw size={16} /> Play Again</>}
                  </button>
                </div>
              )}

              {/* 2. MULTIPLAYER ROOM LOBBY (POLISHED PHASE 7 VIEW) */}
              {gameMode === "mp" && (
                <div className="space-y-4">
                  {mpError && (
                    <div className="rounded-xl border border-rose-500/30 bg-rose-950/70 p-3 text-xs text-rose-200 flex items-center gap-2">
                      <AlertCircle size={15} />
                      {mpError}
                    </div>
                  )}

                  {!mpRoom ? (
                    // Join or Create Options
                    <div className="space-y-4">
                      <div className="rounded-2xl border border-amber-100/15 bg-[#180d07] p-3 text-xs text-[#e6c8a6]">
                        Create a private mansion room or enter an existing 6-character code to play with up to 6 players.
                      </div>

                      <button
                        onClick={handleCreateRoom}
                        disabled={mpLoading}
                        className="flex w-full items-center justify-center gap-2 rounded-2xl bg-amber-300 py-3 text-sm font-black text-[#25170f] shadow-lg transition hover:bg-amber-200 disabled:opacity-60 cursor-pointer"
                      >
                        {mpLoading ? <Loader2 size={16} className="animate-spin" /> : <Users size={16} />}
                        Create Private Mansion Room
                      </button>

                      <div className="flex items-center gap-2 text-xs text-amber-200/40">
                        <div className="h-px flex-1 bg-amber-100/15" />
                        <span className="text-[10px] font-bold uppercase tracking-wider">OR JOIN WITH CODE</span>
                        <div className="h-px flex-1 bg-amber-100/15" />
                      </div>

                      <div className="flex gap-2">
                        <input
                          type="text"
                          maxLength={6}
                          placeholder="CODE (e.g. ABC123)"
                          value={mpJoinCode}
                          onChange={e => setMpJoinCode(e.target.value.toUpperCase())}
                          className="w-full rounded-2xl border border-amber-100/25 bg-[#140a05] px-4 py-2.5 text-center font-mono text-sm font-black uppercase tracking-widest text-amber-200 placeholder:text-amber-100/30 shadow-inner"
                        />
                        <button
                          onClick={handleJoinRoom}
                          disabled={mpLoading || mpJoinCode.length < 4}
                          className="rounded-2xl border border-amber-100/25 bg-[#2d180e] px-6 py-2.5 text-xs font-black uppercase text-amber-100 shadow transition hover:bg-[#432517] disabled:opacity-50 cursor-pointer"
                        >
                          Join
                        </button>
                      </div>
                    </div>
                  ) : (
                    // Active Room Lobby
                    <div className="space-y-4">
                      {/* Big Arcade Code Blocks with Copy */}
                      <div className="flex items-center justify-between rounded-2xl border border-amber-200/25 bg-[#180d07] p-3.5 shadow-inner">
                        <div>
                          <span className="text-[9px] font-black uppercase tracking-widest text-amber-200/60 block">Room Passcode</span>
                          <div className="flex gap-1.5 mt-1">
                            {mpRoom.code.split("").map((char, idx) => (
                              <span
                                key={idx}
                                className="grid size-8 place-items-center rounded-lg border border-amber-200/30 bg-[#25150d] font-mono text-base font-black text-amber-300 shadow"
                              >
                                {char}
                              </span>
                            ))}
                          </div>
                        </div>
                        <button
                          onClick={copyCode}
                          className="flex items-center gap-1.5 rounded-xl border border-amber-100/25 bg-[#2a170d] px-3.5 py-2 text-xs font-bold text-amber-200 shadow transition hover:bg-[#3d2214] cursor-pointer"
                        >
                          {mpCopied ? <Check size={14} className="text-emerald-400" /> : <Copy size={14} />}
                          {mpCopied ? "Copied" : "Copy Code"}
                        </button>
                      </div>

                      {/* Player Roster with Status */}
                      <div>
                        <div className="mb-2 flex items-center justify-between text-xs text-amber-200/75">
                          <span className="font-bold">Joined Players ({mpPlayers.length}/6)</span>
                          <span className="text-[10px] text-amber-200/50">Min 2 players required</span>
                        </div>
                        <div className="space-y-1.5 max-h-40 overflow-y-auto pr-1">
                          {mpPlayers.map(p => (
                            <div
                              key={p.user_id}
                              className={`flex items-center justify-between rounded-xl px-3 py-2 text-xs transition ${p.user_id === currentUserId ? "bg-amber-400/15 border border-amber-300/40" : "bg-[#160b06] border border-amber-100/10"}`}
                            >
                              <div className="flex items-center gap-2.5">
                                <User size={14} className="text-amber-200/70" />
                                <span className="font-bold text-amber-100">{p.display_name}</span>
                                {p.user_id === currentUserId && (
                                  <span className="text-[10px] font-black text-amber-300 uppercase">(You)</span>
                                )}
                              </div>
                              <div className="flex items-center gap-2">
                                {p.user_id === mpRoom.host_id ? (
                                  <span className="flex items-center gap-1 rounded bg-amber-400/20 px-2 py-0.5 text-[9px] font-black uppercase text-amber-300">
                                    <Shield size={10} /> Host
                                  </span>
                                ) : (
                                  <span className="flex items-center gap-1 text-[10px] text-emerald-400 font-semibold">
                                    <CheckCircle2 size={11} /> Ready
                                  </span>
                                )}
                              </div>
                            </div>
                          ))}
                        </div>
                      </div>

                      {/* Guest Ready Up Toggle (For non-hosts) */}
                      {!isHost && (
                        <div className="flex items-center justify-between rounded-xl border border-amber-100/15 bg-[#170e08] p-3 text-xs">
                          <span className="text-amber-200/80">Ready to play?</span>
                          <button
                            onClick={() => setIsGuestReady(r => !r)}
                            className={`rounded-xl px-4 py-1.5 text-xs font-black transition cursor-pointer ${isGuestReady ? "bg-emerald-500 text-black shadow" : "border border-amber-100/25 bg-[#25150c] text-amber-100"}`}
                          >
                            {isGuestReady ? "✓ Ready" : "Set Ready"}
                          </button>
                        </div>
                      )}

                      {/* Lobby Actions */}
                      <div className="flex gap-2 pt-2">
                        {isHost ? (
                          <button
                            onClick={handleStartMpRound}
                            disabled={mpLoading || mpPlayers.length < 2}
                            className="flex flex-1 items-center justify-center gap-2 rounded-2xl bg-amber-300 py-3 text-sm font-black text-[#25170f] shadow-lg transition hover:bg-amber-200 disabled:opacity-50 cursor-pointer"
                          >
                            {mpLoading ? <Loader2 size={16} className="animate-spin" /> : null}
                            {phase === "ready" ? "Start Match" : "Play Again"}
                          </button>
                        ) : (
                          <div className="flex flex-1 items-center justify-center rounded-2xl border border-amber-100/15 bg-[#180d07] py-3 text-xs font-semibold text-amber-200/70">
                            Waiting for host to start match...
                          </div>
                        )}
                        <button
                          onClick={handleLeaveMpRoom}
                          className="rounded-2xl border border-amber-100/20 bg-[#25150d] px-5 py-3 text-xs font-bold text-amber-200 hover:bg-[#382013] cursor-pointer"
                        >
                          Leave
                        </button>
                      </div>
                    </div>
                  )}
                </div>
              )}

              {/* Controls Quick Guide Accordion */}
              <div className="mt-4 border-t border-amber-100/10 pt-3">
                <button
                  onClick={() => setShowControlsGuide(g => !g)}
                  className="flex w-full items-center justify-between text-xs font-bold text-amber-200/60 hover:text-amber-200"
                >
                  <span className="flex items-center gap-1.5">
                    <HelpCircle size={13} /> Controls & Rules Guide
                  </span>
                  <span>{showControlsGuide ? "Hide ▲" : "Show ▼"}</span>
                </button>
                {showControlsGuide && (
                  <div className="mt-2 space-y-1.5 rounded-xl bg-black/40 p-3 text-[11px] leading-relaxed text-amber-100/80">
                    <p>• <strong>Movement:</strong> WASD or Arrow Keys. Hold Shift to sprint or Ctrl to crouch. Press Space to jump onto furniture and painting ledges.</p>
                    <p>• <strong>Camera:</strong> Drag to orbit behind either shoulder. Press C to recenter.</p>
                    <p>• <strong>Wall hiding:</strong> Press G at a foyer mural, W/S to climb, and G or Space to drop. Match its paint and stop moving to blend.</p>
                    <p>• <strong>Hider Disguise:</strong> Stand near a prop and choose it from dropdown. Q/E rotates, F freezes in place, R restores character.</p>
                    <p>• <strong>Seeker Tagging:</strong> Crosshair aims at suspicious props. Click or press F to fire tag blaster.</p>
                  </div>
                )}
              </div>
            </div>
          </div>
        )}

        {/* Mobile On-Screen Movement Controls */}
        {phase === "playing" && (
          <>
            <div className="absolute bottom-5 left-4 flex gap-2 touch-none sm:hidden z-20">
              <button data-control="shift" onPointerDown={holdControl} onLostPointerCapture={releaseControl} className="rounded-xl bg-[#21150f]/90 px-4 py-3 font-bold border border-amber-100/20">
                Run
              </button>
              <button onClick={() => { jumpUntil.current = performance.now() + 115; }} className="rounded-xl bg-[#21150f]/90 px-4 py-3 font-bold border border-amber-100/20">
                Jump
              </button>
            </div>
            <div className="absolute bottom-3 right-3 grid touch-none grid-cols-3 gap-1 sm:hidden z-20">
              <span /><button data-control="w" onPointerDown={holdControl} onLostPointerCapture={releaseControl} aria-label="Move forward" className="rounded-lg bg-slate-900/85 p-3 border border-amber-100/20"><ArrowUp /></button><span />
              <button data-control="a" onPointerDown={holdControl} onLostPointerCapture={releaseControl} aria-label="Move left" className="rounded-lg bg-slate-900/85 p-3 border border-amber-100/20"><ArrowLeft /></button>
              <button data-control="s" onPointerDown={holdControl} onLostPointerCapture={releaseControl} aria-label="Move back" className="rounded-lg bg-slate-900/85 p-3 border border-amber-100/20"><ArrowDown /></button>
              <button data-control="d" onPointerDown={holdControl} onLostPointerCapture={releaseControl} aria-label="Move right" className="rounded-lg bg-slate-900/85 p-3 border border-amber-100/20"><ArrowRight /></button>
            </div>
          </>
        )}
      </main>
        {phase !== "playing" && !mpRoom && !studioOpen && <button type="button" onClick={() => setStudioOpen(true)}
          className="absolute bottom-4 right-4 z-40 flex items-center gap-1.5 rounded-xl border border-amber-100/25 bg-[#25170f] px-3.5 py-2 text-xs font-bold text-amber-100">
          <Palette size={14} /> Paint studio
        </button>}
        {studioOpen && <PaintStudio createModel={createStudioCharacter}
          onSave={design => {
            if (!avatar.current) return;
            avatarPaint.current ??= makePaintSurfaces(avatar.current);
            void avatarPaint.current.load(design);
          }}
          onClose={() => setStudioOpen(false)} />}
    </div>
  );
}
