const test = require('node:test');
const assert = require('node:assert/strict');
const { IndexedDBEventStore } = require('../core/IndexedDBEventStore.js');

test('IndexedDBEventStore: Mock testing in node environment', async () => {
  const store = new IndexedDBEventStore();
  await store.init();
  
  await store.saveEvent({ eventId: 'e1', matchId: 'm1', timestamp: 100 });
  await store.saveEvent({ eventId: 'e2', matchId: 'm1', timestamp: 101 });
  await store.saveEvent({ eventId: 'e3', matchId: 'm2', timestamp: 102 });

  const m1Events = await store.getEventsForMatch('m1');
  assert.equal(m1Events.length, 2);
  assert.equal(m1Events[0].eventId, 'e1');
  assert.equal(m1Events[1].eventId, 'e2');

  const m2Events = await store.getEventsForMatch('m2');
  assert.equal(m2Events.length, 1);
  assert.equal(m2Events[0].eventId, 'e3');

  let unsynced = await store.getUnsyncedEvents();
  assert.equal(unsynced.length, 3);

  await store.markEventSynced('e1');
  unsynced = await store.getUnsyncedEvents();
  assert.equal(unsynced.length, 2);
});
