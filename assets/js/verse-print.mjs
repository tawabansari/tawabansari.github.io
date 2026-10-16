import {prepareDocument} from './export-document.mjs?v=reflection-focus-2';
import {selectVerses} from './pdf-selection.mjs';

export async function printVerses(request, {lang, title, anchors}) {
  const selected = selectVerses(request, anchors);
  if (selected.scope === 'range' && selected.missing.length && !request.allowPartial) throw Error('Confirm unpublished verses');
  // Open synchronously from the user's click so embedded readers can open a print tab.
  const popup = window.open('', '_blank');
  if (!popup) throw Error('Print window blocked');
  const target = popup.document;
  try {
    prepareDocument({...selected, includeCrossReferences:true, lang, title,
      sourceURL:location.href, html:document.documentElement.outerHTML}, target);
    const style = target.createElement('link'); style.rel = 'stylesheet';
    style.href = new URL('../css/verse-print.css', import.meta.url).href;
    const styled = new Promise((resolve, reject) => {style.onload=resolve; style.onerror=reject;});
    target.head.append(style);
    const controls = target.createElement('div'); controls.className='print-actions';
    const button=target.createElement('button'); button.type='button'; button.textContent=lang==='fa'?'چاپ':'Print';
    button.addEventListener('click',()=>popup.print()); controls.append(button); target.body.prepend(controls);
    popup.opener = null;
    await styled;
    await target.fonts.ready;
    if (!popup.closed) { popup.focus(); popup.print(); }
  } catch(error) { if (!popup.closed) popup.close(); throw error; }
}
