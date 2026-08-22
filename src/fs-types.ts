import {
  existsSync,
  readFileSync,
  readdirSync,
  writeFileSync,
} from "node:fs";

export interface FileReader {
  /** UTF-8 content of a file, or undefined when it does not exist. */
  readUtf8(path: string): string | undefined;
  /** Raw bytes of a file, or undefined when it does not exist. */
  readBytes(path: string): Uint8Array | undefined;
  /** True when the path exists as a file or as a directory. */
  exists(path: string): boolean;
  /** Direct child names of a directory, sorted; undefined for missing paths. */
  listDir(path: string): string[] | undefined;
}

export interface WriteReader extends FileReader {
  writeUtf8(path: string, content: string): void;
}

/** Real filesystem implementation. */
export class RealFs implements WriteReader {
  readUtf8(path: string): string | undefined {
    try {
      return readFileSync(path, "utf8");
    } catch {
      return undefined;
    }
  }

  readBytes(path: string): Uint8Array | undefined {
    try {
      return new Uint8Array(readFileSync(path));
    } catch {
      return undefined;
    }
  }

  exists(path: string): boolean {
    return existsSync(path);
  }

  listDir(path: string): string[] | undefined {
    try {
      return readdirSync(path).sort();
    } catch {
      return undefined;
    }
  }

  writeUtf8(path: string, content: string): void {
    writeFileSync(path, content, "utf8");
  }
}
