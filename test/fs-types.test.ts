import { describe, expect, it } from "vitest";
import { mkdtempSync, readFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { RealFs } from "../src/fs-types.js";

describe("RealFs.writeUtf8", () => {
  it("creates missing parent directories", () => {
    const tmp = mkdtempSync(join(tmpdir(), "agentsmd-fs-"));
    const fs = new RealFs();
    const target = join(tmp, ".gemini", "settings.json");
    fs.writeUtf8(target, '{"ok":true}\n');
    expect(readFileSync(target, "utf8")).toBe('{"ok":true}\n');
  });
});
