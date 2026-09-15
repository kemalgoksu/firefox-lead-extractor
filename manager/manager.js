(function () {
  "use strict";

  const repo = LeadStorage.createRepository(browser);
  const el = {
    nav: document.querySelector("#list-nav"), contacts: document.querySelector("#contacts"), empty: document.querySelector("#empty"),
    currentName: document.querySelector("#current-name"), summary: document.querySelector("#list-summary"), created: document.querySelector("#list-created"), toast: document.querySelector("#toast"),
    createForm: document.querySelector("#create-form"), listName: document.querySelector("#list-name"), dialog: document.querySelector("#rename-dialog"), renameName: document.querySelector("#rename-name"),
    copyEmails: document.querySelector("#copy-emails"), listSearch: document.querySelector("#list-search"), contactSearch: document.querySelector("#contact-search"),
    noLists: document.querySelector("#no-lists-found"), noContacts: document.querySelector("#no-contacts-found"), bulkActions: document.querySelector("#bulk-actions"),
    selectedCount: document.querySelector("#selected-count"), moveTarget: document.querySelector("#move-target"), moveSelected: document.querySelector("#move-selected"),
    deleteSelected: document.querySelector("#delete-selected"), selectAll: document.querySelector("#select-all"), table: document.querySelector("table")
  };
  let currentData;
  let activeId;
  let toastTimer;
  const selectedIds = new Set();

  function toast(message) {
    clearTimeout(toastTimer); el.toast.textContent = message; el.toast.classList.add("show");
    toastTimer = setTimeout(() => el.toast.classList.remove("show"), 2200);
  }

  function formatDate(iso) {
    try { return new Intl.DateTimeFormat(undefined, { dateStyle: "medium" }).format(new Date(iso)); }
    catch (_) { return iso || ""; }
  }

  function formatDateTime(iso) {
    try { return new Intl.DateTimeFormat(undefined, { dateStyle: "medium", timeStyle: "short" }).format(new Date(iso)); }
    catch (_) { return iso || "Unknown"; }
  }

  function byNewestCreated(a, b) {
    return (Date.parse(b.createdAt) || 0) - (Date.parse(a.createdAt) || 0);
  }

  function matchesContact(contact, query) {
    if (!query) return true;
    return [contact.type, contact.value, contact.domain, contact.sourceUrl]
      .some((value) => String(value || "").toLowerCase().includes(query));
  }

  async function render(preferredId) {
    currentData = await repo.getData();
    activeId = preferredId && currentData.lists.some((list) => list.id === preferredId) ? preferredId : currentData.activeListId;
    const currentList = currentData.lists.find((list) => list.id === activeId) || currentData.lists[0];
    if (activeId !== currentData.activeListId) await repo.selectList(activeId);
    const listQuery = el.listSearch.value.trim().toLowerCase();
    const visibleLists = [...currentData.lists]
      .sort(byNewestCreated)
      .filter((list) => list.name.toLowerCase().includes(listQuery));
    el.nav.replaceChildren(...visibleLists.map((list) => {
      const count = currentData.contacts.filter((contact) => contact.listId === list.id).length;
      const button = document.createElement("button"); button.type = "button"; button.className = `nav-item${list.id === activeId ? " active" : ""}`;
      const name = document.createElement("span"); name.className = "name"; name.textContent = list.name;
      const total = document.createElement("span"); total.className = "count"; total.textContent = count;
      button.append(name, total); button.addEventListener("click", () => { selectedIds.clear(); render(list.id); }); return button;
    }));
    el.noLists.hidden = visibleLists.length !== 0;
    const contacts = currentData.contacts.filter((contact) => contact.listId === activeId);
    const contactIds = new Set(contacts.map((contact) => contact.id));
    for (const id of selectedIds) if (!contactIds.has(id)) selectedIds.delete(id);
    const contactQuery = el.contactSearch.value.trim().toLowerCase();
    const visibleContacts = contacts.filter((contact) => matchesContact(contact, contactQuery));
    el.currentName.textContent = currentList.name;
    el.summary.textContent = contactQuery
      ? `${visibleContacts.length} of ${contacts.length} saved contacts`
      : `${contacts.length} saved contact${contacts.length === 1 ? "" : "s"}`;
    el.created.textContent = `Created ${formatDateTime(currentList.createdAt)}`;
    el.copyEmails.disabled = !contacts.some((contact) => contact.type === "email");
    el.contacts.replaceChildren(...visibleContacts.map(contactRow));
    el.empty.hidden = contacts.length !== 0;
    el.noContacts.hidden = contacts.length === 0 || visibleContacts.length !== 0;
    el.table.hidden = visibleContacts.length === 0;
    renderBulkActions(visibleContacts);
  }

  function renderBulkActions(visibleContacts) {
    const selectedCount = selectedIds.size;
    el.bulkActions.hidden = selectedCount === 0;
    el.selectedCount.textContent = `${selectedCount} selected`;
    const destinations = [...currentData.lists].sort(byNewestCreated).filter((list) => list.id !== activeId);
    const previousTarget = el.moveTarget.value;
    el.moveTarget.replaceChildren(...destinations.map((list) => {
      const option = document.createElement("option"); option.value = list.id; option.textContent = list.name; return option;
    }));
    if (destinations.some((list) => list.id === previousTarget)) el.moveTarget.value = previousTarget;
    el.moveTarget.disabled = destinations.length === 0;
    el.moveSelected.disabled = destinations.length === 0;
    const visibleIds = visibleContacts.map((contact) => contact.id);
    const selectedVisible = visibleIds.filter((id) => selectedIds.has(id)).length;
    el.selectAll.checked = visibleIds.length > 0 && selectedVisible === visibleIds.length;
    el.selectAll.indeterminate = selectedVisible > 0 && selectedVisible < visibleIds.length;
  }

  function contactRow(contact) {
    const row = document.createElement("tr");
    const selectCell = document.createElement("td"); selectCell.className = "select-cell";
    const checkbox = document.createElement("input"); checkbox.type = "checkbox"; checkbox.checked = selectedIds.has(contact.id); checkbox.setAttribute("aria-label", `Select ${contact.value}`);
    checkbox.addEventListener("change", () => { if (checkbox.checked) selectedIds.add(contact.id); else selectedIds.delete(contact.id); render(activeId); });
    selectCell.append(checkbox);
    const typeCell = document.createElement("td"); const chip = document.createElement("span"); chip.className = "type-chip"; chip.textContent = contact.type; typeCell.append(chip);
    const value = document.createElement("td"); value.className = "value"; value.textContent = contact.value;
    const source = document.createElement("td"); source.className = "source"; const link = document.createElement("a"); link.href = contact.sourceUrl; link.target = "_blank"; link.rel = "noreferrer"; link.textContent = contact.domain; link.title = contact.sourceUrl; source.append(link);
    const date = document.createElement("td"); date.textContent = formatDate(contact.savedAt);
    const actions = document.createElement("td"); const remove = document.createElement("button"); remove.className = "remove"; remove.type = "button"; remove.textContent = "Remove";
    remove.addEventListener("click", async () => { await repo.removeContact(contact.id); selectedIds.delete(contact.id); await render(activeId); toast("Contact removed"); });
    actions.append(remove); row.append(selectCell, typeCell, value, source, date, actions); return row;
  }

  async function download(listId) {
    const data = await repo.getData();
    const list = listId ? data.lists.find((item) => item.id === listId) : null;
    const csv = LeadCsv.toCsv(data, listId);
    const url = URL.createObjectURL(new Blob([csv], { type: "text/csv;charset=utf-8" }));
    const date = new Date().toISOString().slice(0, 10);
    const filename = `leadfox-${LeadCsv.sanitizeFilename(list ? list.name : "all-lists")}-${date}.csv`;
    try { await browser.downloads.download({ url, filename, saveAs: true }); toast("CSV export ready"); }
    finally { setTimeout(() => URL.revokeObjectURL(url), 30000); }
  }

  async function copyEmails() {
    const emails = currentData.contacts
      .filter((contact) => contact.listId === activeId && contact.type === "email")
      .map((contact) => contact.value);
    if (!emails.length) { toast("No emails to copy"); return; }
    await navigator.clipboard.writeText(emails.join("\n"));
    toast(`${emails.length} email${emails.length === 1 ? "" : "s"} copied`);
  }

  document.querySelector("#show-create").addEventListener("click", () => { el.createForm.hidden = !el.createForm.hidden; if (!el.createForm.hidden) el.listName.focus(); });
  el.createForm.addEventListener("submit", async (event) => { event.preventDefault(); try { const list = await repo.createList(el.listName.value); el.listName.value = ""; el.createForm.hidden = true; await render(list.id); toast("List created"); } catch (error) { toast(error.message); } });
  document.querySelector("#rename").addEventListener("click", () => { el.renameName.value = currentData.lists.find((list) => list.id === activeId).name; el.dialog.showModal(); el.renameName.select(); });
  document.querySelector("#cancel-rename").addEventListener("click", () => el.dialog.close());
  document.querySelector("#rename-form").addEventListener("submit", async (event) => { event.preventDefault(); try { await repo.renameList(activeId, el.renameName.value); el.dialog.close(); await render(activeId); toast("List renamed"); } catch (error) { toast(error.message); } });
  document.querySelector("#delete-list").addEventListener("click", async () => { const list = currentData.lists.find((item) => item.id === activeId); if (!confirm(`Delete “${list.name}” and all its saved contacts?`)) return; await repo.deleteList(activeId); await render(); toast("List deleted"); });
  el.listSearch.addEventListener("input", () => render(activeId));
  el.contactSearch.addEventListener("input", () => render(activeId));
  el.selectAll.addEventListener("change", () => {
    const query = el.contactSearch.value.trim().toLowerCase();
    const visible = currentData.contacts.filter((contact) => contact.listId === activeId && matchesContact(contact, query));
    for (const contact of visible) { if (el.selectAll.checked) selectedIds.add(contact.id); else selectedIds.delete(contact.id); }
    render(activeId);
  });
  el.deleteSelected.addEventListener("click", async () => {
    const count = selectedIds.size;
    if (!count || !confirm(`Delete ${count} selected contact${count === 1 ? "" : "s"}?`)) return;
    const removed = await repo.removeContacts([...selectedIds]);
    selectedIds.clear();
    await render(activeId);
    toast(`${removed} contact${removed === 1 ? "" : "s"} deleted`);
  });
  el.moveSelected.addEventListener("click", async () => {
    if (!selectedIds.size || !el.moveTarget.value) return;
    const count = selectedIds.size;
    const destination = currentData.lists.find((list) => list.id === el.moveTarget.value);
    const result = await repo.moveContacts([...selectedIds], el.moveTarget.value);
    selectedIds.clear();
    await render(activeId);
    const merged = result.merged ? ` (${result.merged} duplicate${result.merged === 1 ? "" : "s"} merged)` : "";
    toast(`${count} contact${count === 1 ? "" : "s"} moved to ${destination.name}${merged}`);
  });
  el.copyEmails.addEventListener("click", () => copyEmails().catch((error) => toast(error.message || "Copy failed")));
  document.querySelector("#export-list").addEventListener("click", () => download(activeId).catch((error) => toast(error.message || "Export failed")));
  document.querySelector("#export-all").addEventListener("click", () => download().catch((error) => toast(error.message || "Export failed")));
  render();
})();
