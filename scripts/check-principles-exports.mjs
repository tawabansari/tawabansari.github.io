import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import {chromium} from 'playwright';
const origin=process.env.PRINCIPLES_ORIGIN||'http://127.0.0.1:4059';
const browser=await chromium.launch({headless:true,executablePath:'/Applications/Google Chrome.app/Contents/MacOS/Google Chrome'});
try{for(const lang of ['fa','en']){
 const context=await browser.newContext({acceptDownloads:true});await context.addInitScript(()=>{window.print=()=>{window.printRequested=true;};});
 const page=await context.newPage();await page.goto(`${origin}/${lang}/principles/freeing-people-from-bondage/`);
 const arabic=await page.locator('.principle-evidence .arabic-text').textContent(),translation=await page.locator('.principle-translation').textContent();
 await page.locator('.study-print-button').click();const popupPromise=page.waitForEvent('popup');await page.locator('[data-pdf-save]').click();const popup=await popupPromise;
 await popup.locator('.principle-translation').waitFor();assert.equal(await popup.locator('.principle-translation').textContent(),translation);assert.equal(await popup.locator('.principle-evidence .arabic-text').textContent(),arabic);
 assert.equal(await popup.locator('.principle-tools,.principles-return').count(),0);assert.equal(await popup.locator('.quran-source-credit a[href="https://tanzil.net/"]').count(),1);assert.ok(await popup.locator('.principle-references a').count()>0);await popup.close();
 await page.locator('[data-pdf-close]').click();await page.locator('.pdf-download-button').click();const downloaded=page.waitForEvent('download',{timeout:120000});await page.locator('[data-pdf-save]').click();const file=await downloaded;const path=`/tmp/principles-export-${lang}.pdf`;await file.saveAs(path);assert.equal((await readFile(path)).subarray(0,5).toString(),'%PDF-');console.log(path);await context.close();
}console.log('Passed bilingual principle print content and actual PDF downloads.');}finally{await browser.close();}
