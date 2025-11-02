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

  console.log(fullPageHeight);

  const VIEWPORT_WIDTH = 1920;
  const MAX_SCREENSHOT_HEIGHT = 2025;

  await page.setViewport({
    width: VIEWPORT_WIDTH,
    height: fullPageHeight,
  });

  let screenshots = [];

  const totalScreens = Math.ceil(fullPageHeight / MAX_SCREENSHOT_HEIGHT);

  for (let i = 0; i < totalScreens; i++) {
    const y = i * MAX_SCREENSHOT_HEIGHT;
    const clipHeight = Math.min(MAX_SCREENSHOT_HEIGHT, fullPageHeight - y);

    const screenshot = await page.screenshot({
      path: `screenshot_part_${i + 1}.png`,

      clip: {
        x: 0,
        y,
        width: 1920,
        height: clipHeight,
      },
    });

    screenshots.push(screenshot);
  }
}

s();
