const { setTimeout } = require("timers/promises");

const cron = require("node-cron");
const dayjs = require("./../utils/dayjs");
const {
  parseRawFactors,
  parseShortInterest,
  parseInstOwnData,
  parseDilutionFloat,
  parseDilutionCap,
  parseNews,
  parsCompanyProfile,
  convertVolumeToHR,
} = require("../utils/parse");
const { getTVSession, setTVSession } = require("../database/queries");
const { MARKET_TYPES } = require("../utils/constants");
const configFile = require("./../../config.json");

let retries = 0;

const {
  OPEN_MARKET_CONFIG,
  SHOULD_RUN_TV,
  PRE_MARKET_CONFIG,
  TV_PASSWORD,
  TV_EMAIL,
  TV_URL,
  USER_AGENT,
} = process.env;

class TradingView {
  #username;
  #started;
  #tickers = [];
  #previousMarket;
  constructor(client, config) {
    this.config = config;
    this.client = client;
  }

  async checkForNewTickers() {
    const now = dayjs.tz();

    const openMarketStart = now
      .set("hour", 9)
      .set("minute", 30)
      .set("second", 30);
    const openMarketEnd = now.set("hour", 16).set("minute", 0).set("second", 0);
    const preMarketStart = now.set("hour", 4).set("minute", 1).set("second", 0);
    const preMarketEnd = now.set("hour", 9).set("minute", 30).set("second", 0);

    let body, marketType;

    if (now >= openMarketStart && now <= openMarketEnd) {
      body = OPEN_MARKET_CONFIG;
      marketType = MARKET_TYPES.OPEN_MARKET;
    }

    if (now >= preMarketStart && now <= preMarketEnd) {
      body = PRE_MARKET_CONFIG;
      marketType = MARKET_TYPES.PRE_MARKET;
    }

    console.log(`Market type: ${marketType}`);

    console.log(`Current time in EST: ${now.format()}`);

    if ([6, 0].includes(now.day())) {
      console.log("Today is Saturday, or Sunday.");
      body = null;
    }

    if (!body) return await setTimeout(this.config.afterMarketTimeout);

    const TV_DATA = await getTVSession();

    const cookie = this.formatSessionToCookie(TV_DATA);

    const res = await fetch(
      "https://scanner.tradingview.com/america/scan?label-product=screener-stock",
      this.getHeaders({
        referrer: "",
        mode: "cors",
        contentType: "text/plain;charset=UTF-8",
        body,
        method: "POST",
        cookie: `cookiePrivacyPreferenceBannerProduction=notApplicable; cookiesSettings={"analytics":true,"advertising":true};${cookie}`,
      }),
    );

    const data = await this.parseResponse(res);

    if (!res.ok) {
      console.log(res);

      console.log(data);

      await setTimeout(this.config.refreshTime);

      throw new Error(res.statusText);
    }

    const isNewMarket = marketType !== this.#previousMarket;

    if (isNewMarket) {
      if (this.#previousMarket) await this.client.dilutionTracker.login(); // so browser doesnt disconnect for being idle, also prevMarket would be undefined on startup so it doesnt open the browser twice

      this.#previousMarket = marketType;

      // this logic because bot restarted and market type is 13, even if 4.30 (30mins after market) it'll send all tickers dont want that, just when the bot has been running since hours and 4am comes it'll send all tickers so good, hence not adding this.#previousMarket cond since bot can be restarted hours before 4am and it'll be undefined
      if (process.uptime() < 30) {
        console.log(`Been ${process.uptime()} seconds since bot was ran`);

        this.#tickers = this.filterNewTickers(data.data, marketType);
        console.log(this.#tickers);

        return console.log(
          "Seems like bot was restarted,market was open so not sending tickers on startup",
        );
      }

      if (marketType === MARKET_TYPES.PRE_MARKET) {
        this.#tickers = []; // remove tickers of prev day
      }

      // for 4 am market, dont return rather send all tickers
      console.log(
        "New Market tickers! Sending all! (some in case of open market",
      );
      // } else {
      //   console.log("Trading View: adding to cache OR new market");

      //   this.#tickers = this.filterNewTickers(data.data, marketType);
      //   console.log(this.#tickers);
      //   return;
      // }
    }

    console.log(data.totalCount);

    const newTickers = this.filterNewTickers(data.data, marketType);

    console.log(`TV: Fetching for dilution ${newTickers.length}`);

    const scrapeResults = await Promise.allSettled(
      newTickers.map(async (t) => {
        const scrapedData = await this.client.dilutionTracker.scrapeTickerInfo(
          t.d[0],
          {
            fetchNews: true,
            fetchShortInterest: true,
            fetchfloat: true,
            fetchMarketCap: true,
            fetchCompanyProfile: true,
            // takeFullScreenshot: true,
          },
        );

        return { ...t, scrapedData };
      }),
    );

    console.log(`TV: Fetched for dilution ${newTickers.length}`);

    const enrichedTickers = scrapeResults
      .filter((r) => r.status === "fulfilled")
      .map((r) => r.value);

    scrapeResults
      .filter((r) => r.status === "rejected")
      .forEach((r) => console.error(r));

    for (const t of enrichedTickers) {
      const symbol = t.d[0];
      const { scrapedData } = t;

      let spacing, finalSpacing;
      switch (symbol.length) {
        case 4:
          spacing = "\u2800".repeat(4);
          finalSpacing = [`${spacing} `, `\u2006${spacing}`];
          break;
        case 3:
          spacing = "\u2800".repeat(4);
          finalSpacing = [`${spacing}\u2002`, `\u2002${spacing}`];
          break;
        case 2:
          spacing = "\u2800".repeat(5);
          finalSpacing = [`${spacing}\u2006`, `\u2006${spacing}`];
          break;
        case 1:
          spacing = "\u2800".repeat(5);
          finalSpacing = [`${spacing}\u2002`, `\u2008${spacing}`];
          break;
        default:
          spacing = "\u2800".repeat(4);
          finalSpacing = [`${spacing} `, `\u2006${spacing}`];
      }

      const volume = `**Volume**: ${convertVolumeToHR(t.d[marketType + 1])}\n`;
      const country = parsCompanyProfile(scrapedData, false);
      const shortInterest = parseShortInterest(scrapedData.shortInterestData);
      const factors = parseRawFactors(scrapedData, true);
      const cap = parseDilutionCap(scrapedData);
      const float = parseDilutionFloat(scrapedData);
      const inst = parseInstOwnData(scrapedData);
      const news = await parseNews(scrapedData, symbol);

      for (const monitoredChange of t.types) {
        const channelIds = configFile.alertsChannelIds[monitoredChange.type];

        const header = `Stock pumped ${monitoredChange.targetChange}%`;

        if (monitoredChange.type === "long") {
          // check for stuff to validate

          // // float must be smaller than 2 mil
          // if (!scrapedData.float?.latestFloat) continue;

          // if (scrapedData.float.latestFloat > 2) continue;

          // all factors must be double red
          if (factors.isDoubleRed) continue;

          // if (Number.isNaN(factors.numberedMonths)) continue; // in case of undefined the below condition returns false causing to send
          // // cash pos months must be smaller than 6
          if (factors.isPositive) continue;
          // if (factors.numberedMonths <= 30) continue;
        }

        if (monitoredChange.isVw) {
          const stuffToCheck = [shortInterest, factors.string, cap, inst];

          const isRed = stuffToCheck.some((s) => s.includes("🔴🔴"));
          if (isRed) continue;
        }

        const message = `# ${
          finalSpacing[0] + symbol + finalSpacing[1]
        }\n\n${header}\n\n${volume}${country}${cap}${float}${inst}**SI**: ${shortInterest}${
          factors.string
        }${news}`;

        for (const channelId of channelIds)
          await this.client.sendTickerMessage(
            symbol,
            message,
            channelId,
            false,
            monitoredChange.screenshot ? scrapedData.screenshots : [],
          );
      }

      t.scrapedData = null; // well so dont occupy memory much
      this.#tickers.push(t);
    }

    console.log(`Waiting ${this.config.refreshTime} before checking next`);

    await setTimeout(this.config.refreshTime);
  }

  filterNewTickers(justFetchedTickers, marketType) {
    const newFilteredTickers = [];
    const monitoredChanges = [
      { targetChange: 0, type: "long" },
      { targetChange: 15, shouldBeLessThan: 30, type: "normal" },
      { targetChange: 30, type: "normal" },
      { targetChange: 40, type: "new-40" },
      { targetChange: 100, type: "new-100" },
      { targetChange: 200, type: "new-200" },
      { targetChange: 40, type: "vw1", isVw: true },
      { targetChange: 15, type: "vw-15", isVw: true },
      { targetChange: 100, type: "vw2", isVw: true },
    ];

    for (const ticker of justFetchedTickers) {
      console.log(ticker.s);
      console.log(ticker.d[marketType]);

      ticker.types = [];
      ticker.priceChange = ticker.d[marketType]; // used in below loop and also when bot restarts, it caches them, so needed to present

      monitoredChanges.forEach((monitorChange) => {
        const pumpedTicker = this.returnTickerIfPumped(
          ticker,
          marketType,
          monitorChange,
        );

        if (!pumpedTicker) return;

        ticker.types.push(monitorChange);
      });

      if (!ticker.types.length) continue; // no match for 15/30/40/100

      newFilteredTickers.push(ticker);
    }

    return newFilteredTickers;
  }
  async start() {
    if (SHOULD_RUN_TV === "false")
      return console.log("Did not start TV manager");

    if (this.#started) return;

    this.#started = true;

    await this.isLoggedIn();

    this.refreshTickerCache();
    this.keepCheckingCookie();
    while (true) {
      try {
        await this.checkForNewTickers();
      } catch (error) {
        console.log(error);
        await setTimeout(this.config.refreshTime);
      }
    }
  }

  async keepCheckingCookie() {
    cron.schedule("*/10 * * * *", async () => {
      console.log("Checking if cookie is valid!");

      await this.isLoggedIn().catch(console.error);
    });
  }

  async login() {
    console.log(`Logging in TV via API`);

    const res = await fetch(
      `${TV_URL}/accounts/signin/`,
      this.getHeaders({
        method: "POST",
        contentType:
          "multipart/form-data; boundary=----WebKitFormBoundarydW3ebpGipqyIwBKz",
        referrer:
          "pricing/?source=header_go_pro_button&feature=start_free_trial",
        mode: "same-origin",
        body: `------WebKitFormBoundarydW3ebpGipqyIwBKz\r\nContent-Disposition: form-data; name="username"\r\n\r\n${TV_EMAIL}\r\n------WebKitFormBoundarydW3ebpGipqyIwBKz\r\nContent-Disposition: form-data; name="password"\r\n\r\n${TV_PASSWORD}\r\n------WebKitFormBoundarydW3ebpGipqyIwBKz\r\nContent-Disposition: form-data; name="remember"\r\n\r\ntrue\r\n------WebKitFormBoundarydW3ebpGipqyIwBKz--\r\n`,
      }),
    );

    const data = await this.parseResponse(res);

    if (!res.ok || data?.error) {
      console.log(res);
      console.log(data);
      return false;
    }

    console.log(res);
    console.log(data);
    const unparsedCookie = res.headers.get("set-cookie");

    const sessionId = this.parseCookie(unparsedCookie, "sessionid=");
    const sessionid_signin = this.parseCookie(
      unparsedCookie,
      "sessionid_sign=",
    );

    this.#username = data.user?.username;

    console.log(`Login Success (${this.#username})`);

    await setTVSession(sessionId, sessionid_signin);

    return true;
  }

  async isLoggedIn() {
    const TV_DATA = await getTVSession();

    let isLoggedIn;

    if (TV_DATA) {
      const cookie = this.formatSessionToCookie(TV_DATA);

      const res = await fetch(
        `https://pricealerts.tradingview.com/list_alerts?log_username=quadstradinghjf8i&maintenance_unset_reason=initial_operated&user_id=90035776`,
        this.getHeaders({
          cookie: `cookiePrivacyPreferenceBannerProduction=notApplicable; cookiesSettings={"analytics":true,"advertising":true};${cookie}`,
          referrer: ``,
          mode: "cors",
        }),
      );

      const data = await this.parseResponse(res);

      console.log(res);
      console.log(data);

      if (data.s === "ok") isLoggedIn = true;
    }

    if (!isLoggedIn) {
      await this.client.sendTickerMessage(
        null, // no ticker
        `Cookie Expired - Login Attempt #${retries + 1} (Max Retries = 2)`,
        process.env.LOGS_CHANNEL_ID,
      );
      // handle the login code here

      const result = await this.login();

      let text;
      retries++;

      if (result) {
        text = `Successfully logged in On TV`;
        retries = 0; // reset retries for next cycle of login if cookie expires while bot is running
      }

      if (!result) text = `Encountered error while logging in - Check logs!`;

      await this.client.sendTickerMessage(
        null, // no ticker
        text,
        process.env.LOGS_CHANNEL_ID,
      );

      if (retries < 2 && !result) {
        // we just try two times
        await isLoggedIn();
      }
    }
  }

  refreshTickerCache() {
    cron.schedule("0 0 * * *", () => {
      console.log("Refreshing TV Cache");

      this.#tickers = [];
    });
  }

  async parseResponse(res) {
    let data;

    if (res.headers.get("content-type")?.includes("application/json"))
      data = await res.json();

    if (res.headers.get("content-type")?.includes("text"))
      data = await res.text();

    if (!data) data = await res.json();

    return data;
  }

  returnTickerIfPumped(ticker, marketType, monitorChange) {
    const { s, d } = ticker; // s contains name
    const priceChange = d[marketType];
    const { targetChange, shouldBeLessThan } = monitorChange;

    if (monitorChange.marketType && monitorChange.marketType !== marketType)
      return; // for vw2, only pre market

    if (priceChange < targetChange) return; // check if ticker pumped 10,15,30/40/100

    if (shouldBeLessThan && priceChange >= shouldBeLessThan) return; // in case of 15, if change is 35 it wont proceed rather will go to next iteration (30)

    const tickerAlreadyFound = this.#tickers.find(
      (t) => t.s === s && t.priceChange >= targetChange, // earlier, it was t.d[marketType] because we were clearing cache every market change but now it posts once, so old ticker from 12 would have wrong map to 13
    ); // check if a ticker sent already with pump of 10,15,30/40/100

    if (tickerAlreadyFound) return;

    // no ticker sent, means it pumped a certain percent first time

    return ticker;
  }

  parseCookie(string, name) {
    return string.split(name)[1].split(";")[0];
  }

  getHeaders({ contentType, body, method, referrer, mode, cookie }) {
    return {
      headers: {
        accept: "*/*",
        "accept-language": "en-US,en;q=0.9",
        "cache-control": "no-cache",
        "content-type": contentType,
        cookie,
        origin: TV_URL,
        pragma: "no-cache",
        priority: "u=1, i",
        Referer: `${TV_URL}/${referrer}`,
        "sec-ch-ua":
          '"Google Chrome";v="131", "Chromium";v="131", "Not_A Brand";v="24"',
        "sec-ch-ua-mobile": "?0",
        "sec-ch-ua-platform": '"Windows"',
        "sec-fetch-dest": "empty",
        "sec-fetch-mode": mode,
        "sec-fetch-site": "same-site",
        "user-agent": USER_AGENT,
      },
      body,
      method,
    };
  }

  formatSessionToCookie(sessionData) {
    return ` sessionid=${sessionData.session_id}; sessionid_sign=${sessionData.session_id_sign_in}`;
  }
}

module.exports = TradingView;
