const cheerio = require("cheerio");

const { FIVINZ_BASE_URL } = process.env;

class FivinzNews {
  static async fetchTickerNews(ticker) {
    const url = `${FIVINZ_BASE_URL}/quote.ashx?t=${ticker}`;
    const response = await fetch(url);

    if (!response.ok) return "Some error occured";

    const data = await response.text();

    const $ = cheerio.load(data);

    const firstRow = $("#news-table tr").first();

    if (!firstRow.length) return;

    const timestamp = firstRow.find("td").first().text().trim();

    // Title & URL
    const link = firstRow.find("a.tab-link-news");
    const title = link.text().trim();
    const href = link.attr("href");
    const fullUrl = href ? `${FIVINZ_BASE_URL}${href}` : FIVINZ_BASE_URL;

    const rightTextHtml = firstRow.find("div.news-link-right").text()?.trim();

    return `[${title}}](${fullUrl})\n-# ${timestamp} ${rightTextHtml}`;
  }
}

module.exports = FivinzNews;
