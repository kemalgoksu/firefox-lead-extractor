const test = require("node:test");
const assert = require("node:assert/strict");
const extraction = require("../shared/extraction.js");

test("malformed contact links do not abort extraction of valid contacts", () => {
  const result = extraction.extractContacts("hello@example.com", [
    "mailto:bad%ZZ@example.com", "tel:%ZZ", "tel:+14155552671",
    "mailto:sales@example.org", "ftp://github.com/example"
  ]);
  assert.deepEqual(result.emails.map((item) => item.normalizedValue), ["hello@example.com", "sales@example.org"]);
  assert.deepEqual(result.phones.map((item) => item.normalizedValue), ["+14155552671"]);
  assert.deepEqual(result.socials, []);
});

test("extracts and deduplicates emails from text and mailto links", () => {
  const result = extraction.extractContacts(
    "Write to Hello@Example.com or hello@example.com.",
    ["mailto:hello@example.com?subject=Hi", "mailto:sales@example.org"]
  );
  assert.deepEqual(result.emails.map((item) => item.normalizedValue), ["hello@example.com", "sales@example.org"]);
});

test("extracts phone numbers only from tel links", () => {
  assert.equal(extraction.normalizePhone("+90 (555) 123-45-67"), "+905551234567");
  assert.equal(extraction.normalizePhone("123"), "");
  const result = extraction.extractContacts(
    "Call +1 (415) 555-2671 or 555-123-4567.",
    ["https://example.com/555-123-4567", "tel:+14155552671"]
  );
  assert.deepEqual(result.phones.map((item) => item.normalizedValue), ["+14155552671"]);
});

test("does not extract phone-shaped text when no tel link exists", () => {
  assert.equal(extraction.normalizePhone("2026-06-21"), "");
  assert.equal(extraction.normalizePhone("21/06/2026"), "");
  assert.equal(extraction.normalizePhone("06.21.26"), "");
  const result = extraction.extractContacts(
    "Published 2026-06-21, updated 21/06/2026. Call 555-123-4567.",
    []
  );
  assert.deepEqual(result.phones, []);
});

test("accepts profiles and rejects generic or sharing social links", () => {
  assert.equal(extraction.getSocialPlatform("https://linkedin.com/in/ada-lovelace"), "LinkedIn");
  assert.equal(extraction.getSocialPlatform("https://github.com/octocat"), "GitHub");
  assert.equal(extraction.getSocialPlatform("https://twitter.com/intent/tweet?x=1"), "");
  assert.equal(extraction.getSocialPlatform("https://instagram.com/"), "");
  assert.equal(extraction.getSocialPlatform("https://youtube.com/watch?v=abc"), "");
  assert.equal(extraction.getSocialPlatform("https://github.com/openai/codex"), "");
  assert.equal(extraction.getSocialPlatform("https://x.com/openai/status/123"), "");
});

test("canonical social URLs remove tracking and fragments", () => {
  assert.equal(
    extraction.canonicalSocialUrl("https://www.linkedin.com/in/example/?utm_source=x#bio"),
    "https://linkedin.com/in/example"
  );
});
