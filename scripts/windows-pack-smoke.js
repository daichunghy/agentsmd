// Smoke: resolve package bin the way npm shims do (node + entry), path-safe on Windows.
const path = require("path");
const fs = require("fs");
const pkg = require("../package.json");
const bin = pkg.bin;
const entry = typeof bin === "string" ? bin : bin[Object.keys(bin)[0]];
const abs = path.join(__dirname, "..", entry);
if (!fs.existsSync(abs)) {
  console.error("missing bin", abs);
  process.exit(1);
}
const head = fs.readFileSync(abs, "utf8").split(/\r?\n/, 1)[0];
if (!head.startsWith("#!") && !abs.endsWith(".js")) {
  console.warn("no shebang on", entry, "(ok on Windows via npm shim)");
}
console.log("windows-pack-smoke ok:", path.normalize(abs));
