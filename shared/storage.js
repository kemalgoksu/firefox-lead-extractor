(function (root) {
  "use strict";

  const STORAGE_KEY = "leadPocketData";
  const SCHEMA_VERSION = 1;

  function id(prefix) {
    if (globalThis.crypto && typeof globalThis.crypto.randomUUID === "function") return `${prefix}_${globalThis.crypto.randomUUID()}`;
    return `${prefix}_${Date.now()}_${Math.random().toString(36).slice(2)}`;
  }

  function defaultData(now) {
    const timestamp = now || new Date().toISOString();
    return {
      version: SCHEMA_VERSION,
      activeListId: "list_default",
      lists: [{ id: "list_default", name: "My Leads", createdAt: timestamp, updatedAt: timestamp }],
      contacts: []
    };
  }

  function repairData(input) {
    const data = input && typeof input === "object" ? input : defaultData();
    data.version = SCHEMA_VERSION;
    data.lists = Array.isArray(data.lists) ? data.lists.filter((item) => item && item.id && item.name) : [];
    data.contacts = Array.isArray(data.contacts) ? data.contacts.filter((item) => item && item.id && item.listId) : [];
    if (!data.lists.length) return defaultData();
    const ids = new Set(data.lists.map((list) => list.id));
    data.contacts = data.contacts.filter((contact) => ids.has(contact.listId));
    if (!ids.has(data.activeListId)) data.activeListId = data.lists[0].id;
    return data;
  }

  function createRepository(browserApi) {
    async function getData() {
      const stored = await browserApi.storage.local.get(STORAGE_KEY);
      const repaired = repairData(stored[STORAGE_KEY]);
      if (!stored[STORAGE_KEY] || JSON.stringify(stored[STORAGE_KEY]) !== JSON.stringify(repaired)) await saveData(repaired);
      return repaired;
    }

    async function saveData(data) {
      await browserApi.storage.local.set({ [STORAGE_KEY]: repairData(data) });
    }

    async function createList(name) {
      const cleanName = String(name || "").trim();
      if (!cleanName) throw new Error("Enter a list name.");
      const data = await getData();
      if (data.lists.some((list) => list.name.toLowerCase() === cleanName.toLowerCase())) throw new Error("A list with that name already exists.");
      const now = new Date().toISOString();
      const list = { id: id("list"), name: cleanName, createdAt: now, updatedAt: now };
      data.lists.push(list);
      data.activeListId = list.id;
      await saveData(data);
      return list;
    }

    async function selectList(listId) {
      const data = await getData();
      if (!data.lists.some((list) => list.id === listId)) throw new Error("List not found.");
      data.activeListId = listId;
      await saveData(data);
    }

    async function renameList(listId, name) {
      const cleanName = String(name || "").trim();
      if (!cleanName) throw new Error("Enter a list name.");
      const data = await getData();
      if (data.lists.some((list) => list.id !== listId && list.name.toLowerCase() === cleanName.toLowerCase())) throw new Error("A list with that name already exists.");
      const list = data.lists.find((item) => item.id === listId);
      if (!list) throw new Error("List not found.");
      list.name = cleanName;
      list.updatedAt = new Date().toISOString();
      await saveData(data);
    }

    async function deleteList(listId) {
      const data = await getData();
      data.lists = data.lists.filter((list) => list.id !== listId);
      data.contacts = data.contacts.filter((contact) => contact.listId !== listId);
      if (!data.lists.length) {
        const replacement = defaultData();
        data.lists = replacement.lists;
        data.activeListId = replacement.activeListId;
      } else if (data.activeListId === listId) {
        data.activeListId = data.lists[0].id;
      }
      await saveData(data);
    }

    async function addContact(contact) {
      const data = await getData();
      const list = data.lists.find((item) => item.id === contact.listId);
      if (!list) throw new Error("Choose a valid list.");
      const duplicate = data.contacts.some((item) => item.listId === contact.listId && item.domain === contact.domain && item.normalizedValue === contact.normalizedValue);
      if (duplicate) return { saved: false, reason: "duplicate" };
      const record = Object.assign({}, contact, { id: id("contact"), savedAt: new Date().toISOString() });
      data.contacts.push(record);
      list.updatedAt = record.savedAt;
      await saveData(data);
      return { saved: true, contact: record };
    }

    async function removeContact(contactId) {
      const data = await getData();
      data.contacts = data.contacts.filter((contact) => contact.id !== contactId);
      await saveData(data);
    }

    async function removeContacts(contactIds) {
      const ids = new Set(Array.isArray(contactIds) ? contactIds : []);
      if (!ids.size) return 0;
      const data = await getData();
      const originalLength = data.contacts.length;
      data.contacts = data.contacts.filter((contact) => !ids.has(contact.id));
      await saveData(data);
      return originalLength - data.contacts.length;
    }

    async function moveContacts(contactIds, destinationListId) {
      const ids = new Set(Array.isArray(contactIds) ? contactIds : []);
      if (!ids.size) return { moved: 0, merged: 0 };
      const data = await getData();
      const destination = data.lists.find((list) => list.id === destinationListId);
      if (!destination) throw new Error("Choose a valid destination list.");
      const moving = data.contacts.filter((contact) => ids.has(contact.id) && contact.listId !== destinationListId);
      const movingIds = new Set(moving.map((contact) => contact.id));
      let merged = 0;
      for (const contact of moving) {
        const duplicate = data.contacts.some((item) =>
          !movingIds.has(item.id) &&
          item.listId === destinationListId &&
          item.domain === contact.domain &&
          item.normalizedValue === contact.normalizedValue
        );
        if (duplicate) {
          data.contacts = data.contacts.filter((item) => item.id !== contact.id);
          merged += 1;
        } else {
          contact.listId = destinationListId;
        }
      }
      destination.updatedAt = new Date().toISOString();
      await saveData(data);
      return { moved: moving.length - merged, merged };
    }

    return { getData, createList, selectList, renameList, deleteList, addContact, removeContact, removeContacts, moveContacts };
  }

  const api = { STORAGE_KEY, SCHEMA_VERSION, defaultData, repairData, createRepository };
  root.LeadStorage = api;
  if (typeof module !== "undefined" && module.exports) module.exports = api;
})(typeof globalThis !== "undefined" ? globalThis : this);
