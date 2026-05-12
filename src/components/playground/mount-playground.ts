import "../../types/speech";
import type { SpeechRecognition } from "../../types/speech";
import type { Block, BlockCategoryId } from "../../types/app";
import {
  CATEGORIES,
  COMMANDS,
  createBlockFromCommandId,
  getCommandById,
  mergeDefaultParams,
  parseStoredBlocks,
  STORAGE_KEY,
  LEGACY_STORAGE_KEY,
} from "../../data/commands";
import {
  getDefaultRobotModel,
  getPortRole,
  getRobotModelById,
  listPortsForPanel,
  ROBOT_MODELS,
  type RobotModel,
} from "../../data/robot-models";
import { compileToMicroPython } from "../../lib/codegen";
import {
  applySimCommand,
  createInitialSimState,
  resetSimToCenter,
  simMmToPercent,
  type SimState,
} from "../../lib/sim-engine";
import { createSimRobot3D } from "../../lib/sim-robot-3d";
import { extractParamsFromUtterance } from "../../lib/voice-params";
import { findBestCommandIndex, normalizeText, sleep } from "../../lib/utils";
import { getPlaygroundShellHtml } from "./shell-html";
import { wireA11yPanel } from "../../lib/wire-a11y-panel";
import { wireAiGuide } from "./wire-ai-guide";
import { isPlaygroundTourComplete, startPlaygroundTour } from "./wire-playground-tour";

const ROBOT_MODEL_STORAGE_KEY = "braillePlaygroundRobotModelV1";

function escHtml(s: string): string {
  return s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");
}

export function mountPlayground(root: HTMLElement): void {
  root.innerHTML = getPlaygroundShellHtml();

  let isListening = false;
  let isRunning = false;
  let recognition: SpeechRecognition | null = null;
  let blocks: Block[] = [];
  let activeCategory: BlockCategoryId = "motors";
  let robotModel: RobotModel = getDefaultRobotModel();
  let simState: SimState = createInitialSimState(robotModel);
  let runAbort = false;
  let zoom = 1;
  let isStageExpanded = false;
  let dragId: string | null = null;
  let listenSessionTimer: number | null = null;
  /** Suppress duplicate `processCommand` when the speech engine fires the same final twice in one utterance. */
  let lastVoiceProcessKey = "";
  let lastVoiceProcessAt = 0;
  /** When true, `recognition.onend` must not call `start()` — we stopped the mic for TTS. */
  let micPausedForBrowserTts = false;
  let resumeAfterTtsRetryCount = 0;

  const el = {
    srPolite: document.getElementById("srPolite") as HTMLDivElement,
    srAssertive: document.getElementById("srAssertive") as HTMLDivElement,
    projectName: document.getElementById("projectName") as HTMLInputElement,
    micBtn: document.getElementById("micBtn") as HTMLButtonElement,
    micBtnText: document.getElementById("micBtnText") as HTMLSpanElement,
    waveform: document.getElementById("waveform") as HTMLSpanElement,
    transcript: document.getElementById("transcript") as HTMLDivElement,
    manualCmd: document.getElementById("manualCmd") as HTMLInputElement,
    canvasCmd: document.getElementById("canvasCmd") as HTMLInputElement,
    categorySidebar: document.getElementById("categorySidebar") as HTMLDivElement,
    blockList: document.getElementById("blockList") as HTMLDivElement,
    clearBtn: document.getElementById("clearBtn") as HTMLButtonElement,
    undoBtn: document.getElementById("undoBtn") as HTMLButtonElement,
    zoomInBtn: document.getElementById("zoomInBtn") as HTMLButtonElement,
    zoomOutBtn: document.getElementById("zoomOutBtn") as HTMLButtonElement,
    stackWrap: document.getElementById("stackWrap") as HTMLDivElement,
    stackBlocks: document.getElementById("stackBlocks") as HTMLDivElement,
    emptyMsg: document.getElementById("emptyMsg") as HTMLDivElement,
    voiceDropZone: document.getElementById("voiceDropZone") as HTMLDivElement,
    runBtn: document.getElementById("runBtn") as HTMLButtonElement,
    expandStageBtn: document.getElementById("expandStageBtn") as HTMLButtonElement,
    runBtnTop: document.getElementById("runBtnTop") as HTMLButtonElement,
    stopBtn: document.getElementById("stopBtn") as HTMLButtonElement,
    stopBtnTop: document.getElementById("stopBtnTop") as HTMLButtonElement,
    resetBtn: document.getElementById("resetBtn") as HTMLButtonElement,
    resetSimViewBtn: document.getElementById("resetSimViewBtn") as HTMLButtonElement,
    exportBtn: document.getElementById("exportBtn") as HTMLButtonElement,
    connLabel: document.getElementById("connLabel") as HTMLSpanElement,
    connDot: document.getElementById("connDot") as HTMLSpanElement,
    simCanvas: document.getElementById("simCanvas") as HTMLDivElement,
    sim3dHost: document.getElementById("sim3dHost") as HTMLDivElement,
    simLog: document.getElementById("simLog") as HTMLDivElement,
    robotModelSelect: document.getElementById("robotModelSelect") as HTMLSelectElement,
    robotModelDesc: document.getElementById("robotModelDesc") as HTMLParagraphElement,
    portStatusPanel: document.getElementById("portStatusPanel") as HTMLDivElement,
    hubMatrixGrid: document.getElementById("hubMatrixGrid") as HTMLDivElement,
    hubMatrixSr: document.getElementById("hubMatrixSr") as HTMLParagraphElement,
  };

  const sim3d = createSimRobot3D(el.sim3dHost);

  function mergedParams(b: Block): Record<string, string | number> {
    const c = getCommandById(b.commandId);
    if (!c) return b.params;
    return mergeDefaultParams(c, b.params);
  }

  function blockA11yLabel(b: Block, stepIdx: number): string {
    const c = getCommandById(b.commandId);
    if (!c) return `Step ${stepIdx + 1}: unknown block`;
    const m = mergedParams(b);
    const details = c.params
      .map((p) => (m[p.name] !== undefined ? `${p.voiceHint}: ${m[p.name]}` : null))
      .filter(Boolean)
      .join(", ");
    return `Step ${stepIdx + 1}: ${c.label}${details ? `. ${details}` : ""}`;
  }

  function loadSavedRobotModel(): RobotModel {
    try {
      const id = localStorage.getItem(ROBOT_MODEL_STORAGE_KEY);
      if (id) {
        const m = getRobotModelById(id);
        if (m) return m;
      }
    } catch {
      /* noop */
    }
    return getDefaultRobotModel();
  }

  function persistRobotModelId(id: string): void {
    try {
      localStorage.setItem(ROBOT_MODEL_STORAGE_KEY, id);
    } catch {
      /* noop */
    }
  }

  function wireRobotModel(): void {
    el.robotModelSelect.innerHTML = ROBOT_MODELS.map(
      (m) =>
        `<option value="${escHtml(m.id)}" title="${escHtml(m.name + ". " + m.description + " " + m.wheelDiameterMm + " mm wheels, " + m.axleTrackMm + " mm track.")}">${escHtml(
          m.name
        )}</option>`
    ).join("");
    robotModel = loadSavedRobotModel();
    el.robotModelSelect.value = robotModel.id;
    el.robotModelDesc.textContent = robotModel.description;
    simState = createInitialSimState(robotModel);
    el.robotModelSelect.addEventListener("change", () => {
      const m = getRobotModelById(el.robotModelSelect.value);
      if (!m) return;
      robotModel = m;
      persistRobotModelId(m.id);
      el.robotModelDesc.textContent = m.description;
      simState = createInitialSimState(robotModel);
      updateRobotEl();
      updatePortStatusPanel();
      updateHubMatrix();
      announcePolite(`Robot model: ${m.name}. ${m.description}`);
    });
  }

  function updatePortStatusPanel(): void {
    const ports = listPortsForPanel();
    const items = ports.map((p) => {
      const role = getPortRole(robotModel, p);
      const m = simState.motors[p]!;
      const status = m.running
        ? `Running, about ${Math.round(m.velocityDps)} degrees per second`
        : `Idle, position about ${Math.round(m.positionDeg)}°`;
      const line = role
        ? `Port ${p}: ${role}. ${status}.`
        : `Port ${p}: not pre-assigned for this model. ${status} if a block uses this port.`;
      return `<li class="port-line"><span class="port-letter" aria-hidden="true">${p}</span><span class="port-detail">${escHtml(
        line
      )}</span></li>`;
    });
    el.portStatusPanel.innerHTML = `<ul class="port-status-list" role="list">${items.join("")}</ul>`;
  }

  function updateHubMatrix(): void {
    const cells = simState.hub.lightMatrix;
    const rows = cells
      .map(
        (row) =>
          `<div class="hub-matrix-row" role="presentation">` +
          row
            .map(
              (v) =>
                `<div class="hub-mcell" style="opacity:${
                  0.1 + (v / 100) * 0.9
                }" role="cell" data-bright="${v}" title="brightness ${v}"></div>`
            )
            .join("") +
          `</div>`
      )
      .join("");
    el.hubMatrixGrid.innerHTML = rows;
    const lit: string[] = [];
    for (let y = 0; y < 5; y++) {
      for (let x = 0; x < 5; x++) {
        if ((cells[y]![x] ?? 0) > 40) lit.push(`row ${y + 1} column ${x + 1}`);
      }
    }
    el.hubMatrixSr.textContent = lit.length ? `Lit pixels: ${lit.join(", ")}.` : "Light matrix: dim or empty in simulation.";
  }

  function init(): void {
    void sim3d.load().then(() => sim3d.setPose(simState, robotModel));
    renderCategories();
    renderPaletteBlocks();
    wireEvents();
    loadBlocks();
    renderStack();
    wireRobotModel();
    resetRobot();
    setupSpeechRecognition();
    if (!isPlaygroundTourComplete()) {
      requestAnimationFrame(() => {
        startPlaygroundTour({
          appRoot: root,
          srPolite: el.srPolite,
          onClose: () => {
            announcePolite(
              "Playground ready. Add blocks or use the mic, then press Run. Script in the middle, robot stage on the right."
            );
            if (blocks.length > 0) {
              window.setTimeout(() => {
                announcePolite(`Loaded ${blocks.length} saved blocks from your last visit.`);
              }, 800);
            }
          },
        });
      });
    } else {
      window.setTimeout(() => {
        announcePolite(
          "Playground ready. Add blocks or use the mic, then press Run. Script in the middle, robot stage on the right."
        );
      }, 500);
      if (blocks.length > 0) {
        window.setTimeout(() => {
          announcePolite(`Loaded ${blocks.length} saved blocks from your last visit.`);
        }, 1200);
      }
    }
    const guideRoot = document.getElementById("aiGuideRoot");
    if (guideRoot) {
      wireAiGuide(guideRoot, {
        getBlocks: () => blocks,
        getProjectTitle: () => el.projectName.value.trim() || "My Robot Program",
        announcePolite,
        announceAssertive,
      });
    }

    function announceA11yOnly(text: string): void {
      setLiveRegion(el.srPolite, text);
    }
    wireA11yPanel(announceA11yOnly);
  }

  function wireEvents(): void {
    el.micBtn.addEventListener("click", () => (isListening ? stopListening() : startListening()));
    function submitTypedCommandField(field: HTMLInputElement): void {
      const v = field.value.trim();
      if (!v) {
        announcePolite("No command typed. Enter a phrase like move forward, or use the microphone.");
        return;
      }
      processCommand(v);
      field.value = "";
    }
    el.manualCmd.addEventListener("keydown", (e) => {
      if (e.key === "Enter") submitTypedCommandField(el.manualCmd);
    });
    el.canvasCmd.addEventListener("keydown", (e) => {
      if (e.key === "Enter") submitTypedCommandField(el.canvasCmd);
    });
    document.addEventListener("keydown", (e) => {
      if (e.key === "Enter" && (e.ctrlKey || e.metaKey) && !e.shiftKey) {
        e.preventDefault();
        void runSimulation();
      }
    });
    el.projectName.addEventListener("blur", () => {
      const v = el.projectName.value.trim() || "My Robot Program";
      el.projectName.value = v;
      announcePolite(`Project name: ${v}.`);
    });
    el.projectName.addEventListener("keydown", (e) => {
      if (e.key === "Enter") (e.target as HTMLInputElement).blur();
    });
    el.clearBtn.addEventListener("click", clearBlocks);
    el.undoBtn.addEventListener("click", undoLastBlock);
    el.zoomInBtn.addEventListener("click", () => setZoom(zoom + 0.1));
    el.zoomOutBtn.addEventListener("click", () => setZoom(zoom - 0.1));
    el.runBtn.addEventListener("click", () => void runSimulation());
    el.runBtnTop.addEventListener("click", () => void runSimulation());
    el.expandStageBtn.addEventListener("click", toggleStageExpand);
    el.stopBtn.addEventListener("click", stopSimulation);
    el.stopBtnTop.addEventListener("click", stopSimulation);
    el.resetBtn.addEventListener("click", () => resetRobot(true));
    el.resetSimViewBtn.addEventListener("click", () => {
      sim3d.resetView();
      announcePolite("3D view reset: default angle and zoom.");
    });
    el.exportBtn.addEventListener("click", exportProgram);
    window.addEventListener("resize", updateRobotEl);
  }

  function renderCategories(): void {
    el.categorySidebar.innerHTML = CATEGORIES.map(
      (c) => `<button class="cat-btn ${c.id === activeCategory ? "active" : ""}" data-cat="${c.id}" title="${c.label}" data-sr="category-${c.id}"><i class="${c.icon}"></i></button>`
    ).join("");
    el.categorySidebar.querySelectorAll<HTMLButtonElement>(".cat-btn").forEach((btn) => {
      btn.addEventListener("click", () => {
        activeCategory = btn.dataset.cat as BlockCategoryId;
        const cat = CATEGORIES.find((c) => c.id === activeCategory);
        renderCategories();
        renderPaletteBlocks();
        announcePolite(
          `${cat?.label ?? activeCategory} category. ${COMMANDS.filter((c) => c.category === activeCategory).length} blocks in this list.`
        );
      });
    });
  }

  function renderPaletteBlocks(): void {
    const list = COMMANDS.filter((c) => c.category === activeCategory);
    el.blockList.innerHTML = list
      .map((c) => {
        const sub = c.phrase.length > 48 ? c.phrase.slice(0, 45) + "…" : c.phrase;
        return `<button type="button" class="palette-block cat-${c.category}" data-command-id="${escHtml(c.id)}" data-sr="palette-${c.label.toLowerCase().replace(/\s+/g, "-")}"><span class="stripe"></span><span class="dot"></span><span class="txt"><strong><i class="${c.icon}"></i> ${escHtml(c.label)}</strong><small>${escHtml(sub)}</small></span><span class="add"><i class="ph ph-plus"></i></span></button>`;
      })
      .join("");
    el.blockList.querySelectorAll<HTMLButtonElement>(".palette-block").forEach((btn) => {
      btn.addEventListener("click", () => {
        const id = btn.dataset.commandId;
        if (id) addBlockDirect(id);
      });
    });
  }

  function setupSpeechRecognition(): void {
    const SpeechRec = window.SpeechRecognition ?? window.webkitSpeechRecognition;
    if (!SpeechRec) {
      updateTranscript('<i class="ph ph-microphone-slash"></i> "voice not supported" → ✗ Not recognised');
      el.connLabel.textContent = "○ Disconnected";
      el.connDot.className = "dot off";
      announceAssertive(
        "Voice recognition is not available in this browser. Use Chrome or Edge, or type commands in the manual input field."
      );
      return;
    }
    recognition = new SpeechRec();
    recognition.continuous = true;
    recognition.interimResults = true;
    recognition.lang = "en-US";
    recognition.onresult = (e) => {
      let live = "";
      for (let i = 0; i < e.results.length; i++) {
        live += e.results[i]![0]!.transcript;
      }
      const text = live.trim().toLowerCase();
      updateTranscript(`<i class="ph ph-microphone"></i> "${text || "..."}"`);
      if (isRunning) return;
      // Do not process finals while browser TTS is speaking (avoids hearing our own voice / SR loop).
      if (isSpeechSynthBusy()) return;
      // Only handle *new* finals (resultIndex). In continuous mode, `e.results` grows for the
      // whole session; concatenating every final re-processes old utterances and adds duplicate blocks.
      const VOICE_DEDUPE_MS = 450;
      for (let i = e.resultIndex; i < e.results.length; i++) {
        const r = e.results[i];
        if (!r?.isFinal) continue;
        const chunk = r[0].transcript.trim().toLowerCase();
        if (!chunk) continue;
        const now = performance.now();
        if (chunk === lastVoiceProcessKey && now - lastVoiceProcessAt < VOICE_DEDUPE_MS) continue;
        lastVoiceProcessKey = chunk;
        lastVoiceProcessAt = now;
        processCommand(chunk);
      }
    };
    recognition.onend = () => {
      if (!isListening) return;
      if (micPausedForBrowserTts) return;
      window.setTimeout(() => {
        if (!isListening || !recognition) return;
        if (micPausedForBrowserTts) return;
        try {
          recognition.start();
        } catch {
          /* invalid state */
        }
      }, 0);
    };
    recognition.onerror = (e) => {
      if (e.error === "no-speech" && isListening) return;
      if (e.error === "aborted") return;
      clearListenSessionTimer();
      stopListening({ announce: false });
      updateTranscript(`<i class="ph ph-warning-circle"></i> "${e.error}" → ✗ Not recognised`);
      announceAssertive(`Voice input error: ${e.error}. Try again or type your command.`);
    };
  }

  const LISTEN_SESSION_MS = 3 * 60 * 1000;

  function clearListenSessionTimer(): void {
    if (listenSessionTimer != null) {
      window.clearTimeout(listenSessionTimer);
      listenSessionTimer = null;
    }
  }

  function startListening(): void {
    if (!recognition) {
      announceAssertive("Microphone is not available. Type your command in the text field.");
      return;
    }
    if (window.speechSynthesis) window.speechSynthesis.cancel();
    micPausedForBrowserTts = false;
    resumeAfterTtsRetryCount = 0;
    isListening = true;
    try {
      recognition.start();
    } catch {
      isListening = false;
      el.micBtn.classList.remove("listening");
      el.waveform.classList.remove("active");
      el.micBtn.setAttribute("aria-pressed", "false");
      el.micBtnText.textContent = "Speak Command";
      announceAssertive("Could not start the microphone. Try again in a moment.");
      return;
    }
    el.micBtn.classList.add("listening");
    el.waveform.classList.add("active");
    el.micBtn.setAttribute("aria-pressed", "true");
    el.micBtnText.textContent = "Listening...";
    el.voiceDropZone.hidden = false;
    clearListenSessionTimer();
    listenSessionTimer = window.setTimeout(() => {
      if (!isListening) return;
      stopListening({ announce: false });
      setLiveRegion(el.srPolite, "Session ended. Press Speak command to add more by voice.");
      updateTranscript('<i class="ph ph-pause"></i> Long session paused — tap mic to speak again');
    }, LISTEN_SESSION_MS);
    setLiveRegion(el.srPolite, "Listening. Speak your command.");
  }

  function stopListening(opts?: { announce?: boolean }): void {
    clearListenSessionTimer();
    isListening = false;
    micPausedForBrowserTts = false;
    resumeAfterTtsRetryCount = 0;
    if (recognition) {
      try {
        recognition.stop();
      } catch {
        /* noop */
      }
    }
    el.micBtn.classList.remove("listening");
    el.waveform.classList.remove("active");
    el.micBtn.setAttribute("aria-pressed", "false");
    el.micBtnText.textContent = "Speak Command";
    el.voiceDropZone.hidden = true;
    if (opts?.announce !== false) announcePolite("Microphone off.");
  }

  function processCommand(text: string): void {
    const raw = text.trim();
    if (!raw) return;
    const normalized = normalizeText(raw);
    const segments = normalized.split(/\b(?:and then|then|and|,)\b/g).map((s) => s.trim()).filter(Boolean);
    const chunks = segments.length ? segments : [normalized];
    let added = 0;
    let firstLabel = "";
    for (const seg of chunks) {
      const idx = findCommandIndex(seg);
      if (idx === -1) continue;
      const cmd = COMMANDS[idx];
      const params = extractParamsFromUtterance(seg, cmd);
      const inst = createBlockFromCommandId(cmd.id, params);
      if (!inst) continue;
      if (!firstLabel) firstLabel = cmd.label;
      blocks.push(inst);
      added += 1;
    }
    if (added === 0) {
      updateTranscript(`<i class="ph ph-warning-circle"></i> "${raw}" → ✗ Not recognised`);
      el.micBtn.classList.add("shake");
      window.setTimeout(() => el.micBtn.classList.remove("shake"), 220);
      announceAssertive(`Command not recognised: ${raw}. Try a phrase like move forward, or pick a block from the palette.`);
      return;
    }
    saveBlocks();
    const lastId = blocks[blocks.length - 1]?.id;
    renderStack(animateIdForLast(added, lastId));
    updateTranscript(`<i class="ph ph-check-circle"></i> "${raw}" → ✓ Added ${added}`);
    if (added === 1) announcePolite(`Added ${firstLabel}. You have ${blocks.length} blocks.`);
    else announcePolite(`Added ${added} blocks. You have ${blocks.length} blocks in your program.`);
  }

  function animateIdForLast(added: number, lastId: string | undefined): string | null {
    if (added !== 1 || !lastId) return null;
    return lastId;
  }

  function findCommandIndex(text: string): number {
    return findBestCommandIndex(text, COMMANDS);
  }

  function addBlockDirect(commandId: string): void {
    const inst = createBlockFromCommandId(commandId);
    if (!inst) return;
    const cmd = getCommandById(commandId);
    blocks.push(inst);
    saveBlocks();
    renderStack(inst.id);
    const phrase = cmd?.phrase ?? commandId;
    updateTranscript(`<i class="ph ph-check-circle"></i> "${phrase}" → ✓ Added block`);
    announcePolite(
      `Added ${cmd?.label ?? commandId} from the palette. ${blocks.length} blocks. Parameters: use tab to focus fields on each block.`
    );
  }

  function undoLastBlock(): void {
    if (!blocks.length) {
      announcePolite("Nothing to undo.");
      return;
    }
    const last = blocks[blocks.length - 1];
    const label = getCommandById(last.commandId)?.label ?? "block";
    blocks.pop();
    saveBlocks();
    renderStack();
    announcePolite(`Undo. Removed ${label}. ${blocks.length} blocks remaining.`);
  }

  function removeBlock(id: string): void {
    const b = blocks.find((x) => x.id === id);
    const label = b ? getCommandById(b.commandId)?.label ?? "block" : "block";
    blocks = blocks.filter((x) => x.id !== id);
    saveBlocks();
    renderStack();
    announcePolite(`Removed ${label} from your program. ${blocks.length} blocks left.`);
  }

  function clearBlocks(): void {
    blocks = [];
    saveBlocks();
    renderStack();
    announcePolite("All blocks cleared. Your program is empty.");
  }

  function moveBlock(id: string, direction: number): void {
    const i = blocks.findIndex((b) => b.id === id);
    const j = i + direction;
    if (i < 0 || j < 0 || j >= blocks.length) {
      announcePolite("Cannot move this block further in that direction.");
      return;
    }
    const label = getCommandById(blocks[i]!.commandId)?.label ?? "block";
    [blocks[i], blocks[j]] = [blocks[j]!, blocks[i]!];
    saveBlocks();
    renderStack();
    announcePolite(direction < 0 ? `Moved ${label} up in the stack.` : `Moved ${label} down in the stack.`);
  }

  function setBlockParam(bid: string, key: string, value: string | number): void {
    const i = blocks.findIndex((b) => b.id === bid);
    if (i < 0) return;
    const c = getCommandById(blocks[i]!.commandId);
    if (!c) return;
    const pdef = c.params.find((p) => p.name === key);
    let v: string | number = value;
    if (pdef?.type === "int") v = Math.round(typeof value === "number" ? value : parseInt(String(value), 10) || 0);
    const next = { ...blocks[i]!.params, [key]: v };
    const merged = mergeDefaultParams(c, next);
    blocks[i] = { ...blocks[i]!, params: merged };
    saveBlocks();
  }

  function paramFieldsHtml(b: Block, stepIdx: number): string {
    const c = getCommandById(b.commandId);
    if (!c || c.params.length === 0) return "";
    const m = mergedParams(b);
    return c.params
      .map((p) => {
        const id = `p-${b.id}-${p.name}`;
        if (p.type === "port") {
          const opts = (["A", "B", "C", "D", "E", "F"] as const)
            .map((x) => `<option value="${x}"${String(m[p.name] ?? p.default) === x ? " selected" : ""}>${x}</option>`)
            .join("");
          return `<div class="stack-param"><label for="${id}">${escHtml(p.voiceHint)}</label><select id="${id}" class="stack-param-inp" data-bid="${escHtml(b.id)}" data-pkey="${escHtml(p.name)}" aria-label="${escHtml(p.voiceHint)} for step ${stepIdx + 1}">${opts}</select></div>`;
        }
        if (p.type === "color" && p.options?.length) {
          const opts = p.options
            .map((x) => `<option value="${x}"${String(m[p.name] ?? p.default) === x ? " selected" : ""}>${x}</option>`)
            .join("");
          return `<div class="stack-param"><label for="${id}">${escHtml(p.voiceHint)}</label><select id="${id}" class="stack-param-inp" data-bid="${escHtml(b.id)}" data-pkey="${escHtml(p.name)}" aria-label="${escHtml(p.voiceHint)} for step ${stepIdx + 1}">${opts}</select></div>`;
        }
        if (p.type === "int") {
          const val = m[p.name] ?? p.default;
          return `<div class="stack-param"><label for="${id}">${escHtml(p.voiceHint)}</label><input id="${id}" class="stack-param-inp" type="number" data-bid="${escHtml(b.id)}" data-pkey="${escHtml(
            p.name
          )}" min="${p.min ?? ""}" max="${p.max ?? ""}" value="${val}" step="1" aria-label="${escHtml(p.voiceHint)} for step ${stepIdx + 1}"/></div>`;
        }
        if (p.type === "string" || p.type === "image" || p.type === "direction") {
          const val = String(m[p.name] ?? p.default);
          if (p.options?.length) {
            const opts = p.options
              .map((x) => `<option value="${x}"${val === x ? " selected" : ""}>${x}</option>`)
              .join("");
            return `<div class="stack-param"><label for="${id}">${escHtml(p.voiceHint)}</label><select id="${id}" class="stack-param-inp" data-bid="${escHtml(b.id)}" data-pkey="${escHtml(p.name)}" aria-label="${escHtml(p.voiceHint)} for step ${stepIdx + 1}">${opts}</select></div>`;
          }
          return `<div class="stack-param"><label for="${id}">${escHtml(p.voiceHint)}</label><input id="${id}" class="stack-param-inp" type="text" data-bid="${escHtml(b.id)}" data-pkey="${escHtml(
            p.name
          )}" value="${escHtml(val)}" aria-label="${escHtml(p.voiceHint)} for step ${stepIdx + 1}"/></div>`;
        }
        return "";
      })
      .join("");
  }

  function renderStack(animateId: string | null = null): void {
    el.emptyMsg.hidden = blocks.length > 0;
    el.runBtn.disabled = blocks.length === 0 || isRunning;
    el.runBtnTop.disabled = blocks.length === 0 || isRunning;
    el.stackBlocks.innerHTML = blocks
      .map((b, idx) => {
        const cmd = getCommandById(b.commandId);
        if (!cmd) return "";
        const a11y = escHtml(blockA11yLabel(b, idx));
        const phtml = paramFieldsHtml(b, idx);
        return `<div class="stack-node ${animateId === b.id ? "added" : ""}" data-id="${escHtml(
          b.id
        )}" draggable="true" role="listitem" aria-roledescription="program block" aria-label="${a11y}"><div class="connector"></div><div class="stack-block cat-${
          cmd.category
        }" data-sr="stack-${idx}"><div class="stack-block-top"><span class="drag" title="Drag to reorder"><i class="ph ph-dots-six-vertical"></i></span><div class="stack-copy"><strong><i class="${
          cmd.icon
        }"></i> ${escHtml(cmd.label)}</strong><small>${escHtml(cmd.phrase)}</small></div><div class="block-actions" role="toolbar" aria-label="Block actions for step ${idx + 1}"><button type="button" class="tiny" data-up="${escHtml(
          b.id
        )}" aria-label="Move up"><i class="ph ph-caret-up"></i></button><button type="button" class="tiny" data-down="${escHtml(
          b.id
        )}" aria-label="Move down"><i class="ph ph-caret-down"></i></button><button type="button" class="tiny" data-del="${escHtml(
          b.id
        )}" aria-label="Remove block"><i class="ph ph-x"></i></button></div></div>${phtml ? `<div class="stack-param-wrap" role="group" aria-label="Parameters for ${escHtml(cmd.label)}">${phtml}</div>` : ""}</div></div>`;
      })
      .join("");
    el.stackBlocks.querySelectorAll<HTMLButtonElement>("[data-up]").forEach((b) => {
      b.onclick = () => moveBlock(b.dataset.up!, -1);
    });
    el.stackBlocks.querySelectorAll<HTMLButtonElement>("[data-down]").forEach((b) => {
      b.onclick = () => moveBlock(b.dataset.down!, 1);
    });
    el.stackBlocks.querySelectorAll<HTMLButtonElement>("[data-del]").forEach((b) => {
      b.onclick = () => removeBlock(b.dataset.del!);
    });
    el.stackBlocks.querySelectorAll<HTMLInputElement | HTMLSelectElement>(".stack-param-inp").forEach((inp) => {
      inp.addEventListener("change", () => {
        const bid = inp.dataset.bid;
        const key = inp.dataset.pkey;
        if (!bid || !key) return;
        if (inp instanceof HTMLInputElement && inp.type === "number") setBlockParam(bid, key, inp.valueAsNumber);
        else         setBlockParam(bid, key, (inp as HTMLInputElement | HTMLSelectElement).value);
        const bl = blocks.find((x) => x.id === bid);
        if (bl) announcePolite(`Updated ${key}. ${blockA11yLabel(bl, blocks.findIndex((x) => x.id === bid))}`);
      });
    });
    wireDragReorder();
  }

  function wireDragReorder(): void {
    const nodes = Array.from(el.stackBlocks.querySelectorAll<HTMLElement>(".stack-node"));
    nodes.forEach((node) => {
      const id = node.dataset.id ?? "";
      node.addEventListener("dragstart", () => {
        dragId = id;
        node.classList.add("dragging");
      });
      node.addEventListener("dragend", () => {
        dragId = null;
        node.classList.remove("dragging");
        nodes.forEach((n) => n.classList.remove("drop-target"));
      });
      node.addEventListener("dragover", (e) => {
        e.preventDefault();
        if (dragId === null) return;
        if (node.dataset.id === dragId) return;
        nodes.forEach((n) => n.classList.remove("drop-target"));
        node.classList.add("drop-target");
      });
      node.addEventListener("drop", () => {
        if (dragId === null) return;
        const from = blocks.findIndex((b) => b.id === dragId);
        const to = blocks.findIndex((b) => b.id === node.dataset.id);
        if (from < 0 || to < 0 || from === to) return;
        const [item] = blocks.splice(from, 1);
        blocks.splice(to, 0, item!);
        saveBlocks();
        renderStack();
        const lab = getCommandById(item!.commandId)?.label ?? "Block";
        announcePolite(`Reordered: ${lab} moved to a new position in the stack.`);
      });
    });
  }

  function setZoom(next: number): void {
    const prev = zoom;
    zoom = Math.max(0.7, Math.min(1.4, next));
    el.stackWrap.style.transform = `scale(${zoom})`;
    el.stackWrap.style.transformOrigin = "top left";
    if (Math.abs(zoom - prev) > 0.01) {
      announcePolite(`Script canvas zoom ${Math.round(zoom * 100)} percent.`);
    } else {
      announcePolite("Zoom limit reached.");
    }
  }

  function updateTranscript(text: string): void {
    el.transcript.innerHTML = text;
    window.setTimeout(() => {
      if (el.transcript.innerHTML === text) el.transcript.innerHTML = '<i class="ph ph-microphone"></i> Ready';
    }, 3000);
  }

  function setRunningState(running: boolean): void {
    isRunning = running;
    el.runBtn.disabled = running || blocks.length === 0;
    el.runBtnTop.disabled = running || blocks.length === 0;
    el.stopBtn.hidden = !running;
    el.stopBtnTop.hidden = !running;
  }

  function stopSimulation(): void {
    runAbort = true;
    setRunningState(false);
    log("Stopped by user");
    announcePolite("Run stopped.");
  }

  function toggleStageExpand(): void {
    isStageExpanded = !isStageExpanded;
    const shell = document.querySelector(".app-shell");
    if (!shell) return;
    shell.classList.toggle("stage-expanded", isStageExpanded);
    el.expandStageBtn.innerHTML = isStageExpanded ? '<i class="ph ph-arrows-in"></i> Collapse' : '<i class="ph ph-arrows-out"></i> Expand';
    window.setTimeout(updateRobotEl, 180);
    announcePolite(isStageExpanded ? "Simulator enlarged." : "Simulator back to normal size.");
  }

  function updateRobotEl(): void {
    sim3d.setSize();
    sim3d.setPose(simState, robotModel);
  }

  function spawnTrailAtRobot(): void {
    const { xPct, yPct } = simMmToPercent(simState);
    const cw = el.simCanvas.clientWidth;
    const ch = el.simCanvas.clientHeight;
    const dot = document.createElement("div");
    dot.className = "trail-dot";
    dot.style.left = `${(xPct / 100) * cw}px`;
    dot.style.top = `${(yPct / 100) * ch}px`;
    el.simCanvas.appendChild(dot);
    window.setTimeout(() => dot.remove(), 1800);
  }

  function resetRobot(fromUser = false): void {
    resetSimToCenter(simState);
    updateRobotEl();
    updatePortStatusPanel();
    updateHubMatrix();
    if (fromUser) {
      announcePolite(
        "Robot reset to the centre of the two-metre field, facing up, zero millimetres from top-left origin in the simulator."
      );
    }
  }

  function log(msg: string): void {
    const line = document.createElement("div");
    line.className = "log-line new";
    line.textContent = `> ${msg}`;
    el.simLog.appendChild(line);
    el.simLog.scrollTop = el.simLog.scrollHeight;
  }

  async function runSimulation(): Promise<void> {
    if (!blocks.length) {
      announcePolite("Cannot run. Add at least one block to your program first.");
      return;
    }
    if (isRunning) {
      announcePolite("A run is already in progress.");
      return;
    }
    runAbort = false;
    setRunningState(true);
    resetSimToCenter(simState);
    updateRobotEl();
    updatePortStatusPanel();
    updateHubMatrix();
    el.simLog.innerHTML = "";
    log("Program started");
    const startMsg = `Starting run. ${blocks.length} blocks. Robot: ${robotModel.name}. Field ${simState.field.widthMm} by ${simState.field.heightMm} millimetres.`;
    setLiveRegion(el.srPolite, startMsg);
    await speakAndWait(startMsg);
    for (let i = 0; i < blocks.length; i++) {
      if (runAbort) break;
      const b = blocks[i]!;
      const cmd = getCommandById(b.commandId);
      if (!cmd) continue;
      const m = mergedParams(b);
      const sim = cmd.sim;
      const action = sim.action;
      const linePreview = cmd.codegen.template.slice(0, 64);
      log(`Executing: ${linePreview}${cmd.codegen.template.length > 64 ? "…" : ""}`);
      const node = Array.from(el.stackBlocks.querySelectorAll<HTMLElement>(".stack-node")).find((n) => n.dataset.id === b.id)?.querySelector<HTMLElement>(".stack-block");
      node?.classList.add("executing");
      spawnTrailAtRobot();
      const out = applySimCommand(simState, robotModel, cmd, m);
      if (out.stopRun) runAbort = true;

      updateRobotEl();
      updatePortStatusPanel();
      updateHubMatrix();

      if (out.announce?.trim()) {
        setLiveRegion(el.srPolite, out.announce);
        await speakAndWait(out.announce);
      }

      if (action === "beep") {
        if (window.speechSynthesis) window.speechSynthesis.cancel();
        beepSound(Number(m.freq) || 440, Math.min(2000, Number(m.ms) || 200));
      }
      if (action === "blink_led") {
        sim3d.setBlink(true);
      }
      if (action === "delay") {
        const sec = Number(m.n) || 1;
        await sleep(Math.min(5000, sec * 1000));
      } else if (action === "wait_sensor") {
        await sleep(350);
      }
      updateRobotEl();
      updatePortStatusPanel();
      updateHubMatrix();
      if (!runAbort) await sleep(200);
      node?.classList.remove("executing");
      if (runAbort) break;
    }
    if (!runAbort) {
      log("✓ Done");
    }
    setRunningState(false);
    if (!runAbort) {
      const lastB = blocks[blocks.length - 1];
      const lastCmd = lastB ? getCommandById(lastB.commandId) : null;
      if (lastCmd?.sim.action === "beep") {
        await sleep(400);
      }
      const endMsg = "Program finished successfully.";
      setLiveRegion(el.srPolite, endMsg);
      await speakAndWait(endMsg);
    }
  }

  function saveBlocks(): void {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(blocks));
  }

  function loadBlocks(): void {
    try {
      const newRaw = localStorage.getItem(STORAGE_KEY);
      const legRaw = localStorage.getItem(LEGACY_STORAGE_KEY);
      const raw = newRaw ?? legRaw;
      if (!raw) {
        blocks = [];
        return;
      }
      blocks = parseStoredBlocks(raw);
      if (!newRaw && legRaw && blocks.length) {
        saveBlocks();
        localStorage.removeItem(LEGACY_STORAGE_KEY);
      }
    } catch {
      blocks = [];
    }
  }

  function exportProgram(): void {
    if (!blocks.length) {
      announcePolite("Nothing to export. Add blocks to your program first.");
      return;
    }
    const { python } = compileToMicroPython(blocks);
    const title = el.projectName.value.trim() || "My Robot Program";
    const payload = {
      version: 2,
      createdAt: new Date().toISOString(),
      projectName: title,
      robotModelId: robotModel.id,
      python,
      blocks,
    };
    const blob = new Blob([JSON.stringify(payload, null, 2)], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "braillerobotics-spike-program.json";
    a.click();
    URL.revokeObjectURL(url);
    announcePolite("Program exported. JSON includes MicroPython source for SPIKE Prime.");
  }

  function setLiveRegion(region: HTMLElement, text: string): void {
    region.textContent = "";
    requestAnimationFrame(() => {
      region.textContent = text;
    });
  }

  function isSpeechSynthBusy(): boolean {
    if (typeof window === "undefined" || !window.speechSynthesis) return false;
    return window.speechSynthesis.speaking || window.speechSynthesis.pending;
  }

  /** Stops the mic (without toggling the UI) so the recognition engine cannot hear TTS. */
  function pauseMicForBrowserTts(): void {
    if (!isListening || !recognition) return;
    micPausedForBrowserTts = true;
    try {
      recognition.stop();
    } catch {
      /* noop */
    }
  }

  /** Restarts the mic if the user still has listening on and TTS is done. */
  function resumeMicAfterBrowserTts(): void {
    if (!isListening || !recognition) {
      micPausedForBrowserTts = false;
      resumeAfterTtsRetryCount = 0;
      return;
    }
    if (isSpeechSynthBusy() && resumeAfterTtsRetryCount < 30) {
      resumeAfterTtsRetryCount += 1;
      window.setTimeout(() => resumeMicAfterBrowserTts(), 100);
      return;
    }
    resumeAfterTtsRetryCount = 0;
    micPausedForBrowserTts = false;
    window.setTimeout(() => {
      if (!isListening || !recognition) return;
      if (micPausedForBrowserTts) return;
      if (isSpeechSynthBusy()) return;
      try {
        recognition.start();
      } catch {
        /* already started or bad state */
      }
    }, 0);
  }

  function speakAndWait(text: string): Promise<void> {
    if (!window.speechSynthesis) return Promise.resolve();
    const t = text.trim();
    if (!t) return Promise.resolve();
    resumeAfterTtsRetryCount = 0;
    pauseMicForBrowserTts();
    window.speechSynthesis.cancel();
    return new Promise((resolve) => {
      const u = new SpeechSynthesisUtterance(t);
      u.rate = 1.02;
      const end = () => {
        resolve();
        resumeMicAfterBrowserTts();
      };
      u.onend = end;
      u.onerror = end;
      window.speechSynthesis.speak(u);
    });
  }

  function speak(text: string): void {
    if (!window.speechSynthesis) return;
    resumeAfterTtsRetryCount = 0;
    pauseMicForBrowserTts();
    window.speechSynthesis.cancel();
    const utterance = new SpeechSynthesisUtterance(text);
    utterance.rate = 1.02;
    utterance.onend = () => resumeMicAfterBrowserTts();
    utterance.onerror = () => resumeMicAfterBrowserTts();
    window.speechSynthesis.speak(utterance);
  }

  function announcePolite(text: string): void {
    speak(text);
    setLiveRegion(el.srPolite, text);
  }

  function announceAssertive(text: string): void {
    speak(text);
    setLiveRegion(el.srAssertive, text);
  }

  function beepSound(hz: number, ms: number): void {
    try {
      const Ctx = window.AudioContext || (window as Window & { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
      if (!Ctx) return;
      const ctx = new Ctx();
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.frequency.value = hz;
      const dur = Math.min(ms / 1000, 1.2);
      gain.gain.setValueAtTime(0.2, ctx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + dur);
      osc.start();
      osc.stop(ctx.currentTime + dur);
    } catch {
      /* noop */
    }
  }

  init();
}
