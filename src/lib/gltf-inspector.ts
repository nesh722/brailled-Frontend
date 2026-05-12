/**
 * Load a GLTF/GLB and return a structured report for binding to the simulator.
 * Use {@link PLAYGROUND_SCENE_GLTF_URL} for the default playground robot (`public/scene.gltf`).
 */
import * as THREE from "three";
import { GLTFLoader } from "three/examples/jsm/loaders/GLTFLoader.js";
import { DRACOLoader } from "three/examples/jsm/loaders/DRACOLoader.js";

export interface GLTFNodeInfo {
  name: string;
  type: string;
  depth: number;
  worldPosition: { x: number; y: number; z: number };
  localRotation: { x: number; y: number; z: number };
  children: GLTFNodeInfo[];
  geometryVertexCount?: number;
  materialName?: string;
  materialType?: string;
  boneIndex?: number;
}

export interface GLTFAnimInfo {
  name: string;
  duration: number;
  trackCount: number;
  tracks: {
    name: string;
    type: string;
    keyframeCount: number;
    targetNodeName: string;
    property: string;
  }[];
}

export interface GLTFInspectionReport {
  fileUrl: string;
  sceneName: string;
  totalMeshes: number;
  totalBones: number;
  totalAnimations: number;
  boundingBox: {
    min: { x: number; y: number; z: number };
    max: { x: number; y: number; z: number };
    size: { x: number; y: number; z: number };
    center: { x: number; y: number; z: number };
  };
  hierarchy: GLTFNodeInfo;
  meshNames: string[];
  boneNames: string[];
  groupNames: string[];
  animations: GLTFAnimInfo[];
  suggestedMapping: {
    body: string | null;
    leftWheel: string | null;
    rightWheel: string | null;
    sensor_distance: string | null;
    sensor_color: string | null;
    arm: string | null;
    hub: string | null;
  };
}

function vec3(v: THREE.Vector3): { x: number; y: number; z: number } {
  return { x: v.x, y: v.y, z: v.z };
}

function classifyTrack(t: THREE.KeyframeTrack): "vector" | "quaternion" | "number" {
  if (t instanceof THREE.QuaternionKeyframeTrack) return "quaternion";
  if (t instanceof THREE.VectorKeyframeTrack) return "vector";
  if (t instanceof THREE.NumberKeyframeTrack) return "number";
  return "number";
}

function parseTrackBindingName(trackName: string): { targetNodeName: string; property: string } {
  const dot = trackName.indexOf(".");
  if (dot === -1) return { targetNodeName: trackName, property: "unknown" };
  return {
    targetNodeName: trackName.slice(0, dot),
    property: trackName.slice(dot + 1),
  };
}

function walkNode(
  obj: THREE.Object3D,
  depth: number,
  meshNames: string[],
  boneNames: string[],
  groupNames: string[],
  meshVertexCounts: Map<string, number>
): GLTFNodeInfo {
  let type = "Object3D";
  if ((obj as THREE.SkinnedMesh).isSkinnedMesh) type = "SkinnedMesh";
  else if ((obj as THREE.Mesh).isMesh) type = "Mesh";
  else if ((obj as THREE.Bone).isBone) type = "Bone";
  else if ((obj as THREE.Group).isGroup) type = "Group";

  const name = obj.name || `(unnamed_${type}_${depth})`;
  if (type === "Mesh" || type === "SkinnedMesh") meshNames.push(name);
  if (type === "Bone") boneNames.push(name);
  if (type === "Group") groupNames.push(name);

  const wp = new THREE.Vector3();
  obj.getWorldPosition(wp);

  const euler = new THREE.Euler().setFromQuaternion(obj.quaternion, obj.rotation.order);

  const info: GLTFNodeInfo = {
    name,
    type,
    depth,
    worldPosition: vec3(wp),
    localRotation: { x: euler.x, y: euler.y, z: euler.z },
    children: [],
  };

  if (type === "Mesh" || type === "SkinnedMesh") {
    const m = obj as THREE.Mesh;
    const pos = m.geometry?.getAttribute("position");
    if (pos) {
      info.geometryVertexCount = pos.count;
      meshVertexCounts.set(name, pos.count);
    }
    const mat = m.material;
    const one = Array.isArray(mat) ? mat[0] : mat;
    if (one) {
      info.materialName = one.name || undefined;
      info.materialType = one.type;
    }
  }

  for (const child of obj.children) {
    info.children.push(walkNode(child, depth + 1, meshNames, boneNames, groupNames, meshVertexCounts));
  }

  return info;
}

function buildAnimations(animations: THREE.AnimationClip[]): GLTFAnimInfo[] {
  return animations.map((clip) => ({
    name: clip.name || "(unnamed_clip)",
    duration: clip.duration,
    trackCount: clip.tracks.length,
    tracks: clip.tracks.map((t: THREE.KeyframeTrack) => {
      const { targetNodeName, property } = parseTrackBindingName(t.name);
      return {
        name: t.name,
        type: classifyTrack(t),
        keyframeCount: t.times.length,
        targetNodeName,
        property,
      };
    }),
  }));
}

function suggestMapping(
  meshNames: string[],
  groupNames: string[],
  meshVertexCounts: Map<string, number>
): GLTFInspectionReport["suggestedMapping"] {
  const all = [...meshNames, ...groupNames].filter(Boolean);
  const low = (s: string) => s.toLowerCase();

  const pick = (re: RegExp) => {
    for (const n of all) {
      if (re.test(low(n))) return n;
    }
    return null;
  };

  let body: string | null = null;
  let maxV = 0;
  for (const n of meshNames) {
    const v = meshVertexCounts.get(n) ?? 0;
    if (v > maxV) {
      maxV = v;
      body = n;
    }
  }
  if (pick(/chassis|body|base|frame|hull|main|car/i)) {
    body = all.find((n) => /chassis|body|base|frame|hull|main|car/i.test(low(n))) ?? body;
  }

  return {
    body,
    leftWheel: pick(/\bleft|l_wheel|wheel_l|leftwheel|wheel\.l|l\.wheel/i),
    rightWheel: pick(/\bright|r_wheel|wheel_r|rightwheel|wheel\.r|r\.wheel/i),
    sensor_distance: pick(/ultra|sonar|distance|timeofflight|tof|lidar|radar|prox/i),
    sensor_color: pick(/color|colour|light|reflec|intensity|cs\b/i),
    arm: pick(/arm|grip|claw|gate|manip|lift|servo/i),
    hub: pick(/hub|matrix|spike|brick|control|cpu/i),
  };
}

/**
 * Build a full report from a loaded gltf.scene and animations.
 */
function buildReport(
  fileUrl: string,
  scene: THREE.Object3D,
  animations: THREE.AnimationClip[]
): GLTFInspectionReport {
  const meshNames: string[] = [];
  const boneNames: string[] = [];
  const groupNames: string[] = [];
  const meshVertexCounts = new Map<string, number>();

  scene.updateMatrixWorld(true);

  const box = new THREE.Box3().setFromObject(scene);
  const size = new THREE.Vector3();
  const center = new THREE.Vector3();
  box.getSize(size);
  box.getCenter(center);

  const hierarchy = walkNode(scene, 0, meshNames, boneNames, groupNames, meshVertexCounts);

  return {
    fileUrl,
    sceneName: scene.name || "Scene",
    totalMeshes: meshNames.length,
    totalBones: boneNames.length,
    totalAnimations: animations.length,
    boundingBox: {
      min: vec3(box.min),
      max: vec3(box.max),
      size: vec3(size),
      center: vec3(center),
    },
    hierarchy,
    meshNames,
    boneNames,
    groupNames,
    animations: buildAnimations(animations),
    suggestedMapping: suggestMapping(meshNames, groupNames, meshVertexCounts),
  };
}

const dracoPath = "https://www.gstatic.com/draco/versioned/decoders/1.5.7/";

/**
 * Load and deeply inspect a GLTF/GLB. Browser-only (uses loaders + Draco from CDN).
 * @param url — e.g. `"/scene.gltf"` for `public/scene.gltf`
 */
export async function inspectGLTF(url: string): Promise<GLTFInspectionReport> {
  const loader = new GLTFLoader();
  const dracoLoader = new DRACOLoader();
  dracoLoader.setDecoderPath(dracoPath);
  loader.setDRACOLoader(dracoLoader);

  try {
    const gltf = await new Promise<{
      scene: THREE.Group;
      animations: THREE.AnimationClip[];
    }>((resolve, reject) => {
      loader.load(
        url,
        (g: { scene: THREE.Group; animations: THREE.AnimationClip[] }) => resolve({ scene: g.scene, animations: g.animations }),
        undefined,
        reject
      );
    });
    const report = buildReport(url, gltf.scene, gltf.animations);
    return report;
  } finally {
    dracoLoader.dispose();
  }
}
