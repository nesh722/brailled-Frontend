import type { Block } from "../types/app";
import { COMMANDS, getCommandById } from "../data/commands";

function escapePyString(s: string): string {
  return s.replace(/\\/g, "\\\\").replace(/'/g, "\\'");
}

function valForTemplate(key: string, v: string | number, cmd: import("../types/app").Command): string {
  const param = cmd.params.find((p) => p.name === key);
  if (param?.type === "string" && key !== "port") {
    if (key === "t" || key === "name" || key === "text" || key === "side") {
      if (key === "side") return String(v);
      return escapePyString(String(v));
    }
  }
  if (param?.type === "color") {
    const s = String(v);
    if (/^[A-Z_]+$/.test(s)) return s;
    if (!s.length) return "RED";
    return s[0]!.toUpperCase() + s.slice(1).toLowerCase();
  }
  return String(v);
}

export function applyCommandTemplate(cmd: import("../types/app").Command, params: Record<string, string | number>): string {
  let line = cmd.codegen.template;
  for (const [key, v] of Object.entries(params)) {
    const rep = valForTemplate(key, v, cmd);
    line = line.split(`{${key}}`).join(rep);
  }
  for (const p of cmd.params) {
    if (line.includes(`{${p.name}}`)) {
      const def = p.default;
      const rep = valForTemplate(p.name, typeof def === "number" ? def : def, cmd);
      line = line.split(`{${p.name}}`).join(rep);
    }
  }
  return line;
}

export function compileToMicroPython(blocks: Block[]): { python: string; importLines: string[] } {
  const imports = new Set<string>(["import runloop"]);
  const bodyLines: string[] = [];
  for (const b of blocks) {
    const cmd = getCommandById(b.commandId);
    if (!cmd) continue;
    cmd.codegen.imports.forEach((i) => imports.add(i));
    let line = applyCommandTemplate(cmd, b.params);
    const tr = line.trimStart();
    if (cmd.codegen.isAsync && !tr.startsWith("await ")) {
      line = `await ${line}`;
    }
    bodyLines.push(`    ${line}`);
  }
  const importBlock = Array.from(imports).sort().join("\n");
  const body = bodyLines.length ? bodyLines.join("\n") : "    # empty program\n    pass\n";
  const python = `${importBlock}

async def main():
${body}

runloop.run(main())
`;
  return { python, importLines: Array.from(imports) };
}

export function getPythonLinesForStack(blocks: Block[]): string[] {
  return blocks
    .map((b) => {
      const cmd = COMMANDS.find((c) => c.id === b.commandId) ?? getCommandById(b.commandId);
      if (!cmd) return null;
      const line = applyCommandTemplate(cmd, b.params);
      return cmd.codegen.isAsync && !line.startsWith("await ") ? `await ${line}` : line;
    })
    .filter((x): x is string => x !== null);
}
