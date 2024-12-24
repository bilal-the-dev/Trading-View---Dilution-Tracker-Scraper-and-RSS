const { default: yahooFinance } = require("yahoo-finance2");

class YahooAPI {
  constructor(ticker) {
    this.ticker = ticker;
  }

  async getTickerData() {
    const queryOptions = {
      modules: [
        "price",
        "summaryDetail",
        "financialData",
        "defaultKeyStatistics",
        "assetProfile",
      ],
    };
    return yahooFinance.quoteSummary(this.ticker, queryOptions, {
      validateResult: false,
    });
  }

  async getQuarterlyIncome() {
    let url = `https://query2.finance.yahoo.com/ws/fundamentals-timeseries/v1/finance/timeseries/${this.ticker}?type=quarterlyNetIncome`;

    const period1 = 493590046; // 1985
    const end = new Date(); // Current timestamp

    const period2 = Math.floor(end.getTime() / 1000); // Convert to seconds

    url += `&period1=${period1}&period2=${period2}`;

    const res = await fetch(url);
    const data = await res.json();

    const result = data?.timeseries?.result?.[0]?.["quarterlyNetIncome"];

    if (!res.ok || !result)
      throw new Error("Something went wrong while fetching quarterly income");

    return result;
  }
}

module.exports = YahooAPI;
