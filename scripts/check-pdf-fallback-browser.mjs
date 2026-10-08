import assert from 'node:assert/strict';
import {mkdir,readFile} from 'node:fs/promises';
import {chromium} from 'playwright';
import {build} from 'esbuild';
import {selectDocument} from '../assets/js/pdf-catalog.mjs';
const origin = process.env.PDF_TEST_ORIGIN || 'http://127.0.0.1:4003';
const out = process.env.PDF_TEST_OUTPUT || '/tmp/forqan-pdf-fallback';
await mkdir(out,{recursive:true});
const modelBundle = await build({entryPoints:['services/pdf/browser-model.mjs'],bundle:true,format:'iife',globalName:'PDFModel',write:false});
const pages = JSON.parse(await readFile('_site/assets/data/pdf-catalog.json','utf8')).pages;
const browser = await chromium.launch({headless:true,executablePath:process.env.PDF_BROWSER_PATH});
try {
  for (const lang of ['fa','en']) {
    const context = await browser.newContext({viewport:{width:390,height:844},acceptDownloads:true});
    const page = await context.newPage();
    page.on('pageerror',error=>console.error('Page error:',error.message));
    let calls = 0;
    await page.route('**/api/pdf',route=>{ calls++; return route.fulfill({status:429,headers:{'Retry-After':'3600','X-PDF-Reason':'daily-limit'},body:'Quota exceeded'}); });
    const chapterPath = `/quran-reflection/${lang}/002-al-baqarah/`;
    await page.goto(origin+chapterPath);
    await page.locator('#ayah-106 .pdf-download-button').click();
    const dialog = page.locator('.pdf-download-dialog');
    assert.ok(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth));
    async function save(label) {
      const started = Date.now();
      const ready = page.waitForEvent('download',{timeout:180000});
      const failed = page.waitForFunction(() => /could not|انجام نشد/.test(document.querySelector('.pdf-download-status')?.textContent || ''),{},{timeout:180000}).then(()=>{throw Error('Download failed: '+label);});
      await dialog.locator('[data-pdf-save]').click();
      const download = await Promise.race([ready,failed]);
      const filename = `${out}/${download.suggestedFilename()}`;
      await download.saveAs(filename);
      assert.equal((await readFile(filename)).subarray(0,5).toString(),'%PDF-');
      console.log(`${lang} ${label}: ${filename} (${Math.round((Date.now()-started)/1000)}s)`);
    }
    await save('single verse');
    await dialog.locator('[value=range]').check();
    await dialog.locator('[data-pdf-from]').selectOption('3');
    await dialog.locator('[data-pdf-to]').selectOption('12');
    await save('10 verse range');
    assert.equal(calls,1,'Later requests must use the recorded quota cooldown');
    await dialog.locator('[value=chapter]').check();
    await save('published chapter');
    assert.equal(calls,1);
    await dialog.locator('[data-pdf-close]').click();
    // Confirm the semantic fallback preserves every authored Arabic passage and reflection.
    const html = await (await context.request.get(origin+chapterPath)).text();
    await page.addScriptTag({content:modelBundle.outputFiles[0].text});
    const selected = selectDocument({path:chapterPath,scope:'chapter'},pages);
    const facts = await page.evaluate(({html,selected,sourceURL})=>{
      const model = PDFModel.browserDocument(selected,html,sourceURL);
      const verses = model.blocks.filter(b=>b.type==='verse');
      const runsText = node => node?.runs ? node.runs.map(r=>r.text).join('') : node?.children ? node.children.map(runsText).join(' ') : node?.items ? node.items.map(runsText).join(' ') : node?.rows ? node.rows.flat().map(runsText).join(' ') : '';
      const modelText = node => node.type==='contents' ? node.title+node.items.map(i=>i.text).join('') : node.runs ? node.runs.map(r=>r.text).join('') : (node.children||node.items||node.rows?.flat()||[]).map(modelText).join('');
      const source = new DOMParser().parseFromString(html,'text/html');
      const norm = value => value.replace(/\s+/g,' ').trim();
      return {ids:verses.map(v=>v.id),opening:model.blocks.filter(b=>b.type==='opening').length,
        contents:model.blocks.find(b=>b.type==='contents').items.length,
        fullText:model.blocks.map(modelText).join('').replace(/\s/g,'')===model.text.replace(/\s/g,''),
        complete:verses.every(v=>{
          const arabic = source.querySelector('#'+v.id+' .arabic-text').textContent;
          return norm(runsText(v)).includes(norm(arabic));
        })};
    },{html,selected,sourceURL:'https://forqan.co'+chapterPath});
    assert.deepEqual(facts.ids,selected.ids); assert.equal(facts.opening,1); assert.equal(facts.contents,selected.ids.length); assert.equal(facts.complete,true); assert.equal(facts.fullText,true,'Semantic model must preserve all cleaned text, including every reflection');
    for (const [label,path] of [['article',`/${lang}/quran-terminology/naskh-in-the-quran/`],['root',`/quran-terminology/${lang}/roots/kh-l-f/`]]) {
      await page.goto(origin+path);
      await page.locator('.pdf-study-tools button').click();
      await save(label);
    }
    await context.close();
  }
  // A user cancellation must terminate local work without a late download.
  const page = await browser.newPage({acceptDownloads:true});
  await page.route('**/api/pdf',route=>route.fulfill({status:503,body:'Unavailable'}));
  await page.goto(origin+'/quran-reflection/en/002-al-baqarah/');
  let downloads = 0; page.on('download',()=>downloads++);
  await page.locator('#ayah-106 .pdf-download-button').click();
  await page.locator('[value=chapter]').check();
  await page.locator('[data-pdf-save]').click();
  await page.locator('[data-pdf-close]').click();
  await page.waitForTimeout(1200);
  assert.equal(downloads,0); assert.equal(await page.locator('.pdf-download-dialog').isVisible(),false);
  console.log('Passed browser fallback, Persian/English verse/range/chapter/article/root, quota persistence, semantic verse preservation, and cancellation.');
} finally { await browser.close(); }
