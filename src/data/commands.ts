import type { Block, BlockCategoryId, Command, LegacyBlock, PortLetter } from "../types/app";

/** v2: SPIKE-style blocks. v1 used `brailleEduMvpBlocksV1` with cmdIndex. */
export const STORAGE_KEY = "brailleSpikeBlocksV1";

const P = (o: {
  name: string;
  type: "port" | "int" | "string" | "color" | "image" | "direction";
  default: string | number;
  min?: number;
  max?: number;
  options?: string[];
  voiceHint: string;
}): Command["params"][0] => o;

export const CATEGORIES: { id: BlockCategoryId; icon: string; label: string }[] = [
  { id: "motors", label: "Motors", icon: "ph ph-gear" },
  { id: "movement", label: "Movement", icon: "ph ph-arrows-out-cardinal" },
  { id: "sensors", label: "Sensors", icon: "ph ph-eye" },
  { id: "hub", label: "Hub", icon: "ph ph-cpu" },
  { id: "sound", label: "Sound", icon: "ph ph-speaker-high" },
  { id: "light", label: "Light", icon: "ph ph-lightbulb" },
  { id: "control", label: "Control", icon: "ph ph-flow-arrow" },
  { id: "operators", label: "Operators", icon: "ph ph-math-operations" },
  { id: "voice", label: "My Voice", icon: "ph ph-microphone" },
];

function defSim(action: Command["sim"]["action"], defaults: Record<string, number | string> = {}): Command["sim"] {
  return { action, defaults };
}

const RUNLOOP = "import runloop";
const PORT = "from hub import port";
const MOTOR = "import motor";
const MOTOR_PAIR = "import motor_pair";

const COMMANDS_LIST: Command[] = [
  // —— Motors ——
  {
    id: "motor_run",
    phrase: "run motor",
    aliases: ["motor go", "spin motor"],
    label: "Run Motor",
    category: "motors",
    icon: "ph ph-gear",
    params: [P({ name: "port", type: "port", default: "A", voiceHint: "port letter" }), P({ name: "velocity", type: "int", default: 500, min: -1000, max: 1000, voiceHint: "velocity" })],
    sim: defSim("motor_run", { port: "A", velocity: 500 }),
    codegen: { template: "motor.run(port.{port}, {velocity})", imports: [MOTOR, PORT, RUNLOOP], isAsync: true, isBlock: false },
  },
  {
    id: "motor_run_for_degrees",
    phrase: "run motor for",
    aliases: ["motor for degrees", "turn motor", "run for degrees"],
    label: "Run Motor for Degrees",
    category: "motors",
    icon: "ph ph-gear",
    params: [
      P({ name: "port", type: "port", default: "A", voiceHint: "port" }),
      P({ name: "degrees", type: "int", default: 360, min: -3600, max: 3600, voiceHint: "degrees" }),
      P({ name: "velocity", type: "int", default: 500, min: -1000, max: 1000, voiceHint: "velocity" }),
    ],
    sim: defSim("motor_run", { port: "A", degrees: 360, velocity: 500 }),
    codegen: { template: "await motor.run_for_degrees(port.{port}, {degrees}, {velocity})", imports: [MOTOR, PORT, RUNLOOP], isAsync: true, isBlock: false },
  },
  {
    id: "motor_run_for_time",
    phrase: "run motor for time",
    aliases: ["motor for milliseconds", "run motor for milliseconds"],
    label: "Run Motor for Time",
    category: "motors",
    icon: "ph ph-timer",
    params: [
      P({ name: "port", type: "port", default: "A", voiceHint: "port" }),
      P({ name: "ms", type: "int", default: 2000, min: 0, max: 60000, voiceHint: "milliseconds" }),
      P({ name: "velocity", type: "int", default: 500, min: -1000, max: 1000, voiceHint: "velocity" }),
    ],
    sim: defSim("motor_run", { port: "A", ms: 2000, velocity: 500 }),
    codegen: { template: "await motor.run_for_time(port.{port}, {ms}, {velocity})", imports: [MOTOR, PORT, RUNLOOP], isAsync: true, isBlock: false },
  },
  {
    id: "motor_stop",
    phrase: "stop motor",
    aliases: ["halt motor", "brake motor"],
    label: "Stop Motor",
    category: "motors",
    icon: "ph ph-stop",
    params: [P({ name: "port", type: "port", default: "A", voiceHint: "port" })],
    sim: defSim("motor_stop", { port: "A" }),
    codegen: { template: "motor.stop(port.{port})", imports: [MOTOR, PORT], isAsync: false, isBlock: false },
  },
  {
    id: "motor_position",
    phrase: "get motor position",
    aliases: ["motor position", "read motor angle"],
    label: "Motor Position",
    category: "motors",
    icon: "ph ph-gauge",
    params: [P({ name: "port", type: "port", default: "A", voiceHint: "port" })],
    sim: defSim("read_sensor", { port: "A", kind: "motor_pos" }),
    codegen: { template: "motor.absolute_position(port.{port})", imports: [MOTOR, PORT], isAsync: false, isBlock: false },
  },
  {
    id: "motor_reset_position",
    phrase: "reset motor position",
    aliases: ["zero motor", "reset motor"],
    label: "Reset Motor Position",
    category: "motors",
    icon: "ph ph-arrow-u-up-left",
    params: [P({ name: "port", type: "port", default: "A", voiceHint: "port" })],
    sim: defSim("noop", { port: "A" }),
    codegen: { template: "motor.reset_relative_position(port.{port}, 0)", imports: [MOTOR, PORT], isAsync: false, isBlock: false },
  },
  // —— Movement ——
  {
    id: "pair_motors",
    phrase: "pair motors",
    aliases: ["set up drive", "configure drive", "pair drive"],
    label: "Pair Motors",
    category: "movement",
    icon: "ph ph-link",
    params: [P({ name: "left", type: "port", default: "A", voiceHint: "left port" }), P({ name: "right", type: "port", default: "B", voiceHint: "right port" })],
    sim: defSim("pair_configure", { left: "A", right: "B" }),
    codegen: { template: "motor_pair.pair(motor_pair.PAIR_1, port.{left}, port.{right})", imports: [MOTOR_PAIR, PORT], isAsync: false, isBlock: false },
  },
  {
    id: "move_forward",
    phrase: "move forward",
    aliases: ["go forward", "drive forward", "forward"],
    label: "Move Forward",
    category: "movement",
    icon: "ph ph-arrow-up",
    params: [P({ name: "degrees", type: "int", default: 360, min: 1, max: 7200, voiceHint: "degrees" }), P({ name: "velocity", type: "int", default: 50, min: 1, max: 100, voiceHint: "velocity" })],
    sim: defSim("move_forward", { degrees: 360, velocity: 50 }),
    codegen: { template: "await motor_pair.move_for_degrees(motor_pair.PAIR_1, {degrees}, 0, velocity={velocity})", imports: [MOTOR_PAIR, RUNLOOP], isAsync: true, isBlock: false },
  },
  {
    id: "move_backward",
    phrase: "move backward",
    aliases: ["go backward", "drive backward", "backward", "back"],
    label: "Move Backward",
    category: "movement",
    icon: "ph ph-arrow-down",
    params: [P({ name: "degrees", type: "int", default: 360, min: 1, max: 7200, voiceHint: "degrees" }), P({ name: "velocity", type: "int", default: 50, min: 1, max: 100, voiceHint: "velocity" })],
    sim: defSim("move_backward", { degrees: 360, velocity: 50 }),
    codegen: { template: "await motor_pair.move_for_degrees(motor_pair.PAIR_1, {degrees}, 0, velocity=-{velocity})", imports: [MOTOR_PAIR, RUNLOOP], isAsync: true, isBlock: false },
  },
  {
    id: "turn_right",
    phrase: "turn right",
    aliases: ["rotate right", "right turn"],
    label: "Turn Right",
    category: "movement",
    icon: "ph ph-arrow-bend-down-right",
    params: [P({ name: "degrees", type: "int", default: 90, min: 1, max: 360, voiceHint: "degrees" }), P({ name: "velocity", type: "int", default: 50, min: 1, max: 100, voiceHint: "velocity" })],
    sim: defSim("turn", { direction: 1, degrees: 90, velocity: 50 }),
    codegen: { template: "await motor_pair.move_for_degrees(motor_pair.PAIR_1, {degrees}, 100, velocity={velocity})", imports: [MOTOR_PAIR, RUNLOOP], isAsync: true, isBlock: false },
  },
  {
    id: "turn_left",
    phrase: "turn left",
    aliases: ["rotate left", "left turn", "left"],
    label: "Turn Left",
    category: "movement",
    icon: "ph ph-arrow-bend-up-left",
    params: [P({ name: "degrees", type: "int", default: 90, min: 1, max: 360, voiceHint: "degrees" }), P({ name: "velocity", type: "int", default: 50, min: 1, max: 100, voiceHint: "velocity" })],
    sim: defSim("turn", { direction: -1, degrees: 90, velocity: 50 }),
    codegen: { template: "await motor_pair.move_for_degrees(motor_pair.PAIR_1, {degrees}, -100, velocity={velocity})", imports: [MOTOR_PAIR, RUNLOOP], isAsync: true, isBlock: false },
  },
  {
    id: "move_steering",
    phrase: "steer",
    aliases: ["move with steering", "curve"],
    label: "Move with Steering",
    category: "movement",
    icon: "ph ph-path",
    params: [
      P({ name: "degrees", type: "int", default: 360, min: 1, max: 7200, voiceHint: "degrees" }),
      P({ name: "steering", type: "int", default: 30, min: -100, max: 100, voiceHint: "steering" }),
      P({ name: "velocity", type: "int", default: 50, min: 1, max: 100, voiceHint: "velocity" }),
    ],
    sim: defSim("move_steer", { degrees: 360, steering: 30, velocity: 50 }),
    codegen: { template: "await motor_pair.move_for_degrees(motor_pair.PAIR_1, {degrees}, {steering}, velocity={velocity})", imports: [MOTOR_PAIR, RUNLOOP], isAsync: true, isBlock: false },
  },
  {
    id: "tank_move",
    phrase: "tank move",
    aliases: ["tank drive", "differential"],
    label: "Tank Move",
    category: "movement",
    icon: "ph ph-arrows-left-right",
    params: [
      P({ name: "degrees", type: "int", default: 180, min: 1, max: 7200, voiceHint: "degrees" }),
      P({ name: "left_vel", type: "int", default: 30, min: -100, max: 100, voiceHint: "left velocity" }),
      P({ name: "right_vel", type: "int", default: 30, min: -100, max: 100, voiceHint: "right velocity" }),
    ],
    sim: defSim("tank_move", { degrees: 180, left_vel: 30, right_vel: 30 }),
    codegen: { template: "await motor_pair.move_tank_for_degrees(motor_pair.PAIR_1, {degrees}, {left_vel}, {right_vel})", imports: [MOTOR_PAIR, RUNLOOP], isAsync: true, isBlock: false },
  },
  {
    id: "stop_moving",
    phrase: "stop moving",
    aliases: ["halt", "stop drive", "stop"],
    label: "Stop Moving",
    category: "movement",
    icon: "ph ph-stop",
    params: [],
    sim: defSim("pair_stop", {}),
    codegen: { template: "motor_pair.stop(motor_pair.PAIR_1)", imports: [MOTOR_PAIR], isAsync: false, isBlock: false },
  },
  {
    id: "spin_around",
    phrase: "spin around",
    aliases: ["spin", "turn around", "do a 360", "360", "full spin", "one full turn"],
    label: "Spin Around",
    category: "movement",
    icon: "ph ph-arrows-clockwise",
    params: [P({ name: "velocity", type: "int", default: 50, min: 1, max: 100, voiceHint: "velocity" })],
    sim: defSim("turn", { direction: 1, degrees: 360, velocity: 50 }),
    codegen: { template: "await motor_pair.move_for_degrees(motor_pair.PAIR_1, 360, 100, velocity={velocity})", imports: [MOTOR_PAIR, RUNLOOP], isAsync: true, isBlock: false },
  },
  // —— Sensors (simplified runloop) ——
  {
    id: "read_color",
    phrase: "read color",
    aliases: ["what color", "color sensor"],
    label: "Read Color",
    category: "sensors",
    icon: "ph ph-palette",
    params: [P({ name: "port", type: "port", default: "C", voiceHint: "port" })],
    sim: defSim("read_sensor", { port: "C", kind: "color" }),
    codegen: { template: "color_sensor.color(port.{port})", imports: [PORT, "import color_sensor"], isAsync: false, isBlock: false },
  },
  {
    id: "read_reflection",
    phrase: "read light",
    aliases: ["reflected light", "light value"],
    label: "Read Reflected Light",
    category: "sensors",
    icon: "ph ph-sun",
    params: [P({ name: "port", type: "port", default: "C", voiceHint: "port" })],
    sim: defSim("read_sensor", { port: "C", kind: "reflection" }),
    codegen: { template: "color_sensor.reflection(port.{port})", imports: [PORT, "import color_sensor"], isAsync: false, isBlock: false },
  },
  {
    id: "read_distance",
    phrase: "read distance",
    aliases: ["how far", "distance sensor", "ultrasonic"],
    label: "Read Distance",
    category: "sensors",
    icon: "ph ph-ruler",
    params: [P({ name: "port", type: "port", default: "D", voiceHint: "port" })],
    sim: defSim("read_sensor", { port: "D", kind: "distance" }),
    codegen: { template: "distance_sensor.distance(port.{port})", imports: [PORT, "import distance_sensor"], isAsync: false, isBlock: false },
  },
  {
    id: "read_force",
    phrase: "read force",
    aliases: ["how hard", "force sensor"],
    label: "Read Force",
    category: "sensors",
    icon: "ph ph-hand-palm",
    params: [P({ name: "port", type: "port", default: "E", voiceHint: "port" })],
    sim: defSim("read_sensor", { port: "E", kind: "force" }),
    codegen: { template: "force_sensor.force(port.{port})", imports: [PORT, "import force_sensor"], isAsync: false, isBlock: false },
  },
  {
    id: "force_pressed",
    phrase: "is force pressed",
    aliases: ["force pressed", "button pressed on force"],
    label: "Force Pressed",
    category: "sensors",
    icon: "ph ph-hand-tap",
    params: [P({ name: "port", type: "port", default: "E", voiceHint: "port" })],
    sim: defSim("read_sensor", { port: "E", kind: "force_pressed" }),
    codegen: { template: "force_sensor.pressed(port.{port})", imports: [PORT, "import force_sensor"], isAsync: false, isBlock: false },
  },
  {
    id: "wait_for_color",
    phrase: "wait for color",
    aliases: ["wait color"],
    label: "Wait for Color",
    category: "sensors",
    icon: "ph ph-hourglass",
    params: [P({ name: "port", type: "port", default: "C", voiceHint: "port" }), P({ name: "color", type: "color", default: "red", options: ["red", "blue", "green", "yellow", "black", "white"], voiceHint: "color name" })],
    sim: defSim("wait_sensor", { port: "C", kind: "color_wait" }),
    codegen: { template: "await runloop.until(lambda: color_sensor.color(port.{port}) is color.{color})", imports: [PORT, RUNLOOP, "import color_sensor", "import color"], isAsync: true, isBlock: false },
  },
  {
    id: "wait_for_distance",
    phrase: "wait until close",
    aliases: ["wait for distance", "wait distance"],
    label: "Wait for Distance",
    category: "sensors",
    icon: "ph ph-hourglass-high",
    params: [P({ name: "port", type: "port", default: "D", voiceHint: "port" }), P({ name: "threshold", type: "int", default: 100, min: 0, max: 2000, voiceHint: "millimetres" })],
    sim: defSim("wait_sensor", { port: "D", kind: "distance_wait" }),
    codegen: { template: "await runloop.until(lambda: distance_sensor.distance(port.{port}) < {threshold})", imports: [PORT, RUNLOOP, "import distance_sensor"], isAsync: true, isBlock: false },
  },
  // —— Hub ——
  {
    id: "hub_show_image",
    phrase: "show image",
    aliases: ["matrix image", "display image on hub"],
    label: "Show Image",
    category: "hub",
    icon: "ph ph-smiley",
    params: [P({ name: "name", type: "image", default: "HAPPY", options: ["HAPPY", "SAD", "HEART", "YES", "NO"], voiceHint: "image name" })],
    sim: defSim("display_image", { name: "HAPPY" }),
    codegen: { template: "light_matrix.show_image(light_matrix.IMAGE_{name})", imports: [PORT, "from hub import light_matrix"], isAsync: false, isBlock: false },
  },
  {
    id: "hub_write_text",
    phrase: "write text",
    aliases: ["scroll text on hub", "matrix text"],
    label: "Write Text",
    category: "hub",
    icon: "ph ph-text-aa",
    params: [P({ name: "t", type: "string", default: "Hi", voiceHint: "text" })],
    sim: defSim("display_text", { t: "Hi" }),
    codegen: { template: "await light_matrix.write('{t}')", imports: ["from hub import light_matrix", RUNLOOP], isAsync: true, isBlock: false },
  },
  {
    id: "hub_clear",
    phrase: "clear display",
    aliases: ["clear matrix", "clear hub lights"],
    label: "Clear Display",
    category: "hub",
    icon: "ph ph-eraser",
    params: [],
    sim: defSim("display_clear", {}),
    codegen: { template: "light_matrix.clear()", imports: ["from hub import light_matrix"], isAsync: false, isBlock: false },
  },
  {
    id: "hub_set_pixel",
    phrase: "set pixel",
    aliases: ["light pixel", "pixel on"],
    label: "Set Pixel",
    category: "hub",
    icon: "ph ph-dot",
    params: [
      P({ name: "x", type: "int", default: 2, min: 0, max: 4, voiceHint: "column" }),
      P({ name: "y", type: "int", default: 2, min: 0, max: 4, voiceHint: "row" }),
    ],
    sim: defSim("display_pixel", { x: 2, y: 2 }),
    codegen: { template: "light_matrix.set_pixel({x}, {y}, 100)", imports: ["from hub import light_matrix"], isAsync: false, isBlock: false },
  },
  {
    id: "hub_light_color",
    phrase: "set hub light",
    aliases: ["hub led", "centre light"],
    label: "Hub Light Color",
    category: "hub",
    icon: "ph ph-lightbulb-filament",
    params: [P({ name: "color", type: "color", default: "RED", options: ["RED", "GREEN", "BLUE", "VIOLET", "ORANGE"], voiceHint: "color" })],
    sim: defSim("hub_light", { color: "RED" }),
    codegen: { template: "hub.light.color(color.{color})", imports: ["import hub", "import color"], isAsync: false, isBlock: false },
  },
  {
    id: "hub_read_button",
    phrase: "left button",
    aliases: ["is left button pressed", "read left button", "hub button"],
    label: "Read Left Button",
    category: "hub",
    icon: "ph ph-caret-circle-left",
    params: [P({ name: "side", type: "string", default: "LEFT", options: ["LEFT", "RIGHT"], voiceHint: "left or right" })],
    sim: defSim("hub_button", { side: "LEFT" }),
    codegen: { template: "button.pressed(button.{side})", imports: ["from hub import button"], isAsync: false, isBlock: false },
  },
  {
    id: "hub_get_yaw",
    phrase: "get yaw angle",
    aliases: ["yaw angle", "tilt yaw", "heading angle"],
    label: "Get Yaw Angle",
    category: "hub",
    icon: "ph ph-compass",
    params: [],
    sim: defSim("hub_motion", { kind: "yaw" }),
    codegen: { template: "hub.motion_sensor.tilt_angles()[0]", imports: ["import hub"], isAsync: false, isBlock: false },
  },
  {
    id: "hub_reset_yaw",
    phrase: "reset yaw",
    aliases: ["zero yaw", "calibrate heading"],
    label: "Reset Yaw",
    category: "hub",
    icon: "ph ph-arrow-counter-clockwise",
    params: [],
    sim: defSim("hub_motion", { kind: "reset_yaw" }),
    codegen: { template: "hub.motion_sensor.reset_yaw(0)", imports: ["import hub"], isAsync: false, isBlock: false },
  },
  // —— Sound ——
  {
    id: "play_sound",
    phrase: "play sound",
    aliases: ["play a sound", "play sample"],
    label: "Play Sound",
    category: "sound",
    icon: "ph ph-speaker-high",
    params: [P({ name: "name", type: "string", default: "Hello", voiceHint: "sound name" })],
    sim: defSim("play_sound", { name: "Hello" }),
    codegen: { template: "await sound.play('{name}')", imports: ["import sound", RUNLOOP], isAsync: true, isBlock: false },
  },
  {
    id: "beep",
    phrase: "beep",
    aliases: ["buzzer", "play beep", "beep the buzzer"],
    label: "Beep",
    category: "sound",
    icon: "ph ph-bell",
    params: [P({ name: "freq", type: "int", default: 440, min: 100, max: 2000, voiceHint: "frequency" }), P({ name: "ms", type: "int", default: 200, min: 20, max: 2000, voiceHint: "milliseconds" })],
    sim: defSim("beep", { freq: 440, ms: 200 }),
    codegen: { template: "await sound.beep({freq}, {ms})", imports: ["import sound", RUNLOOP], isAsync: true, isBlock: false },
  },
  {
    id: "set_volume",
    phrase: "set volume",
    aliases: ["volume", "sounds volume"],
    label: "Set Volume",
    category: "sound",
    icon: "ph ph-speaker-low",
    params: [P({ name: "n", type: "int", default: 100, min: 0, max: 100, voiceHint: "percent" })],
    sim: defSim("set_volume", { n: 100 }),
    codegen: { template: "sound.volume({n})", imports: ["import sound"], isAsync: false, isBlock: false },
  },
  // —— Light (color matrix) ——
  {
    id: "light_blink",
    phrase: "blink the light",
    aliases: ["blink", "flash light", "led blink"],
    label: "Blink Light",
    category: "light",
    icon: "ph ph-lightbulb",
    params: [P({ name: "times", type: "int", default: 3, min: 1, max: 20, voiceHint: "times" })],
    sim: defSim("blink_led", { times: 3 }),
    codegen: { template: "await light_matrix.blink({times})", imports: ["from hub import light_matrix", RUNLOOP], isAsync: true, isBlock: false },
  },
  {
    id: "color_matrix_set_pixel",
    phrase: "set color matrix pixel",
    aliases: ["color matrix pixel", "rgb matrix"],
    label: "Color Matrix Set Pixel",
    category: "light",
    icon: "ph ph-grid-four",
    params: [
      P({ name: "port", type: "port", default: "F", voiceHint: "port" }),
      P({ name: "x", type: "int", default: 0, min: 0, max: 2, voiceHint: "x" }),
      P({ name: "y", type: "int", default: 0, min: 0, max: 2, voiceHint: "y" }),
      P({ name: "hue", type: "int", default: 200, min: 0, max: 360, voiceHint: "hue" }),
    ],
    sim: defSim("color_matrix", { port: "F", x: 0, y: 0, hue: 200 }),
    codegen: { template: "color_matrix.set_pixel(port.{port}, {x}, {y}, ({hue}, 10))", imports: [PORT, "import color_matrix"], isAsync: false, isBlock: false },
  },
  {
    id: "light_show_happy",
    phrase: "show happy face",
    aliases: ["happy face on matrix", "smiley matrix"],
    label: "Show Happy Face",
    category: "light",
    icon: "ph ph-smiley",
    params: [],
    sim: defSim("display_image", { name: "HAPPY" }),
    codegen: { template: "light_matrix.show_image(light_matrix.IMAGE_HAPPY)", imports: ["from hub import light_matrix"], isAsync: false, isBlock: false },
  },
  // —— Control ——
  {
    id: "wait_seconds",
    phrase: "wait",
    aliases: ["wait seconds", "sleep", "pause"],
    label: "Wait Seconds",
    category: "control",
    icon: "ph ph-hourglass-medium",
    params: [P({ name: "n", type: "int", default: 1, min: 0, max: 60, voiceHint: "seconds" })],
    sim: defSim("delay", { n: 1 }),
    codegen: { template: "await runloop.sleep_ms({n} * 1000)", imports: [RUNLOOP], isAsync: true, isBlock: false },
  },
  {
    id: "stop_program",
    phrase: "stop program",
    aliases: ["end program", "exit", "system exit"],
    label: "Stop Program",
    category: "control",
    icon: "ph ph-power",
    params: [],
    sim: defSim("stop_program", {}),
    codegen: { template: "raise SystemExit", imports: [], isAsync: false, isBlock: false },
  },
  // —— Operators (placeholder) ——
  {
    id: "op_comment",
    phrase: "comment",
    aliases: ["note in program"],
    label: "Comment",
    category: "operators",
    icon: "ph ph-chat-text",
    params: [P({ name: "text", type: "string", default: "", voiceHint: "comment text" })],
    sim: defSim("noop", { text: "" }),
    codegen: { template: "# {text}", imports: [], isAsync: false, isBlock: false },
  },
  // —— My Voice ——
  {
    id: "my_voice_hello",
    phrase: "hello robot",
    aliases: ["hi robot", "greet"],
    label: "Say Hello (voice)",
    category: "voice",
    icon: "ph ph-microphone-stage",
    params: [],
    sim: defSim("noop", {}),
    codegen: { template: "# student voice: hello", imports: [], isAsync: false, isBlock: false },
  },
];

export const COMMANDS: Command[] = COMMANDS_LIST;

const BY_ID = new Map(COMMANDS.map((c) => [c.id, c] as const));

export function getCommandById(id: string): Command | undefined {
  return BY_ID.get(id);
}

export function mergeDefaultParams(cmd: Command, overrides: Record<string, string | number>): Record<string, string | number> {
  const o: Record<string, string | number> = {};
  for (const p of cmd.params) o[p.name] = p.default;
  for (const [k, v] of Object.entries(overrides)) o[k] = v;
  return o;
}

function clampParam(cmd: Command, params: Record<string, string | number>): Record<string, string | number> {
  const o = { ...params };
  for (const p of cmd.params) {
    const v = o[p.name];
    if (p.type === "int" && typeof v === "number") {
      if (p.min !== undefined) o[p.name] = Math.max(p.min, v);
      if (p.max !== undefined) o[p.name] = Math.min(p.max, o[p.name] as number);
    }
    if (p.type === "port" && typeof v === "string") {
      const L = v.toUpperCase() as PortLetter;
      o[p.name] = (["A", "B", "C", "D", "E", "F"] as const).includes(L) ? L : p.default;
    }
  }
  return o;
}

export function createBlockFromCommandId(commandId: string, paramOverrides: Record<string, string | number> = {}): Block | null {
  const cmd = getCommandById(commandId);
  if (!cmd) return null;
  return {
    id: typeof crypto !== "undefined" && crypto.randomUUID ? crypto.randomUUID() : `b-${Date.now()}-${Math.random()}`,
    commandId,
    params: clampParam(cmd, mergeDefaultParams(cmd, paramOverrides)),
  };
}

const LEGACY_INDEX_TO_ID = [
  "move_forward",
  "move_backward",
  "turn_left",
  "turn_right",
  "spin_around",
  "stop_moving",
  "beep",
  "light_blink",
] as const;

export const LEGACY_STORAGE_KEY = "brailleEduMvpBlocksV1";

function isLegacyBlock(x: unknown): x is LegacyBlock {
  return (
    typeof x === "object" &&
    x !== null &&
    typeof (x as LegacyBlock).id === "number" &&
    typeof (x as LegacyBlock).cmdIndex === "number"
  );
}

function migrateLegacyBlocks(raw: unknown): Block[] | null {
  if (!Array.isArray(raw) || raw.length === 0) return null;
  if (!isLegacyBlock(raw[0])) return null;
  const out: Block[] = [];
  for (const b of raw) {
    if (!isLegacyBlock(b)) continue;
    const id = LEGACY_INDEX_TO_ID[b.cmdIndex] ?? "move_forward";
    const nb = createBlockFromCommandId(id) ?? { id: `m-${b.id}`, commandId: "move_forward", params: { degrees: 360, velocity: 50 } };
    nb.id = `mig-${b.id}`;
    out.push(nb);
  }
  return out.length ? out : null;
}

export function parseStoredBlocks(json: string | null): Block[] {
  if (!json) return [];
  let parsed: unknown;
  try {
    parsed = JSON.parse(json);
  } catch {
    return [];
  }
  if (!Array.isArray(parsed)) return [];
  const migrated = migrateLegacyBlocks(parsed);
  if (migrated) return migrated;
  return parsed
    .filter(
      (b): b is Block =>
        typeof b === "object" &&
        b !== null &&
        typeof (b as Block).id === "string" &&
        typeof (b as Block).commandId === "string" &&
        typeof (b as Block).params === "object" &&
        (b as Block).params !== null
    )
    .map((b) => {
      const cmd = getCommandById(b.commandId);
      if (!cmd) return b as Block;
      return { ...(b as Block), params: mergeDefaultParams(cmd, (b as Block).params) };
    });
}
