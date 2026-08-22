import { describe, expect, it } from "vitest";
import { execSync } from "node:child_process";
import { mkdtempSync, cpSync, readdirSync, writeFileSync, mkdirSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";

function run(cmd: string, cwd: string): { code: number; out: string } {
  try {
    const out = execSync(cmd, { cwd, encoding: "utf8" });
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
});
