const header = "###";
const subHeader = "**";

exports.parseTickerData = (data) => {
  const {
    ticker,
    dilutionData,
    // yahooData
  } = data;

  // const parsedYahooData = parseYahooData(yahooData);

  let historicalText = `${subHeader} Historical O/S & Potential Dilution ${subHeader}\n${
    dilutionData?.historicalText?.split("calculated using")[0] ?? "N/A"
  }`;

  !dilutionData?.historicalText &&
    !dilutionData?.cashPosText &&
    (historicalText = "It doesn't matter for this stock");

  const parsedNews =
    dilutionData?.news?.news?.length > 0
      ? dilutionData.news.news
          .slice(0, 2)
          .reduce(
            (acc, cur) =>
              `${acc}[${cur.title}](https://dilution.news/${cur.id})\n-# ${cur.source?.name} ${cur.publishedAtDateTimeString}\n\n`,
            ""
          )
      : "N/A";

  const shortInterest = this.parseShortInterest(
    dilutionData?.shortInterestData
  );
  const text = `# ${ticker}-# This Information might not be accurate, do your own diligence!\n\n${parsCompanyProfile(
    dilutionData
  )}${this.parseDilutionCap(dilutionData)}${this.parseInstOwnData(
    dilutionData
  )}${this.parseDilutionFloat(
    dilutionData
  )}${subHeader} Short Interest ${subHeader}: ${shortInterest}\n${header} DILUTION\n${historicalText}\n${this.parseRawFactors(
    dilutionData
  )}\n${header} NEWS\n${parsedNews}\n${ticker}`;

  return text;
};

function parsCompanyProfile(dilutionData) {
  const str = `**Country**: ${
    dilutionData.companyProfile.country || "N/A"
  }\n**Exchange**: ${dilutionData.companyProfile.exchange || "N/A"}\n`;

  return str;
}

exports.parseCash = (dilutionData) => {
  const cashPos = dilutionData?.cashPosText
    ? `${subHeader} Cash Position ${subHeader}: ${this.parseCashPosText(
        dilutionData.cashPosText
      )}\n`
    : "N/A\n";
  return cashPos;
};

exports.parseRawFactors = (dilutionData) => {
  const emojiMap = { Low: "🔴", High: "🟢", Medium: "🟠", "N/A": "N/A" }; // N/A for default

  let factors = dilutionData?.rawFactorsContentArray
    ? dilutionData.rawFactorsContentArray.reduce(
        (acc, cur) => `${acc}> ${cur.title}: ${emojiMap[cur.text]}\n`,
        ""
      )
    : "N/A\n";

  factors += `> Cash Position: ${this.parseCashPosText(
    dilutionData.cashPosText
  )}\n`;
  // const factors = dilutionData?.rawFactorsContentArray
  //   ? dilutionData.rawFactorsContentArray.reduce(
  //       (acc, cur) => `${acc}${cur.title}: ${cur.text}\n`,
  //       ""
  //     )
  //   : "N/A";
  return `> ${subHeader} Dilution  ${subHeader}\n${factors}`;
};

exports.parseInstOwnData = (dilutionData) => {
  let str = "N/A\n";

  if (dilutionData?.instOwnData) {
    const { totalInstOwnPct } = dilutionData.instOwnData;
    let emoji;

    if (totalInstOwnPct < 50) emoji = "🟢";
    if (totalInstOwnPct >= 50) emoji = "🔴";

    str = `${totalInstOwnPct || "N/A"}% ${emoji}\n`;
  }

  return `${subHeader} Inst Own  ${subHeader}: ${str}`;
};

exports.parseCashPosText = (cashPosText) => {
  let emoji;

  const i = cashPosText?.indexOf("of");
  let cashData = "N/A";

  if (cashPosText?.includes("cash left")) {
    cashData = cashPosText?.slice(16, i).trim() || "N/A";

    const numberedMonths = Number(cashData.split(" ")[0]);

    if (numberedMonths < 30) emoji = "🟢";
    if (numberedMonths >= 30) emoji = "🔴";
  }

  if (cashPosText?.includes("cashflow positive")) {
    cashData = "Positive " + (cashPosText?.slice(i + 2).trim() || "N/A");

    emoji = "🔴🔴";
  }

  return `${cashData} ${emoji}`;
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

exports.parseDilutionFloat = (dilutionData) => {
  let str = "N/A";

  if (dilutionData.float) {
    let emoji;

    const floatAmount = dilutionData.float.latestFloat;

    if (floatAmount < 1) emoji = "🔴";
    if (floatAmount <= 1.5) emoji = "🟡";
    if (floatAmount > 1.5) emoji = "🟢";

    str = `${floatAmount + "M" + ` ${emoji}`}`;
  }
  return `**Float**: ${str}\n`;
};

exports.parseDilutionCap = (dilutionData) => {
  let str = "N/A";

  if (dilutionData.marketCap) {
    let emoji;

    const { marketCap } = dilutionData.marketCap;

    const loweredCap = marketCap.toLowerCase();

    let splitter;
    if (loweredCap.includes("m")) splitter = "m";
    if (loweredCap.includes("b")) emoji = "🔴";

    if (splitter) {
      const numberedCap = Number(loweredCap.split(splitter)[0]);

      if (numberedCap < 10) emoji = "🟢";
      if (numberedCap < 100 && numberedCap >= 10) emoji = "🟡";
      if (numberedCap > 100) emoji = "🔴";
    }

    str = `${marketCap} ${emoji || ""}`;
  }
  return `**Market Cap**: ${str}\n`;
};

// function getYahooString(yahooData) {
//   const str = `-# This Information is being pulled from Yahoo Finance; it might be inaccurate!\n${header} GENERAL\nCountry: ${
//     yahooData.country ?? "N/A"
//   } ${yahooData.country === "China" ? "🟡" : ""}\nExchange: ${
//     yahooData.exchange ?? "N/A"
//   }\nMarket Cap: ${
//     yahooData.marketCap ?? "N/A"
//   }\n\n${header} STATISTIC \nProfit Margin: ${
//     yahooData.profitMargins ?? "N/A"
//   }\nOperating Margin: ${
//     yahooData.operatingMargins ?? "N/A"
//   }\nReturn on Assets: ${
//     yahooData.returnOnAssets ?? "N/A"
//   }\nReturn on Equity: ${yahooData.returnOnEquity ?? "N/A"}\nTotal Cash: ${
//     yahooData.totalCash ?? "N/A"
//   }\nOperating Cash Flow: ${
//     yahooData.operatingCashflow ?? "N/A"
//   }\nLeveraged Free Cash Flow: ${
//     yahooData.freeCashflow ?? "N/A"
//   }\n52-Week Change: ${
//     yahooData["52WeekChange"] ?? "N/A"
//   }\n\nInstitutional Ownership: ${
//     yahooData.instituion ?? "N/A"
//   }\nInsider Ownership: ${yahooData.insiders ?? "N/A"}\nFloat Shares: ${
//     yahooData.floatShares ?? "N/A"
//   }\nTrailing EPS: ${yahooData.trailingEps ?? "N/A"}`;

//   return str;
// }

// function getQuarterlyString(yahooData) {
//   const str = `${header} QUARTERLY INCOME\n${yahooData.quaterlyIncome}`;
//   return str;
// }

// function parseYahooData(yahooData) {
//   const {
//     assetProfile,
//     price,
//     quarterlyIncome,
//     defaultKeyStatistics,
//     financialData,
//   } = yahooData;

//   const financialKeys = {
//     profitMargins: "numberPercent",
//     operatingMargins: "numberPercent",
//     returnOnEquity: "numberPercent",
//     returnOnAssets: "numberPercent",
//     totalCash: "number",
//     operatingCashflow: "number",
//     freeCashflow: "number",
//   };

//   const financialDataPrettified = loopOverKeysAndAddDefault(
//     financialData,
//     financialKeys
//   );

//   const defualtStatKeys = {
//     "52WeekChange": "numberPercent",
//   };

//   const defaultStatsFormatted = loopOverKeysAndAddDefault(
//     defaultKeyStatistics,
//     defualtStatKeys
//   );

//   const exchange = getExchangeName(price?.exchange);

//   const insiders = defaultKeyStatistics?.heldPercentInsiders
//     ? `${roundOffAndConverToPercent(
//         defaultKeyStatistics.heldPercentInsiders
//       )} ${
//         defaultKeyStatistics.heldPercentInsiders > 0.95
//           ? "🔴 'Must be below 95%'"
//           : " 🟢"
//       }`
//     : "N/A";

//   const instituion = defaultKeyStatistics?.heldPercentInstitutions
//     ? `${roundOffAndConverToPercent(
//         defaultKeyStatistics.heldPercentInstitutions
//       )} ${
//         defaultKeyStatistics.heldPercentInstitutions > 0.5
//           ? "🔴 'Must be below 50%'"
//           : " 🟢"
//       }`
//     : "N/A";

//   const floatShares = defaultKeyStatistics?.floatShares
//     ? `${addCommasToNumber(defaultKeyStatistics.floatShares, true)} ${
//         defaultKeyStatistics.floatShares < 1_000_000 ? " (NANO FLOAT) 🟡" : ""
//       }`
//     : "N/A";

//   const trailingEps = defaultKeyStatistics?.trailingEps
//     ? `${addCommasToNumber(defaultKeyStatistics.trailingEps)} ${
//         defaultKeyStatistics.floatShare > 0
//           ? " 🔴 'Must have negative EPS'"
//           : " 🟢"
//       }`
//     : "N/A";

//   const quaterlyIncome =
//     quarterlyIncome
//       .reverse()
//       .reduce(
//         (acc, cur) =>
//           `${acc}Date: ${cur.asOfDate}: ${cur.reportedValue.fmt}${
//             cur.reportedValue.raw > 0 ? " 🔴 'Must be negative income'" : " 🟢"
//           }\n`,
//         ""
//       ) || "N/A";

//   return {
//     ...financialDataPrettified,
//     ...defaultStatsFormatted,
//     exchange,
//     insiders,
//     instituion,
//     quaterlyIncome,
//     floatShares,
//     trailingEps,
//     marketCap: addDefaultIfNotExist(price?.marketCap, "number"),
//     symbol: price?.symbol,
//     country: addDefaultIfNotExist(assetProfile?.country),
//     ...(assetProfile?.fullTimeEmployees && {
//       employees: addCommasToNumber(assetProfile.fullTimeEmployees, true),
//     }),
//   };
// }

// function roundOffAndConverToPercent(number) {
//   return (Number(number) * 100).toFixed(2) + "%";
// }

// function addCommasToNumber(value, shouldNotAddSign) {
//   if (!value && value != "0") return "N/A";

//   const result = Number(value).toLocaleString();
//   return shouldNotAddSign ? result : "$" + result;
// }

// function addDefaultIfNotExist(value, type) {
//   if (!value && value != "0") return "N/A";

//   if (!type) return value;

//   if (type === "numberPercent") return roundOffAndConverToPercent(value);

//   if (type === "number") return addCommasToNumber(value);
// }

// function loopOverKeysAndAddDefault(object, keys) {
//   if (!object) return {};
//   const keysToActOn = Object.keys(keys);

//   return Object.keys(object).reduce((acc, cur) => {
//     if (!keysToActOn.includes(cur)) return acc;

//     acc[cur] = `${addDefaultIfNotExist(object[cur], keys[cur])}`;
//     // console.log(acc);
//     return acc;
//   }, {});
// }

// function getExchangeName(exchange) {
//   const d = {
//     NASDAQ: "NASDAQ",
//     NYSEMKT: "New York Stock Exchange",
//   };

//   return d[exchange] || exchange;
// }
