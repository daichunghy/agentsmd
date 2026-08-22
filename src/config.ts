import type { FileReader } from "./fs-types.js";

export type Severity = "error" | "warning" | "off";

export interface ResolvedConfig {
  failOn: "error" | "warning";
  budgets: { codexChainBytes: number };
  rules: Record<string, Severity>;
  /** Repo-relative prefixes skipped during discovery, e.g. `vendor/`. */
  ignore: string[];
}

export class ConfigError extends Error {}

const DEFAULT_CONFIG: ResolvedConfig = {
  failOn: "error",
  budgets: { codexChainBytes: 32768 },
  rules: {},
  ignore: [],
};

/**
 * Load a JSON config from the repo root. Default filename is
 * `agentsmd.config.json`. Any invalid value raises ConfigError.
 */
export function loadConfig(
  fs: FileReader,
  root: string,
  filename = "agentsmd.config.json",
): ResolvedConfig {
  if (filename.includes("\0") || filename.startsWith("/") || filename.includes("..")) {
    throw new ConfigError("config path must be a repository-relative file");
  }
  const raw = fs.readUtf8(join(root, filename));
  if (raw === undefined) {
    if (filename === "agentsmd.config.json") return structuredClone(DEFAULT_CONFIG);
    throw new ConfigError(`${filename} was not found`);
  }
  let parsed: unknown;
  try {
    parsed = JSON.parse(raw);
  } catch {
    throw new ConfigError("agentsmd.config.json is not valid JSON");
  }
  if (typeof parsed !== "object" || parsed === null) {
    throw new ConfigError("agentsmd.config.json must be an object");
  }
  const obj = parsed as Record<string, unknown>;
  const cfg = structuredClone(DEFAULT_CONFIG);
  if (obj["failOn"] !== undefined) {
    if (obj["failOn"] !== "error" && obj["failOn"] !== "warning") {
      throw new ConfigError('failOn must be "error" or "warning"');
    }
    cfg.failOn = obj["failOn"];
  }
  if (obj["budgets"] !== undefined) {
    const b = obj["budgets"];
    if (typeof b !== "object" || b === null) {
      throw new ConfigError("budgets must be an object");
    }
    const bytes = (b as Record<string, unknown>)["codexChainBytes"];
    if (bytes !== undefined) {
      if (typeof bytes !== "number" || !Number.isInteger(bytes) || bytes <= 0) {
        throw new ConfigError("budgets.codexChainBytes must be a positive integer");
      }
      cfg.budgets.codexChainBytes = bytes;
    }
  }
  if (obj["rules"] !== undefined) {
    const r = obj["rules"];
    if (typeof r !== "object" || r === null || Array.isArray(r)) {
      throw new ConfigError("rules must be an object");
    }
    for (const [id, sev] of Object.entries(r as Record<string, unknown>)) {
      if (sev !== "error" && sev !== "warning" && sev !== "off") {
        throw new ConfigError(
          `rules.${id} must be "error", "warning", or "off"`,
        );
      }
      cfg.rules[id] = sev;
    }
  }
  if (obj["ignore"] !== undefined) {
    const ignore = obj["ignore"];
    if (!Array.isArray(ignore) || ignore.some((item) => typeof item !== "string")) {
      throw new ConfigError("ignore must be an array of strings");
    }
    cfg.ignore = (ignore as string[]).map((item) => item.replace(/\\/g, "/").replace(/\/+$/, ""));
  }
  return cfg;
}

function join(root: string, rel: string): string {
  return root === "" ? rel : `${root}/${rel}`;
}
