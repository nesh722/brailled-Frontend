# BrailleEd Playground → SPIKE Prime Simulator: Agent Instructions

**Version:** 1.0  
**Date:** April 2026  
**Context:** The BrailleEd playground is a voice-first, block-based robotics IDE for blind/low-vision students. It currently uses toy commands ("move forward", "beep"). This spec upgrades it to use real LEGO SPIKE Prime (v3) commands, simulate actual SPIKE robot models, export to `.llsp3` project files, add a backend server, and fix deep accessibility gaps.

---

## Table of Contents

1. [Architecture Overview](#1-architecture-overview)
2. [Phase 1 — Replace Commands with Real SPIKE Prime API](#2-phase-1--replace-commands-with-real-spike-prime-api)
3. [Phase 2 — Robot Model Simulator](#3-phase-2--robot-model-simulator)
4. [Phase 3 — Export to SPIKE Prime (.llsp3 and MicroPython)](#4-phase-3--export-to-spike-prime-llsp3-and-micropython)
5. [Phase 4 — Server Backend (VM)](#5-phase-4--server-backend-vm)
6. [Phase 5 — Accessibility Deep Fixes](#6-phase-5--accessibility-deep-fixes)
7. [Phase 6 — AI Mentor Upgrade](#7-phase-6--ai-mentor-upgrade)
8. [File-by-File Change Map](#8-file-by-file-change-map)
9. [Testing Checklist](#9-testing-checklist)

---

## 1. Architecture Overview

### Current State
```
Browser-only:
  Palette → Block Stack → Simple 2D sim (x/y dot on canvas)
  Voice input (Web Speech API)
  AI mentor → proxy to HuggingFace Gradio space
  Export → simple JSON
```

### Target State
```
┌─────────────────────────────────────────────────────────┐
│                     BROWSER CLIENT                       │
│                                                          │
│  Block Palette          Script Canvas        Stage        │
│  (SPIKE categories)     (block stack)        (2D sim)     │
│  - Motors               - drag/drop          - Robot SVG  │
│  - Sensors              - voice add          - Trail      │
│  - Hub                  - manual type         - Sensor viz │
│  - Movement                                               │
│  - Sound/Light                                            │
│  - Control/Events                                         │
│                                                          │
│  Robot Model Picker: [Driving Base] [Hopper] [Custom]    │
│                                                          │
│  Export: [.llsp3] [.py MicroPython] [JSON backup]        │
└─────────────────────┬────────────────────────────────────┘
                      │ HTTPS
┌─────────────────────▼────────────────────────────────────┐
│                     SERVER (VM)                           │
│                                                          │
│  POST /api/guide        — AI mentor (Gemma/etc)          │
│  POST /api/compile      — block stack → MicroPython      │
│  POST /api/export/llsp3 — block stack → .llsp3 file      │
│  POST /api/projects     — save/load user projects      │
│  GET  /api/robots       — robot model definitions        │
│  WebSocket /ws/sim      — (future) real-time sim sync    │
└──────────────────────────────────────────────────────────┘
```

*(Full specification continues with the same sections as the canonical agent brief: Phase 1–6, file map, testing checklist, priority order, and key references. Implementation status is tracked in code and in `docs/playground.md`.)*

**Priority order**

1. **Phase 1** (Commands) — Unlocks the rest.  
2. **Phase 5** (Accessibility) — Alongside Phase 1.  
3. **Phase 2** (Robot models + sim).  
4. **Phase 4** (Server).  
5. **Phase 3** (Export .llsp3 / .py).  
6. **Phase 6** (AI mentor).

**Key references**

- SPIKE 3 Python: https://spike.legoeducation.com/prime/help/lls-help-python  
- Tufts mirror: https://tuftsceeo.github.io/SPIKEPythonDocs/SPIKE3.html  
- .llsp3: ZIP with `manifest.json`, `icon.svg`, `projectbody.json` (Python)  
- LLSP3 extractor: https://github.com/BookCatKid/LLSP3-Extractor  

---

*Note: The complete Phase 1–9 narrative, code samples, and API tables from Version 1.0 are preserved in project planning materials; the repository implementation evolves toward this spec incrementally.*
