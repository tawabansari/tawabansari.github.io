import {readFile} from 'node:fs/promises';
import {prepareDocument} from './document.mjs';
import {pdfFilename} from '../../assets/js/pdf-catalog.mjs';
export {selectDocument} from '../../assets/js/pdf-catalog.mjs';

export async function renderPDF(browser, selection, {siteOrigin, publicOrigin = siteOrigin, stylesheet, fetchSource = fetch}) {
  const context = await browser.newContext({locale:selection.lang, serviceWorkers:'block'});
  const page = await context.newPage();
  const deadline = setTimeout(() => context.close().catch(() => {}), selection.ids?.length > 1 ? 180000 : 60000);
  const source = new URL(selection.url, siteOrigin);
  const documentURL = new URL(selection.url, publicOrigin);
  if (selection.ids?.length === 1) documentURL.hash = selection.ids[0];
  try {
    const response = await fetchSource(source, {redirect:'manual', signal:AbortSignal.timeout(20000)});
    if (!response.ok) throw Error('Source unavailable');
    const html = await response.text();
    if (html.length > 15000000) throw Error('Document too large');
    // Never turn the public endpoint into an arbitrary URL/HTML converter.
    await context.route('**/*', route => {
      const request = route.request(), url = new URL(request.url());
      if (request.isNavigationRequest() && url.href === source.href) return route.fulfill({contentType:'text/html',body:'<!doctype html><html><head></head><body></body></html>'});
      const allowed = url.origin === siteOrigin && request.method() === 'GET' &&
        (['font','image'].includes(request.resourceType()) && !url.search);
      return allowed ? route.continue() : route.abort();
    });
    await page.emulateMedia({media:'print', colorScheme:'light', reducedMotion:'reduce'});
    await page.goto(source.href, {waitUntil:'domcontentloaded',timeout:20000});
    await page.evaluate(prepareDocument, {...selection, sourceURL:documentURL.href, html});
    const css = (stylesheet ?? await readFile(new URL('./document.css', import.meta.url), 'utf8')).replaceAll('__ORIGIN__', siteOrigin);
    await page.evaluate(cssText => {
      const style = document.createElement('style'); style.textContent = cssText; document.head.append(style);
    }, css);
    // Explicit font loads also catch failures that document.fonts.ready alone would hide.
    await page.evaluate(async () => {
      for (const font of ['12px Vazirmatn','700 12px Vazirmatn','20px "Amiri Quran"','20px "Amiri Quran Colored"']) {
        if (!(await document.fonts.load(font)).length) throw Error('Required font unavailable');
      }
      await document.fonts.ready;
      for (const image of document.images) { await image.decode(); if (!image.naturalWidth) throw Error('Image unavailable'); }
    });
    const bytes = await page.pdf({format:'A4', preferCSSPageSize:true, printBackground:true, tagged:true, outline:true, timeout:selection.ids?.length > 1 ? 120000 : 30000,
      displayHeaderFooter:true, headerTemplate:'<span></span>',
      footerTemplate:'<div style="font-family:Arial,sans-serif;font-size:9px;color:#666;width:100%;text-align:center"><span class="pageNumber"></span> / <span class="totalPages"></span></div>'});
    return {bytes, filename:pdfFilename(selection)};
  } finally { clearTimeout(deadline); await context.close(); }
}
