const { XMLParser } = require("fast-xml-parser");
const cron = require("node-cron");

const { HALT_RSS_URL, HALT_FEED_CHANNEL_ID, SHOULD_RUN_HALT } = process.env;

class HaltManager {
  parser = new XMLParser();
  #items = [];
  #haltTimes = {};
  constructor({ filters, client }) {
    this.client = client;
    this.filters = filters;
  }

  async fetchFeed() {
    console.log("Checking new updates for halt rss feed");

    const res = await fetch(HALT_RSS_URL);

    const text = await res.text();

    const result = this.parser.parse(text);

    if (this.#items.length === 0) {
      for (const item of result.rss.channel.item)
        this.#items.push(
          `${item["ndaq:HaltDate"]}-${item["ndaq:HaltTime"]}-${item["ndaq:IssueSymbol"]}-${item["ndaq:ReasonCode"]}`
        );
      return console.log("Halt: first time pushing in cache");
    }

    for (const item of result.rss.channel.item) {
      if (
        this.#items.includes(
          `${item["ndaq:HaltDate"]}-${item["ndaq:HaltTime"]}-${item["ndaq:IssueSymbol"]}-${item["ndaq:ReasonCode"]}`
        )
      )
        continue;

      console.log("Halt: Found new item, checking if it passes the filter");
      console.log(item);

      const hasPassedFilter = this.filters.some(
        (f) =>
          f.market === item["ndaq:Market"].toLowerCase() &&
          f.code === item["ndaq:ReasonCode"].toLowerCase()
      );

      if (!hasPassedFilter) {
        console.log("Halt: Well, not one of our filtered item. Skipping");
        this.#items.push(
          `${item["ndaq:HaltDate"]}-${item["ndaq:HaltTime"]}-${item["ndaq:IssueSymbol"]}-${item["ndaq:ReasonCode"]}`
        );
        continue;
      }

      console.log("Halt: Yes, one of our filtered items. Sending to discord");

      await this.sendMessage(item);

      this.#items.push(
        `${item["ndaq:HaltDate"]}-${item["ndaq:HaltTime"]}-${item["ndaq:IssueSymbol"]}-${item["ndaq:ReasonCode"]}`
      );
    }
  }

  async start() {
    if (SHOULD_RUN_HALT === "false")
      return console.log("Did not start halt manager");

    console.log("Starting halt manager fetching!");

    await this.fetchFeed();
    cron.schedule("*/1 * * * *", async () => {
      await this.fetchFeed().catch(console.error);
    });
  }

  async sendMessage(item) {
    const date = item["ndaq:HaltDate"];
    const code = item["ndaq:ReasonCode"];

    if (!this.#haltTimes[date]) this.#haltTimes[date] = {};

    if (!this.#haltTimes[date][code]) this.#haltTimes[date][code] = 0;

    this.#haltTimes[date][code]++;
    const noOfHalts = this.#haltTimes[date][code];

    await this.client.sendTickerMessage(
      item[["ndaq:IssueSymbol"]],
      `*Issue Symbol**: ${item["ndaq:IssueSymbol"]}\n**Halt Date**: ${date}\n**Halt Time**: ${item["ndaq:HaltTime"]}\n***Market**: ${item["ndaq:Market"]}\n**Reason Code**: ${code} #${noOfHalts}`,
      HALT_FEED_CHANNEL_ID
    );
  }
}

module.exports = HaltManager;
