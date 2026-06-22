import { chromium } from 'playwright';

const SCRATCHPAD = 'C:/Users/IVANDE~1/AppData/Local/Temp/claude/C--Apps-Claude-Projects-uigen/9b475894-876e-40f1-b471-1d957f959363/scratchpad';

const browser = await chromium.launch({ headless: true });
const context = await browser.newContext({ viewport: { width: 1280, height: 900 } });
const page = await context.newPage();
page.setDefaultTimeout(120000);

await page.goto('http://localhost:3000');
await page.waitForLoadState('networkidle');

const textarea = page.locator('textarea').first();
await textarea.fill('Create a team member profile card component showing name, role, bio, and social links.');
await page.keyboard.press('Enter');

console.log('Submitted. Waiting for turn to complete...');
await page.waitForTimeout(3000);

await page.waitForFunction(() => {
  const ta = document.querySelector('textarea');
  return ta && !ta.disabled;
}, { timeout: 90000, polling: 1500 });

console.log('Done. Settling...');
await page.waitForTimeout(4000);

await page.screenshot({ path: `${SCRATCHPAD}/team_app.png`, fullPage: true });

const iframe = page.locator('iframe').first();
if (await iframe.count() > 0) {
  const iframeEl = await iframe.elementHandle();
  const frame = await iframeEl.contentFrame();
  const fullHeight = await frame.evaluate(() => document.documentElement.scrollHeight);
  console.log(`Iframe height: ${fullHeight}px`);

  await page.evaluate((h) => {
    const el = document.querySelector('iframe');
    if (el) el.style.height = h + 'px';
  }, Math.max(fullHeight, 400));
  await page.waitForTimeout(500);

  const box = await iframe.boundingBox();
  if (box) {
    await page.screenshot({ path: `${SCRATCHPAD}/team_preview.png`, clip: box });
    console.log(`Preview saved: team_preview.png (${Math.round(box.width)}x${Math.round(box.height)})`);
  }
}

await browser.close();
console.log('Done');
