import type { PortLetter } from "../types/app";

/**
 * Preset physical layouts for the playground simulator. Dimensions match
 * common LEGO Education SPIKE Prime builds: large drive wheels ~56 mm diameter
 * and typical driving-base track (wheel centres) ~112 mm for the 2-motor "Driving Base" model.
 * @see https://spike.legoeducation.com/ — verify against your physical build.
 */
export type RobotModel = {
  id: string;
  name: string;
  /** Shown in UI and for screen reader context */
  description: string;
  wheelDiameterMm: number;
  /** Centre-to-centre distance between the two drive wheels (axle track) */
  axleTrackMm: number;
  motorPorts: { left: PortLetter; right: PortLetter };
  sensorPorts: {
    color?: PortLetter;
    distance?: PortLetter;
    force?: PortLetter;
  };
  /** Extra actuators (e.g. arm); shown in port panel */
  auxiliaryMotors: { port: PortLetter; label: string; rangeDeg: [number, number] }[];
};

const ALL_PORTS: PortLetter[] = ["A", "B", "C", "D", "E", "F"];

/** SPIKE “large” wheel (455×24) is commonly quoted ~55.5–56 mm. */
const SPIKE_LARGE_WHEEL_DIAMETER_MM = 56;
/** Default driving base track: ~112 mm between wheel centres. */
const DRIVING_BASE_TRACK_MM = 112;

export const ROBOT_MODELS: RobotModel[] = [
  {
    id: "driving_base",
    name: "Driving Base",
    description: "Two-wheel differential drive. Standard SPIKE Prime starter build; large wheels and ~112 millimetre track.",
    wheelDiameterMm: SPIKE_LARGE_WHEEL_DIAMETER_MM,
    axleTrackMm: DRIVING_BASE_TRACK_MM,
    motorPorts: { left: "E", right: "F" },
    sensorPorts: { color: "C", distance: "D" },
    auxiliaryMotors: [],
  },
  {
    id: "hopper",
    name: "Hopper",
    description: "Small walking-style model with a shorter wheel base; uses the same 56 millimetre wheel spec with an 80 millimetre track in this sim.",
    wheelDiameterMm: SPIKE_LARGE_WHEEL_DIAMETER_MM,
    /** Hopper is narrower than a full-width driving base. */
    axleTrackMm: 80,
    motorPorts: { left: "E", right: "F" },
    sensorPorts: { color: "C" },
    auxiliaryMotors: [],
  },
  {
    id: "delivery_cart",
    name: "Delivery Cart",
    description: "Driving-base style robot with left drive on A, right on B, distance sensor for obstacles, and an arm on F in simulation.",
    wheelDiameterMm: SPIKE_LARGE_WHEEL_DIAMETER_MM,
    axleTrackMm: DRIVING_BASE_TRACK_MM,
    motorPorts: { left: "A", right: "B" },
    sensorPorts: { distance: "D", color: "C", force: "E" },
    auxiliaryMotors: [{ port: "F", label: "Arm motor", rangeDeg: [0, 180] }],
  },
  {
    id: "custom",
    name: "Custom",
    description: "Generic defaults: 56 millimetre wheels, 100 millimetre track, motors on A and B. Adjust ports in your program to match your build.",
    wheelDiameterMm: SPIKE_LARGE_WHEEL_DIAMETER_MM,
    axleTrackMm: 100,
    motorPorts: { left: "A", right: "B" },
    sensorPorts: {},
    auxiliaryMotors: [],
  },
];

const BY_ID = new Map(ROBOT_MODELS.map((m) => [m.id, m] as const));

export function getRobotModelById(id: string): RobotModel | undefined {
  return BY_ID.get(id);
}

export function getDefaultRobotModel(): RobotModel {
  return ROBOT_MODELS[0]!;
}

/** Role label for a port in the context of this model, or null if not assigned. */
export function getPortRole(model: RobotModel, port: PortLetter): string | null {
  if (model.motorPorts.left === port) return "Left drive";
  if (model.motorPorts.right === port) return "Right drive";
  if (model.sensorPorts.color === port) return "Color sensor";
  if (model.sensorPorts.distance === port) return "Distance sensor";
  if (model.sensorPorts.force === port) return "Force sensor";
  for (const a of model.auxiliaryMotors) {
    if (a.port === port) return a.label;
  }
  return null;
}

export function listPortsForPanel(): PortLetter[] {
  return ALL_PORTS;
}
