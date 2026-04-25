// scripts/nas_upload.js
const { chromium } = require('playwright');
const fs = require('fs');
const path = require('path');

const COOKIE_PATH = path.join(__dirname, 'cookie.json');
// TODO: 修改为实际 NAS 地址
const NAS_URL = 'http://nas.local/upload';

(async () => {
  const filePath = process.argv[2];
  if (!filePath) {
    console.error("Usage: node nas_upload.js <file_path>");
    process.exit(1);
  }

  if (!fs.existsSync(COOKIE_PATH)) {
    console.error("NOT_LOGGED_IN");
    process.exit(1);
  }

  const cookieData = JSON.parse(fs.readFileSync(COOKIE_PATH, 'utf8'));

  const browser = await chromium.launch({ headless: true });
  const context = await browser.newContext();

  // TODO: 根据 NAS 实际 cookie 结构修改
  await context.addCookies([{
    name: 'session',
    value: cookieData.cookie,
    domain: new URL(NAS_URL).hostname,
    path: '/'
  }]);

  const page = await context.newPage();
  await page.goto(NAS_URL);

  const input = await page.$('input[type=file]');
  await input.setInputFiles(filePath);

  // TODO: 根据实际上传页面修改 selector
  await page.click('button.upload');
  await page.waitForTimeout(5000);

  await browser.close();
  console.log("/video/" + path.basename(filePath));
})();
