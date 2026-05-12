const STORAGE_KEY = "braillePlaygroundTourDoneV1";

type TourStep = {
  id: string;
  title: string;
  body: string;
  /** null = full-screen center */
  targetSelector: string | null;
};

function buildSteps(narrow: boolean): TourStep[] {
  if (narrow) {
    return [
      {
        id: "welcome",
        title: "Welcome to the playground",
        body: "Build a program with blocks, your voice, or the manual line when it is on screen, then run it and watch the robot. This short tour orients you. You can skip it anytime with Skip tour or Escape.",
        targetSelector: null,
      },
      {
        id: "topbar",
        title: "Top bar: mic, run, and more",
        body: "On a small screen the block list is tucked away. Use Speak command, type a command in the text field if you see it, and Run in the top bar. Accessibility settings (A11y) are here when you need them.",
        targetSelector: ".topbar",
      },
    {
      id: "script",
      title: "Your program stack",
      body: "The centre area is your script. Blocks you add or voice commands you speak appear here, from top to bottom, like a recipe for the robot. The text box along the bottom of this column is another way to type commands, same as the field in the block list.",
      targetSelector: "#scriptCanvas",
    },
      {
        id: "stage",
        title: "The robot stage",
        body: "The simulator shows a robot moving on a stage. The strip below the stage echoes voice commands. You can expand the stage, reset the robot, and read the run log at the bottom of this column.",
        targetSelector: "#playgroundStageCol",
      },
      {
        id: "guide",
        title: "Optional guided project",
        body: "Enroll in a guided project to get step-by-step help from the AI guide (needs a network). You can leave the tour now and try this when you are ready.",
        targetSelector: "#aiGuideRoot",
      },
      {
        id: "done",
        title: "You are all set",
        body: "Export your program from the footer when you want a backup. Have fun, and you will not see this tour again on this device unless the site data is cleared.",
        targetSelector: "footer.status-bar",
      },
    ];
  }
  return [
    {
      id: "welcome",
      title: "Welcome to the playground",
      body: "This is the Braille robotics block playground. The left has blocks, the centre is your program, the right is the robot and the optional AI guide. You can leave this tour anytime with Skip tour or the Escape key.",
      targetSelector: null,
    },
    {
      id: "blocks",
      title: "Block palette and categories",
      body: "Pick a category, then a block, to add it to your program. You can also type a phrase like “move forward” in the field below the title, or use Speak command in the top bar for voice input.",
      targetSelector: "#playgroundPaletteCol",
    },
    {
      id: "script",
      title: "Your program stack",
      body: "Blocks appear here in order, and you can also type commands in the bar along the bottom of this column. When you press Run, the robot runs through them from top to bottom, like a script.",
      targetSelector: "#scriptCanvas",
    },
    {
      id: "mic",
      title: "Speak command",
      body: "Tap this to use your microphone. The session stays open for a while so you can add several commands, then tap again to turn it off. Your browser will ask for permission the first time.",
      targetSelector: "#micBtn",
    },
    {
      id: "run",
      title: "Run your program",
      body: "Use Run in the top bar (or the button above the stage) to execute the stack. Stop appears while the robot is moving.",
      targetSelector: "#runBtnTop",
    },
    {
      id: "stage",
      title: "The robot and log",
      body: "Watch the robot on the stage, read the voice transcript under it, and check the run log. Expand can show a larger view on some screens.",
      targetSelector: "#playgroundStageCol",
    },
    {
      id: "guide",
      title: "Guided project (optional)",
      body: "Enroll to get on-screen and spoken hints from the AI guide for a chosen lesson. It needs a network connection.",
      targetSelector: "#aiGuideRoot",
    },
    {
      id: "done",
      title: "You are all set",
      body: "Use Export in the status bar to download your program. This tour will not show again on this device unless you clear the site’s stored data. Enjoy.",
      targetSelector: "footer.status-bar",
    },
  ];
}

function setLive(elt: HTMLElement, text: string): void {
  elt.textContent = "";
  requestAnimationFrame(() => {
    elt.textContent = text;
  });
}

function isTargetVisible(el: Element | null): el is HTMLElement {
  if (!el) return false;
  const h = el as HTMLElement;
  const r = h.getBoundingClientRect();
  if (r.width < 4 && r.height < 4) return false;
  const st = window.getComputedStyle(h);
  if (st.display === "none" || st.visibility === "hidden") return false;
  return true;
}

export function isPlaygroundTourComplete(): boolean {
  try {
    return localStorage.getItem(STORAGE_KEY) === "1";
  } catch {
    return true;
  }
}

export function startPlaygroundTour(opts: { appRoot: HTMLElement; srPolite: HTMLElement; onClose: (reason: "finished" | "skipped") => void }): void {
  const { appRoot, srPolite, onClose } = opts;
  const steps = buildSteps(window.matchMedia("(max-width: 767px)").matches);
  const shell = appRoot.querySelector<HTMLElement>(".app-shell");
  let index = 0;
  let closed = false;
  let prevTarget: HTMLElement | null = null;

  const layer = document.createElement("div");
  layer.className = "playground-tour";
  layer.setAttribute("data-playground-tour", "");
  layer.innerHTML = `
    <div class="playground-tour-backdrop" aria-hidden="true"></div>
    <div
      class="playground-tour-dialog"
      role="dialog"
      aria-modal="true"
      aria-labelledby="playgroundTourTitle"
    >
      <h2 class="playground-tour-title" id="playgroundTourTitle"></h2>
      <p class="playground-tour-body" id="playgroundTourBody"></p>
      <p class="playground-tour-step" id="playgroundTourStep" aria-live="polite" aria-atomic="true"></p>
      <div class="playground-tour-actions">
        <button type="button" class="btn btn-ghost" data-tour-skip>Skip tour</button>
        <div class="playground-tour-nav">
          <button type="button" class="btn btn-ghost" data-tour-back>Back</button>
          <button type="button" class="btn btn-run" data-tour-next>Next</button>
        </div>
      </div>
    </div>
  `;
  appRoot.appendChild(layer);

  if (shell) {
    try {
      shell.setAttribute("inert", "");
    } catch {
      (shell as HTMLDivElement & { inert?: boolean }).inert = true;
    }
  }

  const dialog = layer.querySelector<HTMLElement>(".playground-tour-dialog")!;
  const titleEl = layer.querySelector<HTMLElement>("#playgroundTourTitle")!;
  const bodyEl = layer.querySelector<HTMLElement>("#playgroundTourBody")!;
  const stepEl = layer.querySelector<HTMLElement>("#playgroundTourStep")!;
  const btnSkip = layer.querySelector<HTMLButtonElement>("[data-tour-skip]")!;
  const btnBack = layer.querySelector<HTMLButtonElement>("[data-tour-back]")!;
  const btnNext = layer.querySelector<HTMLButtonElement>("[data-tour-next]")!;

  function clearTarget(): void {
    if (prevTarget) {
      prevTarget.classList.remove("playground-tour-target");
      prevTarget = null;
    }
  }

  function placeDialog(): void {
    const step = steps[index]!;
    let target: HTMLElement | null = null;
    if (step.targetSelector) {
      const t = document.querySelector(step.targetSelector);
      if (t && isTargetVisible(t)) target = t as HTMLElement;
    }
    dialog.classList.remove("playground-tour-dialog--center", "playground-tour-dialog--place");
    if (!target) {
      dialog.classList.add("playground-tour-dialog--center");
      dialog.style.top = "50%";
      dialog.style.left = "50%";
      dialog.style.width = "min(96vw, 28rem)";
      dialog.style.transform = "translate(-50%, -50%)";
      return;
    }
    target.scrollIntoView({ block: "nearest", inline: "nearest", behavior: "auto" });
    const r = target.getBoundingClientRect();
    const margin = 12;
    const dw = Math.min(448, window.innerWidth - 24);
    dialog.style.width = `${dw}px`;
    const dh = Math.max(dialog.getBoundingClientRect().height, 200);
    let top = r.bottom + margin;
    if (top + dh + margin > window.innerHeight) {
      top = Math.max(margin, r.top - margin - dh);
    }
    let left = r.left + r.width / 2 - dw / 2;
    left = Math.max(margin, Math.min(left, window.innerWidth - dw - margin));
    dialog.classList.add("playground-tour-dialog--place");
    dialog.style.left = `${left}px`;
    dialog.style.top = `${top}px`;
    dialog.style.transform = "none";
  }

  function render(): void {
    const step = steps[index]!;
    const total = steps.length;
    const n = index + 1;
    titleEl.textContent = step.title;
    bodyEl.textContent = step.body;
    stepEl.textContent = `Step ${n} of ${total}`;
    setLive(
      srPolite,
      `Tour, step ${n} of ${total}. ${step.title}. ${step.body}`
    );
    clearTarget();
    if (step.targetSelector) {
      const t = document.querySelector(step.targetSelector);
      if (t && isTargetVisible(t)) {
        prevTarget = t as HTMLElement;
        prevTarget.classList.add("playground-tour-target");
      }
    }
    btnBack.hidden = index === 0;
    btnBack.disabled = index === 0;
    const last = index === total - 1;
    btnNext.textContent = last ? "Done" : "Next";
    btnNext.setAttribute("aria-label", last ? "Finish tour" : "Next step");
    void dialog.offsetWidth;
    placeDialog();
    if (!closed) {
      requestAnimationFrame(() => {
        placeDialog();
        btnNext.focus();
      });
    }
  }

  function finish(reason: "finished" | "skipped"): void {
    if (closed) return;
    closed = true;
    if (shell) {
      shell.removeAttribute("inert");
    }
    clearTarget();
    document.removeEventListener("keydown", onKeydown, true);
    window.removeEventListener("resize", onResize);
    layer.remove();
    try {
      localStorage.setItem(STORAGE_KEY, "1");
    } catch {
      /* noop */
    }
    onClose(reason);
  }

  function onKeydown(e: KeyboardEvent): void {
    if (e.key === "Escape") {
      e.preventDefault();
      e.stopPropagation();
      finish("skipped");
    }
  }

  function onResize(): void {
    placeDialog();
  }

  btnSkip.addEventListener("click", () => finish("skipped"));
  btnBack.addEventListener("click", () => {
    if (index > 0) {
      index -= 1;
      render();
    }
  });
  btnNext.addEventListener("click", () => {
    if (index >= steps.length - 1) {
      finish("finished");
    } else {
      index += 1;
      render();
    }
  });

  document.addEventListener("keydown", onKeydown, true);
  window.addEventListener("resize", onResize);
  requestAnimationFrame(() => {
    requestAnimationFrame(() => {
      if (!closed) render();
    });
  });
}

export function markPlaygroundTourNotDone(): void {
  try {
    localStorage.removeItem(STORAGE_KEY);
  } catch {
    /* noop */
  }
}
