// scripts/extract_m3u8.js
const { chromium } = require('playwright');

(async () => {
  const url = process.argv[2];
  if (!url) {
    console.error("Usage: node extract_m3u8.js <url>");
    process.exit(1);
  }

  const browser = await chromium.launch({ headless: true });
  const page = await browser.newPage();

  let m3u8Url = null;

  page.on('request', req => {
    const u = req.url();
    if (u.includes('.m3u8')) {
      m3u8Url = u;
    }
  });

  await page.goto(url, { waitUntil: 'networkidle' });
  await page.waitForTimeout(5000);
  await browser.close();

  if (!m3u8Url) {
    console.error("NO_M3U8_FOUND");
    process.exit(1);
  }

  console.log(m3u8Url);
})();
