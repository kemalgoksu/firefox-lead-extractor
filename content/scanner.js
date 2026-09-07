globalThis.__leadPocketSnapshot = (() => {
  "use strict";

  const MAX_TEXT = 2000000;
  const MAX_LINKS = 20000;

  try {
    const roots = [document];
    const textParts = [];
    const links = new Set();

    // Open shadow roots are separate DOM trees and are common in modern sites.
    for (let index = 0; index < roots.length && roots.length < 500; index += 1) {
      const root = roots[index];
      for (const element of root.querySelectorAll("*")) {
        if (element.shadowRoot) roots.push(element.shadowRoot);
      }
    }

    for (const root of roots) {
      const container = root.body || root.documentElement || root;
      const renderedText = typeof container.innerText === "string" ? container.innerText : container.textContent;
      if (renderedText) textParts.push(renderedText);

      for (const element of root.querySelectorAll("a[href], area[href]")) {
        if (element.href) links.add(element.href);
        if (links.size >= MAX_LINKS) break;
      }

      // Icons and metadata can contain contacts that are absent from visible text.
      for (const element of root.querySelectorAll("meta[content], [aria-label], [title], [data-email]")) {
        for (const name of ["content", "aria-label", "title", "data-email"]) {
          const value = element.getAttribute(name);
          if (value && /@|\d{3}/.test(value)) textParts.push(value);
        }
      }

      // Decode Cloudflare's standard email-protection attribute locally.
      for (const element of root.querySelectorAll("[data-cfemail]")) {
        const encoded = element.getAttribute("data-cfemail") || "";
        if (!/^[0-9a-f]+$/i.test(encoded) || encoded.length < 4 || encoded.length % 2) continue;
        const key = parseInt(encoded.slice(0, 2), 16);
        let decoded = "";
        for (let offset = 2; offset < encoded.length; offset += 2) decoded += String.fromCharCode(parseInt(encoded.slice(offset, offset + 2), 16) ^ key);
        if (decoded.includes("@")) textParts.push(decoded);
      }
    }

    return {
      ok: true,
      page: {
        text: textParts.join("\n").slice(0, MAX_TEXT),
        links: Array.from(links),
        sourceUrl: location.href,
        domain: location.hostname.toLowerCase().replace(/^www\./, "") || "local-file",
        title: document.title || ""
      }
    };
  } catch (error) {
    return { ok: false, error: error && error.message ? error.message : "The document could not be read." };
  }
})();

// Keep the snapshot on the isolated content-script global. Some Firefox
// versions omit a packaged file's completion value from InjectionResult.
globalThis.__leadPocketSnapshot;
