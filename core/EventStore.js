class EventStore {
  /**
   * @param {Object} event The match event
   * @returns {Promise<void>}
   */
  async saveEvent(event) {
    throw new Error('Not implemented');
  }

  /**
   * @param {string} matchId
   * @returns {Promise<Array<Object>>}
   */
  async getEventsForMatch(matchId) {
    throw new Error('Not implemented');
  }

  /**
   * Returns events that haven't been synced to the server yet.
   * @returns {Promise<Array<Object>>}
   */
  async getUnsyncedEvents() {
    throw new Error('Not implemented');
  }

  /**
   * @param {string} eventId
   * @returns {Promise<void>}
   */
  async markEventSynced(eventId) {
    throw new Error('Not implemented');
  }
}

module.exports = { EventStore };
