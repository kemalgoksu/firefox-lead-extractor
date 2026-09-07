const test = require("node:test");
const assert = require("node:assert/strict");
const storage = require("../shared/storage.js");

function mockBrowser(seed) {
  const values = seed || {};
  return {
    values,
    storage: { local: {
      async get(key) { return { [key]: values[key] }; },
      async set(next) { Object.assign(values, next); }
    } }
  };
}

test("repository creates a default list", async () => {
  const api = mockBrowser();
  const repo = storage.createRepository(api);
  const data = await repo.getData();
  assert.equal(data.lists.length, 1);
  assert.equal(data.activeListId, data.lists[0].id);
});

test("contacts are deduplicated by list, normalized value, and domain", async () => {
  const repo = storage.createRepository(mockBrowser());
  const data = await repo.getData();
  const contact = { listId: data.activeListId, type: "email", value: "A@example.com", normalizedValue: "a@example.com", domain: "site.test", sourceUrl: "https://site.test" };
  assert.equal((await repo.addContact(contact)).saved, true);
  assert.equal((await repo.addContact(contact)).saved, false);
  assert.equal((await repo.getData()).contacts.length, 1);
});

test("deleting the final list creates a replacement default", async () => {
  const repo = storage.createRepository(mockBrowser());
  const data = await repo.getData();
  await repo.deleteList(data.activeListId);
  const repaired = await repo.getData();
  assert.equal(repaired.lists.length, 1);
  assert.equal(repaired.contacts.length, 0);
});

test("list names must be unique", async () => {
  const repo = storage.createRepository(mockBrowser());
  await repo.createList("Prospects");
  await assert.rejects(() => repo.createList(" prospects "), /already exists/);
});

test("contacts can be removed in a batch", async () => {
  const repo = storage.createRepository(mockBrowser());
  const data = await repo.getData();
  const first = await repo.addContact({ listId: data.activeListId, type: "email", value: "a@test.dev", normalizedValue: "a@test.dev", domain: "test.dev" });
  const second = await repo.addContact({ listId: data.activeListId, type: "email", value: "b@test.dev", normalizedValue: "b@test.dev", domain: "test.dev" });
  assert.equal(await repo.removeContacts([first.contact.id, second.contact.id]), 2);
  assert.equal((await repo.getData()).contacts.length, 0);
});

test("contacts can be moved to another list and duplicate destinations are merged", async () => {
  const repo = storage.createRepository(mockBrowser());
  const source = (await repo.getData()).activeListId;
  const destination = await repo.createList("Destination");
  const contact = { type: "email", value: "a@test.dev", normalizedValue: "a@test.dev", domain: "test.dev" };
  const sourceContact = await repo.addContact(Object.assign({ listId: source }, contact));
  await repo.addContact(Object.assign({ listId: destination.id }, contact));
  assert.deepEqual(await repo.moveContacts([sourceContact.contact.id], destination.id), { moved: 0, merged: 1 });
  const data = await repo.getData();
  assert.equal(data.contacts.length, 1);
  assert.equal(data.contacts[0].listId, destination.id);
});

test("moving a unique contact preserves it in the destination list", async () => {
  const repo = storage.createRepository(mockBrowser());
  const source = (await repo.getData()).activeListId;
  const destination = await repo.createList("Destination");
  const saved = await repo.addContact({ listId: source, type: "phone", value: "+15551234567", normalizedValue: "+15551234567", domain: "test.dev" });
  assert.deepEqual(await repo.moveContacts([saved.contact.id], destination.id), { moved: 1, merged: 0 });
  const [contact] = (await repo.getData()).contacts;
  assert.equal(contact.id, saved.contact.id);
  assert.equal(contact.listId, destination.id);
});
