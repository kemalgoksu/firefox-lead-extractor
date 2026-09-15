(function (root) {
  "use strict";

  const SOCIAL_HOSTS = {
    "linkedin.com": "LinkedIn",
    "facebook.com": "Facebook",
    "instagram.com": "Instagram",
    "x.com": "X",
    "twitter.com": "X",
    "tiktok.com": "TikTok",
    "youtube.com": "YouTube",
    "youtu.be": "YouTube",
    "github.com": "GitHub",
    "wa.me": "WhatsApp",
    "whatsapp.com": "WhatsApp"
  };

  const BLOCKED_PATHS = new Set([
    "", "home", "login", "logout", "signup", "register", "share", "sharer",
    "intent", "search", "explore", "settings", "privacy", "terms", "about"
  ]);

  function trimPunctuation(value) {
    return String(value || "").trim().replace(/^[\s<([{]+/, "").replace(/[\s>\])},;:.!?]+$/, "");
  }

  function normalizeEmail(value) {
    return trimPunctuation(value).toLowerCase();
  }

  function decodeContact(value) {
    try { return decodeURIComponent(value); }
    catch (_) { return ""; }
  }

  function isLikelyDate(value) {
    const candidate = trimPunctuation(value).trim();
    let match = candidate.match(/^(\d{4})([-/.])(\d{1,2})\2(\d{1,2})$/);
    if (match) {
      const month = Number(match[3]);
      const day = Number(match[4]);
      return month >= 1 && month <= 12 && day >= 1 && day <= 31;
    }
    match = candidate.match(/^(\d{1,2})([-/.])(\d{1,2})\2(\d{2}|\d{4})$/);
    if (match) {
      const first = Number(match[1]);
      const second = Number(match[3]);
      return first >= 1 && first <= 31 && second >= 1 && second <= 31 && (first <= 12 || second <= 12);
    }
    return false;
  }

  function normalizePhone(value) {
    const raw = String(value || "").trim();
    if (isLikelyDate(raw)) return "";
    const digits = raw.replace(/\D/g, "");
    if (digits.length < 7 || digits.length > 15) return "";
    return (raw.startsWith("+") ? "+" : "") + digits;
  }

  function canonicalSocialUrl(value) {
    try {
      const url = new URL(value);
      url.hash = "";
      for (const key of [...url.searchParams.keys()]) {
        if (/^(utm_|fbclid|gclid|ref|source)/i.test(key)) url.searchParams.delete(key);
      }
      url.hostname = url.hostname.toLowerCase().replace(/^www\./, "");
      url.pathname = url.pathname.replace(/\/+$/, "") || "/";
      return url.toString();
    } catch (_) {
      return "";
    }
  }

  function getSocialPlatform(value) {
    try {
      const url = new URL(value);
      if (!["http:", "https:"].includes(url.protocol)) return "";
      const host = url.hostname.toLowerCase().replace(/^www\./, "");
      const matchedHost = Object.keys(SOCIAL_HOSTS).find((candidate) => host === candidate || host.endsWith(`.${candidate}`));
      if (!matchedHost) return "";

      const parts = url.pathname.split("/").filter(Boolean);
      const first = (parts[0] || "").toLowerCase();
      if (BLOCKED_PATHS.has(first)) return "";
      if (["linkedin.com", "facebook.com", "instagram.com", "x.com", "twitter.com", "tiktok.com", "github.com"].includes(matchedHost) && !parts.length) return "";
      if (/\/(share|sharer|intent)(\/|$)/i.test(url.pathname)) return "";
      if (matchedHost === "youtube.com" && !(/^@/.test(first) || ["channel", "c", "user"].includes(first))) return "";
      if (matchedHost === "github.com" && parts.length !== 1) return "";
      if (["x.com", "twitter.com"].includes(matchedHost) && parts.length > 1) return "";
      if (matchedHost === "instagram.com" && ["p", "reel", "reels", "stories"].includes(first)) return "";
      if (matchedHost === "tiktok.com" && !first.startsWith("@")) return "";
      if (matchedHost === "linkedin.com" && !["in", "company", "school", "showcase"].includes(first)) return "";
      if (matchedHost === "facebook.com" && ["watch", "groups", "events", "marketplace", "gaming", "reel", "photo"].includes(first)) return "";
      if (matchedHost === "whatsapp.com" && first !== "send") return "";
      return SOCIAL_HOSTS[matchedHost];
    } catch (_) {
      return "";
    }
  }

  function extractContacts(text, links) {
    const results = { emails: [], phones: [], socials: [] };
    const seen = { emails: new Set(), phones: new Set(), socials: new Set() };
    const body = String(text || "");
    const hrefs = Array.isArray(links) ? links : [];

    const add = (bucket, value, normalized, extra) => {
      if (!normalized || seen[bucket].has(normalized)) return;
      seen[bucket].add(normalized);
      results[bucket].push(Object.assign({ value, normalizedValue: normalized }, extra || {}));
    };

    const emailRegex = /[a-z0-9.!#$%&'*+/=?^_`{|}~-]+@[a-z0-9](?:[a-z0-9-]{0,61}[a-z0-9])?(?:\.[a-z0-9](?:[a-z0-9-]{0,61}[a-z0-9])?)+/gi;
    for (const match of body.matchAll(emailRegex)) {
      const email = trimPunctuation(match[0]);
      add("emails", email, normalizeEmail(email));
    }

    for (const href of hrefs) {
      if (/^mailto:/i.test(href)) {
        const email = decodeContact(href.replace(/^mailto:/i, "").split(/[?;,]/)[0]);
        add("emails", email, normalizeEmail(email));
      } else if (/^tel:/i.test(href)) {
        const phone = decodeContact(href.replace(/^tel:/i, "").split(/[?;]/)[0]);
        add("phones", phone, normalizePhone(phone));
      } else {
        const platform = getSocialPlatform(href);
        const canonical = canonicalSocialUrl(href);
        if (platform && canonical) add("socials", canonical, canonical.toLowerCase(), { platform });
      }
    }

    return results;
  }

  const api = { extractContacts, normalizeEmail, normalizePhone, isLikelyDate, canonicalSocialUrl, getSocialPlatform };
  root.LeadExtraction = api;
  if (typeof module !== "undefined" && module.exports) module.exports = api;
})(typeof globalThis !== "undefined" ? globalThis : this);
