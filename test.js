// // import { chromium } from "playwright";

// // (async () => {
// //   // Launch browser with devtools open
// //   const browser = await chromium.launch({ headless: false, devtools: true });

// //   // Create a new browser context and page
// //   const context = await browser.newContext({
// //     extraHTTPHeaders: {
// //       cookie: "s", // Set custom cookie
// //       //   referrer: "sd", // Set custom referrer
// //     },
// //     userAgent:
// //       "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Safari/537.36",
// //   });

// //   const page = await context.newPage();

// //   // Define URLs
// //   let set_url = "https://dilutiontracker.com/app/search/PULM";
// //   let get_url = "https://dilutiontracker.com/app/search/PULM";

// //   // Navigate to the set_url
// //   await page.goto(set_url, { waitUntil: "networkidle" });

// //   // Optionally close the browser (if required)
// //   // await browser.close();
// // })();

// // const { chromium } = require("playwright"); // Assuming Playwright for browser control
// // const { setTimeout } = require("timers/promises");

// // class TradingViewBot {
// //   constructor(config) {
// //     this.config = config;
// //     this.started = false;
// //     this.page = null;
// //     this.trackers = {}; // Placeholder for user-defined callbacks
// //   }

// //   async _loop(timeout) {
// //     console.log("loop");
// //     let beforeUrl = null;
// //     let tableContainer = null;
// //     let oldCache = {};
// //     let firstRun = true;

// //     const maxLoadTimeout = this.config.loading_page_timeout;

// //     if (this.config.landing_page_url) {
// //       try {
// //         await this.page.waitForURL(this.config.landing_page_url, {
// //           timeout: maxLoadTimeout * 1000,
// //         });
// //       } catch (error) {
// //         console.log("Login most likely did not succeed!");
// //       }
// //     }

// //     if (this.config.login_page_selector) {
// //       const intervalTimeout = 500;
// //       for (
// //         let i = 0;
// //         i < Math.floor((maxLoadTimeout * 1000) / intervalTimeout);
// //         i++
// //       ) {
// //         try {
// //           await this.page.waitForSelector(this.config.login_page_selector, {
// //             timeout: intervalTimeout,
// //           });
// //         } catch (error) {
// //           break;
// //         }
// //       }
// //     }

// //     await setTimeout(60000);

// //     while (true) {
// //       const now = new Date();
// //       const timezoneOffset = new Date().getTimezoneOffset() * 60000; // Offset in milliseconds
// //       const estTime = new Date(now.getTime() - timezoneOffset - 5 * 3600000); // US/Eastern offset

// //       const openMarketStart = new Date(estTime.setHours(9, 30, 0, 0));
// //       const openMarketEnd = new Date(estTime.setHours(16, 0, 0, 0));
// //       const preMarketStart = new Date(estTime.setHours(4, 0, 0, 0));
// //       const preMarketEnd = new Date(estTime.setHours(9, 30, 0, 0));

// //       const newUrl =
// //         now >= openMarketStart && now <= openMarketEnd
// //           ? this.config.open_market_url
// //           : now >= preMarketStart && now <= preMarketEnd
// //           ? this.config.pre_market_url
// //           : null || this.config.open_market_url;

// //       let newCache = {};

// //       if (!newUrl) {
// //         await setTimeout(this.config.after_market_timeout);
// //         continue;
// //       }

// //       if (newUrl !== beforeUrl) {
// //         try {
// //           await this.page.goto(newUrl);
// //         } catch (error) {
// //           continue;
// //         }
// //         await setTimeout(this.config.loading_data_timeout);
// //       }

// //       beforeUrl = newUrl;

// //       try {
// //         tableContainer =
// //           tableContainer ||
// //           (await this.page.waitForSelector("#js-screener-container"));
// //         const table = await tableContainer.waitForSelector("table");
// //       } catch (error) {
// //         throw new Error(
// //           "Unable to load scanner! Most likely not logged in! Restart the bot!"
// //         );
// //       }

// //       if (this.config.refresh) {
// //         const refreshButtonContainer = await this.page.waitForSelector(
// //           ".controlPanel-rKthODOo"
// //         );
// //         const refreshButtonContainerItems = await refreshButtonContainer.$$(
// //           "div"
// //         );
// //         const refreshButton = await refreshButtonContainerItems[
// //           refreshButtonContainerItems.length - 1
// //         ].$("button[style*='--ui-lib-light-button-content-max-lines']");
// //         await refreshButton.click();
// //       }

// //       await setTimeout(2000);

// //       let isDataPresent = true;
// //       const rows = await table.$$("tbody > tr");

// //       for (const row of rows) {
// //         const stockSymbol = await row.$("[href^='/symbols/']");
// //         if (!stockSymbol) {
// //           isDataPresent = false;
// //           break;
// //         }

// //         const stockName = await stockSymbol.textContent();
// //         const uri = await stockSymbol.getAttribute("href");
// //         newCache[stockName] = uri;
// //       }

// //       if (!isDataPresent) {
// //         await setTimeout(this.config.loading_data_timeout);
// //         continue;
// //       }

// //       if (firstRun) oldCache = newCache;

// //       const added = Object.keys(newCache).filter(
// //         (stock) => !(stock in oldCache)
// //       );
// //       const removed = Object.keys(oldCache).filter(
// //         (stock) => !(stock in newCache)
// //       );

// //       for (const [stock, wasAdded] of [
// //         ...added.map((stock) => [stock, true]),
// //         ...removed.map((stock) => [stock, false]),
// //       ]) {
// //         for (const callback of Object.values(this.trackers)) {
// //           await callback(
// //             {
// //               stock,
// //               uri: (wasAdded ? newCache : oldCache)[stock],
// //             },
// //             wasAdded
// //           );
// //         }
// //       }

// //       oldCache = newCache;
// //       firstRun = false;
// //       await setTimeout(timeout);
// //     }
// //   }

// //   async start() {
// //     if (this.started) return false;

// //     const browser = await chromium.launch({ headless: false });
// //     this.page = await browser.newPage();

// //     const loopTask = async () => {
// //       while (true) {
// //         try {
// //           await this._loop(this.config.refresh_timeout);
// //         } catch (error) {
// //           console.error(error);
// //         }
// //       }
// //     };

// //     loopTask();

// //     this.started = true;
// //     return this.started;
// //   }
// // }

// // module.exports = TradingViewBot;
// // var moment = require("moment-timezone");
// // console.log(moment().tz("	Canada/Eastern").format());

// //   console.log(dayjs.tz() > dayjs.tz().set("hour", 13).set("minute", 7));
// // }
// // s();

// // fetch("https://dilutiontracker.com/bundle.b5bf677a06e2a4077dde.js", {
// //   headers: {
// //     accept: "*/*",
// //     "accept-language": "en-US,en;q=0.9",
// //     "cache-control": "no-cache",
// //     pragma: "no-cache",
// //     "sec-ch-ua":
// //       '"Google Chrome";v="131", "Chromium";v="131", "Not_A Brand";v="24"',
// //     "sec-ch-ua-mobile": "?0",
// //     "sec-ch-ua-platform": '"Windows"',
// //     "sec-fetch-dest": "script",
// //     "sec-fetch-mode": "no-cors",
// //     "sec-fetch-site": "same-origin",
// //     // cookie:
// //     //   "__stripe_mid=61c8f2a1-19bd-40fc-9be6-237be687d0c8a31b77; intercom-device-id-qkbpyl27=3dc19f45-3456-4122-88d3-a00b6488fcf6; intercom-id-qkbpyl27=56df37cf-cc4c-4447-87a9-6ad9ed26033f; connect.sid=s%3AorZIa0NGw1l_qAtz66A0NRc1uhPw-hfg.DXRSaSEOPxUzozs6L3FlwuDeZxKjsQCW8%2Bxg70W428U; intercom-session-qkbpyl27=SmIybDVUeGx4RU4wbUs3Ni9wVlVJczM1NmZNVW5PbHV2R3E4bXVYS1p6dUMxVnlEb3cwYlBZVXBQa2xTelg2Yi0tNW1xdGpSYVFhSUNFakZ0STBuU0I0UT09--cb10f2833d9d0e19adcb2a503be6d07476f8b274; aws-waf-token=17885e93-8e47-4345-85ab-9f6bb3f42bc5:EQoAq4+BJM8zAQAA:VF7c5QhGA5velyiUUpt0jITFeAfYsdrjzLiblpSW7aJuN+CfjwHKWDpPOIf48ptc1VQFX3WXiNlWFXO8k/GIHbn37V1addkLBV025tRtnB6usr8tMkK3z/KXbMSIKD/TsvGHfcj2P+5AoNka9cNq5fuYU4KYg7DNj9YEla3R0R7pIqtYDSuod3zFzZMDzWFEViViGwb6ioZwZThj6WsIkm4xbUjyTflo7M6NDaH7ZvoKc6qc4aVysdpOimiLQ2FR0RtgzoW1Y4okFg==",
// //     Referer: "https://dilutiontracker.com/app/search/PPBT",
// //     "Referrer-Policy": "strict-origin-when-cross-origin",
// //     "user-agent":
// //       "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Safari/537.36",
// //   },
// //   body: null,
// //   method: "GET",
// // })
// //   .then((r) => r.text())
// //   .then(console.log);
fetch(
  "https://scanner.tradingview.com/america/scan?label-product=screener-stock",
  {
    headers: {
      accept: "application/json",
      "accept-language": "en-US,en;q=0.9",
      "cache-control": "no-cache",
      "content-type": "text/plain;charset=UTF-8",
      pragma: "no-cache",
      priority: "u=1, i",
      "sec-ch-ua":
        '"Google Chrome";v="131", "Chromium";v="131", "Not_A Brand";v="24"',
      "sec-ch-ua-mobile": "?0",
      "sec-ch-ua-platform": '"Windows"',
      "sec-fetch-dest": "empty",
      "sec-fetch-mode": "cors",

      "sec-fetch-site": "same-site",
      // cookie:
      //   'cookiePrivacyPreferenceBannerProduction=notApplicable; cookiesSettings={"analytics":true,"advertising":true}; _ga=GA1.1.1711260882.1731691356; tv_ecuid=e1395b63-4159-4d1e-841d-c0e1cb57538b; device_t=UU5aZEJROjI.3qXibDts1JwompKeS73Hts1XJBddBKK-Zi6xOkeAZcg; _sp_ses.cf1a=*; sessionid_sign=v3:t13U+y+wGV4WXMG73u+V7VmmLLbGnnI2CFh8oEig2cM=; cachec=undefined; etg=undefined; _ga_YVVRYGL0E0=GS1.1.1734609242.8.1.1734610239.60.0.0; _sp_id.cf1a=14b53834-768f-4d66-9bdf-4efe376fcc4d.1731691356.7.1734610714.1734555222.a43e6964-0c0a-4c5e-aece-e63fbb4ea27e.6b139b01-f762-4fe8-96a2-cf47ad5e5542.d736b735-46b6-4f18-a7cb-00d01dfc448d.1734609242299.23',
      //   "sessionid=or0ltxf4woekzw0waujb60ont75q4k0n; sessionid_sign=sessionid=or0ltxf4woekzw0waujb60ont75q4k0n;",
      Referer: "https://www.tradingview.com/",
      "Referrer-Policy": "origin-when-cross-origin",
    },
    body: '{"columns":["name","description","logoid","update_mode","type","typespecs","close","pricescale","minmov","fractional","minmove2","currency","change","volume","relative_volume_10d_calc","market_cap_basic","fundamental_currency_code","price_earnings_ttm","earnings_per_share_diluted_ttm","earnings_per_share_diluted_yoy_growth_ttm","dividends_yield_current","sector.tr","market","sector","recommendation_mark","exchange"],"filter":[{"left":"market_cap_basic","operation":"in_range","right":[1,500000000]},{"left":"premarket_change","operation":"greater","right":15},{"left":"premarket_high","operation":"in_range","right":[0.8,20]},{"left":"premarket_volume","operation":"greater","right":15000},{"left":"exchange","operation":"in_range","right":["AMEX","NASDAQ","NYSE"]}],"ignore_unknown_fields":false,"options":{"lang":"en"},"range":[0,100],"sort":{"sortBy":"market_cap_basic","sortOrder":"desc"},"symbols":{},"markets":["america"],"filter2":{"operator":"and","operands":[{"operation":{"operator":"or","operands":[{"operation":{"operator":"and","operands":[{"expression":{"left":"type","operation":"equal","right":"stock"}},{"expression":{"left":"typespecs","operation":"has","right":["common"]}}]}},{"operation":{"operator":"and","operands":[{"expression":{"left":"type","operation":"equal","right":"stock"}},{"expression":{"left":"typespecs","operation":"has","right":["preferred"]}}]}},{"operation":{"operator":"and","operands":[{"expression":{"left":"type","operation":"equal","right":"dr"}}]}},{"operation":{"operator":"and","operands":[{"expression":{"left":"type","operation":"equal","right":"fund"}},{"expression":{"left":"typespecs","operation":"has_none_of","right":["etf"]}}]}}]}}]}}',
    method: "POST",
  }
)
  .then((r) => r.json())
  .then(console.log);

// async function sA(params) {
//   fetch("https://www.tradingview.com/accounts/signin/", {
//     headers: {
//       accept: "*/*",
//       "accept-language": "en-US,en;q=0.9",
//       "cache-control": "no-cache",
//       "content-type":
//         "multipart/form-data; boundary=----WebKitFormBoundarydW3ebpGipqyIwBKz",
//       pragma: "no-cache",
//       priority: "u=1, i",
//       "sec-ch-ua":
//         '"Microsoft Edge";v="131", "Chromium";v="131", "Not_A Brand";v="24"',
//       "sec-ch-ua-mobile": "?0",
//       "sec-ch-ua-platform": '"Windows"',
//       "sec-fetch-dest": "empty",
//       "sec-fetch-mode": "same-origin",
//       "sec-fetch-site": "same-origin",

//       Referer:
//         "https://www.tradingview.com/pricing/?source=header_go_pro_button&feature=start_free_trial",
//       "Referrer-Policy": "origin-when-cross-origin",
//     },
//     body:,
//     method: "POST",
//   })
//     .then((r) => r.json())
//     .then(console.log);
// }

// sA();
