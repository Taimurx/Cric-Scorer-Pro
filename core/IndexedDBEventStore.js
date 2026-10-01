const { EventStore } = require('./EventStore');

class IndexedDBEventStore extends EventStore {
  constructor(dbName = 'CricScorerPro_Events', version = 1) {
    super();
    this.dbName = dbName;
    this.version = version;
    this.db = null;
  }

  async init() {
    return new Promise((resolve, reject) => {
      if (typeof window === 'undefined' || !window.indexedDB) {
        // Fallback for node/tests
        this.isNode = true;
        this.memoryEvents = [];
        return resolve();
      }

      const request = window.indexedDB.open(this.dbName, this.version);

      request.onupgradeneeded = (event) => {
        const db = event.target.result;
        if (!db.objectStoreNames.contains('events')) {
          const store = db.createObjectStore('events', { keyPath: 'eventId' });
          store.createIndex('matchId', 'matchId', { unique: false });
          store.createIndex('synced', 'synced', { unique: false });
          store.createIndex('timestamp', 'timestamp', { unique: false });
        }
      };

      request.onsuccess = (event) => {
        this.db = event.target.result;
        resolve();
      };

      request.onerror = (event) => {
        reject(event.target.error);
      };
    });
  }

  async saveEvent(event) {
    if (this.isNode) {
      this.memoryEvents.push({ ...event, synced: false });
      return Promise.resolve();
    }

    return new Promise((resolve, reject) => {
      const tx = this.db.transaction('events', 'readwrite');
      const store = tx.objectStore('events');
      
      const record = {
        ...event,
        synced: false
      };

      const request = store.put(record);

      request.onsuccess = () => resolve();
      request.onerror = (e) => reject(e.target.error);
    });
  }

  async getEventsForMatch(matchId) {
    if (this.isNode) {
      return Promise.resolve(this.memoryEvents.filter(e => e.matchId === matchId).sort((a, b) => a.timestamp - b.timestamp));
    }

    return new Promise((resolve, reject) => {
      const tx = this.db.transaction('events', 'readonly');
      const store = tx.objectStore('events');
      const index = store.index('matchId');
      const request = index.getAll(matchId);

      request.onsuccess = (e) => {
        const events = e.target.result;
        events.sort((a, b) => (a.version || 0) - (b.version || 0) || a.timestamp - b.timestamp);
        resolve(events);
      };
      request.onerror = (e) => reject(e.target.error);
    });
  }

  async getUnsyncedEvents() {
    if (this.isNode) {
      return Promise.resolve(this.memoryEvents.filter(e => !e.synced));
    }

    return new Promise((resolve, reject) => {
      const tx = this.db.transaction('events', 'readonly');
      const store = tx.objectStore('events');
      const index = store.index('synced');
      const request = index.getAll(false);

      request.onsuccess = (e) => resolve(e.target.result);
      request.onerror = (e) => reject(e.target.error);
    });
  }

  async markEventSynced(eventId) {
    if (this.isNode) {
      const ev = this.memoryEvents.find(e => e.eventId === eventId);
      if (ev) ev.synced = true;
      return Promise.resolve();
    }

    return new Promise((resolve, reject) => {
      const tx = this.db.transaction('events', 'readwrite');
      const store = tx.objectStore('events');
      const getReq = store.get(eventId);

      getReq.onsuccess = (e) => {
        const data = e.target.result;
        if (data) {
          data.synced = true;
          store.put(data);
        }
        resolve();
      };
      getReq.onerror = (e) => reject(e.target.error);
    });
  }
}

if (typeof module !== 'undefined' && module.exports) {
  module.exports = { IndexedDBEventStore };
} else if (typeof window !== 'undefined') {
  window.IndexedDBEventStore = IndexedDBEventStore;
}
