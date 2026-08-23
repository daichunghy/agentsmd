import { parseMarkdown } from "../markdown.js";
import { joinRel, type Finding, type Rule, type RuleContext } from "./types.js";

function scanLines(
  ctx: RuleContext,
  id: string,
  severity: "error" | "warning",
  match: (text: string) => string | undefined,
  message: (hit: string) => string,
  fixHint: string,
): Finding[] {
  const findings: Finding[] = [];
  for (const file of ctx.inv.instructionFiles) {
    const text = ctx.fs.readUtf8(joinRel(ctx.inv.root, file));
    if (text === undefined) continue;
    for (const line of parseMarkdown(text).lines) {
      if (line.kind === "comment") continue;
      const hit = match(line.text);
      if (hit !== undefined) {
        findings.push({
          ruleId: id,
          severity,
          file,
          line: line.n,
          message: message(hit),
          fixHint,
        });
      }
    }
  }
  return findings;
}

const TODO_RE = /\b(TODO|FIXME)\b/;
const SECRET_KEY_RE = /-----BEGIN [A-Z ]*PRIVATE KEY-----/;
const SECRET_ASSIGN_RE =
  /(api[_-]?key|secret|token)\s*[:=]\s*["'][A-Za-z0-9_-]{16,}["']/i;
const ABS_PATH_RE = /`(\/(?:Users|home|var|etc|opt|tmp)\/[^`]*|[A-Z]:\\[^`]*)`/;
/** Absolute or file:// targets inside markdown links, e.g. `](file:///Users/...)`. */
const LINK_ABS_RE =
  /\]\(\s*(?:file:\/\/)?(?:\/(?:Users|home|var|etc|opt|tmp)\/|[A-Z]:\\)[^)\s]*/;

export const todoRotRule: Rule = {
  id: "todo-rot",
  defaultSeverity: "warning",
  run(ctx) {
    return scanLines(
      ctx,
      this.id,
      "warning",
      (t) => (TODO_RE.test(t) ? t : undefined),
      () => "TODO/FIXME left in agent instructions",
      "resolve it or track it in an issue; agents act on stale TODOs literally",
    );
  },
};

export const secretLikeRule: Rule = {
  id: "secret-like",
  defaultSeverity: "error",
  run(ctx) {
    return scanLines(
      ctx,
      this.id,
      "error",
      (t) => (SECRET_KEY_RE.test(t) || SECRET_ASSIGN_RE.test(t) ? t : undefined),
      () => "instruction file contains a secret-looking string",
      "remove the secret immediately; instructions are read by every agent and often committed publicly",
    );
  },
};

export const absolutePathRule: Rule = {
  id: "absolute-path-portability",
  defaultSeverity: "warning",
  run(ctx) {
    return scanLines(
      ctx,
      this.id,
      "warning",
      (t) => ABS_PATH_RE.exec(t)?.[0] ?? LINK_ABS_RE.exec(t)?.[0],
      (hit) => `absolute path ${hit} breaks on other machines`,
      "use a repo-relative path like ./scripts/build.sh",
    );
  },
};
