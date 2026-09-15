const test = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const vm = require("node:vm");

function element(attributes) {
  return {
    href: attributes.href || "",
    shadowRoot: null,
    getAttribute(name) { return attributes[name] || null; }
  };
}

function encodeCloudflare(value, key = 0x42) {
  return key.toString(16).padStart(2, "0") + Array.from(value)
    .map((character) => (character.charCodeAt(0) ^ key).toString(16).padStart(2, "0"))
    .join("");
}

test("page scanner returns rendered text, links, metadata, and protected emails", () => {
  const anchor = element({ href: "mailto:sales@example.com" });
  const metadata = element({ content: "Call +1 415 555 2671" });
  const protectedEmail = element({ "data-cfemail": encodeCloudflare("team@example.org") });
  const document = {
    body: { innerText: "Visible contact page" },
    title: "Contact",
    querySelectorAll(selector) {
      if (selector === "*") return [];
      if (selector === "a[href], area[href]") return [anchor];
      if (selector === "meta[content], [aria-label], [title], [data-email]") return [metadata];
      if (selector === "[data-cfemail]") return [protectedEmail];
      return [];
    }
  };
  const source = fs.readFileSync(path.join(__dirname, "..", "content", "scanner.js"), "utf8");
  const isolatedGlobal = {};
  let expireSnapshot;
  const result = vm.runInNewContext(source, {
    document,
    location: { href: "https://www.example.com/contact", hostname: "www.example.com" },
    Set,
    Array,
    String,
    parseInt,
    globalThis: isolatedGlobal,
    setTimeout(callback, delay) {
      assert.equal(delay, 15000);
      expireSnapshot = callback;
    }
  });

  assert.equal(result.ok, true);
  assert.equal(result.page.domain, "example.com");
  assert.deepEqual(Array.from(result.page.links), ["mailto:sales@example.com"]);
  assert.match(result.page.text, /Visible contact page/);
  assert.match(result.page.text, /\+1 415 555 2671/);
  assert.match(result.page.text, /team@example\.org/);
  assert.equal(isolatedGlobal.__leadPocketSnapshot, result);
  expireSnapshot();
  assert.equal(isolatedGlobal.__leadPocketSnapshot, undefined);
});

test("manifest uses click-time injection instead of a persistent content script", () => {
  const manifest = JSON.parse(fs.readFileSync(path.join(__dirname, "..", "manifest.json"), "utf8"));
  assert.ok(manifest.permissions.includes("activeTab"));
  assert.ok(manifest.permissions.includes("scripting"));
  assert.equal(manifest.content_scripts, undefined);
  assert.equal(manifest.host_permissions, undefined);

  const popup = fs.readFileSync(path.join(__dirname, "..", "popup", "popup.js"), "utf8");
  assert.match(popup, /files:\s*\["\/content\/scanner\.js"\]/);
});
