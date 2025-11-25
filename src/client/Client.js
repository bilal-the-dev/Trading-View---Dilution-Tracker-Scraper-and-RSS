const path = require("path");
const fs = require("fs");

const { Client } = require("discord.js");
const WOK = require("wokcommands");
const { Events } = require("discord.js");
const cron = require("node-cron");

const { DilutionTracker } = require("../structures/DilutionTracker");
const TickerFetcher = require("../structures/TickerFetcher");
const { parseTickerData } = require("../utils/parse");
const HaltManager = require("../structures/HaltManager");
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
      // headless: process.env.debug == "true" ? false : true,
      // devtools: true,
      ...(process.platform === "linux" && {
        executablePath: this.getChromiumPath(),
      }),
      args: ["--no-sandbox", "--disable-setuid-sandbox"],
    });

    this.tradingView = new TradingView(this, {
      afterMarketTimeout: 1000 * 20,
      refreshTime: 1000 * 30,
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
    this.tickerFecther.startFetching();
  }

  #registerReady() {
    this.on(Events.ClientReady, (readyClient) => {
      console.log(
        `${readyClient.user.username} (${readyClient.user.id}) is ready!`
      );

      // Inititating managers that need to run when client is ready
      this.haltManager.start();
      this.tradingView.start(); // to send logs message thats why put in ready
      this.bans.start();
      this.setCronForScamMessage();
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
      withDilution,
      // withYahoo,
    } = {
      withYahoo: true,
      withDilution: true,
    }
  ) {
    let dilutionData;
    // yahooData;

    // if (withYahoo) {
    //   const yahooManager = new YahooAPI(ticker);
    //   yahooData = await yahooManager.getTickerData();
    //   yahooData.quarterlyIncome = await yahooManager.getQuarterlyIncome();
    // }

    if (withDilution)
      dilutionData = await this.dilutionTracker.scrapeTickerInfo(ticker);

    return parseTickerData({
      ticker,
      dilutionData,
      // yahooData,
    });
  }

  async sendTickerMessage(ticker, text, channelId, isPlainText, files) {
    const channel = this.channels.cache.get(channelId);

    const row = getButtonRow(ticker);

    const data = {
      ...(!isPlainText && { embeds: [generateEmbed({ description: text })] }),
      ...(isPlainText && { content: text }),
      ...(files && { files }),
      ...(row && { components: [row] }),
    };

    await channel.send(data);
  }

  async sendLogsMessage(data) {
    const channel = this.channels.cache.get(process.env.LOGS_CHANNEL_ID);

    await channel.send(data);
  }

  setCronForScamMessage() {
    cron.schedule(
      "0 9 * * 1,3,5",
      async () => {
        const text = `🚨 Heads up, @everyone 🚨
Be on the lookout for imposters/scammers!! 😱 Some people may join our Discord and change their names to resemble Quads Trading or  Shawn - Smithtrading.com.  Once they do, they might try to send DM or friend requests to promote their services, sell something or even take your money 💵!! Please don't engage with these individuals or accept their friend requests from unknown people. Your safety is our #1 priority! If your unsure, feel free to reach out via <#1392457437117677629>. Thank you for understanding and stay safe out there!!

✅ All payments are processed only through our official Whop shop.

❌ We will never ask you to send crypto payments.

❌ Do not engage with, or accept friend requests from, unknown users.`;

        await this.sendTickerMessage(
          null,
          text,
          process.env.SCAM_CHANNEL_ID,
          true
        ).catch(console.error);
      },
      {
        timezone: "America/New_York",
      }
    );
  }
}

module.exports = ExtendedClient;
