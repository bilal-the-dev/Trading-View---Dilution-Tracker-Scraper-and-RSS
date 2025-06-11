// const keys = [
//   // "TaxEffectOfUnusualItems",
//   // "TaxRateForCalcs",
//   // "NormalizedEBITDA",
//   // "NormalizedDilutedEPS",
//   // "NormalizedBasicEPS",
//   // "TotalUnusualItems",
//   // "TotalUnusualItemsExcludingGoodwill",
//   // "NetIncomeFromContinuingOperationNetMinorityInterest",
//   // "ReconciledDepreciation",
//   // "ReconciledCostOfRevenue",
//   // "EBITDA",
//   // "EBIT",
//   // "NetInterestIncome",
//   // "InterestExpense",
//   // "InterestIncome",
//   // "ContinuingAndDiscontinuedDilutedEPS",
//   // "ContinuingAndDiscontinuedBasicEPS",
//   // "NormalizedIncome",
//   // "NetIncomeFromContinuingAndDiscontinuedOperation",
//   // "TotalExpenses",
//   // "RentExpenseSupplemental",
//   // "ReportedNormalizedDilutedEPS",
//   // "ReportedNormalizedBasicEPS",
//   // "TotalOperatingIncomeAsReported",
//   // "DividendPerShare",
//   // "DilutedAverageShares",
//   // "BasicAverageShares",
//   // "DilutedEPS",
//   // "DilutedEPSOtherGainsLosses",
//   // "TaxLossCarryforwardDilutedEPS",
//   // "DilutedAccountingChange",
//   // "DilutedExtraordinary",
//   // "DilutedDiscontinuousOperations",
//   // "DilutedContinuousOperations",
//   // "BasicEPS",
//   // "BasicEPSOtherGainsLosses",
//   // "TaxLossCarryforwardBasicEPS",
//   // "BasicAccountingChange",
//   // "BasicExtraordinary",
//   // "BasicDiscontinuousOperations",
//   // "BasicContinuousOperations",
//   // "DilutedNIAvailtoComStockholders",
//   // "AverageDilutionEarnings",
//   // "NetIncomeCommonStockholders",
//   // "OtherunderPreferredStockDividend",
//   // "PreferredStockDividends",
//   "NetIncome",
//   // "MinorityInterests",
//   // "NetIncomeIncludingNoncontrollingInterests",
//   // "NetIncomeFromTaxLossCarryforward",
//   // "NetIncomeExtraordinary",
//   // "NetIncomeDiscontinuousOperations",
//   // "NetIncomeContinuousOperations",
//   // "EarningsFromEquityInterestNetOfTax",
//   // "TaxProvision",
//   // "PretaxIncome",
//   // "OtherIncomeExpense",
//   // "OtherNonOperatingIncomeExpenses",
//   // "SpecialIncomeCharges",
//   // "GainOnSaleOfPPE",
//   // "GainOnSaleOfBusiness",
//   // "OtherSpecialCharges",
//   // "WriteOff",
//   // "ImpairmentOfCapitalAssets",
//   // "RestructuringAndMergernAcquisition",
//   // "SecuritiesAmortization",
//   // "EarningsFromEquityInterest",
//   // "GainOnSaleOfSecurity",
//   // "NetNonOperatingInterestIncomeExpense",
//   // "TotalOtherFinanceCost",
//   // "InterestExpenseNonOperating",
//   // "InterestIncomeNonOperating",
//   // "OperatingIncome",
//   // "OperatingExpense",
//   // "OtherOperatingExpenses",
//   // "OtherTaxes",
//   // "ProvisionForDoubtfulAccounts",
//   // "DepreciationAmortizationDepletionIncomeStatement",
//   // "DepletionIncomeStatement",
//   // "DepreciationAndAmortizationInIncomeStatement",
//   // "Amortization",
//   // "AmortizationOfIntangiblesIncomeStatement",
//   // "DepreciationIncomeStatement",
//   // "ResearchAndDevelopment",
//   // "SellingGeneralAndAdministration",
//   // "SellingAndMarketingExpense",
//   // "GeneralAndAdministrativeExpense",
//   // "OtherGandA",
//   // "InsuranceAndClaims",
//   // "RentAndLandingFees",
//   // "SalariesAndWages",
//   // "GrossProfit",
//   // "CostOfRevenue",
//   // "TotalRevenue",
//   // "ExciseTaxes",
//   // "OperatingRevenue",
//   // "LossAdjustmentExpense",
//   // "NetPolicyholderBenefitsAndClaims",
//   // "PolicyholderBenefitsGross",
//   // "PolicyholderBenefitsCeded",
//   // "OccupancyAndEquipment",
//   // "ProfessionalExpenseAndContractServicesExpense",
//   // "OtherNonInterestExpense",
// ];
// const yahooFinance = require("yahoo-finance2").default; // NOTE the .default

// async function abc() {
//   const symbol = "224";
//   const queryOptions = {
//     modules: [
//       "price",
//       "summaryDetail",
//       "financialData",
//       "quoteType",
//       "defaultKeyStatistics",
//       "assetProfile",
//       "incomeStatementHistoryQuarterly",
//     ],
//   }; // defaults
//   const result = await yahooFinance.quoteSummary(symbol, queryOptions);
//   console.log(result.incomeStatementHistoryQuarterly.incomeStatementHistory);
// }

// const processData = (jsonData, timescale, keys) => {
//   // Extract the relevant data
//   const dataRaw = jsonData.timeseries.result;

//   // Remove the "meta" field from each entry
//   dataRaw.forEach((entry) => delete entry.meta);

//   // Initialize sets for timestamps and unpacked data storage
//   const timestamps = new Set();
//   const dataUnpacked = {};

//   // Process the raw data
//   dataRaw.forEach((entry) => {
//     Object.keys(entry).forEach((key) => {
//       if (key === "timestamp") {
//         entry[key].forEach((ts) => timestamps.add(ts));
//       } else {
//         if (!dataUnpacked[key]) {
//           dataUnpacked[key] = [];
//         }
//         dataUnpacked[key] = entry[key];
//       }
//     });
//   });

//   // Convert timestamps to sorted array and map to dates
//   const sortedTimestamps = Array.from(timestamps).sort((a, b) => a - b);
//   const dates = sortedTimestamps.map((ts) => new Date(ts * 1000));

//   console.log(sortedTimestamps);
//   console.log(dates);

//   // Create a table-like structure
//   const table = {};
//   Object.keys(dataUnpacked).forEach((key) => {
//     table[key] = dates.map((date) => {
//       const matchingEntry = dataUnpacked[key].find(
//         (entry) => new Date(entry.asOfDate).getTime() === date.getTime()
//       );
//       return matchingEntry ? matchingEntry.reportedValue.raw : null;
//     });
//   });

//   console.log(table);

//   // Replace the timescale prefix in the index
//   const processedTable = Object.keys(table).reduce((acc, key) => {
//     const newKey = key.replace(new RegExp(`^${timescale}`), "");
//     acc[newKey] = table[key];
//     return acc;
//   }, {});

//   console.log(processedTable);

//   // Reorder table to match the order on Yahoo's website
//   const reorderedTable = {};
//   keys.forEach((key) => {
//     if (processedTable[key]) {
//       reorderedTable[key] = processedTable[key];
//     }
//   });

//   // Return the final table with columns sorted in descending order
//   const sortedColumns = dates.slice().reverse();
//   return { table: reorderedTable, columns: sortedColumns };
// };

// const getQuarterlyNetIncome = (financials) => {
//   if (financials.table["NetIncome"]) {
//     // Get the 'Net Income' row
//     const netIncome = financials.table["NetIncome"];

//     // Get the last 8 values and their corresponding dates
//     const quarterlyNetIncome = netIncome.slice(-8);
//     const quarterlyNetIncomeDates = financials.columns.slice(-8);

//     // Create a dictionary of date-income pairs, filtering out null values
//     const quarterlyNetIncomeDict = {};
//     quarterlyNetIncomeDates.forEach((date, index) => {
//       const income = quarterlyNetIncome[index];
//       if (income !== null) {
//         quarterlyNetIncomeDict[date] = income;
//       }
//     });

//     console.log(quarterlyNetIncomeDict);

//     // Sort the dictionary by dates in descending order and pick the top 4
//     const sortedQuarterlyNetIncome = Object.entries(quarterlyNetIncomeDict)
//       .sort(([dateA], [dateB]) => new Date(dateB) - new Date(dateA)) // Sort by date descending
//       .slice(0, 4) // Get the top 4
//       .reduce((acc, [date, income]) => {
//         acc[date] = income;
//         return acc;
//       }, {});

//     return sortedQuarterlyNetIncome;
//   } else {
//     return null; // 'Net Income' not found
//   }
// };

// async function s() {
//   const symbol = "PIK";

//   const timescale = ""; // Add the appropriate timescale prefix here if needed
//   let url = `https://query2.finance.yahoo.com/ws/fundamentals-timeseries/v1/finance/timeseries/${symbol}?symbol=${symbol}`;

//   const startDt = new Date(Date.UTC(2016, 11, 31)); // Months are 0-indexed in JavaScript (December = 11)
//   const end = new Date(); // Current UTC timestamp

//   // Round `end` to the next day
//   end.setUTCHours(24, 0, 0, 0);

//   const period1 = Math.floor(startDt.getTime() / 1000); // Convert to seconds
//   const period2 = Math.floor(end.getTime() / 1000); // Convert to seconds

//   //   const period1 = 493590046; // Hardcoded start timestamp
//   //   const period2 = 1734278399; // Hardcoded end timestamp

//   url += `&type=${keys.map((key) => "quarterly" + timescale + key).join(",")}`;
//   url += `&period1=${period1}&period2=${period2}`;

//   const res = await fetch(url);
//   const d = await res.json();
//   console.log(d.timeseries.result[0]["quarterlyNetIncome"]);
//   const df = processData(d, "quarterly", keys);

//   console.log("YAHAHAHHAH");

//   console.log(df.table["NetIncome"]);

//   console.log(getQuarterlyNetIncome(df));

//   //   console.log(url);
// }
// s();
// // abc();

async function checkSqlite() {
  const sqlite3 = require("sqlite3");
  const { open } = require("sqlite");

  const db = await open({
    filename: "./database.db",
    driver: sqlite3.Database,
  });

  const r = await db.get("SELECT * FROM TV_DATA;");

  console.log(r);
}

async function checkTVCookie() {
  const body = process.env.PRE_MARKET_CONFIG;
  const res = await fetch(
    "https://scanner.tradingview.com/america/scan?label-product=screener-stock",
    {
      contentType: "text/plain;charset=UTF-8",
      mode: "cors",
      body,
      method: "POST",
      cookie: `cookiePrivacyPreferenceBannerProduction=notApplicable; cookiesSettings={"analytics":true,"advertising":true}; sessionid=5gsqai06i9oglv5uc7z39kb26hbnn0qf; sessionid_sign=v3:UQieaTADoYId7rLxa3SdaFsqUH5r/40ILXQpSl9q91w=`,
    }
  );

  console.log(res);

  const d = await res.json();

  console.log(d);

  d.data.map(console.log);
}

checkTVCookie();
// checkSqlite();
