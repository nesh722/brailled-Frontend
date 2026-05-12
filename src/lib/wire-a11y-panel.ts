import { A11Y_DEFAULTS, A11Y_TOGGLE_DEFS } from "./a11y-toggles-meta";
import { applyPreferencesToDocument, loadPreferences, savePreferences } from "./a11y-preferences";

/** Mounts the playground accessibility dialog (vanilla DOM). */
export function wireA11yPanel(announcePolite: (msg: string) => void): void {
  const openBtnEl = document.getElementById("a11yOpenBtn");
  const hostEl = document.getElementById("a11yPanelRoot");
  if (!openBtnEl || !hostEl) return;
  const openBtn = openBtnEl;
  const host = hostEl;

  let prefs = loadPreferences();
  let open = false;

  function announce(msg: string) {
    announcePolite(msg);
  }

  function renderDialog() {
    host.querySelectorAll(".bra-a11y-backdrop, .bra-a11y-dialog").forEach((n) => n.remove());

    if (!open) {
      openBtn.setAttribute("aria-expanded", "false");
      openBtn.focus();
      return;
    }

    openBtn.setAttribute("aria-expanded", "true");

    const backdrop = document.createElement("div");
    backdrop.className = "bra-a11y-backdrop";
    backdrop.setAttribute("role", "presentation");
    backdrop.addEventListener("click", () => {
      open = false;
      renderDialog();
      announce("Accessibility panel closed.");
    });

    const dialog = document.createElement("div");
    dialog.className = "bra-a11y-dialog";
    dialog.setAttribute("role", "dialog");
    dialog.setAttribute("aria-modal", "true");
    dialog.setAttribute("aria-labelledby", "a11y-dialog-title-pg");
    dialog.id = "a11y-dialog-playground";

    const head = document.createElement("div");
    head.className = "bra-a11y-dialog-head";
    head.innerHTML = `<h2 id="a11y-dialog-title-pg" class="bra-a11y-dialog-title">Accessibility settings</h2>
      <p class="bra-a11y-dialog-lead">These options apply to this site and the playground. Your choices are saved in this browser.</p>`;

    const list = document.createElement("ul");
    list.className = "bra-a11y-toggle-list";

    A11Y_TOGGLE_DEFS.forEach((def) => {
      const li = document.createElement("li");
      const label = document.createElement("label");
      label.className = "bra-a11y-toggle";

      const input = document.createElement("input");
      input.type = "checkbox";
      input.className = "bra-a11y-checkbox";
      input.checked = prefs[def.key];
      input.addEventListener("change", () => {
        prefs = { ...prefs, [def.key]: input.checked };
        savePreferences(prefs);
        applyPreferencesToDocument(prefs);
        announce(`${def.label}: ${input.checked ? "on" : "off"}.`);
      });

      const body = document.createElement("span");
      body.className = "bra-a11y-toggle-body";
      body.innerHTML = `<span class="bra-a11y-toggle-label">${escapeHtml(def.label)}</span>
        <span class="bra-a11y-toggle-desc">${escapeHtml(def.description)}</span>`;

      label.appendChild(input);
      label.appendChild(body);
      li.appendChild(label);
      list.appendChild(li);
    });

    const actions = document.createElement("div");
    actions.className = "bra-a11y-dialog-actions";

    const resetBtn = document.createElement("button");
    resetBtn.type = "button";
    resetBtn.className = "bra-a11y-btn bra-a11y-skip-underline";
    resetBtn.textContent = "Reset to defaults";
    resetBtn.addEventListener("click", () => {
      prefs = { ...A11Y_DEFAULTS };
      savePreferences(prefs);
      applyPreferencesToDocument(prefs);
      open = false;
      renderDialog();
      announce("Accessibility settings reset to defaults.");
    });

    const doneBtn = document.createElement("button");
    doneBtn.type = "button";
    doneBtn.className = "bra-a11y-btn bra-a11y-btn-primary bra-a11y-skip-underline";
    doneBtn.textContent = "Done";
    doneBtn.addEventListener("click", () => {
      open = false;
      renderDialog();
      announce("Accessibility panel closed.");
    });

    actions.appendChild(resetBtn);
    actions.appendChild(doneBtn);

    dialog.appendChild(head);
    dialog.appendChild(list);
    dialog.appendChild(actions);

    host.appendChild(backdrop);
    host.appendChild(dialog);

    window.setTimeout(() => {
      dialog.querySelector<HTMLInputElement>("input[type=checkbox]")?.focus();
    }, 0);
  }

  openBtn.addEventListener("click", () => {
    open = !open;
    prefs = loadPreferences();
    renderDialog();
    if (open) announce("Accessibility settings opened.");
  });

  document.addEventListener("keydown", (e) => {
    if (e.key === "Escape" && open) {
      open = false;
      renderDialog();
      announce("Accessibility panel closed.");
    }
  });
}

function escapeHtml(s: string): string {
  return s
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}
