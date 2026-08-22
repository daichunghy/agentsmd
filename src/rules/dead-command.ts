import { parseMarkdown } from "../markdown.js";
import { joinRel, type Finding, type Rule } from "./types.js";

const NPM_RUN = /npm run ([\w:-]+)/g;
const NPM_BARE = /npm (test|start)\b/g;
const MAKE = /\bmake ([\w-]+)/g;

interface DefinedCommands {
  npm: Set<string>;
  make: Set<string>;
}

function definedCommands(ctx: Parameters<Rule["run"]>[0]): DefinedCommands {
  const npm = new Set<string>();
  const make = new Set<string>();
  const pkgText = ctx.fs.readUtf8(joinRel(ctx.inv.root, "package.json"));
  if (pkgText !== undefined) {
    try {
      const pkg = JSON.parse(pkgText) as { scripts?: Record<string, unknown> };
      for (const k of Object.keys(pkg.scripts ?? {})) npm.add(k);
    } catch {
      /* malformed package.json is out of scope for this rule */
    }
  }
  const mkText = ctx.fs.readUtf8(joinRel(ctx.inv.root, "Makefile"));
  if (mkText !== undefined) {
    for (const m of mkText.matchAll(/^([\w-]+):/gm)) {
      if (m[1] !== undefined) make.add(m[1]);
    }
  }
  return { npm, make };
}

/** Referenced npm scripts / make targets that are not defined. */
export const deadCommandRule: Rule = {
  id: "dead-command",
  defaultSeverity: "error",
  run(ctx) {
    const findings: Finding[] = [];
    const defined = definedCommands(ctx);
    for (const file of ctx.inv.instructionFiles) {
      const text = ctx.fs.readUtf8(joinRel(ctx.inv.root, file));
      if (text === undefined) continue;
      for (const line of parseMarkdown(text).lines) {
        if (line.kind === "comment") continue;
        for (const m of line.text.matchAll(NPM_RUN)) {
          const name = m[1]!;
          if (!defined.npm.has(name)) {
            findings.push({
              ruleId: this.id,
              severity: this.defaultSeverity,
              file,
              line: line.n,
              message: `\`npm run ${name}\` referenced but not defined in package.json`,
              fixHint: `add a "${name}" script or update the instruction`,
            });
          }
        }
        for (const m of line.text.matchAll(NPM_BARE)) {
          const name = m[1]!;
          if (!defined.npm.has(name)) {
            findings.push({
              ruleId: this.id,
              severity: this.defaultSeverity,
              file,
              line: line.n,
              message: `\`npm ${name}\` referenced but no "${name}" script is defined`,
              fixHint: `define "${name}" in package.json or use \`npm run <script>\``,
            });
          }
        }
        for (const m of line.text.matchAll(MAKE)) {
          const name = m[1]!;
          if (!defined.make.has(name)) {
            findings.push({
              ruleId: this.id,
              severity: this.defaultSeverity,
              file,
              line: line.n,
              message: `\`make ${name}\` referenced but no such target exists`,
              fixHint: `add a ${name}: target to the Makefile or update the instruction`,
            });
          }
        }
      }
    }
    return findings;
  },
};
