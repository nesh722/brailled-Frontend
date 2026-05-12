import type { Command, PortLetter, SimAction } from "../types/app";
import type { RobotModel } from "../data/robot-models";
import { clamp } from "./utils";

/** Field size in millimetres (top-down view). */
export type SimField = { widthMm: number; heightMm: number };

export const DEFAULT_FIELD: SimField = { widthMm: 4000, heightMm: 4000 };

export type MotorPortState = {
  running: boolean;
  /** Degrees per second (signed) — simulation */
  velocityDps: number;
  /** Cumulative relative rotation since reset (deg) */
  positionDeg: number;
  /** -180..180 style (simplified) */
  absoluteDeg: number;
};

export type SensorSimState = {
  currentColor: string;
  /** 0..100 */
  reflectedLight: number;
  /** mm */
  distanceMm: number;
  /** newtons (sim) */
  forceN: number;
  forcePressed: boolean;
};

export type HubSimState = {
  /** 5×5, 0–100 brightness for UI / SR */
  lightMatrix: number[][];
  centerLed: string;
  /** SPIKE reports yaw; we tie to sim heading + offset for reset */
  yawOffsetDeg: number;
  pitchDeg: number;
  rollDeg: number;
  /** Last "shown" image name for announcements */
  lastImage: string;
};

export type SimState = {
  field: SimField;
  xMm: number;
  yMm: number;
  /** 0 = toward −Y in screen space ("north"), 90 = +X, clockwise positive */
  headingDeg: number;
  motors: Record<PortLetter, MotorPortState>;
  /** Simulated world readings; keyed by "current" for model ports */
  sensors: Record<PortLetter, SensorSimState | undefined>;
  hub: HubSimState;
  volumePercent: number;
  /** If motor_pair.pair() was "called" in this run (for future validation) */
  drivePaired: boolean;
};

const PORTS: PortLetter[] = ["A", "B", "C", "D", "E", "F"];

function emptyMatrix(): number[][] {
  return Array.from({ length: 5 }, () => Array.from({ length: 5 }, () => 0));
}

function freshMotor(): MotorPortState {
  return { running: false, velocityDps: 0, positionDeg: 0, absoluteDeg: 0 };
}

function freshSensors(): Record<PortLetter, SensorSimState | undefined> {
  const o: Record<PortLetter, SensorSimState | undefined> = {
    A: undefined,
    B: undefined,
    C: { currentColor: "red", reflectedLight: 45, distanceMm: 0, forceN: 0, forcePressed: false },
    D: { currentColor: "black", reflectedLight: 8, distanceMm: 200, forceN: 0, forcePressed: false },
    E: { currentColor: "black", reflectedLight: 5, distanceMm: 0, forceN: 0.3, forcePressed: false },
    F: { currentColor: "black", reflectedLight: 5, distanceMm: 0, forceN: 0, forcePressed: false },
  };
  return o;
}

export function createInitialSimState(_model: RobotModel, field: SimField = DEFAULT_FIELD): SimState {
  const motors = {} as Record<PortLetter, MotorPortState>;
  for (const p of PORTS) motors[p] = freshMotor();
  return {
    field,
    xMm: field.widthMm / 2,
    yMm: field.heightMm / 2,
    headingDeg: 0,
    motors,
    sensors: freshSensors(),
    hub: {
      lightMatrix: emptyMatrix(),
      centerLed: "OFF",
      yawOffsetDeg: 0,
      pitchDeg: 0,
      rollDeg: 0,
      lastImage: "",
    },
    volumePercent: 100,
    drivePaired: true,
  };
}

export function resetSimToCenter(state: SimState, field: SimField = state.field): void {
  state.field = field;
  state.xMm = field.widthMm / 2;
  state.yMm = field.heightMm / 2;
  state.headingDeg = 0;
  state.hub.yawOffsetDeg = 0;
  state.sensors = freshSensors();
  for (const p of PORTS) {
    state.motors[p] = freshMotor();
  }
  state.hub.lightMatrix = emptyMatrix();
  state.hub.lastImage = "";
  state.hub.centerLed = "OFF";
  state.drivePaired = true;
}

/** Map mm origin top-left to percentage for the stage (0..100), Y down. */
export function simMmToPercent(state: SimState): { xPct: number; yPct: number } {
  return {
    xPct: (state.xMm / state.field.widthMm) * 100,
    yPct: (state.yMm / state.field.heightMm) * 100,
  };
}

function wrapHeading(deg: number): number {
  return ((deg % 360) + 360) % 360;
}

/** Screen coords: y increases downward; 0° heading = up (−Y). */
function forwardDeltaMm(headingDeg: number, distMm: number): { dx: number; dy: number } {
  const r = (headingDeg * Math.PI) / 180;
  return { dx: distMm * Math.sin(r), dy: -distMm * Math.cos(r) };
}

function wheelLinearMm(degreesMotor: number, wheelDiameterMm: number): number {
  return (Number(degreesMotor) / 360) * Math.PI * wheelDiameterMm;
}

function clampToField(state: SimState, margin = 20): void {
  state.xMm = clamp(state.xMm, margin, state.field.widthMm - margin);
  state.yMm = clamp(state.yMm, margin, state.field.heightMm - margin);
}

export type SimApplyResult = { announce: string; stopRun?: boolean };

function merged(cmd: Command, p: Record<string, string | number>): Record<string, string | number> {
  return { ...cmd.sim.defaults, ...p };
}

export function applySimCommand(
  state: SimState,
  model: RobotModel,
  cmd: Command,
  params: Record<string, string | number>
): SimApplyResult {
  const d = merged(cmd, params);
  const a: SimAction = cmd.sim.action;

  if (a === "move_forward") {
    const deg = Number(d.degrees) || 360;
    const v = Math.abs(Number(d.velocity) || 50);
    const dist = wheelLinearMm(deg, model.wheelDiameterMm);
    const { dx, dy } = forwardDeltaMm(state.headingDeg, -dist);
    state.xMm += dx;
    state.yMm += dy;
    const L = model.motorPorts.left;
    const Rp = model.motorPorts.right;
    state.motors[L]!.positionDeg -= deg * (v / 50);
    state.motors[Rp]!.positionDeg -= deg * (v / 50);
    clampToField(state);
    return { announce: `Moved forward about ${Math.round(dist)} millimetres on the field.` };
  }
  if (a === "move_backward") {
    const deg = Number(d.degrees) || 360;
    const v = Math.abs(Number(d.velocity) || 50);
    const dist = wheelLinearMm(deg, model.wheelDiameterMm);
    const { dx, dy } = forwardDeltaMm(state.headingDeg, dist);
    state.xMm += dx;
    state.yMm += dy;
    const L = model.motorPorts.left;
    const Rp = model.motorPorts.right;
    state.motors[L]!.positionDeg += deg * (v / 50);
    state.motors[Rp]!.positionDeg += deg * (v / 50);
    clampToField(state);
    return { announce: `Moved backward about ${Math.round(dist)} millimetres.` };
  }
  if (a === "turn") {
    const dir = d.direction !== undefined ? Number(d.direction) : 1;
    const deg = Number(d.degrees) || 90;
    state.headingDeg = wrapHeading(state.headingDeg + dir * deg);
    const Lp = model.motorPorts.left;
    const Rp = model.motorPorts.right;
    state.motors[Lp]!.positionDeg += -dir * deg;
    state.motors[Rp]!.positionDeg += dir * deg;
    return { announce: `Turn complete. Heading about ${Math.round(state.headingDeg)} degrees.` };
  }
  if (a === "move_steer") {
    const deg = Number(d.steering) || 0;
    const t = (Number(d.degrees) || 360) / 360;
    const turnPart = (deg / 100) * 20 * t;
    const movePart = wheelLinearMm(Number(d.degrees) || 360, model.wheelDiameterMm) * 0.35;
    state.headingDeg = wrapHeading(state.headingDeg + turnPart);
    const m = forwardDeltaMm(state.headingDeg, movePart);
    state.xMm += m.dx;
    state.yMm += m.dy;
    clampToField(state);
    return { announce: "Steering move: curved path in simulation (approximate)." };
  }
  if (a === "tank_move") {
    const D = model.wheelDiameterMm;
    const Lm = model.axleTrackMm;
    const g = Number(d.degrees) || 180;
    const lv = Number(d.left_vel) || 30;
    const rv = Number(d.right_vel) || 30;
    const sL = (lv / 100) * wheelLinearMm(g, D) * 0.5;
    const sR = (rv / 100) * wheelLinearMm(g, D) * 0.5;
    if (Math.abs(sR - sL) < 0.1) {
      const dist = (sL + sR) / 2;
      const f = forwardDeltaMm(state.headingDeg, dist);
      state.xMm += f.dx;
      state.yMm += f.dy;
    } else {
      const dTh = ((sR - sL) / Lm) * (180 / Math.PI);
      state.headingDeg = wrapHeading(state.headingDeg + dTh);
      const f = forwardDeltaMm(state.headingDeg, (Math.abs(sL) + Math.abs(sR)) / 2);
      state.xMm += f.dx;
      state.yMm += f.dy;
    }
    clampToField(state);
    return { announce: "Tank move step (differential drive simulation)." };
  }
  if (a === "pair_stop") {
    for (const p of [model.motorPorts.left, model.motorPorts.right] as const) {
      state.motors[p]!.running = false;
      state.motors[p]!.velocityDps = 0;
    }
    return { announce: "Drive pair stopped. Motors idle in simulation." };
  }
  if (a === "motor_stop") {
    const port = (d.port as PortLetter) || "A";
    if (state.motors[port]) {
      state.motors[port]!.running = false;
      state.motors[port]!.velocityDps = 0;
    }
    return { announce: `Motor ${port} stopped in simulation.` };
  }
  if (a === "pair_configure") {
    state.drivePaired = true;
    return { announce: `Drive paired on left port ${d.left}, right port ${d.right} (simulation).` };
  }
  if (a === "motor_run") {
    const port = (d.port as PortLetter) || "A";
    const vel = Number(d.velocity) || 500;
    if (state.motors[port]) {
      state.motors[port]!.running = true;
      state.motors[port]!.velocityDps = vel * 0.1;
    }
    return { announce: `Motor ${port} running, velocity ${vel} in simulation.` };
  }
  if (a === "read_sensor") {
    const k = d.kind as string;
    if (k === "color" || d.port === model.sensorPorts.color) {
      const c = (d.port as string) || model.sensorPorts.color || "C";
      const s = state.sensors[c as PortLetter];
      const col = s?.currentColor ?? "red";
      return { announce: `Color sensor: ${col}.` };
    }
    if (k === "reflection") {
      return { announce: `Reflected light: about ${45} percent in simulation.` };
    }
    if (k === "distance" || d.port === model.sensorPorts.distance) {
      const s = state.sensors[model.sensorPorts.distance ?? "D"] ?? { distanceMm: 200, currentColor: "", reflectedLight: 0, forceN: 0, forcePressed: false };
      return { announce: `Distance: ${Math.round(s.distanceMm)} millimetres.` };
    }
    if (k === "force" || k === "force_pressed") {
      if (k === "force_pressed") return { announce: "Force: not pressed in simulation." };
      return { announce: "Force: about 0.3 newtons in simulation." };
    }
    if (k === "motor_pos")
      return { announce: "Motor position: zero relative degrees in this run (simulation)." };
    return { announce: "Sensor read (simulation)." };
  }
  if (a === "wait_sensor") {
    return { announce: "Wait until sensor condition; continuing in simulation." };
  }
  if (a === "hub_motion") {
    if (d.kind === "yaw" || d.kind === undefined) {
      const y = wrapHeading(state.headingDeg - state.hub.yawOffsetDeg);
      return { announce: `Tilt or yaw: about ${Math.round(y)} degrees in simulation (matches turn heading).` };
    }
    if (d.kind === "reset_yaw") {
      state.hub.yawOffsetDeg = 0;
      state.headingDeg = 0;
      return { announce: "Yaw reset. Hub heading is zero in simulation." };
    }
  }
  if (a === "display_image" || a === "display_text" || a === "display_clear" || a === "display_pixel") {
    if (a === "display_clear") {
      state.hub.lightMatrix = emptyMatrix();
      return { announce: "Light matrix cleared." };
    }
    if (a === "display_pixel") {
      const x = Math.max(0, Math.min(4, Number(d.x) || 0));
      const y = Math.max(0, Math.min(4, Number(d.y) || 0));
      if (!state.hub.lightMatrix[y]) state.hub.lightMatrix[y] = [0, 0, 0, 0, 0];
      state.hub.lightMatrix[y]![x] = 100;
      return { announce: `Pixel on column ${x + 1} row ${y + 1} on the five by five light matrix.` };
    }
    if (a === "display_image") {
      const n = (String(d.name) || "HAPPY").toUpperCase();
      state.hub.lastImage = n;
      state.hub.lightMatrix = emptyMatrix();
      if (n.includes("HAPPY") || n.includes("SMILE")) {
        const g = state.hub.lightMatrix;
        const smile: [number, number][] = [
          [1, 1],
          [1, 3],
          [3, 0],
          [3, 4],
          [4, 1],
          [4, 2],
          [4, 3],
        ];
        for (const [x, y] of smile) {
          if (g[y]) g[y]![x] = 100;
        }
      }
      return { announce: `Light matrix: image ${n} (simulation).` };
    }
    const t = (d.t as string) || "text";
    return { announce: `Light matrix writing ${t} (simulation).` };
  }
  if (a === "hub_light") {
    state.hub.centerLed = String(d.color) || "RED";
    return { announce: `Hub centre light set to ${state.hub.centerLed}.` };
  }
  if (a === "hub_button") {
    return { announce: "Left button is not pressed in simulation." };
  }
  if (a === "play_sound") {
    return { announce: "Playing sound in simulation." };
  }
  if (a === "beep") {
    return { announce: "Beep." };
  }
  if (a === "set_volume") {
    state.volumePercent = Math.min(100, Math.max(0, Number(d.n) || 100));
    return { announce: `Volume set to ${state.volumePercent} percent in simulation.` };
  }
  if (a === "color_matrix") {
    return { announce: "Color matrix pixel in simulation." };
  }
  if (a === "delay") {
    return { announce: `Pause ${d.n} seconds in simulation log.` };
  }
  if (a === "stop_program") {
    return { announce: "Program stop block reached.", stopRun: true };
  }
  if (a === "blink_led") {
    return { announce: "Hub LED blink in simulation." };
  }
  if (a === "noop") {
    return { announce: "No motion in simulation for this block." };
  }
  return { announce: "" };
}

/** Describe robot pose for screen readers. */
export function describePoseMm(state: SimState): string {
  const { xPct, yPct } = simMmToPercent(state);
  const qu =
    xPct < 33 ? (yPct < 33 ? "top-left" : yPct > 66 ? "bottom-left" : "left") : xPct > 66 ? (yPct < 33 ? "top-right" : yPct > 66 ? "bottom-right" : "right") : yPct < 33 ? "top-centre" : yPct > 66 ? "bottom-centre" : "centre";
  return `Robot at ${qu} of the field, about ${Math.round(state.xMm)} millimetres from the left and ${Math.round(state.yMm)} from the top. Heading ${Math.round(state.headingDeg)} degrees.`;
}
