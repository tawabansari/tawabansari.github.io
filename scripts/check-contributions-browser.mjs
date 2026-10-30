import assert from 'node:assert/strict';
import {chromium} from 'playwright';
const base = process.env.CONTRIBUTIONS_TEST_ORIGIN || 'http://127.0.0.1:4047';
const browser = await chromium.launch({headless:true, ...(process.env.CHROME_PATH ? {executablePath:process.env.CHROME_PATH} : {})});
try {
  for (const lang of ['fa','en']) for (const theme of ['light','dark']) for (const width of [390,1280]) {
    const context = await browser.newContext({viewport:{width,height:900}});
    await context.addInitScript(value => localStorage.setItem('forqan-theme',value),theme);
    const page = await context.newPage();
    const requests = [];
    page.on('request',request => requests.push(request.url()));
    await page.goto(`${base}/${lang}/contributions/`,{waitUntil:'networkidle'});
    assert.equal(await page.locator('.contribution-heading h1').count(),1);
    assert.equal(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth),true,`${lang} ${theme} ${width} overflow`);
    await page.locator('#contribution-query').fill('test');
    await page.waitForFunction(()=>document.querySelector('[role="status"]')?.textContent.includes('0')||document.querySelector('[role="status"]')?.textContent.includes('۰'));
    assert.equal(await page.locator('#contribution-empty').isVisible(),true);
    assert.ok(requests.some(url=>url.includes(`contributions-${lang}.json`)));
    assert.ok(!requests.some(url=>/pagefind|search-worker|search-catalog|vocabulary-/.test(url)),'Independent search loaded a central index');
    assert.equal(await page.locator('.language-switcher a[data-language="'+(lang==='fa'?'en':'fa')+'"]').getAttribute('href'),`/${lang==='fa'?'en':'fa'}/contributions/`);
    await page.screenshot({path:`/tmp/forqan-contributions-${lang}-${theme}-${width}.png`,fullPage:true});
    await page.goto(`${base}/${lang}/articles/`,{waitUntil:'networkidle'});
    assert.equal(await page.locator('[data-contribution-entrance]').count(),1);
    assert.equal(await page.locator('.collection-card').count(),5);
    const cards = await page.locator('.collection-card').evaluateAll(nodes => nodes.map(node => { const r=node.getBoundingClientRect(); return {top:r.top,bottom:r.bottom,left:r.left,width:r.width}; }));
    assert.ok(cards.every((card,i)=>!i || card.top>=cards[i-1].bottom), 'Collections must occupy five separate rows');
    assert.ok(cards.every(card=>Math.abs(card.left-cards[0].left)<1 && Math.abs(card.width-cards[0].width)<1), 'Collection rows must align');
    assert.equal(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth),true,'Hub overflow');
    await page.locator('[data-contribution-entrance]').scrollIntoViewIfNeeded();
    await page.screenshot({path:`/tmp/forqan-contributions-hub-${lang}-${theme}-${width}.png`,fullPage:true});
    await context.close();
  }
  console.log('Passed English/Persian, light/dark, phone/desktop layouts, isolated search requests, language links and hub entrances.');
} finally { await browser.close(); }
