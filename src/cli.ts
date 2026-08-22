import { VERSION } from "./version.js";

export async function runCli(argv: string[]): Promise<number> {
  const cmd = argv[0];
  if (cmd === "--version" || cmd === "-v") {
    process.stdout.write(VERSION + "\n");
    return 0;
  }
  if (cmd === undefined || cmd === "--help" || cmd === "-h") {
    process.stdout.write("agentsmd — lint | doctor | sync | score\n");
    return 0;
  }
  process.stderr.write(`unknown command: ${cmd}\n`);
  return 2;
}
