(function () {
  "use strict";

  const repo = LeadStorage.createRepository(LeadBrowser);
  const elements = {
    listSelect: document.querySelector("#list-select"),
    createForm: document.querySelector("#create-list-form"),
    newListName: document.querySelector("#new-list-name"),
    toggleCreate: document.querySelector("#toggle-create"),
    status: document.querySelector("#status"),
    results: document.querySelector("#results"),
    count: document.querySelector("#result-count"),
    domain: document.querySelector("#page-domain"),
    rescan: document.querySelector("#rescan"),
    toast: document.querySelector("#toast")
  };
  let page = { domain: "", sourceUrl: "" };
  let contacts = { emails: [], phones: [], socials: [] };
  let toastTimer;

  function showToast(message) {
    clearTimeout(toastTimer);
    elements.toast.textContent = message;
    elements.toast.classList.add("show");
    toastTimer = setTimeout(() => elements.toast.classList.remove("show"), 2200);
  }

  function combineFrames(injectionResults) {
    const snapshots = injectionResults
      .map((entry) => entry && entry.result)
      .filter((entry) => entry && entry.ok === true && entry.page);
    if (!snapshots.length) {
      const browserError = injectionResults
        .map((entry) => entry && entry.error)
        .find(Boolean);
      const message = browserError && (browserError.message || String(browserError));
      throw new Error(message || "The scanner ran, but the browser returned no page data.");
    }
    const top = (injectionResults.find((entry) => entry.frameId === 0) || {}).result;
    const primary = top && top.ok ? top.page : snapshots[0].page;
    return {
      domain: primary.domain,
      sourceUrl: primary.sourceUrl,
      text: snapshots.map((entry) => entry.page.text || "").join("\n").slice(0, 4000000),
      links: Array.from(new Set(snapshots.flatMap((entry) => entry.page.links || [])))
    };
  }

  async function readFrames(tabId) {
    const target = { tabId, allFrames: true };
    const injected = await LeadBrowser.scripting.executeScript({
      target,
      files: ["content/scanner.js"]
    });

    // Retrieve and immediately clear the fallback snapshot from each frame.
    // Firefox can omit completion values for packaged script injection.
    const retrieved = await LeadBrowser.scripting.executeScript({
      target,
      func: () => {
        const snapshot = globalThis.__leadPocketSnapshot || null;
        delete globalThis.__leadPocketSnapshot;
        return snapshot;
      }
    });
    return retrieved.some((entry) => entry && entry.result && entry.result.ok)
      ? retrieved
      : injected;
  }

  async function renderLists(selectedId) {
    const data = await repo.getData();
    elements.listSelect.replaceChildren(...data.lists.map((list) => {
      const option = document.createElement("option");
      option.value = list.id;
      option.textContent = list.name;
      option.selected = list.id === (selectedId || data.activeListId);
      return option;
    }));
    updateSavedButtons(data);
  }

  function updateSavedButtons(data) {
    const listId = elements.listSelect.value;
    document.querySelectorAll(".save-button").forEach((button) => {
      const duplicate = data.contacts.some((item) => item.listId === listId && item.domain === page.domain && item.normalizedValue === button.dataset.normalized);
      button.disabled = duplicate;
      button.classList.toggle("saved", duplicate);
      button.textContent = duplicate ? "Saved" : "Save";
    });
  }

  function resultItem(contact, type) {
    const row = document.createElement("div");
    row.className = "result-item";
    const copy = document.createElement("div");
    copy.className = "result-copy";
    const value = document.createElement(type === "social" ? "a" : "strong");
    const displayValue = type === "email" ? contact.normalizedValue : contact.value;
    value.textContent = displayValue;
    value.title = displayValue;
    if (type === "social") {
      value.href = contact.value;
      value.target = "_blank";
      value.rel = "noreferrer";
    }
    const detail = document.createElement("span");
    detail.textContent = contact.platform || type;
    copy.append(value, detail);
    const button = document.createElement("button");
    button.className = "save-button";
    button.type = "button";
    button.textContent = "Save";
    button.dataset.normalized = contact.normalizedValue;
    button.addEventListener("click", async () => {
      button.disabled = true;
      try {
        const result = await repo.addContact({
          listId: elements.listSelect.value,
          type,
          value: contact.value,
          normalizedValue: contact.normalizedValue,
          domain: page.domain,
          sourceUrl: page.sourceUrl
        });
        button.classList.add("saved");
        button.textContent = "Saved";
        showToast(result.saved ? "Saved to your list" : "Already in this list");
      } catch (error) {
        button.disabled = false;
        showToast(error.message || "Could not save this contact");
      }
    });
    row.append(copy, button);
    return row;
  }

  function renderResults() {
    const groups = [
      ["Emails", contacts.emails, "email"],
      ["Social profiles", contacts.socials, "social"],
      ["Phone numbers", contacts.phones, "phone"]
    ];
    elements.results.replaceChildren();
    let total = 0;
    for (const [label, items, type] of groups) {
      if (!items.length) continue;
      total += items.length;
      const section = document.createElement("section");
      section.className = "result-section";
      const heading = document.createElement("div");
      heading.className = "section-heading";
      const title = document.createElement("h2");
      title.textContent = label;
      const badge = document.createElement("span");
      badge.className = "badge";
      badge.textContent = items.length;
      heading.append(title, badge);
      const list = document.createElement("div");
      list.className = "result-list";
      list.append(...items.map((item) => resultItem(item, type)));
      section.append(heading, list);
      elements.results.append(section);
    }
    elements.count.textContent = `${total} contact${total === 1 ? "" : "s"} found`;
    if (!total) {
      const empty = document.createElement("div");
      empty.className = "empty";
      empty.textContent = "No email addresses, phone numbers, or social profiles were found.";
      elements.results.append(empty);
    }
    elements.status.hidden = true;
    elements.results.hidden = false;
  }

  async function scan() {
    let activeUrl = "";
    elements.rescan.disabled = true;
    elements.results.hidden = true;
    elements.status.hidden = false;
    elements.status.className = "scan-status";
    elements.status.innerHTML = '<span class="spinner"></span> Reading this page&hellip;';
    try {
      const [tab] = await LeadBrowser.tabs.query({ active: true, currentWindow: true });
      activeUrl = tab && tab.url || "";
      if (!tab || !tab.id || !/^(https?|file):/i.test(tab.url || "")) {
        throw new Error("Open a regular website or local HTML file to scan it. Browser system and extension pages are protected.");
      }
      const injectionResults = await Promise.race([
        readFrames(tab.id),
        new Promise((_, reject) => setTimeout(() => reject(new Error("The page took too long to respond.")), 10000))
      ]);
      page = combineFrames(injectionResults || []);
      contacts = LeadExtraction.extractContacts(page.text, page.links);
      elements.domain.textContent = page.domain || "Current page";
      renderResults();
      updateSavedButtons(await repo.getData());
    } catch (error) {
      elements.status.className = "scan-status error";
      const denied = /permission|denied|restricted|privileged|cannot access|missing host/i.test(error && error.message || "");
      elements.status.textContent = denied
        ? `The browser blocked access to ${activeUrl ? new URL(activeUrl).hostname || "this page" : "this page"}. Try a normal public website; internal pages, extension stores, PDF viewers, and some local files are protected.`
        : (error.message || "This page could not be read. Try scanning again after it finishes loading.");
      elements.count.textContent = "Scan unavailable";
    } finally {
      elements.rescan.disabled = false;
    }
  }

  elements.toggleCreate.addEventListener("click", () => {
    const willOpen = elements.createForm.hidden;
    elements.createForm.hidden = !willOpen;
    elements.toggleCreate.setAttribute("aria-expanded", String(willOpen));
    if (willOpen) elements.newListName.focus();
  });
  elements.createForm.addEventListener("submit", async (event) => {
    event.preventDefault();
    try {
      const list = await repo.createList(elements.newListName.value);
      elements.newListName.value = "";
      elements.createForm.hidden = true;
      elements.toggleCreate.setAttribute("aria-expanded", "false");
      await renderLists(list.id);
      showToast(`Created ${list.name}`);
    } catch (error) { showToast(error.message); }
  });
  elements.listSelect.addEventListener("change", async () => {
    await repo.selectList(elements.listSelect.value);
    updateSavedButtons(await repo.getData());
  });
  document.querySelector("#open-manager").addEventListener("click", () => LeadBrowser.tabs.create({ url: LeadBrowser.runtime.getURL("manager/manager.html") }));
  elements.rescan.addEventListener("click", scan);

  scan();
  renderLists().catch((error) => showToast(error.message || "Could not load your lists"));
})();
