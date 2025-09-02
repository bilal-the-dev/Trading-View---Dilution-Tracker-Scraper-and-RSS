const cheerio = require("cheerio");

const { FIVINZ_BASE_URL } = process.env;

class FivinzNews {
  static async fetchTickerNews(ticker) {
    const url = `${FIVINZ_BASE_URL}/quote.ashx?t=${ticker}`;
    const response = await fetch(url);

    const data = await response.text();

    if (!response.ok) {
      console.error(response);
      console.error(data);
      return "Some error occured";
    }

    const $ = cheerio.load(data);

    const firstRow = $("#news-table tr").first();

    if (!firstRow.length) return;

    const timestamp = firstRow.find("td").first().text().trim();

    // Title & URL
    const link = firstRow.find("a.tab-link-news");
    const title = link.text().trim();
    const href = link.attr("href");
    const fullUrl = href?.startsWith("/") ? `${FIVINZ_BASE_URL}${href}` : href;

    const rightTextHtml = firstRow.find("div.news-link-right").text()?.trim();

    let emoji = "";

    const wordsToLookFor = ["placement", "fda", "nasa", "nvidia"];

    if (wordsToLookFor.some((word) => title.toLowerCase().includes(word)))
      emoji = "🟡 ";

    let timeEmoji = "";

    if (isToday(timestamp)) timeEmoji = "🔵 ";

    return `${emoji}[${title}](${fullUrl})\n-# ${timeEmoji}${timestamp} ${rightTextHtml}`;
  }
}

const monthMap = {
  Jan: 0,
  Feb: 1,
  Mar: 2,
  Apr: 3,
  May: 4,
  Jun: 5,
  Jul: 6,
  Aug: 7,
  Sep: 8,
  Oct: 9,
  Nov: 10,
  Dec: 11,
};

function isToday(dateStr) {
  // Get first part before space (could be "Jul-17-25" or just "04:01PM")
  const firstPart = dateStr.split(" ")[0];
  const parts = firstPart.split("-");

  if (firstPart.toLowerCase() === "today") return true;
  if (parts.length !== 3) {
    // Not in expected format -> definitely not today
    return false;
  }

  const [monthStr, dayStr, yearSuffix] = parts;

  const year = 2000 + parseInt(yearSuffix, 10);
  const month = monthMap[monthStr];
  const dayNum = parseInt(dayStr, 10);

  if (isNaN(year) || month === undefined || isNaN(dayNum)) {
    return false;
  }

  const today = new Date();

  return (
    today.getUTCFullYear() === year &&
    today.getUTCMonth() === month &&
    today.getUTCDate() === dayNum
  );
}

module.exports = FivinzNews;
