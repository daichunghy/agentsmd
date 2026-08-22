import type { FileReader } from "../src/fs-types.js";

/** In-memory FileReader over a flat map of UTF-8 files ("" is the root). */
export class MemFs implements FileReader {
  private readonly files = new Map<string, string>();

  constructor(files: Record<string, string> = {}) {
    for (const [k, v] of Object.entries(files)) this.files.set(this.norm(k), v);
  }

  private norm(p: string): string {
    return p.replace(/\/+$/, "");
  }

  readUtf8(path: string): string | undefined {
    return this.files.get(this.norm(path));
  }

  readBytes(path: string): Uint8Array | undefined {
    const s = this.readUtf8(path);
    return s === undefined ? undefined : new TextEncoder().encode(s);
  }

  exists(path: string): boolean {
    const n = this.norm(path);
    if (this.files.has(n)) return true;
    for (const f of this.files.keys()) {
      if (f.startsWith(n + "/")) return true;
    }
    return false;
  }

  listDir(path: string): string[] | undefined {
    const n = this.norm(path);
    const names = new Set<string>();
    let isDir = n === "";
    for (const f of this.files.keys()) {
      if (f === n) continue;
      if (n === "") {
        isDir = true;
        names.add(f.split("/")[0]!);
      } else if (f.startsWith(n + "/")) {
        isDir = true;
        names.add(f.slice(n.length + 1).split("/")[0]!);
      }
    }
    return isDir ? [...names].sort() : undefined;
  }
}
