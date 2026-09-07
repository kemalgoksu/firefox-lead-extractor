(function (root) {
  "use strict";

  function preventFormula(value) {
    const text = String(value == null ? "" : value);
    return /^[\t\r ]*[=+\-@]/.test(text) ? `'${text}` : text;
  }

  function quote(value) {
    const safe = preventFormula(value).replace(/"/g, '""');
    return `"${safe}"`;
  }

  function toCsv(data, listId) {
    const allLists = !listId;
    const headers = allLists
      ? ["list_name", "type", "value", "domain", "source_url", "saved_at"]
      : ["type", "value", "domain", "source_url", "saved_at"];
    const listNames = new Map(data.lists.map((list) => [list.id, list.name]));
    const contacts = data.contacts.filter((contact) => !listId || contact.listId === listId);
    const rows = contacts.map((contact) => {
      const values = [contact.type, contact.value, contact.domain, contact.sourceUrl, contact.savedAt];
      if (allLists) values.unshift(listNames.get(contact.listId) || "Unknown list");
      return values.map(quote).join(",");
    });
    return `\uFEFF${headers.map(quote).join(",")}\r\n${rows.join("\r\n")}${rows.length ? "\r\n" : ""}`;
  }

  function sanitizeFilename(value) {
    const cleaned = String(value || "export").trim().toLowerCase()
      .replace(/[^a-z0-9\p{L}\p{N}]+/gu, "-")
      .replace(/^-+|-+$/g, "")
      .slice(0, 60);
    return cleaned || "export";
  }

  const api = { preventFormula, quote, toCsv, sanitizeFilename };
  root.LeadCsv = api;
  if (typeof module !== "undefined" && module.exports) module.exports = api;
})(typeof globalThis !== "undefined" ? globalThis : this);
