import { COMMANDS } from "../../data/commands";
import { GUIDE_PROJECTS, type GuideProject } from "../../data/guide-projects";
import { requestGuide } from "../../lib/guide-client";
import type { Block } from "../../types/app";

const STORAGE_ENROLL = "brailleGuideEnrollmentV1";
const STORAGE_THREAD = "brailleGuideThreadV1";

type ThreadTurn = { role: "user" | "model"; text: string };

type Enrollment = { projectId: string; studentName: string; enrolledAt: string };

type GuideContext = {
  getBlocks: () => Block[];
  getProjectTitle: () => string;
  announcePolite: (s: string) => void;
  announceAssertive: (s: string) => void;
};

function blockSummary(blocks: Block[]): string {
  if (!blocks.length) return "(empty — no blocks yet)";
  return blocks
    .map((b, i) => {
      const c = COMMANDS.find((x) => x.id === b.commandId);
      if (!c) return `${i + 1}. unknown block`;
      const p = Object.entries(b.params)
        .map(([k, v]) => `${k}=${v}`)
        .join(", ");
      return `${i + 1}. ${c.label} (${c.phrase})${p ? ` {${p}}` : ""}`;
    })
    .join("; ");
}

function blocksCheatSheet(): string {
  return COMMANDS.map((c) => `• ${c.label} — say "${c.phrase}" or add from palette (${c.category})`).join("\n");
}

function buildSystemInstruction(project: GuideProject): string {
  return [
    "You are a patient mentor for blind and low-vision students using the Braille Robotics block-based programming playground.",
    "The student may use voice commands, keyboard, or screen reader. Never assume they can see the canvas; name blocks and categories clearly.",
    "Give one or two concrete next steps at a time. Short paragraphs. Encourage them to press Run to test. No latex.",
    "",
    "Available blocks:",
    blocksCheatSheet(),
    "",
    `Enrolled project: ${project.title}.`,
    project.summary,
    "",
    "Mentor notes for this project:",
    project.mentorBrief,
  ].join("\n");
}

function loadEnrollment(): Enrollment | null {
  try {
    const raw = localStorage.getItem(STORAGE_ENROLL);
    if (!raw) return null;
    const o = JSON.parse(raw) as Enrollment;
    if (!o.projectId || typeof o.projectId !== "string") return null;
    return {
      projectId: o.projectId,
      studentName: typeof o.studentName === "string" ? o.studentName : "",
      enrolledAt: typeof o.enrolledAt === "string" ? o.enrolledAt : "",
    };
  } catch {
    return null;
  }
}

function saveEnrollment(e: Enrollment): void {
  localStorage.setItem(STORAGE_ENROLL, JSON.stringify(e));
}

function loadThread(): ThreadTurn[] {
  try {
    const raw = localStorage.getItem(STORAGE_THREAD);
    if (!raw) return [];
    const a = JSON.parse(raw) as unknown;
    if (!Array.isArray(a)) return [];
    return a.filter((t): t is ThreadTurn => t && (t.role === "user" || t.role === "model") && typeof t.text === "string");
  } catch {
    return [];
  }
}

function saveThread(thread: ThreadTurn[]): void {
  const trimmed = thread.slice(-24);
  localStorage.setItem(STORAGE_THREAD, JSON.stringify(trimmed));
}

export function wireAiGuide(root: HTMLElement, ctx: GuideContext): void {
  const sel = (id: string) => root.querySelector(`#${id}`) as HTMLElement | null;

  const studentNameEl = sel("guideStudentName") as HTMLInputElement | null;
  const projectSelect = sel("guideProjectSelect") as HTMLSelectElement | null;
  const enrollBtn = sel("guideEnrollBtn") as HTMLButtonElement | null;
  const leaveBtn = sel("guideLeaveBtn") as HTMLButtonElement | null;
  const enrolledStrip = sel("guideEnrolledStrip") as HTMLDivElement | null;
  const enrolledLabel = sel("guideEnrolledLabel") as HTMLSpanElement | null;
  const messagesEl = sel("guideMessages") as HTMLDivElement | null;
  const nextBtn = sel("guideNextBtn") as HTMLButtonElement | null;
  const askInput = sel("guideAskInput") as HTMLInputElement | null;
  const sendBtn = sel("guideSendBtn") as HTMLButtonElement | null;
  const errorEl = sel("guideError") as HTMLParagraphElement | null;
  const busyEl = sel("guideBusy") as HTMLParagraphElement | null;

  if (
    !studentNameEl ||
    !projectSelect ||
    !enrollBtn ||
    !leaveBtn ||
    !enrolledStrip ||
    !enrolledLabel ||
    !messagesEl ||
    !nextBtn ||
    !askInput ||
    !sendBtn ||
    !errorEl ||
    !busyEl
  ) {
    return;
  }

  const ui = {
    studentNameEl,
    projectSelect,
    enrollBtn,
    leaveBtn,
    enrolledStrip,
    enrolledLabel,
    messagesEl,
    nextBtn,
    askInput,
    sendBtn,
    errorEl,
    busyEl,
  };

  ui.projectSelect.innerHTML = GUIDE_PROJECTS.map(
    (p) => `<option value="${p.id}">${p.title}</option>`
  ).join("");

  let thread = loadThread();
  let enrollment = loadEnrollment();
  let busy = false;

  function setError(msg: string): void {
    if (msg) {
      ui.errorEl.textContent = msg;
      ui.errorEl.hidden = false;
      ctx.announceAssertive(msg);
    } else {
      ui.errorEl.textContent = "";
      ui.errorEl.hidden = true;
    }
  }

  function setBusy(v: boolean): void {
    busy = v;
    ui.busyEl.hidden = !v;
    ui.nextBtn.disabled = v || !enrollment;
    ui.sendBtn.disabled = v || !enrollment;
    ui.askInput.disabled = v || !enrollment;
    ui.enrollBtn.disabled = v;
  }

  function currentProject(): GuideProject | null {
    return GUIDE_PROJECTS.find((p) => p.id === enrollment?.projectId) ?? null;
  }

  function renderMessages(): void {
    ui.messagesEl.innerHTML = thread
      .map(
        (t) =>
          `<div class="guide-msg guide-msg-${t.role}" role="article"><span class="guide-msg-who">${t.role === "user" ? "You" : "Guide"}</span><p>${escapeHtml(t.text)}</p></div>`
      )
      .join("");
    ui.messagesEl.scrollTop = ui.messagesEl.scrollHeight;
  }

  function escapeHtml(s: string): string {
    return s
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;");
  }

  function syncEnrolledUi(): void {
    const p = currentProject();
    if (enrollment && p) {
      ui.enrolledStrip.hidden = false;
      ui.enrolledLabel.textContent = `${p.title}${enrollment.studentName ? ` · ${enrollment.studentName}` : ""}`;
      ui.nextBtn.disabled = busy;
      ui.sendBtn.disabled = busy;
      ui.askInput.disabled = busy;
      ui.leaveBtn.hidden = false;
    } else {
      ui.enrolledStrip.hidden = true;
      ui.nextBtn.disabled = true;
      ui.sendBtn.disabled = true;
      ui.askInput.disabled = true;
      ui.leaveBtn.hidden = true;
      enrollment = null;
    }
  }

  const GUIDE_REQUEST_TIMEOUT_MS = 25_000;
  const GUIDE_TIMEOUT_FALLBACK =
    "The guide is taking longer than usual, often because of a slow or busy network. You can still work on your own: add blocks from the Block Palette, use the manual command line, or the microphone, then press Run. Read the project summary above, or try “What should I do next?” again in a minute. If the problem continues, check your connection or try again later.";

  async function callGuide(userText: string): Promise<void> {
    const project = currentProject();
    if (!project) return;
    setError("");
    setBusy(true);
    thread.push({ role: "user", text: userText });
    saveThread(thread);
    renderMessages();

    const contents = thread.map((t) => ({ role: t.role, parts: [{ text: t.text }] }));
    const controller = new AbortController();
    const timeoutId = window.setTimeout(() => controller.abort(), GUIDE_REQUEST_TIMEOUT_MS);

    try {
      const reply = await requestGuide(
        {
          systemInstruction: { parts: [{ text: buildSystemInstruction(project) }] },
          contents,
          generationConfig: { temperature: 0.65, maxOutputTokens: 512 },
        },
        controller.signal
      );
      thread.push({ role: "model", text: reply });
      saveThread(thread);
      renderMessages();
      ctx.announcePolite(reply);
    } catch (e) {
      const aborted =
        (e instanceof DOMException && e.name === "AbortError") ||
        (typeof e === "object" &&
          e !== null &&
          "name" in e &&
          (e as { name: string }).name === "AbortError");
      if (aborted) {
        thread.push({ role: "model", text: GUIDE_TIMEOUT_FALLBACK });
        saveThread(thread);
        renderMessages();
        setError("");
        ctx.announcePolite("The guide is taking a while, so we are showing tips you can use on your own.");
      } else {
        thread.pop();
        saveThread(thread);
        renderMessages();
        const msg = e instanceof Error ? e.message : String(e);
        setError(msg);
      }
    } finally {
      window.clearTimeout(timeoutId);
      setBusy(false);
      syncEnrolledUi();
    }
  }

  ui.enrollBtn.addEventListener("click", () => {
    const id = ui.projectSelect.value;
    const project = GUIDE_PROJECTS.find((p) => p.id === id);
    if (!project) return;
    const studentName = ui.studentNameEl.value.trim();
    enrollment = { projectId: id, studentName, enrolledAt: new Date().toISOString() };
    saveEnrollment(enrollment);
    thread = [];
    saveThread(thread);
    renderMessages();
    syncEnrolledUi();
    ctx.announcePolite(`Enrolled in ${project.title}. Getting your first step from the guide.`);
    const programTitle = ctx.getProjectTitle();
    const intro = [
      studentName ? `My name is ${studentName}.` : "",
      `I just enrolled in the guided project "${project.title}".`,
      `My program is named "${programTitle}".`,
      "Please welcome me and tell me the very first thing I should do in the editor (one clear step).",
    ]
      .filter(Boolean)
      .join(" ");
    void callGuide(intro);
  });

  ui.leaveBtn.addEventListener("click", () => {
    localStorage.removeItem(STORAGE_ENROLL);
    localStorage.removeItem(STORAGE_THREAD);
    enrollment = null;
    thread = [];
    renderMessages();
    syncEnrolledUi();
    ctx.announcePolite("You left the guided project.");
  });

  ui.nextBtn.addEventListener("click", () => {
    const p = currentProject();
    if (!p) return;
    const stack = blockSummary(ctx.getBlocks());
    void callGuide(
      `Program name: "${ctx.getProjectTitle()}". My current block stack from top to bottom is: ${stack}. What single next step should I take?`
    );
  });

  ui.sendBtn.addEventListener("click", () => {
    const q = ui.askInput.value.trim();
    if (!q) {
      ctx.announcePolite("Type a question first, or use What should I do next.");
      return;
    }
    ui.askInput.value = "";
    const stack = blockSummary(ctx.getBlocks());
    void callGuide(`Context — stack: ${stack}. My question: ${q}`);
  });

  ui.askInput.addEventListener("keydown", (e) => {
    if (e.key === "Enter") {
      e.preventDefault();
      ui.sendBtn.click();
    }
  });

  if (enrollment && currentProject()) {
    thread = loadThread();
    renderMessages();
  } else {
    renderMessages();
  }
  syncEnrolledUi();
}
