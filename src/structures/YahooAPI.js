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
        "incomeStatementHistoryQuarterly",
      ],
    };
    return yahooFinance.quoteSummary(this.ticker, queryOptions);
  }
}

module.exports = YahooAPI;
