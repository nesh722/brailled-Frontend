export type GuideProject = {
  id: string;
  title: string;
  summary: string;
  mentorBrief: string;
};

/** Curricula the LLM uses as project context (enrollment). */
export const GUIDE_PROJECTS: GuideProject[] = [
  {
    id: "square-path",
    title: "Walk a square",
    summary: "Make the robot trace four equal sides using motion blocks.",
    mentorBrief:
      "Success looks like: four forward moves with 90-degree turns between them (or equivalent), forming a closed square. Encourage testing with Run after every two blocks.",
  },
  {
    id: "dance-beeps",
    title: "Dance with sound and light",
    summary: "Combine motion, buzzer, and blink blocks in a short routine.",
    mentorBrief:
      "Success looks like: at least two motion blocks plus beep and blink used meaningfully, in an order the student can explain. Keep steps playful and short.",
  },
  {
    id: "stop-safely",
    title: "Start, move, then stop",
    summary: "Build a sequence that ends with an explicit stop.",
    mentorBrief:
      "Success looks like: forward or turn blocks followed by a Stop block. Relate Stop to real robots halting motors.",
  },
  {
    id: "open-play",
    title: "Open exploration",
    summary: "No fixed goal—help the student pick their own small goal and iterate.",
    mentorBrief:
      "Ask what they want the robot to pretend to do (e.g. deliver mail, patrol). Then suggest one tiny program toward that story.",
  },
];
