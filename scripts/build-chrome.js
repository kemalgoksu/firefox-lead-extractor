const fs = require("node:fs");
const path = require("node:path");
const { spawnSync } = require("node:child_process");

const root = path.resolve(__dirname, "..");
const stage = path.join(root, ".build", "chrome");
const artifacts = path.join(root, "dist");
const included = ["content", "icons", "manager", "popup", "shared", "LICENSE", "PRIVACY.md"];

fs.rmSync(stage, { recursive: true, force: true });
fs.mkdirSync(stage, { recursive: true });

for (const entry of included) {
  fs.cpSync(path.join(root, entry), path.join(stage, entry), { recursive: true });
}

const manifest = JSON.parse(fs.readFileSync(path.join(root, "manifest.json"), "utf8"));
delete manifest.browser_specific_settings;
delete manifest.action.default_area;
fs.writeFileSync(path.join(stage, "manifest.json"), `${JSON.stringify(manifest, null, 2)}\n`);

fs.mkdirSync(artifacts, { recursive: true });
const executable = path.join(root, "node_modules", "web-ext", "bin", "web-ext.js");
const result = spawnSync(process.execPath, [executable,
  "build",
  "--source-dir", stage,
  "--artifacts-dir", artifacts,
  "--filename", "leadfox-chrome.zip",
  "--overwrite-dest"
], { cwd: root, stdio: "inherit" });

if (result.error) throw result.error;
process.exitCode = result.status || 0;
