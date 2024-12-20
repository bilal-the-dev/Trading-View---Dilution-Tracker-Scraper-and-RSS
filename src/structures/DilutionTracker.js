const puppeteer = require("puppeteer");
const cron = require("node-cron");

// const puppeteer = require("puppeteer-extra");
const fs = require("fs/promises");
// const StealthPlugin = require("puppeteer-extra-plugin-stealth");
// puppeteer.use(StealthPlugin());

const JS_FILE = "bundle.b5bf677a06e2a4077dde.js";
const CSS_FILE = "css.main.99943a6280f5c20dc93c.css";

const {
  DILUTION_TRACKER_EMAIL,
  DILUTION_TRACKER_PASS,
  DILUTION_TRACKER_URL,
  USER_AGENT,
  SHOULD_OPEN_PUPPETEER,
  DULTUION_TRACKER_API_URL,
  debug,
} = process.env;

const rawFactors = [
  { title: "Overall Risk", selector: "drOverallRatingIcon" },
  { title: "Offering Ability", selector: "drOfferingAbilityRatingIcon" },
  { title: "Overhead Supply", selector: "drDilAmtRatingIcon" },
  { title: "Historical", selector: "drHistRatingIcon" },
  { title: "Cash Need", selector: "drCashNeedRatingIcon" },
];

class DilutionTracker {
  constructor(options) {
    this.options = options;
  }

  async login() {
    if (SHOULD_OPEN_PUPPETEER === "false")
      return console.log(
        "Did not open browser for dilution due to config in .env"
      );

    console.log("Opening the browser for logging in to dilution tracker");

    const browser = await puppeteer.launch(this.options);
    this.browser = browser;
    const page = await browser.newPage();

    await this.setDefaultHeaders(page);
    await this.setUserAgent(page);
    await page.goto(DILUTION_TRACKER_URL + "/login", {
      waitUntil: "networkidle2",
    });

    console.log("Entering email and password");

    await page.type("input#email", DILUTION_TRACKER_EMAIL);
    await page.type("input#password", DILUTION_TRACKER_PASS);

    const button = await page.$("button");
    await button.click();

    console.log("Clicked Sign-in");

    await page.waitForSelector("svg#dash_settings_icon");

    console.log("Logged In!!!");

    await page.close();
    this.isLoggedIn = true;
  }

  async scrapeTickerInfo(ticker) {
    if (!this.isLoggedIn)
      throw new Error("Have not logged in into dilution yet");

    const page = await this.browser.newPage();

    let shortInterestData;
    let news = [];

    await this.setDefaultHeaders(page);
    await this.setUserAgent(page);

    await page.setCacheEnabled(false);
    await page.setRequestInterception(true);

    page.on("request", async (interceptedRequest) => {
      try {
        let fileExt, isFileRequest, contentType;

        if (interceptedRequest.url().endsWith(JS_FILE)) {
          isFileRequest = true;
          contentType = "text/javascript";
          fileExt = "js";
        }
        if (interceptedRequest.url().endsWith(CSS_FILE)) {
          isFileRequest = true;
          contentType = "text/css";
          fileExt = "css";
        }

        if (isFileRequest) {
          const body = await fs.readFile(`./dilution.${fileExt}`, {
            encoding: "utf-8",
          });

          await interceptedRequest.respond({ body, contentType });
        }

        if (!isFileRequest) await interceptedRequest.continue();
      } catch (error) {
        console.log(error);
      }
    });

    page.on("response", async (response) => {
      if (response.status() !== 200) return;

      // console.log(response.url());

      if (response.url().endsWith(`getShortInterest?ticker=${ticker}`))
        shortInterestData = await response.json().catch(console.error);
    });

    await page.goto(`${DILUTION_TRACKER_URL}/app/search/${ticker}`, {
      waitUntil: "networkidle0",
    });

    if (debug === "true") {
      await page.screenshot({ path: `ticker.png` });
    }

    const data = await page.evaluate((rawFactors) => {
      /*eslint-disable */
      const rawFactorsContentArray = rawFactors.map((e) => {
        const text =
          document.querySelector(`svg#${e.selector} + span`)?.innerText ||
          "N/A";

        return { title: e.title, text };
      });

      const historicalText = document.querySelector(
        "#results-os-chart > p + p"
      )?.innerText;
      const cashPosText = document.querySelector(
        "#results-os-chart + p + p"
      )?.innerText;

      const newsButton = document.querySelector("#result-tab-news");

      newsButton?.click();

      const data = {
        rawFactorsContentArray,
        cashPosText,
        historicalText,
        ...(newsButton && { newsButton: true }),
      };
      // console.log(data);

      return data;
    }, rawFactors);
    // console.log("dilution");

    console.log(data);

    if (data?.newsButton) {
      const newsRes = await page.waitForResponse(
        (response) =>
          response.url() ===
            `${DULTUION_TRACKER_API_URL}/getOhlcvTimeSeriesWithNews?ticker=${ticker}` &&
          response.status() === 200
      );

      news = await newsRes.json().catch(console.error);
    }

    // console.log(news);

    if (debug === "true") {
      await page.screenshot({ path: `ticker-news.png` });
    }

    await page.close();

    return { ...data, shortInterestData, news };
  }

  async start() {
    this.fetchFilesRepeatedly();

    cron.schedule("*/30 * * * *", async () => {
      this.fetchFilesRepeatedly().catch(console.error);
    });

    this.login();
  }

  async fetchFilesRepeatedly() {
    const jsRes = await fetch(
      `${DILUTION_TRACKER_URL}/${JS_FILE}`,
      this.getHeaders("javascript")
    );

    const cssRes = await fetch(
      `${DILUTION_TRACKER_URL}/${CSS_FILE}`,
      this.getHeaders("css")
    );

    if (!jsRes.ok || !cssRes.ok) {
      console.log(jsRes);
      console.log(cssRes);

      throw new Error("Something went wrong while fetching css/js files");
    }

    const jsText = await jsRes.text();
    const cssText = await cssRes.text();

    await fs.writeFile("./dilution.js", jsText);
    await fs.writeFile("./dilution.css", cssText);
  }

  async requestAPIForTickers() {
    const res = await fetch(`${DULTUION_TRACKER_API_URL}/getTickerCoverage`);

    if (!res.ok) throw new Error("Something went wrong while fetching tickers");

    return res.json();
  }

  async requestAPIForTickerNews(ticker) {
    const res = await fetch(
      `${DULTUION_TRACKER_API_URL}/getOhlcvTimeSeriesWithNews?ticker=${ticker}`
    );

    if (!res.ok) {
      console.log(res);

      console.log(await res.json());

      throw new Error(
        `Something went wrong while fetching ticker (${ticker}) news`
      );
    }

    return res.json();
  }

  async setUserAgent(page) {
    await page.setUserAgent(USER_AGENT);
  }

  async setDefaultHeaders(page) {
    await page.setExtraHTTPHeaders({
      "sec-ch-ua":
        '"Google Chrome";v="131", "Chromium";v="131", ";Not A Brand";v="99"',
      "sec-ch-ua-mobile": "?0",
      "sec-ch-ua-platform": '"Windows"',
    });
  }
  getHeaders(type) {
    return {
      headers: {
        accept: `text/${type},*/*;q=0.1`,
        "accept-language": "en-US,en;q=0.9",
        "cache-control": "no-cache",
        pragma: "no-cache",
        priority: "u=0",
        "sec-ch-ua":
          '"Google Chrome";v="131", "Chromium";v="131", "Not_A Brand";v="24"',
        "sec-ch-ua-mobile": "?0",
        "sec-ch-ua-platform": '"Windows"',
        "sec-fetch-dest": "style",
        "sec-fetch-mode": "no-cors",
        "sec-fetch-site": "same-origin",
        "user-agent": USER_AGENT,
        origin: DILUTION_TRACKER_URL,
      },
      referrer: `${DILUTION_TRACKER_URL}/app/search/PPBT`,
      referrerPolicy: "strict-origin-when-cross-origin",
    };
  }
}

module.exports = { DilutionTracker };
