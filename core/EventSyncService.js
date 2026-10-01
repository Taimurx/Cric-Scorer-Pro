class EventSyncService {
  constructor(eventStore, apiClient) {
    this.eventStore = eventStore;
    this.apiClient = apiClient;
    this.syncInProgress = false;
  }

  async syncOfflineEvents() {
    if (this.syncInProgress) return;
    this.syncInProgress = true;

    try {
      const unsynced = await this.eventStore.getUnsyncedEvents();
      if (unsynced.length === 0) {
        this.syncInProgress = false;
        return;
      }

      // We group by matchId or send in bulk. We'll send in bulk.
      // Assuming apiClient.pushEvents returns successfully if accepted
      const result = await this.apiClient.pushEvents(unsynced);
      const syncedIds = result?.syncedIds || unsynced.map(e => e.eventId);

      // Mark as synced locally
      for (const event of unsynced) {
        if (syncedIds.includes(event.eventId)) {
          await this.eventStore.markEventSynced(event.eventId);
        }
      }
    } catch (e) {
      console.warn('Sync failed, will retry later', e);
    } finally {
      this.syncInProgress = false;
    }
  }

  startPeriodicSync(intervalMs = 5000) {
    if (typeof window !== 'undefined') {
      this.intervalId = window.setInterval(() => this.syncOfflineEvents(), intervalMs);
    } else {
      this.intervalId = setInterval(() => this.syncOfflineEvents(), intervalMs);
    }
  }

  stopPeriodicSync() {
    if (this.intervalId) {
      if (typeof window !== 'undefined') window.clearInterval(this.intervalId);
      else clearInterval(this.intervalId);
      this.intervalId = null;
    }
  }
}

if (typeof module !== 'undefined' && module.exports) {
  module.exports = { EventSyncService };
} else if (typeof window !== 'undefined') {
  window.EventSyncService = EventSyncService;
}
