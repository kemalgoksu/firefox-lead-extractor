const test = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const vm = require("node:vm");

const source = fs.readFileSync(path.join(__dirname, "..", "shared", "browser-api.js"), "utf8");

test("API bridge uses Firefox browser namespace when available", () => {
  const browser = { runtime: {} };
  const context = { browser, chrome: { runtime: {} } };
  context.globalThis = context;
  vm.runInNewContext(source, context);
  assert.equal(context.LeadBrowser, browser);
});

test("API bridge falls back to the Chrome namespace", () => {
  const chrome = { runtime: {} };
  const context = { chrome };
  context.globalThis = context;
  vm.runInNewContext(source, context);
  assert.equal(context.LeadBrowser, chrome);
});
