import { useCallback, useEffect, useId, useRef, useState } from "react";
import {
  A11Y_DEFAULTS,
  A11Y_TOGGLE_DEFS,
  type A11yPreferences,
  type A11yToggleKey,
} from "../lib/a11y-toggles-meta";
import { applyPreferencesToDocument, loadPreferences, savePreferences } from "../lib/a11y-preferences";

function announce(msg: string, liveRef: React.RefObject<HTMLDivElement | null>) {
  const el = liveRef.current;
  if (el) {
    el.textContent = "";
    window.requestAnimationFrame(() => {
      el.textContent = msg;
    });
  }
}

export function AccessibilityPanel() {
  const [prefs, setPrefs] = useState<A11yPreferences>(() => loadPreferences());
  const [open, setOpen] = useState(false);
  const dialogRef = useRef<HTMLDivElement>(null);
  const liveRef = useRef<HTMLDivElement>(null);
  const titleId = useId();

  const update = useCallback(
    (key: A11yToggleKey, value: boolean) => {
      const next = { ...prefs, [key]: value };
      setPrefs(next);
      savePreferences(next);
      applyPreferencesToDocument(next);
      const def = A11Y_TOGGLE_DEFS.find((d) => d.key === key);
      announce(`${def?.label ?? key}: ${value ? "on" : "off"}.`, liveRef);
    },
    [prefs]
  );

  const reset = useCallback(() => {
    const defaults: A11yPreferences = { ...A11Y_DEFAULTS };
    setPrefs(defaults);
    savePreferences(defaults);
    applyPreferencesToDocument(defaults);
    announce("Accessibility settings reset to defaults.", liveRef);
  }, []);

  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        setOpen(false);
        announce("Accessibility panel closed.", liveRef);
      }
    };
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [open]);

  useEffect(() => {
    if (open) {
      announce("Accessibility settings opened.", liveRef);
      window.requestAnimationFrame(() => {
        dialogRef.current?.querySelector<HTMLInputElement>("input[type=checkbox]")?.focus();
      });
    }
  }, [open]);

  return (
    <>
      <div ref={liveRef} className="bra-a11y-live" aria-live="polite" aria-atomic="true" />
      <button
        type="button"
        className="bra-a11y-fab bra-a11y-skip-underline"
        aria-expanded={open}
        aria-controls="bra-a11y-dialog-landing"
        aria-haspopup="dialog"
        onClick={() => setOpen((v) => !v)}
      >
        <span className="bra-a11y-fab-icon" aria-hidden="true">
          <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true">
            <circle cx="12" cy="12" r="10" />
            <path d="M12 8v4M12 16h.01" strokeLinecap="round" />
          </svg>
        </span>
        <span className="bra-a11y-fab-text">Accessibility</span>
      </button>

      {open ? (
        <>
          <div
            className="bra-a11y-backdrop"
            role="presentation"
            onClick={() => setOpen(false)}
            aria-hidden="true"
          />
          <div
            id="bra-a11y-dialog-landing"
            ref={dialogRef}
            className="bra-a11y-dialog"
            role="dialog"
            aria-modal="true"
            aria-labelledby={titleId}
          >
            <div className="bra-a11y-dialog-head">
              <h2 id={titleId} className="bra-a11y-dialog-title">
                Accessibility settings
              </h2>
              <p className="bra-a11y-dialog-lead">
                These options apply to this site and the playground. Your choices are saved in this browser.
              </p>
            </div>
            <ul className="bra-a11y-toggle-list">
              {A11Y_TOGGLE_DEFS.map((def) => (
                <li key={def.key}>
                  <label className="bra-a11y-toggle">
                    <input
                      type="checkbox"
                      className="bra-a11y-checkbox"
                      checked={prefs[def.key]}
                      onChange={(e) => update(def.key, e.target.checked)}
                    />
                    <span className="bra-a11y-toggle-body">
                      <span className="bra-a11y-toggle-label">{def.label}</span>
                      <span className="bra-a11y-toggle-desc">{def.description}</span>
                    </span>
                  </label>
                </li>
              ))}
            </ul>
            <div className="bra-a11y-dialog-actions">
              <button type="button" className="bra-a11y-btn bra-a11y-skip-underline" onClick={reset}>
                Reset to defaults
              </button>
              <button
                type="button"
                className="bra-a11y-btn bra-a11y-btn-primary bra-a11y-skip-underline"
                onClick={() => setOpen(false)}
              >
                Done
              </button>
            </div>
          </div>
        </>
      ) : null}
    </>
  );
}
