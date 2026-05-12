/** Static markup for the IDE shell (injected into #app). */
export function getPlaygroundShellHtml(): string {
  return `
<a href="#scriptCanvas" class="skip-link" data-sr="skip-link">Skip to canvas</a>
<div id="srPolite" class="sr-only" aria-live="polite" aria-atomic="true"></div>
<div id="srAssertive" class="sr-only" aria-live="assertive" aria-atomic="true"></div>
<div class="app-shell">
  <header class="topbar">
    <a href="/" class="logo-wrap" data-sr="logo" title="Back to home" aria-label="BrailleEd home">
      <img src="/Braille%20bot%20%20Bio.png" alt="" width="280" height="88" class="logo-img" decoding="async" />
    </a>
    <input id="projectName" class="project-name" value="My Robot Program" aria-label="Project name" data-sr="project-name" />
    <div class="spacer"></div>
    <button type="button" class="btn btn-ghost btn-a11y-open bra-a11y-skip-underline" id="a11yOpenBtn" aria-label="Accessibility settings" aria-haspopup="dialog" aria-expanded="false" aria-controls="a11y-dialog-playground">
      <i class="ph ph-sliders-horizontal" aria-hidden="true"></i><span class="btn-a11y-label">A11y</span>
    </button>
    <button class="btn mic-pill" id="micBtn" aria-label="Speak command" aria-pressed="false" data-sr="mic-button">
      <i class="ph ph-microphone"></i> <span id="micBtnText">Speak Command</span>
      <span class="waveform" id="waveform"><span></span><span></span><span></span><span></span><span></span><span></span><span></span><span></span></span>
    </button>
    <button class="btn btn-run" id="runBtnTop" data-sr="run-top"><i class="ph ph-play"></i> Run</button>
    <button class="btn btn-stop" id="stopBtnTop" hidden data-sr="stop-top"><i class="ph ph-stop"></i> Stop</button>
    <div class="status-badge" id="connBadge" data-sr="connection-status"><span class="dot warning" id="connDot"></span><span id="connLabel">● Simulating</span></div>
  </header>

  <main class="ide-main">
    <section class="palette-col" id="playgroundPaletteCol">
      <div class="category-sidebar" id="categorySidebar"></div>
      <div class="block-list-panel">
        <div class="panel-title">Block Palette</div>
        <input id="manualCmd" type="text" placeholder='Type or speak command' aria-label="Manual command input" data-sr="manual-input" />
        <div id="blockList" class="block-list"></div>
      </div>
    </section>

    <section class="script-col" id="scriptCanvas" aria-live="polite">
      <div class="script-canvas-scroll">
        <div class="canvas-toolbar">
          <button class="btn btn-ghost" id="clearBtn" data-sr="clear-all"><i class="ph ph-trash"></i> Clear</button>
          <button class="btn btn-ghost" id="undoBtn" data-sr="undo-last"><i class="ph ph-arrow-u-up-left"></i> Undo</button>
          <button class="btn btn-ghost" id="zoomOutBtn" data-sr="zoom-out">−</button>
          <button class="btn btn-ghost" id="zoomInBtn" data-sr="zoom-in">+</button>
        </div>
        <div class="canvas-empty" id="emptyMsg"><div class="empty-icon"><i class="ph ph-microphone-stage"></i></div><p>Tap the mic and say "move forward" to start</p><span>or click a block on the left →</span></div>
        <div id="stackWrap" class="stack-wrap">
          <div class="hat-block"><i class="ph ph-flag-banner"></i> When <i class="ph ph-play"></i> Run is pressed</div>
          <div id="stackBlocks"></div>
          <div class="voice-drop-zone" id="voiceDropZone" hidden aria-live="assertive"><i class="ph ph-microphone"></i> Speak your next command...</div>
        </div>
      </div>
      <div class="script-text-dock" id="scriptTextDock" role="region" aria-labelledby="canvasCmdLabel">
        <div class="script-text-dock-inner">
          <p class="script-text-dock-label" id="canvasCmdLabel">Add to your program</p>
          <div class="script-text-dock-field">
            <i class="ph ph-terminal" aria-hidden="true"></i>
            <input
              id="canvasCmd"
              type="text"
              class="script-text-dock-input"
              placeholder="e.g. move forward, beep, turn right…"
              autocomplete="off"
              data-sr="canvas-command-input"
              aria-labelledby="canvasCmdLabel"
            />
            <span class="script-text-dock-hint" aria-hidden="true"><kbd>Enter</kbd> to add</span>
          </div>
        </div>
      </div>
    </section>

    <section class="stage-col" id="playgroundStageCol">
      <div class="sim-hero" id="simViewHero">
        <div class="stage-canvas" id="simCanvas">
          <div id="sim3dHost" class="sim-3d-host"></div>
          <p class="sim-3d-orbit-hint" aria-hidden="true">Turn: drag · Zoom: scroll · Pan: right-drag</p>
          <span class="sr-only" id="robot" aria-label="Simulated robot">Three-dimensional robot model on the field.</span>
        </div>
      </div>
      <div class="transcript-strip" id="transcript" aria-live="assertive" data-sr="transcript-strip"><i class="ph ph-microphone"></i> Ready</div>
      <div class="stage-controls">
        <button class="btn btn-ghost" type="button" id="resetSimViewBtn" title="Reset 3D camera" aria-label="Reset 3D view"><i class="ph ph-arrows-in-cardinal" aria-hidden="true"></i> View</button>
        <button class="btn btn-ghost" id="expandStageBtn" data-sr="expand-stage" title="Larger stage"><i class="ph ph-arrows-out"></i> Expand</button>
        <button class="btn btn-run" id="runBtn" data-sr="run-stage"><i class="ph ph-play"></i> Run</button>
        <button class="btn btn-stop" id="stopBtn" hidden data-sr="stop-stage"><i class="ph ph-stop"></i> Stop</button>
        <button class="btn btn-ghost" id="resetBtn" data-sr="reset-stage" title="Reset robot on field"><i class="ph ph-arrow-counter-clockwise"></i> Reset</button>
      </div>
      <details class="stage-details" id="stageDetailsSim">
        <summary class="stage-details-summary">Model, ports &amp; light matrix</summary>
        <div class="stage-details-body">
          <div class="robot-model-bar">
            <label for="robotModelSelect" class="robot-model-label">Robot model</label>
            <select id="robotModelSelect" class="robot-model-select" aria-describedby="robotModelDesc"></select>
            <p id="robotModelDesc" class="robot-model-desc" tabindex="-1">Loading robot description.</p>
          </div>
          <div id="portStatusPanel" class="port-status-panel" role="region" aria-label="Hub port connection status for the selected model"></div>
          <div id="hubMatrixWrap" class="hub-matrix-wrap">
            <h3 class="sim-panel-title" id="hubMatrixHeading">Hub light matrix</h3>
            <div id="hubMatrixGrid" class="hub-matrix-grid" role="img" aria-labelledby="hubMatrixHeading hubMatrixSr"></div>
            <p id="hubMatrixSr" class="sr-only" aria-live="polite" aria-atomic="true"></p>
          </div>
        </div>
      </details>
      <details class="stage-details" id="stageDetailsGuide">
        <summary class="stage-details-summary">AI guided project</summary>
        <section class="guide-panel" id="aiGuideRoot" aria-labelledby="guide-heading">
        <div class="guide-panel-head">
          <h2 class="guide-title" id="guide-heading"><i class="ph ph-chalkboard-teacher" aria-hidden="true"></i> Guided project</h2>
          <p class="guide-lead">Enroll to get step-by-step help from the AI guide (Hugging Face Gemma Space).</p>
        </div>
        <label class="guide-label" for="guideStudentName">Your name <span class="guide-optional">(optional)</span></label>
        <input type="text" id="guideStudentName" class="guide-input" placeholder="How should the guide address you?" autocomplete="name" />
        <label class="guide-label" for="guideProjectSelect">Project</label>
        <select id="guideProjectSelect" class="guide-input" aria-describedby="guide-heading"></select>
        <div class="guide-actions-row">
          <button type="button" class="btn btn-run guide-enroll-btn" id="guideEnrollBtn">Enroll &amp; start</button>
          <button type="button" class="btn btn-ghost guide-leave-btn" id="guideLeaveBtn" hidden>Leave project</button>
        </div>
        <div class="guide-enrolled-strip" id="guideEnrolledStrip" hidden>
          <span class="guide-enrolled-dot" aria-hidden="true"></span>
          <span id="guideEnrolledLabel"></span>
        </div>
        <p class="guide-busy" id="guideBusy" hidden aria-live="polite">Guide is thinking…</p>
        <div class="guide-messages" id="guideMessages" role="log" aria-label="Guide conversation" tabindex="0"></div>
        <div class="guide-compose">
          <button type="button" class="btn btn-ghost guide-next-btn" id="guideNextBtn" disabled>What should I do next?</button>
          <div class="guide-ask-row">
            <label class="sr-only" for="guideAskInput">Ask the guide a question</label>
            <input type="text" id="guideAskInput" class="guide-input guide-ask-input" placeholder="Or ask your own question…" disabled />
            <button type="button" class="btn btn-ghost" id="guideSendBtn" disabled>Ask</button>
          </div>
        </div>
        <p class="guide-error" id="guideError" role="alert" aria-live="assertive" hidden></p>
        </section>
      </details>
      <details class="stage-details" id="stageDetailsLog">
        <summary class="stage-details-summary">Run log</summary>
        <div class="sim-log" id="simLog" aria-live="polite"><div class="log-line">> Program ready.</div></div>
      </details>
    </section>
  </main>

  <footer class="status-bar"><span>MicroPython output and SR feedback</span><button class="btn btn-ghost" id="exportBtn" data-sr="export-program"><i class="ph ph-download-simple"></i> Export Program</button></footer>
</div>
<div class="toast" id="toast"></div>
<div id="a11yPanelRoot" class="a11y-panel-root"></div>
`;
}
