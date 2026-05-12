export type PortLetter = "A" | "B" | "C" | "D" | "E" | "F";

export type BlockCategoryId =
  | "motors"
  | "movement"
  | "sensors"
  | "hub"
  | "sound"
  | "light"
  | "control"
  | "operators"
  | "voice";

export type ParamType = "port" | "int" | "string" | "color" | "image" | "direction";

export type SimAction =
  | "motor_run"
  | "motor_stop"
  | "move_forward"
  | "move_backward"
  | "turn"
  | "move_steer"
  | "tank_move"
  | "pair_stop"
  | "pair_configure"
  | "read_sensor"
  | "wait_sensor"
  | "display_image"
  | "display_text"
  | "display_clear"
  | "display_pixel"
  | "hub_light"
  | "hub_button"
  | "hub_motion"
  | "play_sound"
  | "beep"
  | "set_volume"
  | "color_matrix"
  | "delay"
  | "stop_program"
  | "noop"
  | "blink_led";

export type CommandParam = {
  name: string;
  type: ParamType;
  default: string | number;
  min?: number;
  max?: number;
  options?: string[];
  voiceHint: string;
};

export type CodegenInfo = {
  template: string;
  imports: string[];
  isAsync: boolean;
  isBlock: boolean;
};

export type Command = {
  id: string;
  phrase: string;
  aliases: string[];
  label: string;
  category: BlockCategoryId;
  icon: string;
  params: CommandParam[];
  sim: {
    action: SimAction;
    defaults: Record<string, number | string>;
  };
  codegen: CodegenInfo;
};

/** @deprecated Use BlockV2; kept for localStorage migration */
export type LegacyBlock = { id: number; cmdIndex: number };

export type Block = {
  id: string;
  commandId: string;
  params: Record<string, string | number>;
};
