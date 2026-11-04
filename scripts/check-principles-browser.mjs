import assert from 'node:assert/strict';
import {chromium} from 'playwright';
const origin=process.env.PRINCIPLES_ORIGIN || 'http://127.0.0.1:4058';
const browser=await chromium.launch({headless:true,executablePath:process.env.CHROME_PATH || '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome'});
try{
for(const lang of ['fa','en'])for(const width of [390,1280])for(const theme of ['light','dark']){
 const context=await browser.newContext({viewport:{width,height:850}});await context.addInitScript(v=>localStorage.setItem('forqan-theme',v),theme);
 const page=await context.newPage();await page.goto(`${origin}/${lang}/principles/`);await page.locator('[role=status]').filter({hasText:lang==='fa'?'اصل':'principles'}).waitFor();
 assert.ok(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth));
 await page.locator('[name=q]').fill(lang==='fa'?'راست‌گویی':'Truthfulness');
 assert.equal(await page.locator('li[data-verse]:visible').count(),1);
 await page.locator('li[data-verse]:visible a').scrollIntoViewIfNeeded();const before=await page.evaluate(()=>scrollY);await page.locator('li[data-verse]:visible a').click();
 await page.locator('dialog[open]').waitFor();const frame=page.frameLocator('.study-reading-panel iframe');await frame.locator('.principle-detail h1').waitFor();
 assert.equal(await page.locator('dialog').evaluate(d=>d.matches(':modal')),width<1100);
 assert.equal(await frame.locator('.principle-evidence h2').count(),0);
 assert.equal(await frame.locator('[data-copy-principle]').count(),1);
 assert.equal(await frame.locator('.study-print-button').count(),1);
 await frame.locator('.principle-evidence a').first().click();await frame.locator('.ayah-block').first().waitFor();
 assert.equal(new URL(page.url()).pathname,`/${lang}/principles/`);
 await page.locator('[data-panel-return]').click();await frame.locator('.principle-detail h1').waitFor();
 assert.equal(await page.locator('dialog[open]').count(),1);
 assert.equal(await frame.locator('.principle-tools').isVisible(),false);
 assert.equal(await frame.locator('h1 .principle-title-aliases').count(),1);
 if(lang==='fa')assert.equal(await frame.locator('.principle-translation').evaluate(e=>getComputedStyle(e).textAlign),'center');
 assert.equal(await frame.locator('.principle-attribution').count(),0);
 await page.locator('[data-panel-pdf]').click();await frame.locator('.pdf-download-dialog[open]').waitFor();await frame.locator('[data-pdf-close]').click();
 await page.locator('[data-panel-print]').click();await frame.locator('.pdf-download-dialog[open]').waitFor();await frame.locator('[data-pdf-close]').click();
 await page.locator('[data-panel-forward]').click();await frame.locator('.ayah-block').first().waitFor();
 await page.locator('[data-panel-history]').selectOption('0');await frame.locator('.principle-detail h1').waitFor();
 if(width>=1100)assert.equal(await page.locator('.principles-list a[aria-current=true]').count(),1);
 await page.waitForFunction(()=>document.querySelector('.study-panel-status').hidden);
 await page.screenshot({path:`/tmp/principles-reader-${lang}-${width}-${theme}.png`});
 if(width>=1100){
  await page.setViewportSize({width:700,height:850});await page.waitForFunction(()=>document.querySelector('dialog').matches(':modal'));
  await page.setViewportSize({width,height:850});await page.waitForFunction(()=>document.querySelector('dialog').open&&!document.querySelector('dialog').matches(':modal'));
  await page.waitForFunction(()=>document.querySelector('.study-panel-status').hidden);
 }
 await page.locator('[data-panel-close]').click();await page.waitForFunction(()=>!document.querySelector('dialog').open);
 assert.ok(Math.abs(await page.evaluate(()=>scrollY)-before)<5);
 await page.locator('[name=q]').fill('');await page.locator('[name=polarity]').selectOption('negative');assert.equal(await page.locator('[data-polarity=positive]').isVisible(),false);
 await page.locator('[name=category]').selectOption('justice');assert.ok(await page.locator('li[data-verse]:visible').count()>0);
 await page.locator('[name=sort]').selectOption('verse');
 await page.screenshot({path:`/tmp/principles-${lang}-${width}-${theme}.png`,fullPage:true});
 await page.goto(`${origin}/${lang}/`);
 assert.equal(await page.locator('.library-destination').count(),6);
 assert.equal(await page.locator(`.library-destinations a[href="/${lang}/principles/"] svg`).count(),1);
 assert.equal(await page.locator(`.library-destinations a[href="/${lang}/contributions/"] svg`).count(),1);
 assert.ok(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth));
 await page.locator('.library-destinations').scrollIntoViewIfNeeded();await page.mouse.move(0,0);
 await page.screenshot({path:`/tmp/principles-home-${lang}-${width}-${theme}.png`});
 await context.close();
}
console.log('Passed bilingual light/dark desktop/phone filtering, evidence panel, back trail, scroll preservation and overflow.');
}finally{await browser.close();}
