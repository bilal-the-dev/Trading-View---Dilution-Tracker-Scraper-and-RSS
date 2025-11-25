// const puppeteer = require("puppeteer");
const cron = require("node-cron");

const puppeteer = require("puppeteer-extra");
const fs = require("fs/promises");
const StealthPlugin = require("puppeteer-extra-plugin-stealth");
const { AttachmentBuilder } = require("discord.js");
puppeteer.use(StealthPlugin());

const JS_FILE = "bundle.862140c685aefbd7e2d9.js";
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
  { title: "Risk", selector: "drOverallRatingIcon", removeInScanner: true },
  {
    title: "Offering",
    selector: "drOfferingAbilityRatingIcon",
    doubleRedCircle: true,
  },
  { title: "Overhead", selector: "drDilAmtRatingIcon", doubleRedCircle: true },
  { title: "Historical", selector: "drHistRatingIcon", removeInScanner: true },
  // { title: "Cash", selector: "drCashNeedRatingIcon" },
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

    if (this.browser?.isConnected()) await this.browser.close();

    console.log("Opening the browser for logging in to dilution tracker");

    const startTime = new Date();

    const browser = await puppeteer.launch(this.options);

    browser.on("disconnected", () => {
      const disconnectTime = new Date();
      console.log(
        `🔴 Browser disconnected at: ${disconnectTime.toISOString()}`
      );
      console.log(
        `🕒 Uptime: ${(disconnectTime.getTime() - startTime.getTime()) / 1000}s`
      );
    });

    console.log("Launched browser");

    this.browser = browser;
    const page = await browser.newPage();

    await this.setDefaultHeaders(page);
    await this.setOtherDefaults(page);

    // page.on("request", (request) => {
    //   console.log("➡️ Request:", {
    //     url: request.url(),
    //     method: request.method(),
    //     headers: request.headers(),
    //     postData: request.postData(),
    //   });
    // });

    // page.on("response", async (response) => {
    //   const request = response.request();
    //   const url = response.url();
    //   const contentType = response.headers()["content-type"] || "";

    //   let responseBody = null;

    //   try {
    //     if (contentType.includes("application/json")) {
    //       const text = await response.text();
    //       responseBody = JSON.parse(text);

    //       console.log("⬅️ JSON Response:", {
    //         url,
    //         status: response.status(),
    //         method: request.method(),
    //         json: responseBody,
    //       });
    //     } else {
    //       // Optional: log non-JSON response summary
    //       const text = await response.text();
    //       console.log("⬅️ Non-JSON Response:", {
    //         url,
    //         status: response.status(),
    //         method: request.method(),
    //         snippet: text.substring(0, 300),
    //       });
    //     }
    //   } catch (error) {
    //     console.log({
    //       url,
    //       error: error,
    //     });
    //   }
    // });

    await page.goto(DILUTION_TRACKER_URL + "/login", {
      waitUntil: "networkidle2",
    });

    console.log("Entering email and password");

    await page.screenshot({
      path: `./screenshots/beforeTyping.png`,
      fullPage: true,
    });
    await page.type("input#email", DILUTION_TRACKER_EMAIL);
    await page.type("input#password", DILUTION_TRACKER_PASS);

    await page.screenshot({
      path: `./screenshots/afterTyping.png`,
      fullPage: true,
    });
    const button = await page.$("button");

    await button.click();

    console.log("Clicked Sign-in");

    await page.screenshot({
      path: `./screenshots/signInClick.png`,
      fullPage: true,
    });
    await page.waitForSelector("svg#dash_settings_icon");

    console.log("Logged In!!!");

    await page.close();
    this.isLoggedIn = true;
  }

  async scrapeTickerInfo(
    ticker,
    {
      fetchNews,
      fetchShortInterest,
      fetchfloat,
      fetchOsShares,
      fetchMarketCap,
      fetchCompanyProfile,
      takeFullScreenshot,
    } = {
      fetchNews: true,
      fetchShortInterest: true,
      fetchfloat: true,
      fetchMarketCap: true,
      fetchCompanyProfile: true,
    }
  ) {
    if (!this.isLoggedIn)
      throw new Error("Have not logged in into dilution yet");

    const page = await this.browser.newPage();

    let shortInterestData,
      instOwnData,
      float,
      osShares,
      marketCap,
      companyProfile;
    let news = [];

    await this.setDefaultHeaders(page);
    await this.setOtherDefaults(page);

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

      if (
        response.url().endsWith(`getShortInterest?ticker=${ticker}`) &&
        fetchShortInterest
      )
        shortInterestData = await response.json().catch(console.error);

      if (response.url().endsWith(`/getInstOwn?ticker=${ticker}`))
        instOwnData = await response.json().catch(console.error);

      if (response.url().endsWith(`/getFloat?ticker=${ticker}`) && fetchfloat)
        float = await response.json().catch(console.error);

      if (
        response.url().endsWith(`/getMarketCap?ticker=${ticker}`) &&
        fetchMarketCap
      )
        marketCap = await response.json().catch(console.error);

      if (
        response.url().endsWith(`/getSharesOS?ticker=${ticker}`) &&
        fetchOsShares
      )
        osShares = await response.json().catch(console.error);

      if (
        response.url().endsWith(`/getCompanyProfile?ticker=${ticker}`) &&
        fetchCompanyProfile
      )
        companyProfile = await response.json().catch(console.error);
    });

    await page.goto(`${DILUTION_TRACKER_URL}/app/search/${ticker}`, {
      waitUntil: "networkidle0",
    });

    let screenshots = [];

    if (takeFullScreenshot) screenshots = await this.takeScreenShots(page);

    if (debug === "true") {
      await page.screenshot({ path: `ticker.png` });
    }

    const data = await page.evaluate((rawFactors) => {
      /*eslint-disable */
      const rawFactorsContentArray = rawFactors.map((e) => {
        const text =
          document.querySelector(`svg#${e.selector} + span`)?.innerText ||
          "N/A";

        return {
          title: e.title,
          text,
          doubleRedCircle: e.doubleRedCircle,
          removeInScanner: e.removeInScanner,
        };
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

    if (data?.newsButton && fetchNews) {
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

    return {
      ...data,
      shortInterestData,
      instOwnData,
      float,
      osShares,
      marketCap,
      companyProfile,
      news,
      screenshots,
    };
  }

  async start() {
    this.fetchFilesRepeatedly();

    cron.schedule("*/30 * * * *", async () => {
      this.fetchFilesRepeatedly().catch(console.error);
    });

    this.login();
  }

  async takeScreenShots(page) {
    const fullPageHeight = await page.evaluate(() => {
      let pageHeight = 0;

      function findHighestNode(nodesList) {
        for (let i = nodesList.length - 1; i >= 0; i--) {
          if (nodesList[i].scrollHeight && nodesList[i].clientHeight) {
            var elHeight = Math.max(
              nodesList[i].scrollHeight,
              nodesList[i].clientHeight
            );
            pageHeight = Math.max(elHeight, pageHeight);
          }
          if (nodesList[i].childNodes.length)
            findHighestNode(nodesList[i].childNodes);
        }
      }

      findHighestNode(document.documentElement.childNodes);

      return pageHeight;
    });

    const VIEWPORT_WIDTH = 1920;
    const MAX_SCREENSHOT_HEIGHT = 2025;

    await page.setViewport({
      width: VIEWPORT_WIDTH,
      height: fullPageHeight,
    });

    const totalScreens = Math.ceil(fullPageHeight / MAX_SCREENSHOT_HEIGHT);

    const screenshots = [];

    for (let i = 0; i < totalScreens; i++) {
      const y = i * MAX_SCREENSHOT_HEIGHT;
      const clipHeight = Math.min(MAX_SCREENSHOT_HEIGHT, fullPageHeight - y);

      const screenshot = await page.screenshot({
        clip: {
          x: 0,
          y,
          width: 1920,
          height: clipHeight,
        },
      });

      const file = new AttachmentBuilder()
        .setFile(Buffer.from(screenshot))
        .setName(`screenshot_${i + 1}.png`)
        .setSpoiler(true);

      screenshots.push(file);
    }

    return screenshots;
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

  async setOtherDefaults(page) {
    await page.setViewport({
      width: 1920,
      height: 1080,
    });

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
