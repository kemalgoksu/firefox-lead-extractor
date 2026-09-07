const test = require("node:test");
const assert = require("node:assert/strict");
const csv = require("../shared/csv.js");

const data = {
  lists: [{ id: "one", name: "Müşteriler" }],
  contacts: [{
    listId: "one", type: "email", value: "=cmd,\"quoted\"", domain: "example.com",
    sourceUrl: "https://example.com/contact", savedAt: "2026-08-08T10:00:00.000Z"
  }]
};

test("exports a selected list with quoting, BOM, and formula protection", () => {
  const output = csv.toCsv(data, "one");
  assert.ok(output.startsWith("\uFEFF\"type\""));
  assert.ok(output.includes("\"'=cmd,\"\"quoted\"\"\""));
  assert.ok(!output.includes("list_name"));
});

test("all-list export includes list names", () => {
  const output = csv.toCsv(data);
  assert.ok(output.includes("\"list_name\""));
  assert.ok(output.includes("\"Müşteriler\""));
});

test("empty exports retain headers and filenames are safe", () => {
  const output = csv.toCsv({ lists: data.lists, contacts: [] }, "one");
  assert.equal(output.split("\r\n").length, 2);
  assert.equal(csv.sanitizeFilename("  Sales / Europe: Q3  "), "sales-europe-q3");
});
