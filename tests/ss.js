const puppeteer = require("puppeteer-extra");
const StealthPlugin = require("puppeteer-extra-plugin-stealth");
puppeteer.use(StealthPlugin());
// const puppeteer = require("puppeteer");

async function s() {
  const browser = await puppeteer.launch({
    // headless: false,
  });
  const page = await browser.newPage();
  await page.goto("https://dilutiontracker.com/app/search/SBFM", {
    waitUntil: "networkidle0",
  });

  const h = await page.evaluate(() => {
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

  console.log(h);

  await page.setViewport({
    width: 1920,
    height: h,
  });

  await page.screenshot({
    path: "fullpage_clip.png",
    fullPage: true,
  });
}

s();
