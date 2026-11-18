#!/usr/bin/env node
/**
 * Chụp screens/ từ chính prototype này. Cần máy chủ cục bộ đang chạy (start.command, cổng 8769)
 * và Playwright:  PW_FROM=<thư mục có node_modules/playwright>/x.js node tools/capture.mjs
 */
import { createRequire } from 'node:module';
import { writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
const require = createRequire(process.env.PW_FROM || import.meta.url);
const { chromium } = require('playwright');
const OUT = join(dirname(fileURLToPath(import.meta.url)), '..', 'screens');
const URL = process.env.URL || 'http://localhost:8769/';
const SIZES = [['doc', 390, 844, true], ['ngang', 844, 390, true], ['desktop', 1440, 900, false]];

const controls = (p) => p.evaluate(() => [...document.querySelectorAll('a,button,input,textarea,[role=radio]')]
  .filter((e) => { const r = e.getBoundingClientRect(); return r.width && r.height; })
  .map((e) => { const r = e.getBoundingClientRect(); return { tag: e.tagName.toLowerCase(), cls: e.className || '', label: (e.getAttribute('aria-label') || e.textContent || e.placeholder || '').trim().slice(0, 40), w: Math.round(r.width), h: Math.round(r.height), disabled: !!e.disabled }; }));

const b = await chromium.launch();
for (const [tag, w, h, touch] of SIZES) {
  const ctx = await b.newContext({ viewport: { width: w, height: h }, isMobile: touch, hasTouch: touch, deviceScaleFactor: 2 });
  const p = await ctx.newPage();
  const shot = (n) => p.screenshot({ path: join(OUT, `${tag}-${w}x${h}-${n}.png`) });
  const to = async (sel) => { await p.evaluate((s) => { const el = document.querySelector(s); window.scrollTo({ top: el.getBoundingClientRect().top + scrollY - 12, behavior: 'instant' }); }, sel); await p.waitForTimeout(500); };
  const tap = (loc) => (touch ? loc.tap() : loc.click());
  await p.goto(URL, { waitUntil: 'networkidle' });
  await p.waitForTimeout(1500);
  await p.screenshot({ path: join(OUT, `${tag}-${w}x${h}-01-toan-trang.png`), fullPage: true });
  await shot('02-mo-trang');
  await to('.a-when'); await shot('03-gio-dia-diem');
  await to('.a-photo'); await shot('04-anh');
  await to('#xac-nhan'); await shot('05-xac-nhan-trong');
  const ctl = { trang: await controls(p) };
  await p.fill('.a-form input', 'Nguyễn Văn An');
  await tap(p.getByRole('radio', { name: 'Tôi sẽ tham dự' }));
  await p.fill('.a-form textarea', 'Chúc hai cháu trăm năm hạnh phúc. Gia đình tôi sẽ đến đúng giờ.');
  await p.waitForTimeout(300);
  await to('.a-form'); await shot('06-xac-nhan-da-dien');
  ctl.form = await controls(p);
  await tap(p.locator('.a-submit')); await p.waitForSelector('.a-thanks'); await p.waitForTimeout(300);
  await to('#xac-nhan'); await shot('07-cam-on-tham-du');
  await tap(p.locator('.a-link')); await p.waitForTimeout(200);
  await tap(p.getByRole('radio', { name: 'Rất tiếc, tôi không thể đến' }));
  await tap(p.locator('.a-submit')); await p.waitForSelector('.a-thanks'); await p.waitForTimeout(300);
  await to('#xac-nhan'); await shot('08-cam-on-khong-den');
  await to('.a-photo'); await tap(p.locator('.a-photo img').first()); await p.waitForTimeout(700); await shot('09-lightbox');
  writeFileSync(join(OUT, `controls-${tag}-${w}x${h}.json`), JSON.stringify(ctl, null, 1));
  await ctx.close();
}
await b.close();
console.log('screens/ xong');
