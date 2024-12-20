const cron = require("node-cron");

class TickerFetcher {
  #tickers = [];

  constructor(dilutionTracker) {
    this.dilutionTracker = dilutionTracker;
  }

  getTickersCache() {
    return this.#tickers;
  }

  async fillCache() {
    const tickers = await this.dilutionTracker.requestAPIForTickers();

    console.log(`Fetched ${tickers.length} tickers from API`);

    this.#tickers = tickers;
  }

  async startFetching() {
    await this.fillCache();

    cron.schedule("*/2 * * * *", async () => {
      await this.fillCache().catch(console.error);
    });
  }
}

module.exports = TickerFetcher;
