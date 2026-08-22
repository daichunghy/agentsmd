import { describe, expect, it } from "vitest";
import { execSync } from "node:child_process";
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
  try {
    const out = execSync(cmd, {
      cwd,
      encoding: "utf8",
      stdio: ["ignore", "pipe", "pipe"],
    });
    return { code: 0, out };
  } catch (e) {
    const err = e as { status?: number; stdout?: string; stderr?: string };
    return { code: err.status ?? 1, out: (err.stdout ?? "") + (err.stderr ?? "") };
  }
}

describe("process release gate", () => {
  it("packed tarball runs --version", () => {
    const tmp = mkdtempSync(join(tmpdir(), "agentsmd-pack-"));
    execSync("npm pack --silent", { cwd: process.cwd() });
    const tarball = readdirSync(process.cwd()).find((f) => f.endsWith(".tgz"));
    expect(tarball).toBeDefined();
    execSync(`tar -xzf ${join(process.cwd(), tarball!)}`, { cwd: tmp });
    const v = run("node package/dist/main.js --version", tmp);
    expect(v.code).toBe(0);
    expect(v.out.trim()).toMatch(/^0\.1\.0-alpha/);
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
});
