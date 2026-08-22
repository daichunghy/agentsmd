import type { FileReader } from "./fs-types.js";

export type Severity = "error" | "warning" | "off";

export interface ResolvedConfig {
  failOn: "error" | "warning";
  budgets: { codexChainBytes: number };
  rules: Record<string, Severity>;
}

export class ConfigError extends Error {}

const DEFAULT_CONFIG: ResolvedConfig = {
  failOn: "error",
  budgets: { codexChainBytes: 32768 },
  rules: {},
};

/**
 * Load `agentsmd.config.json` from the repo root when present and validate
 * its shape. Any invalid value raises ConfigError (mapped to exit code 2).
 */
export function loadConfig(fs: FileReader, root: string): ResolvedConfig {
  const raw = fs.readUtf8(join(root, "agentsmd.config.json"));
  if (raw === undefined) return structuredClone(DEFAULT_CONFIG);
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
  return cfg;
}

function join(root: string, rel: string): string {
  return root === "" ? rel : `${root}/${rel}`;
}
