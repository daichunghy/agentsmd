import { describe, expect, it } from "vitest";
import { runCli } from "../src/cli.js";
import { VERSION } from "../src/version.js";

describe("cli", () => {
  it("prints version for --version and exits 0", async () => {
    const writes: string[] = [];
    const orig = process.stdout.write.bind(process.stdout);
    process.stdout.write = ((chunk: string | Uint8Array) => {
      writes.push(String(chunk));
      return true;
    }) as typeof process.stdout.write;
    try {
      const code = await runCli(["--version"]);
      expect(code).toBe(0);
      expect(writes.join("")).toBe(VERSION + "\n");
    } finally {
      process.stdout.write = orig;
    }
  });

  it("exits 2 for unknown command", async () => {
    expect(await runCli(["frobnicate"])).toBe(2);
  });

  it("exits 0 for --help", async () => {
    expect(await runCli(["--help"])).toBe(0);
  });
});
