const header = "###";
const subHeader = "**";

exports.parseTickerData = (data) => {
  const { ticker, dilutionData, yahooData } = data;

  const parsedYahooData = parseYahooData(yahooData);

  let historicalText = `${subHeader} Historical O/S & Potential Dilution ${subHeader}\n${
    dilutionData?.historicalText?.split("calculated using")[0] ?? "N/A"
  }`;

  !dilutionData?.historicalText &&
    !dilutionData?.cashPosText &&
    (historicalText = "It doesn't matter for this stock");

  const parsedNews =
    dilutionData?.news?.news?.length > 0
      ? dilutionData.news.news
          .slice(0, 4)
          .reduce(
            (acc, cur) =>
              `${acc}[${cur.title}](https://dilution.news/${cur.id})\n-# ${cur.source?.name} ${cur.publishedAtDateTimeString}\n\n`,
            ""
          )
      : "N/A";

  const shortInterest = this.parseShortInterest(
    dilutionData?.shortInterestData
  );
  const text = `# ${ticker}\n${getYahooString(
    parsedYahooData
  )}\n\n${header} DILUTION\n${historicalText}\n\n${this.parseCash(
    dilutionData
  )}${subHeader} Short Interest ${subHeader}: ${shortInterest}${this.parseInstOwnData(
    dilutionData
  )}**Float**: ${dilutionData.float ? dilutionData.float?.latestFloat + "M" : "N/A"}\n\n${this.parseRawFactors(dilutionData)}\n${getQuarterlyString(
    parsedYahooData
  )}\n${header} NEWS\n${parsedNews}\n${ticker}`;

  return text;
};

function getYahooString(yahooData) {
  const str = `-# This Information is being pulled from Yahoo Finance; it might be inaccurate!\n${header} GENERAL\nCountry: ${
    yahooData.country ?? "N/A"
  } ${yahooData.country === "China" ? "🟡" : ""}\nExchange: ${
    yahooData.exchange ?? "N/A"
  }\nMarket Cap: ${
    yahooData.marketCap ?? "N/A"
  }\n\n${header} STATISTIC \nProfit Margin: ${
    yahooData.profitMargins ?? "N/A"
  }\nOperating Margin: ${
    yahooData.operatingMargins ?? "N/A"
  }\nReturn on Assets: ${
    yahooData.returnOnAssets ?? "N/A"
  }\nReturn on Equity: ${yahooData.returnOnEquity ?? "N/A"}\nTotal Cash: ${
    yahooData.totalCash ?? "N/A"
  }\nOperating Cash Flow: ${
    yahooData.operatingCashflow ?? "N/A"
  }\nLeveraged Free Cash Flow: ${
    yahooData.freeCashflow ?? "N/A"
  }\n52-Week Change: ${
    yahooData["52WeekChange"] ?? "N/A"
  }\n\nInstitutional Ownership: ${yahooData.instituion ?? "N/A"}\nInsider Ownership: ${
    yahooData.insiders ?? "N/A"
  }\nFloat Shares: ${
    yahooData.floatShares ?? "N/A"
  }\nTrailing EPS: ${yahooData.trailingEps ?? "N/A"}`;

  return str;
}

function getQuarterlyString(yahooData) {
  const str = `${header} QUARTERLY INCOME\n${yahooData.quaterlyIncome}`;
  return str;
}

function parseYahooData(yahooData) {
  const {
    assetProfile,
    price,
    quarterlyIncome,
    defaultKeyStatistics,
    financialData,
  } = yahooData;

  const financialKeys = {
    profitMargins: "numberPercent",
    operatingMargins: "numberPercent",
    returnOnEquity: "numberPercent",
    returnOnAssets: "numberPercent",
    totalCash: "number",
    operatingCashflow: "number",
    freeCashflow: "number",
  };

  const financialDataPrettified = loopOverKeysAndAddDefault(
    financialData,
    financialKeys
  );

  const defualtStatKeys = {
    "52WeekChange": "numberPercent",
  };

  const defaultStatsFormatted = loopOverKeysAndAddDefault(
    defaultKeyStatistics,
    defualtStatKeys
  );

  const exchange = getExchangeName(price?.exchange);

  const insiders = defaultKeyStatistics?.heldPercentInsiders
    ? `${roundOffAndConverToPercent(
        defaultKeyStatistics.heldPercentInsiders
      )} ${
        defaultKeyStatistics.heldPercentInsiders > 0.95
          ? "🔴 'Must be below 95%'"
          : " 🟢"
      }`
    : "N/A";

  const instituion = defaultKeyStatistics?.heldPercentInstitutions
    ? `${roundOffAndConverToPercent(
        defaultKeyStatistics.heldPercentInstitutions
      )} ${
        defaultKeyStatistics.heldPercentInstitutions > 0.5
          ? "🔴 'Must be below 50%'"
          : " 🟢"
      }`
    : "N/A";

  const floatShares = defaultKeyStatistics?.floatShares
    ? `${addCommasToNumber(defaultKeyStatistics.floatShares, true)} ${
        defaultKeyStatistics.floatShares < 1_000_000 ? " (NANO FLOAT) 🟡" : ""
      }`
    : "N/A";

  const trailingEps = defaultKeyStatistics?.trailingEps
    ? `${addCommasToNumber(defaultKeyStatistics.trailingEps)} ${
        defaultKeyStatistics.floatShare > 0
          ? " 🔴 'Must have negative EPS'"
          : " 🟢"
      }`
    : "N/A";

  const quaterlyIncome =
    quarterlyIncome
      .reverse()
      .reduce(
        (acc, cur) =>
          `${acc}Date: ${cur.asOfDate}: ${cur.reportedValue.fmt}${
            cur.reportedValue.raw > 0 ? " 🔴 'Must be negative income'" : " 🟢"
          }\n`,
        ""
      ) || "N/A";

  return {
    ...financialDataPrettified,
    ...defaultStatsFormatted,
    exchange,
    insiders,
    instituion,
    quaterlyIncome,
    floatShares,
    trailingEps,
    marketCap: addDefaultIfNotExist(price?.marketCap, "number"),
    symbol: price?.symbol,
    country: addDefaultIfNotExist(assetProfile?.country),
    ...(assetProfile?.fullTimeEmployees && {
      employees: addCommasToNumber(assetProfile.fullTimeEmployees, true),
    }),
  };
}

function roundOffAndConverToPercent(number) {
  return (Number(number) * 100).toFixed(2) + "%";
}

function addCommasToNumber(value, shouldNotAddSign) {
  if (!value && value != "0") return "N/A";

  const result = Number(value).toLocaleString();
  return shouldNotAddSign ? result : "$" + result;
}

function addDefaultIfNotExist(value, type) {
  if (!value && value != "0") return "N/A";

  if (!type) return value;

  if (type === "numberPercent") return roundOffAndConverToPercent(value);

  if (type === "number") return addCommasToNumber(value);
}

function loopOverKeysAndAddDefault(object, keys) {
  if (!object) return {};
  const keysToActOn = Object.keys(keys);

  return Object.keys(object).reduce((acc, cur) => {
    if (!keysToActOn.includes(cur)) return acc;

    acc[cur] = `${addDefaultIfNotExist(object[cur], keys[cur])}`;
    // console.log(acc);
    return acc;
  }, {});
}

function getExchangeName(exchange) {
  const d = {
    NASDAQ: "NASDAQ",
    NYSEMKT: "New York Stock Exchange",
  };

  return d[exchange] || exchange;
}

exports.parseCash = (dilutionData) => {
  const cashPos = dilutionData?.cashPosText
    ? `${subHeader} Cash Position ${subHeader}\n${this.parseCashPosText(dilutionData.cashPosText)}\n\n`
    : "";
  return cashPos;
};

exports.parseRawFactors = (dilutionData) => {
  const emojiMap = { Low: "🟢", High: "🔴", Medium: "🟠", "N/A": "N/A" }; // N/A for default

  const factors = dilutionData?.rawFactorsContentArray
    ? dilutionData.rawFactorsContentArray.reduce(
        (acc, cur) => `${acc}${cur.title}: ${emojiMap[cur.text]}\n`,
        ""
      )
    : "N/A";
  // const factors = dilutionData?.rawFactorsContentArray
  //   ? dilutionData.rawFactorsContentArray.reduce(
  //       (acc, cur) => `${acc}${cur.title}: ${cur.text}\n`,
  //       ""
  //     )
  //   : "N/A";
  return `${subHeader} Dilution  ${subHeader}\n${factors}`;
};

exports.parseInstOwnData = (dilutionData) => {
  let str = "N/A\n";

  if (dilutionData?.instOwnData)
    str = `${dilutionData.instOwnData?.totalInstOwnPct || "N/A"}%\n`;

  return `${subHeader} Inst Own  ${subHeader}: ${str}`;
};

exports.parseCashPosText = (cashPosText) => {
  const i = cashPosText?.indexOf("of");
  let cashData = "N/A";

  if (cashPosText?.includes("cash left"))
    cashData = cashPosText?.slice(16, i).trim() || "N/A";

  if (cashPosText?.includes("cashflow positive"))
    cashData = "Positive " + (cashPosText?.slice(i + 2).trim() || "N/A");

  return cashData;
};

exports.parseShortInterest = (shortInterestData) => {
  if (!shortInterestData) return "N/A\n";
  const {
    shortInterestAsPercentOfFloat,
    // releasedDaysAgo,
    // releaseDate,
    // settlementDate,
  } = shortInterestData;

  let emoji;

  const numberedInterest = Number(shortInterestAsPercentOfFloat);

  if (numberedInterest < 10) emoji = "🟢";
  if (numberedInterest > 20) emoji = "🔴";
  if (numberedInterest >= 10 && numberedInterest <= 20) emoji = "🟡";
  const shortInterest = `${shortInterestAsPercentOfFloat}% ${emoji}\n`;
  // const shortInterest = `${shortInterestAsPercentOfFloat}% ${emoji} as of ${settlementDate} settlement date and published on ${releaseDate}\n-# Last Updated: ${releasedDaysAgo} days ago\n`;

  return shortInterest;
};
