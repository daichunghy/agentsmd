import { describe, it, expect } from "vitest";
import { handleRpc } from "../src/mcp.js";
import { MemFs } from "./helpers.js";

describe("MCP Server JSON-RPC handler", () => {
  it("responds to initialize method", () => {
    const fs = new MemFs({});
    let response: any = null;
    handleRpc(
      { jsonrpc: "2.0", id: 1, method: "initialize" },
      fs,
      "/repo",
      (res) => { response = res; }
    );
    expect(response).not.toBeNull();
    expect(response.id).toBe(1);
    expect(response.result.protocolVersion).toBe("2024-11-05");
    expect(response.result.serverInfo.name).toBe("@daichunghy/agentsmd");
  });

  it("lists MCP tools", () => {
    const fs = new MemFs({});
    let response: any = null;
    handleRpc(
      { jsonrpc: "2.0", id: 2, method: "tools/list" },
      fs,
      "/repo",
      (res) => { response = res; }
    );
    expect(response.result.tools).toHaveLength(4);
    const toolNames = response.result.tools.map((t: any) => t.name);
    expect(toolNames).toContain("agentsmd_doctor");
    expect(toolNames).toContain("agentsmd_lint");
    expect(toolNames).toContain("agentsmd_score");
    expect(toolNames).toContain("agentsmd_get_instructions");
  });

  it("executes agentsmd_get_instructions and returns content", () => {
    const fs = new MemFs({
      "/repo/.git/HEAD": "ref: refs/heads/main\n",
      "/repo/AGENTS.md": "# Project Instructions\n- Run tests with npm test\n",
    });
    let response: any = null;
    handleRpc(
      {
        jsonrpc: "2.0",
        id: 3,
        method: "tools/call",
        params: { name: "agentsmd_get_instructions" },
      },
      fs,
      "/repo",
      (res) => { response = res; }
    );
    expect(response.result.isError).toBeUndefined();
    expect(response.result.content[0].text).toContain("# Project Instructions");
  });

  it("executes agentsmd_score tool", () => {
    const fs = new MemFs({
      "/repo/.git/HEAD": "ref: refs/heads/main\n",
      "/repo/AGENTS.md": "# Title\n## Setup\n## Build\n## Test\n## Style\n",
    });
    let response: any = null;
    handleRpc(
      {
        jsonrpc: "2.0",
        id: 4,
        method: "tools/call",
        params: { name: "agentsmd_score" },
      },
      fs,
      "/repo",
      (res) => { response = res; }
    );
    expect(response.result.isError).toBeUndefined();
    const scoreData = JSON.parse(response.result.content[0].text);
    expect(scoreData.score).toBeGreaterThan(0);
    expect(scoreData.schemaVersion).toBe("1.0.0");
  });
});
