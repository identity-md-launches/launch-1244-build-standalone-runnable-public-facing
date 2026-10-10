import { createServer } from 'node:http';
import { readFile, mkdir, writeFile, stat } from 'node:fs/promises';
import path from 'node:path';
import { pathToFileURL } from 'node:url';
import assert from 'node:assert/strict';

// An external dependency directory lets constrained workers leave node_modules untouched.
const dependencies = process.env.AIMARKET_DEPENDENCY_ROOT;
const imported = (name) =>
  dependencies
    ? import(
        pathToFileURL(
          path.join(dependencies, name, name === '@axe-core/playwright' ? 'dist/index.mjs' : 'index.mjs')
        ).href
      )
    : import(name);
const { chromium } = await imported('playwright');
const { default: AxeBuilder } = await imported('@axe-core/playwright');
const root = process.cwd();
const results = [];
const consoleErrors = [];
const resourceErrors = [];
const checks = [];
const contrast = [];
const prefix = '/ipfs/aimarket-experiment/';
const mime = {
  '.html': 'text/html',
  '.js': 'application/javascript',
  '.css': 'text/css',
  '.svg': 'image/svg+xml',
  '.woff2': 'font/woff2',
  '.json': 'application/json',
};
const server = createServer(async (req, res) => {
  try {
    const pathname = decodeURIComponent(new URL(req.url, 'http://localhost').pathname);
    if (!pathname.startsWith(prefix)) {
      res.writeHead(404).end('Not found');
      return;
    }
    const local = path.resolve(root, 'dist', pathname.slice(prefix.length) || 'index.html');
    if (!local.startsWith(path.join(root, 'dist') + path.sep)) {
      res.writeHead(403).end();
      return;
    }
    const body = await readFile(local);
    res
      .writeHead(200, {
        'Content-Type': mime[path.extname(local)] || 'application/octet-stream',
        'Cache-Control': 'no-store',
      })
      .end(body);
  } catch {
    res.writeHead(404).end('Not found');
  }
});
await new Promise((resolve) => server.listen(0, '127.0.0.1', resolve));
const origin = `http://127.0.0.1:${server.address().port}`;
const browser = await chromium.launch({
  headless: true,
  ...(process.env.AIMARKET_CHROMIUM_PATH ? { executablePath: process.env.AIMARKET_CHROMIUM_PATH } : {}),
});
const context = await browser.newContext({
  viewport: { width: 1440, height: 1000 },
  deviceScaleFactor: 1,
  timezoneId: 'America/New_York',
});
const page = await context.newPage();
await page.clock.install({ time: new Date('2026-10-10T14:30:00Z') });
page.on('pageerror', (error) => consoleErrors.push(error.message));
page.on('console', (message) => {
  if (message.type() === 'error') consoleErrors.push(message.text());
});
page.on('response', (response) => {
  if (response.status() >= 400) resourceErrors.push(`${response.status()} ${response.url()}`);
});
const outbound = [];
context.on('request', (request) => {
  if (!request.url().startsWith(origin)) outbound.push(request.url());
});
await mkdir('artifacts', { recursive: true });
await mkdir('test/scratch', { recursive: true });
const check = async (name, fn) => {
  await fn();
  checks.push(name);
  console.log(`PASS ${name}`);
};
async function screenshot(name, fullPage = true) {
  await page.screenshot({ path: `artifacts/${name}.png`, fullPage, animations: 'disabled' });
}
async function audit(label) {
  const report = await new AxeBuilder({ page })
    .withTags(['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa', 'wcag22aa'])
    .analyze();
  results.push({
    label,
    violations: report.violations.map((v) => ({
      id: v.id,
      impact: v.impact,
      description: v.description,
      nodes: v.nodes.map((n) => ({ target: n.target, summary: n.failureSummary })),
    })),
    incomplete: report.incomplete.map((v) => v.id),
  });
  if (report.violations.length) console.log(`AXE ${label}: ${report.violations.length} violations`);
}
async function noOverflow(label) {
  const overflow = await page.evaluate(() => ({
    scroll: document.documentElement.scrollWidth,
    client: document.documentElement.clientWidth,
  }));
  if (overflow.scroll > overflow.client + 1) {
    console.log(
      'OVERFLOW',
      label,
      await page.evaluate(() =>
        [...document.querySelectorAll('body *')]
          .filter((e) => e.getBoundingClientRect().right > innerWidth + 1)
          .map((e) => ({ tag: e.tagName, className: e.className, right: e.getBoundingClientRect().right }))
          .slice(0, 20)
      )
    );
    await page.screenshot({ path: 'test/scratch/overflow.png', fullPage: true });
  }
  assert.ok(overflow.scroll <= overflow.client + 1, `${label} overflows: ${JSON.stringify(overflow)}`);
}
try {
  await page.goto(origin + prefix, { waitUntil: 'networkidle' });
  await page.evaluate(() => document.fonts.ready);
  await check('production export loads at an IPFS-style subpath with local fonts and assets', async () => {
    assert.match(await page.title(), /AIMarket — Pepe Intelligence Terminal/);
    assert.equal(await page.locator('.market-card').count(), 6);
    assert.equal(await page.evaluate(() => document.fonts.check('500 16px "Space Grotesk"')), true);
    assert.equal(
      await page.locator('.observer').evaluate((img) => img.complete && img.naturalWidth > 0),
      true
    );
    assert.deepEqual(outbound, []);
    await noOverflow('desktop');
  });
  await screenshot('desktop');
  await screenshot('desktop-viewport', false);
  await audit('desktop English');
  await check('rendered text, input boundaries and focus colors meet their contrast thresholds', async () => {
    const measured = await page.evaluate(() => {
      const rgb = (color) =>
        color
          .match(/[\d.]+/g)
          .slice(0, 3)
          .map(Number);
      const luminance = (color) =>
        rgb(color)
          .map((v) => {
            const s = v / 255;
            return s <= 0.04045 ? s / 12.92 : ((s + 0.055) / 1.055) ** 2.4;
          })
          .reduce((sum, v, i) => sum + v * [0.2126, 0.7152, 0.0722][i], 0);
      const ratio = (fg, bg) => {
        const a = luminance(fg),
          b = luminance(bg);
        return (Math.max(a, b) + 0.05) / (Math.min(a, b) + 0.05);
      };
      const background = (element) => {
        for (let e = element; e; e = e.parentElement) {
          const c = getComputedStyle(e).backgroundColor;
          if (c !== 'rgba(0, 0, 0, 0)' && c !== 'transparent') return c;
        }
        return getComputedStyle(document.documentElement).backgroundColor;
      };
      const pairs = [
        '.hero-promise',
        '.button.primary',
        '.badge',
        '.filter-row button[aria-pressed=true]',
        '.market-card-footer>span',
        '.scene-caption',
        '.screen-caption',
      ].map((selector) => {
        const e = document.querySelector(selector);
        const fg = getComputedStyle(e).color;
        const bg = background(e);
        return { selector, foreground: fg, background: bg, ratio: ratio(fg, bg), threshold: 4.5 };
      });
      const field = document.querySelector('.search-box');
      pairs.push({
        selector: '.search-box boundary',
        foreground: getComputedStyle(field).borderColor,
        background: background(field),
        ratio: ratio(getComputedStyle(field).borderColor, background(field)),
        threshold: 3,
      });
      const focus = getComputedStyle(document.documentElement).getPropertyValue('--focus').trim();
      // Resolve the semantic token through an actual focused button's computed outline.
      const primary = document.querySelector('.button.primary');
      primary.focus();
      const outline = getComputedStyle(primary).outlineColor;
      pairs.push({
        selector: '.button.primary focus / adjacent page',
        foreground: outline,
        background: background(primary.parentElement),
        ratio: ratio(outline, background(primary.parentElement)),
        threshold: 3,
        token: focus,
      });
      primary.blur();
      return pairs;
    });
    contrast.push(...measured);
    for (const pair of measured)
      assert.ok(
        pair.ratio >= pair.threshold,
        `${pair.selector}: ${pair.ratio.toFixed(2)} < ${pair.threshold}`
      );
    await page.evaluate(() => {
      document.activeElement?.blur();
      window.scrollTo(0, 0);
    });
    await page.goto(origin + prefix, { waitUntil: 'networkidle' });
  });
  await check('keyboard skip link and focus ring are usable', async () => {
    await page.keyboard.press('Tab');
    assert.equal(await page.locator('.skip-link').evaluate((e) => e === document.activeElement), true);
    assert.equal(await page.locator('.skip-link').evaluate((e) => getComputedStyle(e).outlineWidth), '2px');
    await screenshot('keyboard-focus', false);
    await page.keyboard.press('Enter');
    assert.match(page.url(), /#research$/);
  });
  await check('one click opens evidence; Escape closes and returns focus', async () => {
    const trigger = page.getByRole('button', { name: 'BTCUSDT — View evidence', exact: true });
    await trigger.click();
    await page.getByRole('heading', { name: 'What changed?', exact: true }).waitFor();
    assert.equal(
      await page.getByRole('heading', { name: 'Why is this on the board?', exact: true }).count(),
      1
    );
    assert.equal(
      await page.getByRole('heading', { name: 'What would invalidate it?', exact: true }).count(),
      1
    );
    assert.match(await page.locator('dialog').innerText(), /Not supplied by publisher/);
    await audit('research dialog');
    await page.getByRole('button', { name: 'Close research detail', exact: true }).focus();
    await page.keyboard.press('Shift+Tab');
    assert.equal(await page.evaluate(() => !!document.activeElement?.closest('dialog')), true);
    await page.keyboard.press('Tab');
    assert.equal(
      await page
        .getByRole('button', { name: 'Close research detail', exact: true })
        .evaluate((e) => e === document.activeElement),
      true
    );
    await page.keyboard.press('Escape');
    assert.equal(await page.locator('dialog').count(), 0);
    assert.equal(await trigger.evaluate((e) => e === document.activeElement), true);
  });
  await check('both futures scenarios are visible without order execution controls', async () => {
    await page.getByRole('button', { name: 'ETH-USD — View evidence', exact: true }).click();
    await page.getByRole('heading', { name: 'Long scenario', exact: true }).waitFor();
    assert.equal(await page.getByRole('heading', { name: 'Short scenario', exact: true }).count(), 1);
    assert.match(await page.locator('dialog').innerText(), /no long\/short direction/);
    await page.locator('.scenario-section').scrollIntoViewIfNeeded();
    await screenshot('contracts-detail', false);
    await page.keyboard.press('Escape');
  });
  await check('Kraken research exposes completed candles and all three calculation rules', async () => {
    await page.getByRole('button', { name: 'BTC/USD — View evidence', exact: true }).click();
    assert.equal(await page.locator('.rule-list li').count(), 3);
    assert.match(await page.locator('dialog').innerText(), /in-progress provider candle is always excluded/);
    await screenshot('spot-detail', false);
    await page.locator('.candle-data summary').click();
    assert.equal(await page.locator('.candle-data tbody tr').count(), 21);
    await page.locator('.candle-data summary').click();
    await page.getByRole('button', { name: 'Save research', exact: true }).click();
    assert.match(await page.evaluate(() => localStorage.getItem('aimarket:saved:v1')), /kraken-BTC/);
    await page.keyboard.press('Escape');
  });
  await check('saved research survives reload and can be removed', async () => {
    await page.reload({ waitUntil: 'networkidle' });
    await page.getByRole('link', { name: 'Saved research 1', exact: true }).click();
    assert.equal(await page.locator('.observation-card').count(), 1);
    await page.getByRole('button', { name: 'Remove saved research: BTC/USD', exact: true }).click();
    await page.getByRole('heading', { name: 'Your research, within reach.', exact: true }).waitFor();
    await page.getByRole('button', { name: 'Clear filters', exact: true }).click();
  });
  await check('all six filters, search and honest gold empty state work', async () => {
    for (const name of ['Spot', 'Contracts', 'On-chain', 'Taiwan', 'US equities']) {
      await page
        .getByRole('group', { name: 'Filter by market' })
        .getByRole('button', { name, exact: true })
        .click();
      assert.ok((await page.locator('.observation-card').count()) > 0, name);
    }
    await page
      .getByRole('group', { name: 'Filter by market' })
      .getByRole('button', { name: 'Gold', exact: true })
      .click();
    assert.equal(await page.locator('.observation-value').count(), 0);
    await page.getByRole('button', { name: 'Read the gold framework', exact: true }).click();
    assert.match(await page.locator('dialog').innerText(), /no verified gold price/);
    await page.keyboard.press('Escape');
    await page.getByRole('button', { name: 'All markets', exact: true }).click();
    await page.getByRole('searchbox', { name: 'Search instruments' }).fill('2330');
    assert.equal(await page.locator('.observation-card').count(), 1);
    await page.getByRole('searchbox').fill('no-such-instrument');
    await page.getByRole('heading', { name: 'No matching research', exact: true }).waitFor();
    await page.getByRole('button', { name: 'Clear filters', exact: true }).click();
  });
  await check('Traditional Chinese translates navigation, filters, statuses and evidence', async () => {
    await page.getByRole('button', { name: 'Switch to Traditional Chinese (Taiwan)', exact: true }).click();
    assert.equal(await page.locator('html').getAttribute('lang'), 'zh-TW');
    await page.getByRole('heading', { name: '研究看板.', exact: true }).waitFor();
    await page.getByRole('button', { name: 'BTCUSDT — 檢視證據', exact: true }).click();
    assert.equal(await page.getByRole('heading', { name: '有什麼變化？', exact: true }).count(), 1);
    await page.keyboard.press('Escape');
    await page.evaluate(() => window.scrollTo(0, 0));
    await screenshot('desktop-zh');
    await noOverflow('Chinese desktop');
    await audit('desktop Traditional Chinese');
  });
  await check('responsive layouts reflow at 768, 390 and 320 CSS pixels in both languages', async () => {
    for (const width of [768, 390, 320]) {
      await page.setViewportSize({ width, height: 844 });
      await noOverflow(`Chinese ${width}`);
      if (width === 390) await screenshot('mobile-zh');
    }
    await page.getByRole('button', { name: '切換為英文', exact: true }).click();
    for (const width of [768, 390, 320]) {
      await page.setViewportSize({ width, height: 844 });
      await noOverflow(`English ${width}`);
      if (width === 390) {
        await page.evaluate(() => window.scrollTo(0, 0));
        await screenshot('mobile');
        await screenshot('mobile-viewport', false);
        await audit('mobile English');
      }
      if (width === 320) {
        await screenshot('mobile-320');
      }
    }
  });
  await check('200% text enlargement preserves reflow', async () => {
    await page.setViewportSize({ width: 1280, height: 900 });
    await page.evaluate(() => (document.documentElement.style.fontSize = '32px'));
    await noOverflow('200% text enlargement');
    await page.evaluate(() => (document.documentElement.style.fontSize = ''));
  });
  await check('system reduced motion and the explicit preference suppress transitions', async () => {
    await page.emulateMedia({ reducedMotion: 'reduce' });
    assert.equal(
      await page.locator('.button.primary').evaluate((e) => getComputedStyle(e).transitionDuration),
      '0s'
    );
    await page.emulateMedia({ reducedMotion: 'no-preference' });
    await page.getByRole('checkbox', { name: /Reduce motion/ }).check();
    assert.equal(
      await page.locator('.button.primary').evaluate((e) => getComputedStyle(e).transitionDuration),
      '0s'
    );
    await page.getByRole('checkbox', { name: /Reduce motion/ }).uncheck();
  });
  await check('stale clock changes suppress a current candle reading', async () => {
    await page.clock.setSystemTime(new Date('2026-10-10T15:59:30Z'));
    await page.reload({ waitUntil: 'networkidle' });
    await page.clock.runFor(60_100);
    await page.getByRole('button', { name: 'BTC/USD — View evidence', exact: true }).click();
    assert.match(await page.locator('dialog').innerText(), /Stale data — current conclusions are blocked/);
    await page.keyboard.press('Escape');
  });
  await check('public candle refresh uses two requests and caches subsequent actions', async () => {
    const calls = [];
    await context.route('https://api.kraken.com/**', async (route) => {
      const url = route.request().url();
      calls.push(url);
      const fixture = url.includes('XBTUSD') ? 'btc' : 'eth';
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: await readFile(`src/data/${fixture}.demo.json`, 'utf8'),
      });
    });
    await page.getByRole('button', { name: 'Load public BTC / ETH candles', exact: true }).click();
    await page
      .getByText('Public candles loaded. Dates and calculations updated on the wall.', { exact: true })
      .waitFor();
    assert.equal(calls.length, 2);
    await page.getByRole('button', { name: 'Load public BTC / ETH candles', exact: true }).click();
    assert.equal(calls.length, 2);
    assert.match(await page.locator('.wall-rail').innerText(), /Stale data/);
    await context.unroute('https://api.kraken.com/**');
  });
  const failureContext = await browser.newContext({ viewport: { width: 390, height: 844 } });
  const failedPage = await failureContext.newPage();
  await failedPage.clock.install({ time: new Date('2026-10-10T14:30:00Z') });
  let failures = 0;
  await failureContext.route('https://api.kraken.com/**', (route) => {
    failures++;
    return route.abort();
  });
  await check('provider failure retains demo data and throttles repeated attempts', async () => {
    await failedPage.goto(origin + prefix, { waitUntil: 'networkidle' });
    await failedPage.getByRole('button', { name: 'Load public BTC / ETH candles', exact: true }).click();
    await failedPage.getByText(/Public candles could not load/).waitFor();
    assert.match(await failedPage.locator('.wall-rail').innerText(), /Demo snapshot/);
    await failedPage.getByRole('button', { name: 'Load public BTC / ETH candles', exact: true }).click();
    assert.equal(failures, 2);
  });
  await failureContext.close();
  if (process.env.VERIFY_PUBLIC_SOURCES === '1') {
    const liveContext = await browser.newContext();
    const livePage = await liveContext.newPage();
    await livePage.goto(origin + prefix, { waitUntil: 'networkidle' });
    const cors = await livePage.evaluate(async () => {
      try {
        const r = await fetch('https://aimarket.trade/api/public/overview', { credentials: 'omit' });
        const data = await r.json();
        return { status: r.status, boards: Object.keys(data), accessible: true };
      } catch (error) {
        return { accessible: false, error: String(error) };
      }
    });
    await livePage.getByRole('button', { name: 'Load public BTC / ETH candles', exact: true }).click();
    await livePage.waitForFunction(() => {
      const e = document.querySelector('.provider-message');
      return e && e.textContent.length > 0;
    });
    const live = {
      checkedAt: new Date().toISOString(),
      overviewCors: cors,
      krakenResult: await livePage.locator('.provider-message').innerText(),
      displayedSource: await livePage.locator('.screen-caption').innerText(),
    };
    await writeFile('artifacts/public-provider-check.json', JSON.stringify(live, null, 2) + '\n');
    console.log('PUBLIC SOURCE CHECK', JSON.stringify(live));
    await liveContext.close();
  }
  assert.deepEqual(consoleErrors, [], `Unexpected browser errors: ${consoleErrors.join('\n')}`);
  assert.deepEqual(resourceErrors, [], `Unexpected resource errors: ${resourceErrors.join('\n')}`);
  console.log(`Completed ${checks.length} interaction groups.`);
} finally {
  await writeFile(
    'artifacts/browser-validation.json',
    JSON.stringify(
      {
        testedAt: new Date().toISOString(),
        fixtureClock: '2026-10-10T14:30:00Z; advanced across the two-hour threshold for the stale-state check',
        browser: browser.version(),
        checks,
        consoleErrors,
        resourceErrors,
        contrast,
        accessibility: results,
      },
      null,
      2
    ) + '\n'
  );
  await browser.close();
  await new Promise((resolve) => server.close(resolve));
}
if (results.some((r) => r.violations.length))
  throw new Error('Accessibility violations remain; see artifacts/browser-validation.json');
