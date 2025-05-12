const { setTimeout } = require("timers/promises");

const cron = require("node-cron");

const dayjs = require("dayjs");
const utc = require("dayjs/plugin/utc");
const timezone = require("dayjs/plugin/timezone");
const {
  parseRawFactors,
  parseCashPosText,
  parseShortInterest,
  parseInstOwnData,
} = require("../utils/parse");
const { getTVSession, setTVSession } = require("../database/queries");

dayjs.extend(utc);
dayjs.extend(timezone);
dayjs.tz.setDefault("Canada/Eastern");
let retries = 0;

const {
  OPEN_MARKET_CONFIG,
  SHOULD_RUN_TV,
  PRE_MARKET_CONFIG,
  TRADING_VIEW_CHANNEL_ID,
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
      .set("second", 0);
    const openMarketEnd = now.set("hour", 16).set("minute", 0).set("second", 0);
    const preMarketStart = now.set("hour", 4).set("minute", 0).set("second", 0);
    const preMarketEnd = now.set("hour", 9).set("minute", 30).set("second", 0);

    let body, marketType;

    if (now >= openMarketStart && now <= openMarketEnd) {
      body = OPEN_MARKET_CONFIG;
      marketType = 12;
    }

    if (now >= preMarketStart && now <= preMarketEnd) {
      body = PRE_MARKET_CONFIG;
      marketType = 13;
    }

    console.log(`Market type: ${marketType}`);

    console.log(`Current time in EST: ${now.format()}`);

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
        cookie: `cookiePrivacyPreferenceBannerProduction=notApplicable; cookiesSettings={"analytics":true,"advertising":true};${
          cookie
        }`,
      })
    );

    const data = await this.parseResponse(res);

    if (!res.ok) {
      console.log(res);

      console.log(data);

      await setTimeout(this.config.refreshTime);

      throw new Error(res.statusText);
    }

    if (!this.#tickers.length || marketType !== this.#previousMarket) {
      console.log("Trading View: first time adding to cache OR new market");

      this.#tickers = this.filterNewTickers(data.data, marketType);
      console.log(this.#tickers);

      this.#previousMarket = marketType;
      return;
    }

    // console.log(this.#tickers);
    // console.log(arrayOfTickerNames);
    console.log(data.totalCount);

    const newTickers = this.filterNewTickers(data.data, marketType);

    // console.log(newTickers);

    const promises = newTickers.map(async (t) => {
      let spacing, finalSpacing;

      switch (t.d[0].length) {
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

      const data = await this.client.dilutionTracker.scrapeTickerInfo(t.d[0], {
        fetchNews: false,
        fetchShortInterest: true,
        fetchfloat: true,
      });

      const shortInterest = parseShortInterest(data.shortInterestData);

      const factors = parseRawFactors(data);

      let cashData = parseCashPosText(data.cashPosText);

      await this.client.sendTickerMessage(
        t.d[0],
        `# ${finalSpacing[0] + t.d[0] + finalSpacing[1]}\n\n${
          t.header
        }\n\n**SI**: ${shortInterest}${parseInstOwnData(data)}**Float**: ${data.float ? data.float.latestFloat + "M" : "N/A"}\n${factors}**Cash Position**: ${cashData}`,
        TRADING_VIEW_CHANNEL_ID
      );
      this.#tickers.push(t);
    });

    console.log(newTickers.length);
    await Promise.all(promises);

    this.#previousMarket = marketType;
    await setTimeout(this.config.refreshTime);
  }

  filterNewTickers(justFetchedTickers, marketType) {
    const newFilteredTickers = [];
    for (const ticker of justFetchedTickers) {
      const { s, d } = ticker;

      console.log(d[0]);
      const priceChange = d[marketType];

      console.log(priceChange);
      let header, priceCompareValue;

      if (priceChange >= 15 && priceChange < 30) {
        header = "Stock pumped 15%";
        priceCompareValue = 15;
      }
      if (priceChange >= 30) {
        header = "Stock pumped 30%";
        priceCompareValue = 30;
      }

      if (!header) continue;

      const tickerAlreadyFound = this.#tickers.find(
        (t) => t.s === s && t.d[marketType] >= priceCompareValue
      );

      if (tickerAlreadyFound) continue;

      ticker.header = header;
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
      })
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
      "sessionid_sign="
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
          cookie: `cookiePrivacyPreferenceBannerProduction=notApplicable; cookiesSettings={"analytics":true,"advertising":true};${
            cookie
          }`,
          referrer: ``,
          mode: "cors",
        })
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
        process.env.LOGS_CHANNEL_ID
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
        process.env.LOGS_CHANNEL_ID
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
