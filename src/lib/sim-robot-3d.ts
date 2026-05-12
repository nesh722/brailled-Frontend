/**
 * 3D playground: floor, grid, lighting, and the robot from {@link PLAYGROUND_SCENE_GLTF_URL}.
 * If the GLTF cannot load (e.g. missing `scene.bin`), a simple block placeholder is used so the
 * sim always shows a 3D scene and moving robot.
 */
import * as THREE from "three";
import { OrbitControls } from "three/examples/jsm/controls/OrbitControls.js";
import { GLTFLoader } from "three/examples/jsm/loaders/GLTFLoader.js";
import { DRACOLoader } from "three/examples/jsm/loaders/DRACOLoader.js";
import { PLAYGROUND_ROBOT_HEADING_YAW_OFFSET_RAD, PLAYGROUND_SCENE_GLTF_URL } from "../data/gltf-config";
import type { RobotModel } from "../data/robot-models";
import type { SimState } from "./sim-engine";

const DRACO_DECODER = "https://www.gstatic.com/draco/versioned/decoders/1.5.7/";

const GLTF_LOG = "[sim-robot-3d][gltf]";

function gltfLog(message: string, data?: unknown): void {
  if (data !== undefined) {
    console.log(GLTF_LOG, message, data);
  } else {
    console.log(GLTF_LOG, message);
  }
}

/** e.g. Vite HMR restarts while ~18MB scene.bin is downloading → net::ERR_CONTENT_LENGTH_MISMATCH. */
function isGltfBufferLoadRetriable(e: unknown): boolean {
  const s = e instanceof Error ? e.message : String(e);
  return s.includes("Failed to load buffer");
}

/** True if the JSON (or a quick .glb header scan) references Draco-compressed buffers. */
async function gltfAssetUsesDraco(gltfUrl: string): Promise<boolean> {
  if (gltfUrl.toLowerCase().endsWith(".glb")) {
    try {
      const r = await fetch(gltfUrl, { method: "GET" });
      const ab = await r.arrayBuffer();
      if (ab.byteLength < 28) return false;
      const le = new DataView(ab);
      if (le.getUint32(0, true) !== 0x46546c67) return false; // "glTF"
      const jsonChunkLen = le.getUint32(12, true);
      if (le.getUint32(16, true) !== 0x4e4f534a) return false; // JSON
      if (ab.byteLength < 20 + jsonChunkLen) return false;
      const u8 = new Uint8Array(ab, 20, jsonChunkLen);
      const s = new TextDecoder("utf-8", { fatal: false }).decode(u8);
      const draco = s.includes("KHR_draco_mesh_compression");
      gltfLog("gltfAssetUsesDraco: scanned .glb JSON chunk", { draco, url: gltfUrl });
      return draco;
    } catch (e) {
      gltfLog("gltfAssetUsesDraco: .glb scan failed, assuming Draco may be used", e);
      return true;
    }
  }
  try {
    const t = await (await fetch(gltfUrl)).text();
    const draco = t.includes("KHR_draco_mesh_compression");
    gltfLog("gltfAssetUsesDraco: scanned .gltf text", { draco, url: gltfUrl });
    return draco;
  } catch (e) {
    gltfLog("gltfAssetUsesDraco: scan failed, assuming Draco may be used", e);
    return true;
  }
}

/**
 * For `.gltf` (not `.glb`), ensure external buffer files exist (e.g. `scene.bin`) so we don’t
 * run GLTFLoader with missing data and get RangeError in the console.
 */
async function preflightGltfExternalBuffers(gltfUrl: string): Promise<
  { ok: true } | { ok: false; html: string }
> {
  if (gltfUrl.toLowerCase().endsWith(".glb")) {
    gltfLog("preflight: .glb — external buffer check skipped (self-contained)");
    return { ok: true };
  }
  if (!gltfUrl.toLowerCase().endsWith(".gltf")) {
    gltfLog("preflight: not .gltf/.glb — skipped", { gltfUrl });
    return { ok: true };
  }
  gltfLog("preflight: checking external buffers for", gltfUrl);
  let root: { buffers?: { uri?: string; byteLength?: number }[] };
  const base = new URL(gltfUrl, typeof window !== "undefined" ? window.location.href : "http://local/");
  try {
    const r = await fetch(gltfUrl, { method: "GET" });
    if (!r.ok) {
      gltfLog("preflight: failed to fetch .gltf", { status: r.status, url: gltfUrl });
      return {
        ok: false,
        html: `Could not read the glTF file (HTTP ${r.status}). Check <code>PLAYGROUND_SCENE_GLTF_URL</code> in <code>gltf-config.ts</code>.`,
      };
    }
    root = (await r.json()) as { buffers?: { uri?: string }[] };
    gltfLog("preflight: parsed .gltf JSON", { bufferCount: root.buffers?.length ?? 0 });
  } catch (e) {
    gltfLog("preflight: .gltf read error", e);
    return {
      ok: false,
      html: `Could not read the glTF JSON. ${e instanceof Error ? e.message : ""}`.trim(),
    };
  }
  for (const b of root.buffers ?? []) {
    const uri = b.uri;
    if (!uri || uri.startsWith("data:")) {
      if (uri?.startsWith("data:")) gltfLog("preflight: buffer embedded (data: URI), ok");
      continue;
    }
    const abs = new URL(uri, base).href;
    gltfLog("preflight: buffer", { uri, resolved: abs });
    const head = await fetch(abs, { method: "HEAD" }).catch(() => null);
    if (head) {
      const expected = b.byteLength;
      const cl = head.headers.get("content-length");
      if (head.ok && cl != null && expected != null) {
        const n = parseInt(cl, 10);
        if (n !== expected) {
          gltfLog("preflight: WARNING — Content-Length on server !== gltf buffer byteLength (corrupt or wrong file?)", {
            uri,
            contentLength: n,
            expectedFromGltf: expected,
          });
        } else {
          gltfLog("preflight: buffer size matches .gltf (byteLength)", { uri, bytes: expected });
        }
      } else if (head.ok && expected != null) {
        gltfLog("preflight: no Content-Length in HEAD; cannot verify size", { uri, expectedFromGltf: expected });
      }
      gltfLog("preflight: HEAD", { status: head.status, ok: head.ok });
      if (head.status === 404) {
        const name = uri.split("/").pop() ?? uri;
        return {
          ok: false,
          html: `<strong>Missing: <code>public/${name}</code></strong> — <code>scene.gltf</code> is only the scene description. The real robot mesh lives in a separate <code>*.bin</code> file. Copy <code><strong>${name}</strong></code> from the <em>same export</em> as your <code>scene.gltf</code> into the <code>public</code> folder, then reload. Or re-export a single <code>.glb</code> and set <code>PLAYGROUND_SCENE_GLTF_URL = \"/your.glb\"</code> in <code>gltf-config.ts</code>.`,
        };
      }
      if (head.ok) continue;
    }
    const probe = await fetch(abs, { method: "GET", headers: { Range: "bytes=0-0" } }).catch(
      () => null
    );
    if (probe && probe.ok) continue;
    const get = await fetch(abs, { method: "GET" }).catch(() => null);
    if (!get || !get.ok) {
      gltfLog("preflight: buffer fetch failed", { uri, status: get?.status });
      return {
        ok: false,
        html: `Could not load buffer <code>${uri}</code>${get ? ` (HTTP ${get.status})` : ""}. Place it where the browser can request it, next to the <code>.gltf</code> file.`,
      };
    }
    gltfLog("preflight: buffer ok (GET fallback)", { uri, contentLength: get.headers.get("content-length") });
  }
  gltfLog("preflight: all external buffers OK");
  return { ok: true };
}

function showFallbackHint(
  host: HTMLElement,
  html: string,
  force = false
): { remove: () => void } {
  if (host.querySelector(".sim-3d-fallback-hint")) {
    return { remove: () => undefined };
  }
  if (!force && sessionStorage.getItem("brailleSimGltfHintDismissed") === "1") {
    return { remove: () => undefined };
  }
  const wrap = document.createElement("div");
  wrap.className = "sim-3d-fallback-hint";
  wrap.setAttribute("role", "status");
  wrap.innerHTML = `${html}<div class="sim-3d-fallback-actions"><button type="button" class="sim-3d-fallback-dismiss">Dismiss</button></div>`;
  const btn = wrap.querySelector<HTMLButtonElement>(".sim-3d-fallback-dismiss");
  btn?.addEventListener("click", () => {
    sessionStorage.setItem("brailleSimGltfHintDismissed", "1");
    wrap.remove();
  });
  host.appendChild(wrap);
  return {
    remove: () => {
      if (wrap.parentNode) wrap.remove();
    },
  };
}

/** World units for the ground; sim mm coordinates are scaled so the field fits this span. */
const FIELDWorldSpan = 20;

const SCENE_BG = 0xeef1f5;

/**
 * glTF (e.g. LEGO) often comes in with a flipped “up” vs our Y-up field. Rotate 180° about X
 * so the robot sits on the field right-way up. Adjust if your export is already correct.
 */
const GLTF_UP_CORRECTION = new THREE.Euler(Math.PI, 0, 0, "XYZ");

function stripLightsAndCameras(root: THREE.Object3D): void {
  const remove: THREE.Object3D[] = [];
  root.traverse((o) => {
    if ((o as THREE.Light).isLight) remove.push(o);
    if ((o as THREE.Camera).isCamera) remove.push(o);
  });
  for (const o of remove) o.parent?.remove(o);
}

function pickRobotRoot(loaded: THREE.Object3D): THREE.Object3D {
  const robo = loaded.getObjectByName("Robo");
  if (robo) return robo;
  return loaded;
}

const WHEEL_NAME_RE = /wheel|tire|tyre|gumi|driving|drive[_\s-]*wheel/i;
/** If sim position jumps this far in world space, snap instead of smooth chase (e.g. reset). */
const POSE_SNAP_DIST_WORLD = 2.5;
const VIS_POS_LAMBDA = 12;
const VIS_ROT_LAMBDA = 20;

function lerpShortestAngleY(from: number, to: number, t: number): number {
  let d = to - from;
  while (d > Math.PI) d -= 2 * Math.PI;
  while (d < -Math.PI) d += 2 * Math.PI;
  return from + d * t;
}

/**
 * Picks left/right drive wheel groups by world X; mesh names may include "wheel" / "tire" / etc.
 * Drive rotation is applied around local X (common LEGO export) — if your asset rolls the wrong
 * way, we can add an axis or sign override later.
 */
function findWheelBinds(robotLocalRoot: THREE.Object3D): { left: THREE.Object3D[]; right: THREE.Object3D[] } {
  const candidates: THREE.Object3D[] = [];
  robotLocalRoot.updateMatrixWorld(true);
  robotLocalRoot.traverse((o) => {
    if (!o.name || !WHEEL_NAME_RE.test(o.name)) return;
    if ((o as THREE.Mesh).isMesh || (o as THREE.Group).isGroup) {
      candidates.push(o);
    }
  });
  if (candidates.length === 0) {
    return { left: [], right: [] };
  }
  const p = new THREE.Vector3();
  const scored = candidates.map((o) => {
    o.getWorldPosition(p);
    return { o, wx: p.x };
  });
  scored.sort((a, b) => a.wx - b.wx);
  if (scored.length === 1) {
    return { left: [scored[0]!.o], right: [] };
  }
  const minX = scored[0]!.wx;
  const maxX = scored[scored.length - 1]!.wx;
  const mid = (minX + maxX) / 2;
  const left: THREE.Object3D[] = [];
  const right: THREE.Object3D[] = [];
  for (const { o, wx } of scored) {
    if (wx < mid) left.push(o);
    else right.push(o);
  }
  if (left.length === 0) {
    const half = Math.floor(scored.length / 2);
    return { left: scored.slice(0, half).map((s) => s.o), right: scored.slice(half).map((s) => s.o) };
  }
  if (right.length === 0) {
    const half = Math.ceil(scored.length / 2);
    return { left: scored.slice(0, half).map((s) => s.o), right: scored.slice(half).map((s) => s.o) };
  }
  return { left, right };
}

function logGltfAnimations(animations: THREE.AnimationClip[] | undefined): void {
  if (!animations?.length) {
    gltfLog(
      "no animation clips in this glTF — using smooth pose follow; wheel roll uses motor position on meshes with wheel / tire in the name (see wheel candidate log)"
    );
    return;
  }
  for (const clip of animations) {
    const sampleTrackNames = clip.tracks.slice(0, 8).map((t) => t.name);
    gltfLog("animation clip", {
      name: clip.name,
      duration: clip.duration,
      trackCount: clip.tracks.length,
      sampleTrackNames,
    });
  }
}

function applyWheelRoll(robot: THREE.Object3D, s: SimState, model: RobotModel | null): void {
  if (!model) return;
  const wb = robot.userData.wheelBinds as { left: THREE.Object3D[]; right: THREE.Object3D[] } | undefined;
  if (!wb || (wb.left.length === 0 && wb.right.length === 0)) return;
  const lPort = model.motorPorts.left;
  const rPort = model.motorPorts.right;
  const lDeg = s.motors[lPort]?.positionDeg ?? 0;
  const rDeg = s.motors[rPort]?.positionDeg ?? 0;
  const lRad = THREE.MathUtils.degToRad(lDeg);
  const rRad = THREE.MathUtils.degToRad(rDeg);
  for (const o of wb.left) {
    if (o.userData._rollBaseX === undefined) o.userData._rollBaseX = o.rotation.x;
    o.rotation.x = o.userData._rollBaseX - lRad;
  }
  for (const o of wb.right) {
    if (o.userData._rollBaseX === undefined) o.userData._rollBaseX = o.rotation.x;
    o.rotation.x = o.userData._rollBaseX - rRad;
  }
}

/** Visible stand-in if GLTF is missing (e.g. `scene.bin` not in `public/`). */
function makePlaceholderRobot(): THREE.Group {
  const g = new THREE.Group();
  const w = 0.95;
  const h = 0.32;
  const d = 1.0;
  const mat = new THREE.MeshStandardMaterial({
    color: 0x2d4a6f,
    metalness: 0.2,
    roughness: 0.55,
  });
  const body = new THREE.Mesh(new THREE.BoxGeometry(w, h, d), mat);
  body.position.set(0, h / 2, 0);
  body.castShadow = true;
  g.add(body);
  const mark = new THREE.Mesh(
    new THREE.ConeGeometry(0.15, 0.35, 8),
    new THREE.MeshStandardMaterial({ color: 0x7eb8ff, metalness: 0.1, roughness: 0.4 })
  );
  mark.position.set(0, h + 0.1, d * 0.35);
  mark.rotation.x = Math.PI;
  mark.castShadow = true;
  g.add(mark);
  g.userData.isPlaceholder = true;
  return g;
}

function addFieldSurface(
  worldGroup: THREE.Group,
  widthWorld: number,
  depthWorld: number
): { ground: THREE.Mesh; grid: THREE.GridHelper } {
  const pad = 0.5;
  const gw = widthWorld + pad * 2;
  const gd = depthWorld + pad * 2;
  const ground = new THREE.Mesh(
    new THREE.PlaneGeometry(gw, gd),
    new THREE.MeshStandardMaterial({
      color: 0xe4e8f0,
      metalness: 0,
      roughness: 0.82,
    })
  );
  ground.rotation.x = -Math.PI / 2;
  ground.receiveShadow = true;
  const grid = new THREE.GridHelper(
    Math.max(gw, gd),
    Math.max(12, Math.round(Math.max(gw, gd))),
    0x8b98a8,
    0xb8c0cc
  );
  grid.position.y = 0.003;
  worldGroup.add(ground, grid);
  return { ground, grid };
}

export type SimRobot3D = {
  /**
   * Updates sim-reported pose; the body follows smoothly each frame. Pass the current
   * {@link RobotModel} so left/right drive ports drive wheel roll on matching meshes.
   */
  setPose: (s: SimState, model?: RobotModel | null) => void;
  setSize: () => void;
  setBlink: (on: boolean) => void;
  /** Re-center the camera on the field (after orbit / zoom / pan). */
  resetView: () => void;
  load: () => Promise<void>;
  dispose: () => void;
};

export function createSimRobot3D(
  host: HTMLElement,
  gltfUrl: string = PLAYGROUND_SCENE_GLTF_URL
): SimRobot3D {
  const scene = new THREE.Scene();
  scene.background = new THREE.Color(SCENE_BG);
  scene.fog = new THREE.Fog(SCENE_BG, 50, 130);

  const camera = new THREE.PerspectiveCamera(42, 1, 0.2, 200);

  const renderer = new THREE.WebGLRenderer({
    antialias: true,
    alpha: false,
  });
  renderer.setPixelRatio(Math.min(2, window.devicePixelRatio || 1));
  renderer.setClearColor(SCENE_BG, 1);
  renderer.outputColorSpace = THREE.SRGBColorSpace;
  renderer.toneMapping = THREE.ACESFilmicToneMapping;
  renderer.toneMappingExposure = 1.12;
  renderer.shadowMap.enabled = true;
  renderer.shadowMap.type = THREE.PCFSoftShadowMap;
  host.appendChild(renderer.domElement);

  const controls = new OrbitControls(camera, renderer.domElement);
  controls.enableDamping = true;
  controls.dampingFactor = 0.05;
  controls.target.set(0, 0, 0);
  controls.minDistance = 4;
  controls.maxDistance = 160;
  controls.maxPolarAngle = Math.PI * 0.49;
  controls.minPolarAngle = 0.12;
  controls.screenSpacePanning = true;
  controls.mouseButtons.LEFT = THREE.MOUSE.ROTATE;
  controls.mouseButtons.MIDDLE = THREE.MOUSE.DOLLY;
  controls.mouseButtons.RIGHT = THREE.MOUSE.PAN;

  const worldGroup = new THREE.Group();
  scene.add(worldGroup);

  const hemi = new THREE.HemisphereLight(0xffffff, 0x6a6a70, 0.85);
  const ambient = new THREE.AmbientLight(0xffffff, 0.32);
  const lightDir = new THREE.DirectionalLight(0xfffcf5, 1.2);
  lightDir.position.set(10, 22, 8);
  lightDir.castShadow = true;
  lightDir.shadow.mapSize.set(2048, 2048);
  lightDir.shadow.camera.near = 0.5;
  lightDir.shadow.camera.far = 80;
  lightDir.shadow.camera.left = -25;
  lightDir.shadow.camera.right = 25;
  lightDir.shadow.camera.top = 25;
  lightDir.shadow.camera.bottom = -25;
  const fill = new THREE.DirectionalLight(0xd8e4ff, 0.55);
  fill.position.set(-12, 10, -6);
  const rim = new THREE.DirectionalLight(0xffeedd, 0.45);
  rim.position.set(-5, 8, 14);
  const bounce = new THREE.DirectionalLight(0xe8ecf2, 0.35);
  bounce.position.set(0, 2, 0);
  scene.add(hemi, ambient, lightDir, fill, rim, bounce);

  let lastField: { w: number; h: number } = { w: 4000, h: 4000 };
  const { ground: fieldGround, grid: fieldGrid } = addFieldSurface(worldGroup, FIELDWorldSpan, FIELDWorldSpan);

  let robot: THREE.Object3D | null = null;
  let pendingSim: SimState | null = null;
  let mmToWorld = FIELDWorldSpan / 4000;
  /** Sum of glTF tuning: mesh front vs sim forward (see `PLAYGROUND_ROBOT_HEADING_YAW_OFFSET_RAD`). */
  const modelYawOffset = PLAYGROUND_ROBOT_HEADING_YAW_OFFSET_RAD;
  const clock = new THREE.Clock();
  let raf = 0;
  let rafAlive = true;
  let loopStarted = false;
  let blinkT = 0;
  let fallbackHint: HTMLDivElement | null = null;
  const blinkColor = new THREE.Color(0xffab19);
  const resizeObserver = new ResizeObserver(() => setSizeInternal());
  let lastDriveModel: RobotModel | null = null;

  /** Framing the field: place camera in default orbit position (user can orbit / zoom / pan after). */
  function frameField(): void {
    const w = host.clientWidth;
    const h = host.clientHeight;
    if (w <= 0 || h <= 0) return;
    const fW = lastField.w;
    const fH = lastField.h;
    const scale = FIELDWorldSpan / Math.max(fW, fH, 1);
    const halfW = (fW * scale) / 2;
    const halfD = (fH * scale) / 2;
    const radius = Math.sqrt(halfW * halfW + halfD * halfD);
    const dist = Math.max(radius * 2.1, 9);
    const elev = dist * 0.5;
    camera.near = 0.1;
    camera.far = dist * 7;
    camera.aspect = w / h;
    camera.position.set(radius * 0.88, elev, dist * 0.78);
    camera.lookAt(0, 0, 0);
    camera.updateProjectionMatrix();
    controls.target.set(0, 0, 0);
    controls.update();
  }

  function setSizeInternal(): void {
    const w = host.clientWidth;
    const h = host.clientHeight;
    renderer.setSize(w, h, false);
    if (w > 0 && h > 0) {
      camera.aspect = w / h;
      camera.updateProjectionMatrix();
    }
    controls.update();
  }

  function startLoop(): void {
    if (loopStarted) return;
    loopStarted = true;
    const tick = (): void => {
      if (!rafAlive) return;
      raf = requestAnimationFrame(tick);
      const delta = Math.min(0.1, clock.getDelta());
      updateRobotVisuals(delta);
      if (blinkT > 0) {
        blinkT -= 0.08;
        const pulse = (Math.sin(blinkT * 18) * 0.5 + 0.5) * Math.min(1, blinkT);
        applyBlinkToMeshes(pulse);
        if (blinkT <= 0) applyBlinkToMeshes(0);
      }
      controls.update();
      renderer.render(scene, camera);
    };
    raf = requestAnimationFrame(tick);
  }

  function syncVisualTargets(s: SimState): void {
    if (!robot) return;
    const { widthMm, heightMm } = s.field;
    lastField = { w: widthMm, h: heightMm };
    mmToWorld = FIELDWorldSpan / Math.max(widthMm, heightMm, 1);
    const x = (s.xMm - widthMm / 2) * mmToWorld;
    const z = (s.yMm - heightMm / 2) * mmToWorld;
    // `−heading` (rad) + mesh offset: sim forward is −Z at 0°; see `PLAYGROUND_ROBOT_HEADING_YAW_OFFSET_RAD` in gltf-config.
    const targetRotY = -THREE.MathUtils.degToRad(s.headingDeg) + modelYawOffset;
    if (robot.userData.isPlaceholder) {
      robot.position.set(x, 0, z);
      robot.rotation.y = targetRotY;
      return;
    }
    if (!robot.userData.visual) robot.userData.visual = {};
    const v = robot.userData.visual as {
      targetX: number;
      targetZ: number;
      targetRotY: number;
      pendingSnap?: boolean;
    };
    v.targetX = x;
    v.targetZ = z;
    v.targetRotY = targetRotY;
    if (!robot.userData._poseVisualsInited) {
      v.pendingSnap = true;
      robot.userData._poseVisualsInited = true;
    } else {
      const dist = Math.hypot(x - robot.position.x, z - robot.position.z);
      if (dist > POSE_SNAP_DIST_WORLD) {
        v.pendingSnap = true;
      }
    }
  }

  function updateRobotVisuals(delta: number): void {
    if (!robot) return;
    if (robot.userData.isPlaceholder) return;
    const v = robot.userData.visual as
      | {
          targetX: number;
          targetZ: number;
          targetRotY: number;
          pendingSnap?: boolean;
        }
      | undefined;
    if (!v || v.targetX === undefined) return;
    const aPos = 1 - Math.exp(-VIS_POS_LAMBDA * delta);
    const aRot = 1 - Math.exp(-VIS_ROT_LAMBDA * delta);
    if (v.pendingSnap) {
      robot.position.x = v.targetX;
      robot.position.z = v.targetZ;
      robot.rotation.y = v.targetRotY;
      v.pendingSnap = false;
    } else {
      robot.position.x += (v.targetX - robot.position.x) * aPos;
      robot.position.z += (v.targetZ - robot.position.z) * aPos;
      robot.rotation.y = lerpShortestAngleY(robot.rotation.y, v.targetRotY, aRot);
    }
    const s = pendingSim;
    if (!s) return;
    applyWheelRoll(robot, s, lastDriveModel);
  }

  function applyBlinkToMeshes(intensity: number): void {
    if (!robot) return;
    robot.traverse((o) => {
      if (!(o as THREE.Mesh).isMesh) return;
      const m = (o as THREE.Mesh).material;
      if (!m) return;
      const mat = m as THREE.MeshStandardMaterial;
      const isStd = mat.isMeshStandardMaterial;
      const isPhys = (m as unknown as THREE.MeshPhysicalMaterial).isMeshPhysicalMaterial;
      if (!isStd && !isPhys) return;
      if (intensity > 0) {
        if (!mat.userData._prevEm) {
          mat.userData._prevEm = mat.emissive?.clone() ?? new THREE.Color(0);
          mat.userData._prevEi = mat.emissiveIntensity;
        }
        mat.emissive.copy(blinkColor);
        mat.emissiveIntensity = 0.3 + intensity * 0.8;
      } else {
        if (mat.userData._prevEm) {
          mat.emissive.copy(mat.userData._prevEm);
          mat.emissiveIntensity = mat.userData._prevEi ?? 0;
          delete mat.userData._prevEm;
          delete mat.userData._prevEi;
        }
      }
    });
  }

  function attachRobot(r: THREE.Object3D, fromGltf: boolean): void {
    if (robot) {
      worldGroup.remove(robot);
    }
    robot = r;
    worldGroup.add(robot);
    if (fromGltf) {
      delete host.dataset.gltfError;
    } else {
      host.dataset.gltfError = "placeholder";
    }
  }

  resizeObserver.observe(host);
  setSizeInternal();
  startLoop();

  return {
    setPose(s: SimState, model?: RobotModel | null): void {
      pendingSim = s;
      if (model !== undefined) lastDriveModel = model;
      if (robot) {
        const ud = robot.userData as { _lastSim?: SimState };
        ud._lastSim = s;
        syncVisualTargets(s);
      }
    },
    setSize: () => setSizeInternal(),
    resetView: () => frameField(),
    setBlink(on: boolean): void {
      if (on) blinkT = 1.2;
    },
    async load(): Promise<void> {
      gltfLog("load() starting", { url: gltfUrl, location: typeof window !== "undefined" ? window.location.href : "" });
      host.querySelectorAll(".sim-3d-fallback-hint").forEach((n) => n.remove());
      fallbackHint = null;

      const pre = await preflightGltfExternalBuffers(gltfUrl);
      if (!pre.ok) {
        gltfLog("preflight failed — using placeholder, skipping GLTFLoader");
        host.dataset.gltfError = "model";
        attachRobot(makePlaceholderRobot(), false);
        showFallbackHint(host, pre.html, true);
        fallbackHint = host.querySelector(".sim-3d-fallback-hint");
        if (robot && pendingSim) {
          (robot.userData as { _lastSim?: SimState })._lastSim = pendingSim;
          syncVisualTargets(pendingSim);
        }
        setSizeInternal();
        frameField();
        return;
      }

      gltfLog("preflight passed — running GLTFLoader.load (with retry on large-buffer / dev-server hiccups)");
      const usesDraco = await gltfAssetUsesDraco(gltfUrl);
      if (usesDraco) {
        gltfLog("DRACO will be used if loader requests it", { decoderPath: DRACO_DECODER });
      } else {
        gltfLog("no KHR_draco in asset — GLTFLoader without DRACOLoader");
      }
      const maxAttempts = 3;
      let usedPlaceholder = true;
      const runOneGltfLoad = (attempt: number): Promise<{ scene: THREE.Group; animations?: THREE.AnimationClip[] }> => {
        let lastLoggedPct = -1;
        return new Promise((resolve, reject) => {
          const loader = new GLTFLoader();
          let localDraco: DRACOLoader | null = null;
          if (usesDraco) {
            localDraco = new DRACOLoader();
            localDraco.setDecoderPath(DRACO_DECODER);
            loader.setDRACOLoader(localDraco);
            gltfLog("GLTF attempt: DRACOLoader attached", { attempt, decoderPath: DRACO_DECODER });
          }
          loader.load(
            gltfUrl,
            (g) => {
              localDraco?.dispose();
              gltfLog("GLTFLoader onLoad fired", { attempt });
              resolve(g);
            },
            (event: ProgressEvent) => {
              if (event.lengthComputable) {
                const pct = Math.floor((100 * event.loaded) / event.total);
                if (pct - lastLoggedPct >= 10 || event.loaded === event.total) {
                  lastLoggedPct = pct;
                  gltfLog("download progress", {
                    attempt,
                    pct,
                    loaded: event.loaded,
                    total: event.total,
                    note: "first file is usually the .gltf JSON; the next fetches are buffer(s) like scene.bin",
                  });
                }
              } else {
                gltfLog("download progress (no total)", { attempt, loaded: event.loaded });
              }
            },
            (err) => {
              localDraco?.dispose();
              gltfLog("GLTFLoader onError", { attempt, err });
              reject(err);
            }
          );
        });
      };
      try {
        let gltf: { scene: THREE.Group; animations?: THREE.AnimationClip[] } | undefined;
        for (let att = 1; att <= maxAttempts; att++) {
          try {
            if (att > 1) {
              const delay = 500 * (att - 1);
              gltfLog(
                `retry ${att}/${maxAttempts} in ${delay}ms (e.g. Vite "connection lost" during large scene.bin)`,
                {
                  tip: "use a stable dev server, or: npm run build && npm run preview",
                }
              );
              await new Promise((r) => setTimeout(r, delay));
            }
            gltf = await runOneGltfLoad(att);
            break;
          } catch (e) {
            if (att < maxAttempts && isGltfBufferLoadRetriable(e)) {
              gltfLog("load attempt failed, retrying", e);
              continue;
            }
            if (isGltfBufferLoadRetriable(e)) {
              console.info(
                `${GLTF_LOG} Tip: If the console also showed "ERR_CONTENT_LENGTH_MISMATCH" or Vite "server connection lost", ` +
                  "wait for the dev server to settle, then hard-refresh, or use \`npm run build && npm run preview\` to test large public/scene.bin."
              );
            }
            throw e;
          }
        }
        if (!gltf) throw new Error("GLTF load: no result after retries");
        stripLightsAndCameras(gltf.scene);
        const pivot = pickRobotRoot(gltf.scene);
        pivot.updateMatrixWorld(true);
        const box = new THREE.Box3().setFromObject(pivot);
        const size = new THREE.Vector3();
        const center = new THREE.Vector3();
        box.getSize(size);
        box.getCenter(center);
        const maxDim = Math.max(size.x, size.y, size.z, 1e-3);
        const targetSize = 1.1 * (FIELDWorldSpan / 14);
        const uniform = targetSize / maxDim;
        pivot.position.sub(center);
        const modelRoot = new THREE.Group();
        modelRoot.name = "GltfUpCorrection";
        modelRoot.rotation.copy(GLTF_UP_CORRECTION);
        modelRoot.add(pivot);
        const g = new THREE.Group();
        g.add(modelRoot);
        g.scale.setScalar(uniform);
        const box2 = new THREE.Box3().setFromObject(g);
        const baseY = -box2.min.y;
        g.position.set(0, baseY, 0);
        attachRobot(g, true);
        usedPlaceholder = false;
        let meshCount = 0;
        gltf.scene.traverse((o) => {
          if ((o as THREE.Mesh).isMesh) meshCount += 1;
        });
        gltfLog("robot attached from GLB/gltf", {
          sceneName: gltf.scene.name || "(root)",
          animationClips: gltf.animations?.length ?? 0,
          rootChildren: gltf.scene.children.length,
          meshCount,
          pivotName: pivot.name || "(pivot)",
          worldScale: uniform,
        });
        logGltfAnimations(gltf.animations);
        const wheelBinds = findWheelBinds(pivot);
        g.userData.wheelBinds = wheelBinds;
        gltfLog("wheel meshes for procedural roll (L/R from world X; names should match /wheel|tire|tyre|…/)", {
          left: wheelBinds.left.map((o) => o.name),
          right: wheelBinds.right.map((o) => o.name),
        });
        sessionStorage.removeItem("brailleSimGltfHintDismissed");
        host.querySelectorAll(".sim-3d-fallback-hint").forEach((n) => n.remove());
        fallbackHint = null;
      } catch (e) {
        const msg = e instanceof Error ? e.message : String(e);
        gltfLog("load() catch — full error", e);
        if (msg.includes("typed array") || msg.includes("RangeError")) {
          console.warn(
            "[sim-robot-3d] GLTF buffer parse error — scene.bin may be the wrong file, truncated, or not paired with this scene.gltf. Re-copy both from the same export, or use a single .glb. Error:",
            e
          );
        } else {
          console.warn(
            "[sim-robot-3d] GLTF load failed (often missing or mismatched scene.bin). Error:",
            e
          );
        }
        host.dataset.gltfError = "model";
        const ph = makePlaceholderRobot();
        attachRobot(ph, false);
        if (!host.querySelector(".sim-3d-fallback-hint")) {
          showFallbackHint(
            host,
            "<strong>Robot model not loaded</strong> — stand-in in use. If you added <code>scene.bin</code>, do a <strong>hard refresh</strong> (Ctrl+Shift+R) and ensure the file is exactly <code>public/scene.bin</code> and pairs with <code>scene.gltf</code>.",
            true
          );
          fallbackHint = host.querySelector(".sim-3d-fallback-hint");
        }
      }

      if (robot && pendingSim) {
        (robot.userData as { _lastSim?: SimState })._lastSim = pendingSim;
        syncVisualTargets(pendingSim);
      }
      setSizeInternal();
      frameField();
      if (usedPlaceholder && !host.querySelector(".sim-3d-fallback-hint")) {
        const hint = document.createElement("div");
        hint.className = "sim-3d-fallback-hint";
        hint.setAttribute("role", "alert");
        hint.innerHTML =
          "<strong>Robot model not loaded</strong> — you’re seeing a stand-in box. " +
          "Add <code>public/scene.bin</code> (same export as <code>scene.gltf</code>), " +
          "or use a single <code>.glb</code> and set <code>PLAYGROUND_SCENE_GLTF_URL</code> in " +
          "<code>gltf-config.ts</code>. " +
          "<div class=\"sim-3d-fallback-actions\"><button type=\"button\" class=\"sim-3d-fallback-dismiss\">Dismiss</button></div>";
        const d = hint.querySelector<HTMLButtonElement>(".sim-3d-fallback-dismiss");
        d?.addEventListener("click", () => {
          sessionStorage.setItem("brailleSimGltfHintDismissed", "1");
          hint.remove();
        });
        host.appendChild(hint);
        fallbackHint = hint;
      }
    },
    dispose(): void {
      resizeObserver.disconnect();
      rafAlive = false;
      cancelAnimationFrame(raf);
      controls.dispose();
      fallbackHint?.remove();
      fallbackHint = null;
      if (robot) {
        worldGroup.remove(robot);
        robot.traverse((o) => {
          if (!(o as THREE.Mesh).isMesh) return;
          const mesh = o as THREE.Mesh;
          mesh.geometry?.dispose();
          const mat = mesh.material;
          if (Array.isArray(mat)) mat.forEach((m) => m.dispose());
          else (mat as THREE.Material | undefined)?.dispose();
        });
      }
      fieldGround.geometry.dispose();
      (fieldGround.material as THREE.Material).dispose();
      fieldGrid.geometry.dispose();
      (fieldGrid.material as THREE.LineBasicMaterial | THREE.Material).dispose();
      renderer.dispose();
      if (host.contains(renderer.domElement)) {
        host.removeChild(renderer.domElement);
      }
    },
  };
}
