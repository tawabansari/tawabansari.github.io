import assert from 'node:assert/strict';
import {mkdtemp,readFile,writeFile} from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import {chromium} from 'playwright';
import {prepareDocument} from '../services/pdf/document.mjs';
import {renderPDF,selectDocument} from '../services/pdf/render.mjs';
// Run against `pnpm run preview:pdf`. These are real browser and PDF checks.
const origin = process.env.PDF_TEST_ORIGIN || 'http://127.0.0.1:4003';
const out = await mkdtemp(path.join(os.tmpdir(),'forqan-pdf-check-'));
const pages = JSON.parse(await readFile('_site/assets/data/library.json','utf8')).pages;
const normalize = text => text.replace(/\s+/g,' ').trim();
const browser = await chromium.launch({headless:true,...(process.env.PDF_BROWSER_PATH ? {executablePath:process.env.PDF_BROWSER_PATH} : {})});
try {
  for (const lang of ['fa','en']) {
    const context = await browser.newContext({viewport:{width:390,height:844},acceptDownloads:true});
    const page = await context.newPage();
    await page.goto(`${origin}/quran-reflection/${lang}/002-al-baqarah/`,{waitUntil:'load'});
    const chapterPath = `/quran-reflection/${lang}/002-al-baqarah/`;
    const source = await page.locator('#ayah-106 .arabic-text').textContent();
    const title = page.locator('#ayah-106 .ayah-title');
    await title.scrollIntoViewIfNeeded();
    await title.screenshot({path:path.join(out,`${lang}-verse-controls.png`)});
    await page.locator('#ayah-106 .pdf-download-button').click();
    const dialog = page.locator('.pdf-download-dialog');
    assert.equal(await dialog.isVisible(),true);
    assert.equal(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth),true,'Phone layout must not overflow');
    assert.equal(await dialog.locator('[value="verse"]').isChecked(),true);
    await page.screenshot({path:path.join(out,`${lang}-phone-dialog.png`)});
    async function downloadSelection() {
      const promise = page.waitForEvent('download',{timeout:210000});
      await dialog.locator('[data-pdf-save]').click();
      const download = await promise;
      const output = path.join(out,download.suggestedFilename());
      await download.saveAs(output);
      assert.equal((await readFile(output)).subarray(0,5).toString(),'%PDF-');
      console.log(output);
    }
    await downloadSelection();
    await dialog.locator('[value="range"]').check();
    await dialog.locator('[data-pdf-from]').selectOption('3');
    await dialog.locator('[data-pdf-to]').selectOption('12');
    assert.ok((await dialog.locator('.pdf-summary').textContent()).includes(lang === 'fa' ? '۱۰' : '10'));
    await downloadSelection();
    // Invalid or partly unpublished ranges must be explicit before saving.
    await dialog.locator('[data-pdf-from]').selectOption('120');
    assert.equal(await dialog.locator('[data-pdf-save]').isDisabled(),true);
    await dialog.locator('[data-pdf-to]').selectOption('130');
    assert.equal(await dialog.locator('.pdf-missing').isVisible(),true);
    assert.equal(await dialog.locator('[data-pdf-save]').isDisabled(),true);
    await dialog.locator('.pdf-partial input').check();
    assert.equal(await dialog.locator('[data-pdf-save]').isEnabled(),true);
    await dialog.locator('[data-pdf-from]').selectOption('121');
    assert.equal(await dialog.locator('[data-pdf-save]').isDisabled(),true,'Changing a range resets gap confirmation');
    await dialog.locator('[value="chapter"]').check();
    assert.ok((await dialog.locator('.pdf-summary').textContent()).includes(lang === 'fa' ? '۲۸۶' : '286'));
    await downloadSelection();
    await dialog.locator('[data-pdf-close]').click();
    assert.equal(await page.locator('#ayah-106 .pdf-download-button').evaluate(el => el === document.activeElement),true);
    // Preparing the export preserves the original text and includes collapsed reflections.
    const selection = selectDocument({path:chapterPath,verse:'ayah-106'},pages);
    await page.evaluate(prepareDocument,{...selection,sourceURL:`https://forqan.co${chapterPath}#ayah-106`});
    assert.equal(normalize(await page.locator('.ayah-block > .arabic-text').textContent()),normalize(source));
    assert.equal(await page.locator('.ayah-block').count(),1);
    assert.equal(await page.locator('button,script,form,details,[data-type="cross-reference"]').count(),0);
    assert.equal(await page.locator('html').getAttribute('dir'),lang === 'fa' ? 'rtl' : 'ltr');
    assert.ok((await page.locator('body').textContent()).includes(lang === 'fa' ? 'تأمل ما' : 'Our Reflection'));
    // Full-chapter extraction: compare every Arabic passage and every reflection, not only counts.
    await page.goto(`${origin}${chapterPath}`,{waitUntil:'load'});
    const originals = await page.locator('.ayah-block[id]').evaluateAll(blocks => blocks.map(b => ({id:b.id,
      arabic:b.querySelector('.arabic-text').textContent,
      reflection:b.querySelector('details[data-type="reflection"] .details-content')?.textContent || ''})));
    const all = selectDocument({path:chapterPath,scope:'chapter'},pages);
    await page.evaluate(prepareDocument,{...all,sourceURL:`https://forqan.co${chapterPath}`});
    assert.deepEqual(await page.locator('.ayah-block').evaluateAll(bs => bs.map(b => b.id)),all.ids);
    assert.equal(await page.locator('.pdf-contents a').count(),all.ids.length);
    assert.equal(await page.locator('.pdf-contents a').last().getAttribute('href'),'#'+all.ids.at(-1));
    for (const original of originals) {
      assert.equal(normalize(await page.locator(`#${original.id} > .arabic-text`).textContent()),normalize(original.arabic));
      if (original.reflection) {
        assert.ok(await page.locator(`#${original.id} .details-content`).count() > 0);
        // UI-injected link labels are removed, while the authored reflection text stays intact.
        const reflection = await page.locator(`#${original.id} .details-content`).textContent();
        assert.ok(normalize(reflection).length > normalize(original.reflection).length * .9);
      }
    }
    assert.equal(await page.locator('details,[data-type="cross-reference"]').count(),0);
    await page.goto(`${origin}/${lang}/quran-terminology/naskh-in-the-quran/`,{waitUntil:'load'});
    await page.locator('.pdf-study-tools button').click();
    assert.equal(await dialog.locator('.pdf-scope').isVisible(),false);
    const articleDownload = page.waitForEvent('download',{timeout:90000});
    await dialog.locator('[data-pdf-save]').click();
    const article = await articleDownload;
    await article.saveAs(path.join(out,article.suggestedFilename()));
    console.log(path.join(out,article.suggestedFilename()));
    await context.close();
  }
  const invalid = await fetch(`${origin}/api/pdf`,{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({path:'https://example.com'})});
  assert.equal(invalid.status,400);
  const wrongOrigin = await fetch(`${origin}/api/pdf`,{method:'POST',headers:{'Content-Type':'application/json',Origin:'https://elsewhere.test'},body:'{}'});
  assert.equal(wrongOrigin.status,403);
  const page = await browser.newPage({viewport:{width:390,height:844}});
  await page.goto(`${origin}/quran-terminology/fa/roots/kh-l-f/`,{waitUntil:'load'});
  await page.locator('.pdf-study-tools button').click();
  const rootDownload = page.waitForEvent('download',{timeout:90000});
  await page.locator('[data-pdf-save]').click();
  const root = await rootDownload;
  await root.saveAs(path.join(out,root.suggestedFilename()));
  console.log(path.join(out,root.suggestedFilename()));
  await page.locator('[data-pdf-close]').click();
  // A failed service request must continue with a real local PDF.
  await page.route('**/api/pdf',route => route.fulfill({status:503,body:'Unavailable'}));
  await page.locator('.pdf-study-tools button').click();
  const recoveredDownload = page.waitForEvent('download',{timeout:90000});
  await page.locator('[data-pdf-save]').click();
  const recovered = await recoveredDownload;
  const recoveredFile = path.join(out,'fallback-'+recovered.suggestedFilename());
  await recovered.saveAs(recoveredFile);
  assert.equal((await readFile(recoveredFile)).subarray(0,5).toString(),'%PDF-');
  assert.equal(await page.locator('[data-pdf-save]').isEnabled(),true);
  await page.unroute('**/api/pdf');
  await page.goto(`${origin}/quran-reflection/fa/002-al-baqarah/`,{waitUntil:'load'});
  await page.locator('#ayah-106 .farsi-verse a[href="/fa/quran-terminology/naskh-in-the-quran/"]').click();
  const frame = page.frameLocator('.study-reading-panel iframe');
  await frame.locator('.pdf-study-tools button').click();
  await frame.locator('[data-pdf-save]').press('Escape');
  assert.equal(await frame.locator('.pdf-download-dialog').isVisible(),false);
  assert.equal(await page.locator('.study-reading-panel').isVisible(),true,'Escape must not close the underlying study');
  await page.close();
  // All controls stay together and the dialog fits small phones and desktops in both themes.
  for (const lang of ['fa','en']) {
    const layout = await browser.newPage();
    await layout.goto(`${origin}/quran-reflection/${lang}/002-al-baqarah/`,{waitUntil:'load'});
    for (const width of [320,390,430,1280]) {
      await layout.setViewportSize({width,height:width === 320 ? 568 : 900});
      for (const theme of ['light','dark']) {
        await layout.evaluate(theme => {document.documentElement.dataset.forqanTheme=theme;document.body.classList.toggle('dark-theme',theme==='dark');},theme);
        const controls = await layout.locator('#ayah-106 .pdf-verse-actions > *').evaluateAll(nodes => nodes.map(n => ({y:n.getBoundingClientRect().y,h:n.getBoundingClientRect().height})));
        assert.ok(controls.length === 5 && controls.every(c => c.y === controls[0].y && c.h === controls[0].h),'Verse controls align');
        await layout.locator('#ayah-106 .pdf-download-button').click();
        const dialog = layout.locator('.pdf-download-dialog');
        await dialog.locator('[value=range]').check();
        assert.ok(await dialog.evaluate(d => d.scrollWidth <= d.clientWidth));
        assert.ok(await dialog.evaluate(d => {const r=d.getBoundingClientRect();return r.x>=0 && r.right<=innerWidth && r.height<=innerHeight;}));
        await dialog.locator('[data-pdf-close]').click();
        assert.ok(await layout.evaluate(() => document.documentElement.scrollWidth <= innerWidth));
      }
    }
    await layout.close();
  }
  // Deliberately sparse fixture covers absent reflection, excluded references and inert source markup.
  const fixture = await browser.newPage();
  const html = `<main id="main-content"><div id="ayah-003" class="ayah-block"><h2 class="ayah-title">Verse 3</h2><p class="arabic-text"><button class="word-link">قُلْ</button></p><p class="english-verse">Say.</p><details data-type="cross-reference"><summary>Cross-References</summary><p>EXCLUDED_REFERENCE</p></details></div><div id="ayah-005" class="ayah-block"><h2 class="ayah-title">Verse 5</h2><p class="arabic-text">اللّه</p><p class="english-verse">God.</p><details data-type="reflection"><summary>Our Reflection</summary><div class="details-content"><p>INCLUDED_REFLECTION</p><script>window.untrustedRan=true</script></div></details></div></main>`;
  await fixture.evaluate(prepareDocument,{ids:['ayah-003','ayah-005'],scope:'range',from:3,to:5,missing:[4],lang:'en',title:'Test selection',sourceURL:'https://forqan.co/quran-reflection/en/002-al-baqarah/',html});
  const text = await fixture.locator('body').textContent();
  assert.ok(text.includes('Reflection for this verse is not yet published.'));
  assert.ok(text.includes('Unpublished verses omitted: 4'));
  assert.ok(text.includes('INCLUDED_REFLECTION'));
  assert.ok(!text.includes('EXCLUDED_REFERENCE'));
  assert.equal(await fixture.evaluate(() => window.untrustedRan),undefined);
  await fixture.close();
  // A missing font must fail; quietly substituting a font risks broken Arabic.
  const brokenFonts = {async newContext(options) {
    const context = await browser.newContext(options);
    const newPage = context.newPage.bind(context);
    context.newPage = async () => { const p = await newPage(); await p.route('**/assets/fonts/**',route => route.abort()); return p; };
    return context;
  }};
  await assert.rejects(renderPDF(brokenFonts,selectDocument({path:'/quran-reflection/fa/002-al-baqarah/',verse:'ayah-106'},pages),{siteOrigin:origin}),/font|network/i);
  console.log('Passed root/table export, automatic fallback after service failure, nested-dialog Escape, and missing-font rejection.');
  console.log('Passed real bilingual article/verse downloads, single/range/chapter selections, gap confirmation, Arabic preservation, 390px layout, and service restrictions.');
  await writeFile(path.join(out,'README.txt'),'PDFs generated by scripts/check-pdf-browser.mjs for visual inspection.\n');
} finally { await browser.close(); }
