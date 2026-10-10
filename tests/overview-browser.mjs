import { createServer } from 'node:http';
import { readFile, writeFile, mkdir } from 'node:fs/promises';
import path from 'node:path';
import { pathToFileURL } from 'node:url';
import assert from 'node:assert/strict';

const deps = process.env.AIMARKET_DEPENDENCY_ROOT;
const vite = await import(deps ? pathToFileURL(path.join(deps, 'vite/dist/node/index.js')).href : 'vite');
const { chromium } = await import(
  deps ? pathToFileURL(path.join(deps, 'playwright/index.mjs')).href : 'playwright'
);
const root = process.cwd();
const output = path.join(root, 'test/scratch/configured-dist');
await vite.build({
  configFile: path.join(root, 'vite.config.ts'),
  define: { 'import.meta.env.VITE_PUBLIC_API_BASE_URL': JSON.stringify('https://aimarket.trade') },
  build: { outDir: output, emptyOutDir: true },
});
const mime = {
  '.html': 'text/html',
  '.js': 'application/javascript',
  '.css': 'text/css',
  '.svg': 'image/svg+xml',
  '.woff2': 'font/woff2',
};
const server = createServer(async (request, response) => {
  try {
    const pathname = decodeURIComponent(new URL(request.url, 'http://localhost').pathname);
    const file = path.resolve(output, '.' + (pathname === '/' ? '/index.html' : pathname));
    if (!file.startsWith(output + path.sep)) {
      response.writeHead(403).end();
      return;
    }
    response
      .writeHead(200, { 'Content-Type': mime[path.extname(file)] || 'application/octet-stream' })
      .end(await readFile(file));
  } catch {
    response.writeHead(404).end();
  }
});
await new Promise((resolve) => server.listen(0, '127.0.0.1', resolve));
const origin = `http://127.0.0.1:${server.address().port}/`;
const browser = await chromium.launch({
  headless: true,
  ...(process.env.AIMARKET_CHROMIUM_PATH ? { executablePath: process.env.AIMARKET_CHROMIUM_PATH } : {}),
});
const checks = [];
const fixture = JSON.parse(await readFile('src/data/overview.demo.json', 'utf8'));
try {
  for (const scenario of ['success', 'http-error', 'malformed', 'empty']) {
    const context = await browser.newContext();
    const page = await context.newPage();
    await page.clock.install({ time: new Date('2026-10-10T14:30:00Z') });
    let calls = 0;
    await context.route('https://aimarket.trade/api/public/overview', async (route) => {
      calls++;
      await route.fulfill({
        status: scenario === 'http-error' ? 503 : 200,
        contentType: 'application/json',
        body: JSON.stringify(
          scenario === 'malformed'
            ? { unexpected: true }
            : scenario === 'empty'
              ? { spot: { status: 'ready', items: [] } }
              : fixture
        ),
      });
    });
    await page.goto(origin, { waitUntil: 'networkidle' });
    assert.equal(calls, 1, `${scenario}: initial request count`);
    if (scenario === 'success') {
      assert.match(await page.locator('.status-main').innerText(), /Cached snapshot/);
      await page.getByRole('button', { name: 'BTCUSDT — View evidence', exact: true }).click();
      assert.match(await page.locator('dialog').innerText(), /Public cached response/);
      await page.keyboard.press('Escape');
      await page
        .getByRole('group', { name: 'Filter by market' })
        .getByRole('button', { name: 'Contracts', exact: true })
        .click();
      await page.getByRole('button', { name: 'Switch to Traditional Chinese (Taiwan)' }).click();
      assert.equal(calls, 1, 'interaction must not fetch the summary again');
      await page.reload({ waitUntil: 'networkidle' });
      assert.equal(calls, 2, 'exactly one request on each page load');
    } else if (scenario === 'empty') {
      assert.match(await page.locator('.status-main').innerText(), /Data unavailable/);
      assert.equal(await page.locator('.instrument-row').count(), 0);
      assert.match(await page.locator('.hero-timestamp').innerText(), /Not supplied/);
    } else {
      assert.match(await page.locator('.status-main').innerText(), /Demo snapshot/);
      assert.match(
        await page.getByText('The configured public summary could not load.', { exact: false }).innerText(),
        /fixed demo snapshot/
      );
      assert.equal(await page.locator('.market-card').count(), 6);
    }
    checks.push(`${scenario}: passed`);
    console.log(`PASS configured public overview — ${scenario}`);
    await context.close();
  }
} finally {
  await mkdir('artifacts', { recursive: true });
  await writeFile(
    'artifacts/overview-validation.json',
    JSON.stringify(
      {
        testedAt: new Date().toISOString(),
        checks,
        method:
          'Production alternate export in test/scratch; mocked public responses, no network provider calls.',
      },
      null,
      2
    ) + '\n'
  );
  await browser.close();
  await new Promise((resolve) => server.close(resolve));
}
