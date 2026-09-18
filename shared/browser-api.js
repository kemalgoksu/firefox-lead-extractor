(function (root) {
  "use strict";

  // Firefox exposes the Promise-based WebExtensions API as `browser`, while
  // Chromium exposes the same MV3 APIs as `chrome`.
  const api = root.browser || root.chrome;
  if (!api) throw new Error("The WebExtensions API is unavailable.");
  root.LeadBrowser = api;
})(globalThis);
