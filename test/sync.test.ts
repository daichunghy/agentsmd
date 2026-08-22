import { describe, expect, it } from "vitest";
import { buildInventory } from "../src/discovery.js";
import { runSync } from "../src/sync.js";
import { claudeState } from "../src/targets/claude.js";
import { geminiState } from "../src/targets/gemini.js";
import type { WriteReader } from "../src/fs-types.js";
import { MemFs } from "./helpers.js";

function make(tree: Record<string, string>): { fs: WriteReader; inv: ReturnType<typeof buildInventory> } {
  const fs = new MemFs(tree);
  return { fs, inv: buildInventory(fs, "", "") };
}

const IMPORT_BLOCK =
  "<!-- agentsmd:begin:import -->\n@AGENTS.md\n<!-- agentsmd:end:import -->\n";

describe("sync claude stub", () => {
  it("creates a pristine stub when CLAUDE.md is absent", () => {
    const { fs, inv } = make({ ".git/config": "", "AGENTS.md": "# g\n" });
    expect(runSync(fs, inv, { adopt: false, copilotCopy: false }).changed).toEqual(["CLAUDE.md"]);
    expect(fs.readUtf8("CLAUDE.md")).toBe(IMPORT_BLOCK);
    expect(claudeState(fs, inv)).toBe("managed-intact");
  });

  it("repairs a broken stub while preserving claude-only content", () => {
    const broken =
      "<!-- agentsmd:begin:import -->\n@OLD.md\n<!-- agentsmd:end:import -->\n\n" +
      "<!-- agentsmd:begin:claude-only -->\nClaude-specific rule\n<!-- agentsmd:end:claude-only -->\n";
    const { fs, inv } = make({ ".git/config": "", "AGENTS.md": "# g\n", "CLAUDE.md": broken });
    expect(runSync(fs, inv, { adopt: false, copilotCopy: false }).changed).toEqual(["CLAUDE.md"]);
    const text = fs.readUtf8("CLAUDE.md") ?? "";
    expect(text).toContain("@AGENTS.md");
    expect(text).toContain("Claude-specific rule\n");
    expect(claudeState(fs, inv)).toBe("managed-intact");
  });

  it("refuses unmanaged files without --adopt and wraps with it", () => {
    const { fs, inv } = make({
      ".git/config": "",
      "AGENTS.md": "# g\n",
      "CLAUDE.md": "# my own rules\nmore\n",
    });
    const refused = runSync(fs, inv, { adopt: false, copilotCopy: false });
    expect(refused.changed).toEqual([]);
    expect(refused.adoptHint).toContain("sync --adopt");
    expect(fs.readUtf8("CLAUDE.md")).toBe("# my own rules\nmore\n");
    expect(runSync(fs, inv, { adopt: true, copilotCopy: false }).changed).toEqual(["CLAUDE.md"]);
    const text = fs.readUtf8("CLAUDE.md") ?? "";
    expect(text).toContain(IMPORT_BLOCK);
    expect(text).toContain("# my own rules\nmore\n");
    expect(claudeState(fs, inv)).toBe("managed-intact");
  });
});

const STUB = IMPORT_BLOCK;

describe("sync gemini", () => {
  it("creates settings preserving unrelated keys", () => {
    const { fs, inv } = make({
      ".git/config": "",
      "AGENTS.md": "# g\n",
      "CLAUDE.md": STUB,
      "GEMINI.md": "# g2\n",
      ".gemini/settings.json": '{"theme":"dark","context":{"fileName":"GEMINI.md"}}',
    });
    expect(runSync(fs, inv, { adopt: false, copilotCopy: false }).changed).toEqual([".gemini/settings.json"]);
    const parsed = JSON.parse(fs.readUtf8(".gemini/settings.json")!) as {
      theme: string;
      context: { fileName: string[] };
    };
    expect(parsed.theme).toBe("dark");
    expect(parsed.context.fileName).toEqual(["GEMINI.md", "AGENTS.md"]);
    expect(geminiState(fs, inv)).toBe("wired");
  });

  it("creates settings when only GEMINI.md exists", () => {
    const { fs, inv } = make({
      ".git/config": "",
      "AGENTS.md": "# g\n",
      "CLAUDE.md": STUB,
      "GEMINI.md": "# g2\n",
    });
    runSync(fs, inv, { adopt: false, copilotCopy: false });
    expect(geminiState(fs, inv)).toBe("wired");
  });

  it("still ensures the Claude stub for single-tool repos (spec §7)", () => {
    const { fs, inv } = make({ ".git/config": "", "AGENTS.md": "# g\n" });
    expect(runSync(fs, inv, { adopt: false, copilotCopy: false }).changed).toEqual(["CLAUDE.md"]);
    expect(runSync(fs, inv, { adopt: false, copilotCopy: false }).changed).toEqual([]);
  });
});

describe("sync copilot copy", () => {
  it("writes a hashed managed copy only when asked", () => {
    const { fs, inv } = make({
      ".git/config": "",
      "AGENTS.md": "# g\n",
      "CLAUDE.md": STUB,
    });
    expect(runSync(fs, inv, { adopt: false, copilotCopy: false }).changed).toEqual([]);
    const first = fs.readUtf8(".github/copilot-instructions.md");
    expect(first).toBeUndefined();
    expect(runSync(fs, inv, { adopt: false, copilotCopy: true }).changed).toEqual([
      ".github/copilot-instructions.md",
    ]);
    expect(fs.readUtf8(".github/copilot-instructions.md")).toMatch(
      /^<!-- agentsmd:managed sha256:[0-9a-f]{8} -->\n# g\n$/,
    );
  });
});

describe("idempotency", () => {
  it("second sync run produces no changes", () => {
    const { fs, inv } = make({
      ".git/config": "",
      "AGENTS.md": "# g\n",
      "GEMINI.md": "# g2\n",
      "CLAUDE.md": "# legacy\n",
    });
    const first = runSync(fs, inv, { adopt: true, copilotCopy: true });
    expect(first.changed.length).toBeGreaterThan(0);
    expect(first.adoptHint).toBeUndefined();
    const second = runSync(fs, inv, { adopt: true, copilotCopy: true });
    expect(second.changed).toEqual([]);
    expect(second.adoptHint).toBeUndefined();
  });
});
