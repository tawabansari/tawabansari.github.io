import {installVerseCopy} from './verse-copy-menu.mjs';
import {afterReadingLayout} from './reading-position.mjs';

export function reflectionURL(pathname, verseId) {
  if (!/^\/quran-reflection\/(fa|en)\/\d{3}-[^/]+\/$/.test(pathname)) return null;
  const match = /^ayah-(\d+)$/.exec(verseId);
  if (!match || Number(match[1]) < 1) return null;
  const url = new URL(pathname, 'https://tabsira.forqan.co');
  url.searchParams.set('verse', String(Number(match[1])));
  return url.href;
}

function init() {
  const verses = [...document.querySelectorAll('.ayah-block[id]')];
  if (!verses.length || !reflectionURL(location.pathname, verses[0].id)) return;
  const fa = document.documentElement.lang.startsWith('fa');
  const page = verses[0].parentElement;
  const toolbar = document.createElement('div');
  toolbar.className = 'reader-mode-toolbar';
  toolbar.dataset.pagefindIgnore = '';
  toolbar.setAttribute('role', 'group');
  toolbar.setAttribute('aria-label', fa ? 'شیوهٔ خواندن' : 'Reading view');
  const modes = [['study', fa ? 'مطالعه و بررسی' : 'Study'], ['reading', fa ? 'روخوانی قرآن' : 'Read Qur’an']];
  document.body.classList.add('surah-reader-page');
  const descriptions = fa ? [
    'آیات و ترجمه را همراه با تأویل، توضیح واژه‌ها، ارجاعات متقابل و پژوهش‌های مرتبط مطالعه کنید.',
    'تنها متن آیات و ترجمهٔ آن‌ها را در نمای ساده و پیوسته بخوانید.'
  ] : [
    'Study verses and translations with reflections, word explanations, cross-references, and related research.',
    'Read only the verses and their translations in a simple, continuous view.'
  ];
  const buttons = modes.map(([mode, label], index) => {
    const button = document.createElement('button');
    button.type = 'button'; button.textContent = label;
    button.title = descriptions[index];button.setAttribute('aria-describedby','reader-help-'+mode);
    button.addEventListener('click', () => setMode(mode, true));
    toolbar.append(button); return button;
  });
  const help = document.createElement('details');help.className='reader-mode-help';
  const summary=document.createElement('summary');summary.textContent='ⓘ';summary.setAttribute('aria-label',fa?'راهنمای حالت‌های مطالعه':'Reading modes help');
  const explanation=document.createElement('div');explanation.className='reader-mode-explanation';
  modes.forEach(([mode,label],i)=>{const p=document.createElement('p');p.id='reader-help-'+mode;const strong=document.createElement('strong');strong.textContent=label+': ';p.append(strong,descriptions[i]);explanation.append(p);});
  help.append(summary,explanation);toolbar.append(help);
  document.addEventListener('click',event=>{if(!help.contains(event.target))help.open=false;});
  help.addEventListener('keydown',event=>{if(event.key==='Escape'){help.open=false;summary.focus();}});
  const header=page.querySelector('.surah-header-block');
  if(header) header.after(toolbar);else page.prepend(toolbar);
  // Discussion stays after the title's metadata, even if added by another renderer.
  const discussion=header?.querySelector('[data-tabsira-discuss]');
  if(discussion) header.append(discussion);


  function setMode(mode, preservePosition = false) {
    const edge=Math.max(0,toolbar.getBoundingClientRect().bottom);
    const current = verses.find(verse => verse.getBoundingClientRect().bottom > edge + 12) || verses.at(-1);
    const offset=current.getBoundingClientRect().top;
    const atStart=window.scrollY < 100;
    document.body.classList.toggle('quran-reading-mode', mode === 'reading');
    buttons.forEach((button, index) => button.setAttribute('aria-pressed', String(modes[index][0] === mode)));
    try { localStorage.setItem('forqan-reading-mode', mode); } catch {}
    if (preservePosition) afterReadingLayout(() => {
      if (!atStart) window.scrollBy({top:current.getBoundingClientRect().top-offset,behavior:'instant'});
    });
  }
  let saved = 'study';
  try { saved = localStorage.getItem('forqan-reading-mode') || saved; } catch {}
  setMode(saved === 'reading' ? 'reading' : 'study');
  if (saved === 'reading' && /^#ayah-\d+$/.test(location.hash)) {
    afterReadingLayout(() => document.getElementById(location.hash.slice(1))?.scrollIntoView());
  }

  verses.forEach(verse => {
    const heading = verse.querySelector('.ayah-title,h2');
    if (!heading) return;
    const reference = heading.querySelector('.ayah-reference');
    if (reference) {
      if (!reference.querySelector('a')) {
        const permalink = document.createElement('a');
        permalink.href = '#' + verse.id;
        const label = reference.textContent.trim();
        const parts = /^(.*?)\s+([0-9۰-۹٠-٩]+:[0-9۰-۹٠-٩]+)$/.exec(label);
        permalink.className = 'verse-permalink';
        if (parts) {
          const chapter = document.createElement('span');
          chapter.className = 'verse-reference-chapter'; chapter.textContent = parts[1];
          const number = document.createElement('span');
          number.className = 'verse-reference-number'; number.textContent = parts[2];
          permalink.append(chapter, ' ', number);
        } else permalink.textContent = label;
        reference.replaceChildren(permalink);
      }
      const number = document.createElement('a');
      number.className = 'reading-verse-number';
      number.href = '#' + verse.id;
      number.textContent = new Intl.NumberFormat(fa ? 'fa' : 'en', {useGrouping:false}).format(Number(verse.id.slice(5)));
      number.setAttribute('aria-label', reference.textContent.trim());
      number.title = reference.textContent.trim();
      number.dataset.pagefindIgnore = '';
      heading.prepend(number);
    }
    const link = document.createElement('a');
    link.className = 'tabsira-reflection-link';
    link.href = reflectionURL(location.pathname, verse.id);
    link.target = '_blank'; link.rel = 'noopener';
    link.dataset.pagefindIgnore = '';
    link.textContent = '✎';
    const label = fa ? 'نوشتن تبصره دربارهٔ این آیه' : 'Write a reflection on Tabsira';
    link.setAttribute('aria-label', label); link.title = label;
    const actions = heading.querySelector('.pdf-verse-actions') || heading;
    actions.querySelector('.copy-ayah-link')?.remove();
    const tools = document.createElement('div'); tools.className = 'verse-discussion-tools';
    tools.dataset.pagefindIgnore = '';
    const panels = [...verse.querySelectorAll(':scope > details[data-type]')];
    const reflection = panels.find(panel => panel.dataset.type === 'reflection');
    const sectionCopy = reflection?.querySelector('.copy-section-text');
    installVerseCopy(actions.querySelector('.copy-ayah-text'), sectionCopy, fa);
    sectionCopy?.remove();
    for (const panel of panels) {
      const summary = panel.querySelector('summary');
      if (!summary) continue;
      const group = document.createElement('div'); group.className = 'verse-discussion-group';
      const isReflection = panel.dataset.type === 'reflection';
      const title = isReflection ? (fa ? 'تأمل در این آیه' : 'Verse Reflection') : panel.dataset.type === 'cross-reference' ? (fa ? 'ارجاعات' : 'References') : summary.childNodes[0].textContent.trim();
      const toggle = document.createElement('button'); toggle.type='button'; toggle.className='verse-panel-toggle';
      toggle.setAttribute('aria-controls',panel.id);
      if (isReflection) toggle.classList.add('reflection-primary-toggle');
      const refresh = () => { toggle.textContent = title + (panel.open ? ' −' : ' +'); toggle.setAttribute('aria-expanded',String(panel.open)); };
      toggle.addEventListener('click',()=>{panel.open=!panel.open;refresh();});
      panel.addEventListener('toggle',refresh); refresh(); group.append(toggle);
      summary.querySelectorAll('.language-mirror-link').forEach(control=>group.append(control));
      if (panel.dataset.type === 'reflection') group.append(link);
      panel.classList.add('compact-verse-panel');
      tools.append(group);
    }
    if (!tools.contains(link)) tools.append(link);
    if (panels.length) panels[0].before(tools); else verse.append(tools);
    // Match visual and keyboard order, with verse search always at the far right.
    const search = actions.querySelector('.ayah-quran-nav-button');
    if (search) actions.append(search);
    // Move the actual controls, preserving handlers and matching tab order to visual order.
    const desktop = matchMedia('(min-width:1000px)');
    const controls = [...tools.querySelectorAll('.verse-discussion-group > button,.verse-discussion-group > a'), ...tools.querySelectorAll(':scope > a'), ...actions.children];
    const rank = node => node.matches('.reflection-primary-toggle') ? 0 : node.matches('.verse-panel-toggle') ? 1 : node.matches('.language-mirror-link') ? 2 : node.matches('.quran-gooya-link') ? 3 : node.matches('.copy-ayah-text') ? 4 : node.matches('.pdf-download-button') ? 5 : node.matches('.verse-print-button') ? 6 : node.matches('.ayah-quran-nav-button') ? 7 : 8;
    const homes = controls.map(control => {const marker=document.createComment('verse-control');control.before(marker);return {control,marker};});
    const arrange = () => {
      tools.classList.toggle('unified-verse-tools',desktop.matches);
      if(desktop.matches) controls.sort((a,b)=>rank(a)-rank(b)).forEach(control=>tools.append(control));
      else homes.forEach(({control,marker})=>marker.after(control));
      actions.hidden=desktop.matches;
    };
    desktop.addEventListener('change',arrange);arrange();
    if (reference) reference.title = reference.textContent.trim();
  });

  function revealLinkedSection() {
    const target = document.getElementById(location.hash.slice(1));
    if (!target?.closest('.ayah-block')) return;
    for (let node = target; node; node = node.parentElement) {
      if (node.matches('details')) node.open = true;
    }
  }
  window.addEventListener('hashchange', revealLinkedSection);
  revealLinkedSection();
  document.querySelectorAll('.ayah-quran-nav-button,.quran-nav-trigger').forEach(button => {
    button.innerHTML = '<svg viewBox="0 0 24 24" aria-hidden="true" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round"><path d="M9 5h12M9 12h12M9 19h12M3 3h1v4M3 10h2v2H3v2h2M3 17h2v4H3m0-2h2"/></svg>';
    button.title = fa ? 'فهرست سوره‌ها و آیات' : 'Surah and verse list';
    button.setAttribute('aria-label', button.title);
  });
}

if (typeof document !== 'undefined') init();
