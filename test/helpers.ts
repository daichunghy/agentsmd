import type { WriteReader } from "../src/fs-types.js";

/** Capture stdout/stderr while `fn` runs; restores writers afterwards. */
export async function captureIo(
  fn: () => Promise<number> | number,
): Promise<{ code: number; stdout: string; stderr: string }> {
  const out: string[] = [];
  const err: string[] = [];
  const origOut = process.stdout.write.bind(process.stdout);
  const origErr = process.stderr.write.bind(process.stderr);
  process.stdout.write = ((chunk: string | Uint8Array) => {
    out.push(String(chunk));
    return true;
  }) as typeof process.stdout.write;
  process.stderr.write = ((chunk: string | Uint8Array) => {
    err.push(String(chunk));
    return true;
  }) as typeof process.stderr.write;
  try {
    const code = await fn();
    return { code, stdout: out.join(""), stderr: err.join("") };
  } finally {
    process.stdout.write = origOut;
    process.stderr.write = origErr;
  }
}

/** In-memory WriteReader over a flat map of UTF-8 files ("" is the root). */
export class MemFs implements WriteReader {
  private readonly files = new Map<string, string>();

  constructor(files: Record<string, string> = {}) {
    for (const [k, v] of Object.entries(files)) this.files.set(this.norm(k), v);
  }

  writeUtf8(path: string, content: string): void {
    this.files.set(this.norm(path), content);
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
