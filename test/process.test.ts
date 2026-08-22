import { describe, expect, it } from "vitest";
import { execSync, spawnSync } from "node:child_process";
import {
  mkdtempSync,
  cpSync,
  readdirSync,
  writeFileSync,
  mkdirSync,
  readFileSync,
} from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { EXAMPLE_CONFIG, STARTER_AGENTS_MD } from "../src/init.js";

function run(cmd: string, cwd: string): { code: number; out: string } {
  const result = spawnSync(cmd, { cwd, encoding: "utf8", shell: true });
  return {
    code: result.status ?? 1,
    out: `${result.stdout ?? ""}${result.stderr ?? ""}`,
  };
}

describe("process release gate", () => {
  it("packed tarball runs --version", () => {
    const tmp = mkdtempSync(join(tmpdir(), "agentsmd-pack-"));
    execSync(`npm pack --silent --pack-destination ${JSON.stringify(tmp)}`, {
      cwd: process.cwd(),
    });
    const tarball = readdirSync(tmp).find((f) => f.endsWith(".tgz"));
    expect(tarball).toBeDefined();
    execSync(`tar -xzf ${join(tmp, tarball!)}`, { cwd: tmp });
    const v = run("node package/dist/main.js --version", tmp);
    expect(v.code).toBe(0);
    expect(v.out.trim()).toMatch(/^0\.1\.0-alpha/);
    const fixture = mkdtempSync(join(tmpdir(), "agentsmd-pack-lint-"));
    mkdirSync(join(fixture, ".git"));
    writeFileSync(join(fixture, ".git/config"), "");
    writeFileSync(
      join(fixture, "AGENTS.md"),
      "# Guide\n\n## Setup\nInstall.\n\n## Build\nBuild.\n\n## Test\nTest.\n\n## Conventions\nStyle.\n",
    );
    const packed = `node ${join(tmp, "package/dist/main.js")}`;
    const linted = run(`${packed} lint`, fixture);
    expect(linted.code).toBe(0);
    const synced = run(`${packed} sync`, fixture);
    expect(synced.code).toBe(0);
    expect(synced.out).toContain("wrote");
  });

  it("doctor works inside a real git repo copy of a fixture", () => {
    const tmp = mkdtempSync(join(tmpdir(), "agentsmd-doc-"));
    cpSync(join(process.cwd(), "fixtures", "healthy-single-tool"), tmp, {
      recursive: true,
    });
    run("git init -b main", tmp);
    mkdirSync(join(tmp, ".git"), { recursive: true });
    writeFileSync(join(tmp, ".git", "config"), "");
    run("git config user.email t@t", tmp);
    run("git config user.name t", tmp);
    run("git add -A", tmp);
    run('git commit -m init --quiet --no-verify --allow-empty', tmp);
    const result = run(`node ${join(process.cwd(), "dist", "main.js")} doctor`, tmp);
    expect(result.code).toBe(0);
    expect(result.out).toContain("codex: native AGENTS.md — chain 1 file(s)");
    expect(result.out).toContain("claude-code: absent");
  });

  it("init fails outside a git repository", () => {
    const tmp = mkdtempSync(join(tmpdir(), "agentsmd-nogit-"));
    const result = run(`node ${join(process.cwd(), "dist", "main.js")} init`, tmp);
    expect(result.code).toBe(2);
    expect(result.out).toContain("not inside a git repository");
  });

  it("init creates, refuses overwrite, honors --force/--config/--json", () => {
    const tmp = mkdtempSync(join(tmpdir(), "agentsmd-init-"));
    mkdirSync(join(tmp, ".git"));
    writeFileSync(join(tmp, ".git/config"), "");
    const bin = `node ${join(process.cwd(), "dist", "main.js")}`;

    const created = run(`${bin} init --json`, tmp);
    expect(created.code).toBe(0);
    expect(created.out).toBe('{"skipped":[],"wrote":["AGENTS.md"]}\n');
    expect(readFileSync(join(tmp, "AGENTS.md"), "utf8")).toBe(STARTER_AGENTS_MD);

    const skipped = run(`${bin} init --json`, tmp);
    expect(skipped.code).toBe(0);
    expect(skipped.out).toBe('{"skipped":["AGENTS.md"],"wrote":[]}\n');

    writeFileSync(join(tmp, "AGENTS.md"), "# custom\n");
    const forced = run(`${bin} init --force`, tmp);
    expect(forced.code).toBe(0);
    expect(forced.out).toContain("wrote AGENTS.md");
    expect(readFileSync(join(tmp, "AGENTS.md"), "utf8")).toBe(STARTER_AGENTS_MD);

    const cfg = run(`${bin} init --config --json`, tmp);
    expect(cfg.code).toBe(0);
    expect(cfg.out).toBe(
      '{"skipped":["AGENTS.md"],"wrote":["agentsmd.config.json"]}\n',
    );
    expect(readFileSync(join(tmp, "agentsmd.config.json"), "utf8")).toBe(
      EXAMPLE_CONFIG,
    );
    expect(run(`${bin} init --config --json`, tmp).out).toBe(
      '{"skipped":["AGENTS.md","agentsmd.config.json"],"wrote":[]}\n',
    );
  });

  it("sync prints sync --adopt for unmanaged CLAUDE.md and is silent on the next run", () => {
    const tmp = mkdtempSync(join(tmpdir(), "agentsmd-adopt-"));
    cpSync(join(process.cwd(), "fixtures", "adopt"), tmp, { recursive: true });
    mkdirSync(join(tmp, ".git"), { recursive: true });
    writeFileSync(join(tmp, ".git/config"), "");
    const bin = `node ${join(process.cwd(), "dist", "main.js")}`;
    const before = readFileSync(join(tmp, "CLAUDE.md"), "utf8");

    const refused = run(`${bin} sync`, tmp);
    expect(refused.code).toBe(0);
    expect(refused.out).toContain("sync --adopt");
    expect(refused.out).not.toContain("nothing to change");
    expect(readFileSync(join(tmp, "CLAUDE.md"), "utf8")).toBe(before);

    expect(run(`${bin} sync --adopt`, tmp).code).toBe(0);
    const second = run(`${bin} sync`, tmp);
    expect(second.code).toBe(0);
    expect(second.out).toContain("agentsmd: nothing to change");
    expect(second.out).not.toContain("sync --adopt");
  });

  it("score honors failOn from config", () => {
    const tmp = mkdtempSync(join(tmpdir(), "agentsmd-score-"));
    mkdirSync(join(tmp, ".git"));
    writeFileSync(join(tmp, ".git/config"), "");
    writeFileSync(
      join(tmp, "AGENTS.md"),
      "# Guide\n\n## Setup\nInstall.\n\n## Build\nBuild.\n\n## Test\nTest.\n\n## Conventions\nStyle.\n",
    );
    writeFileSync(join(tmp, "CLAUDE.md"), "# hand written\n");
    writeFileSync(
      join(tmp, "agentsmd.config.json"),
      '{"failOn":"error"}\n',
    );
    const bin = `node ${join(process.cwd(), "dist", "main.js")}`;
    expect(run(`${bin} score`, tmp).code).toBe(0);
    writeFileSync(
      join(tmp, "agentsmd.config.json"),
      '{"failOn":"warning"}\n',
    );
    expect(run(`${bin} score`, tmp).code).toBe(1);
  });
});
