import { RealFs, type FileReader } from "./fs-types.js";
import { findRepoRoot } from "./discovery.js";
import { contextFromCwd, lint } from "./lint.js";
import { computeScore } from "./score.js";
import { runDoctor } from "./wiring.js";
import { VERSION } from "./version.js";

interface JsonRpcRequest {
  jsonrpc: "2.0";
  id?: number | string | null | undefined;
  method: string;
  params?: Record<string, unknown> | undefined;
}

interface JsonRpcResponse {
  jsonrpc: "2.0";
  id?: number | string | null | undefined;
  result?: unknown;
  error?: {
    code: number;
    message: string;
    data?: unknown;
  } | undefined;
}

const MCP_TOOLS = [
  {
    name: "agentsmd_doctor",
    description: "Verify that detected AI agent tools (Claude Code, Codex, Gemini CLI, Cursor, Copilot) load AGENTS.md correctly.",
    inputSchema: {
      type: "object",
      properties: {},
    },
  },
  {
    name: "agentsmd_lint",
    description: "Find instruction rot: dead file paths, dead shell commands, sprawl, budget overruns, and rule hygiene in AGENTS.md.",
    inputSchema: {
      type: "object",
      properties: {},
    },
  },
  {
    name: "agentsmd_score",
    description: "Score repository AI agent instructions from 0 to 100 with explainable breakdown (coverage, freshness, wiring, size).",
    inputSchema: {
      type: "object",
      properties: {},
    },
  },
  {
    name: "agentsmd_get_instructions",
    description: "Read the canonical AGENTS.md and linked instructions for the current workspace/repository.",
    inputSchema: {
      type: "object",
      properties: {},
    },
  },
];

export async function runMcpServer(fs: FileReader = new RealFs(), cwd: string = process.cwd()): Promise<number> {
  const readline = await import("readline");
  const rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout,
    terminal: false,
  });

  const sendResponse = (res: JsonRpcResponse) => {
    process.stdout.write(JSON.stringify(res) + "\n");
  };

  rl.on("line", (line) => {
    const trimmed = line.trim();
    if (!trimmed) return;
    try {
      const req = JSON.parse(trimmed) as JsonRpcRequest;
      handleRpc(req, fs, cwd, sendResponse);
    } catch {
      sendResponse({
        jsonrpc: "2.0",
        error: { code: -32700, message: "Parse error" },
      });
    }
  });

  return new Promise((resolve) => {
    rl.on("close", () => resolve(0));
  });
}

export function handleRpc(
  req: JsonRpcRequest,
  fs: FileReader,
  cwd: string,
  send: (res: JsonRpcResponse) => void
): void {
  const { id, method, params } = req;

  if (method === "initialize") {
    send({
      jsonrpc: "2.0",
      id,
      result: {
        protocolVersion: "2024-11-05",
        capabilities: {
          tools: {},
          resources: {},
        },
        serverInfo: {
          name: "@daichunghy/agentsmd",
          version: VERSION,
        },
      },
    });
    return;
  }

  if (method === "notifications/initialized" || method === "initialized") {
    return;
  }

  if (method === "ping") {
    send({ jsonrpc: "2.0", id, result: {} });
    return;
  }

  if (method === "tools/list") {
    send({
      jsonrpc: "2.0",
      id,
      result: {
        tools: MCP_TOOLS,
      },
    });
    return;
  }

  if (method === "tools/call") {
    const toolName = (params as { name?: string })?.name;
    const toolResult = executeTool(toolName, fs, cwd);
    send({
      jsonrpc: "2.0",
      id,
      result: toolResult,
    });
    return;
  }

  send({
    jsonrpc: "2.0",
    id,
    error: {
      code: -32601,
      message: `Method not found: ${method}`,
    },
  });
}

function executeTool(
  name: string | undefined,
  fs: FileReader,
  cwd: string
): { content: Array<{ type: "text"; text: string }>; isError?: boolean } {
  const root = findRepoRoot(fs, cwd);
  if (root === undefined) {
    return {
      isError: true,
      content: [{ type: "text", text: "Error: Not inside a git repository." }],
    };
  }

  const res = contextFromCwd(fs, cwd);
  if ("error" in res) {
    return {
      isError: true,
      content: [{ type: "text", text: `Error: ${res.error}` }],
    };
  }
  const ctx = res.ctx;

  switch (name) {
    case "agentsmd_doctor": {
      const doc = runDoctor(ctx);
      const text = JSON.stringify(doc, null, 2);
      return { content: [{ type: "text", text }] };
    }
    case "agentsmd_lint": {
      const findings = lint(ctx);
      const text = JSON.stringify(findings, null, 2);
      return { content: [{ type: "text", text }] };
    }
    case "agentsmd_score": {
      const findings = lint(ctx);
      const score = computeScore(ctx, findings);
      const text = JSON.stringify(score, null, 2);
      return { content: [{ type: "text", text }] };
    }
    case "agentsmd_get_instructions": {
      const agentsPath = root === "" ? "AGENTS.md" : `${root}/AGENTS.md`;
      const content = fs.readUtf8(agentsPath);
      if (content === undefined || content === null) {
        return {
          content: [
            {
              type: "text",
              text: `No AGENTS.md found in repository root (${root}). Run 'agentsmd init' to create one.`,
            },
          ],
        };
      }
      return {
        content: [{ type: "text", text: content }],
      };
    }
    default: {
      return {
        isError: true,
        content: [{ type: "text", text: `Unknown tool: ${name}` }],
      };
    }
  }
}
