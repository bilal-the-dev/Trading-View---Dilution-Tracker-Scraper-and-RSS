const path = require("path");
const fs = require("fs");

const { Client } = require("discord.js");
const WOK = require("wokcommands");
const { Events } = require("discord.js");

const { DilutionTracker } = require("../structures/DilutionTracker");
const TickerFetcher = require("../structures/TickerFetcher");
const { parseTickerData } = require("../utils/parse");
const HaltManager = require("../structures/HaltManager");
const YahooAPI = require("../structures/YahooAPI");
const { generateEmbed } = require("../utils/embeds");
const { getButtonRow } = require("../utils/buttons");
const TradingView = require("../structures/TradingView");
const BanManager = require("../structures/BanManager");

const { DefaultCommands } = WOK;

class ExtendedClient extends Client {
  constructor(options) {
    super(options);
    this.#registerReady();

    // Initiating Managers
    this.dilutionTracker = new DilutionTracker({
      // headless: false,
      // devtools: true,
      ...(process.platform === "linux" && {
        executablePath: this.getChromiumPath(),
      }),
      args: ["--no-sandbox", "--disable-setuid-sandbox"],
    });

    this.tradingView = new TradingView(this, {
      afterMarketTimeout: 1000 * 20,
      refreshTime: 1000 * 10,
    });

    this.tickerFecther = new TickerFetcher(this.dilutionTracker);

    this.haltManager = new HaltManager({
      filters: [
        { market: "nasdaq", code: "ludp" },
        { market: "amex", code: "m" },
      ],
      client: this,
    });

    this.bans = new BanManager(this);

    // Starting their functions
    this.dilutionTracker.start();
    this.tradingView.start();
    this.tickerFecther.startFetching();
  }

  #registerReady() {
    this.on(Events.ClientReady, (readyClient) => {
      console.log(
        `${readyClient.user.username} (${readyClient.user.id}) is ready!`
      );

      // Inititating managers that need to run when client is ready
      this.haltManager.start();
      this.bans.start();
      new WOK({
        client: readyClient,
        commandsDir: path.join(__dirname, "..", "commands"),
        events: {
          dir: path.join(__dirname, "..", "events"),
        },
        disabledDefaultCommands: [
          DefaultCommands.ChannelCommand,
          DefaultCommands.CustomCommand,
          DefaultCommands.Prefix,
          DefaultCommands.RequiredPermissions,
          DefaultCommands.RequiredRoles,
          DefaultCommands.ToggleCommand,
        ],
      });

      // extra space
    });
  }

  getChromiumPath() {
    try {
      let path = "/usr/bin/chromium";

      fs.accessSync(path);
      return path;
    } catch (error) {
      console.log(error);
      return "/usr/bin/chromium-browser";
    }
  }

  async fetchInfoAboutTicker(
    ticker,
    {
      // withYahoo = true
      withDilution = true,
    } = {
      withYahoo: true,
      withDilution: true,
    }
  ) {
    let dilutionData;

    const yahooManager = new YahooAPI(ticker);
    const yahooData = await yahooManager.getTickerData();
    yahooData.quarterlyIncome = await yahooManager.getQuarterlyIncome();

    if (withDilution)
      dilutionData = await this.dilutionTracker.scrapeTickerInfo(ticker);

    return parseTickerData({
      ticker,
      dilutionData,
      yahooData,
    });
  }

  async sendTickerMessage(ticker, description, channelId) {
    const channel = this.channels.cache.get(channelId);

    const data = {
      embeds: [generateEmbed({ description })],
      components: [getButtonRow(ticker)],
    };

    await channel.send(data);
  }

  async sendLogsMessage(data) {
    const channel = this.channels.cache.get(process.env.LOGS_CHANNEL_ID);

    await channel.send(data);
  }
}

module.exports = ExtendedClient;
