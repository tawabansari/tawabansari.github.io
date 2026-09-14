import {normalize} from './search-utils.mjs';

export function findChapter(chapters, query) {
  const key = normalize(query).trim();
  return chapters.find(s => [String(s.number), s.slug, s.enName, s.faName,
    `${s.number}. ${s.enName}`, `${s.number}. ${s.faName}`].some(value => normalize(value) === key));
}
export function verseTarget(chapter, value, available, lang) {
  const digits = String(value).trim().replace(/[۰-۹]/g, d => String(d.charCodeAt(0)-1776)).replace(/[٠-٩]/g, d => String(d.charCodeAt(0)-1632));
  if (!/^\d+$/.test(digits)) return null;
  const anchor = `ayah-${String(Number(digits)).padStart(3, '0')}`;
  return available[chapter.slug]?.includes(anchor) ? `/quran-reflection/${lang}/${chapter.slug}/#${anchor}` : null;
}

function init() {
  const match = location.pathname.match(/^\/quran-reflection\/(en|fa)\/(surahs|\d{3}-[^/]+)\//);
  if (!match) return;
  const lang = match[1], fa = lang === 'fa';
  const available = window.FORQAN_READING_AVAILABILITY?.[lang];
  if (!available) return;
  const chapters = (window.FORQAN_QURAN_NAV || []).filter(s => available[s.slug]?.length);
  if (!chapters.length) return;
  const host = document.querySelector('.surah-index-tools,.surah-header-block');
  if (!host) return;
  const digits = value => fa ? String(value).replace(/\d/g, d => '۰۱۲۳۴۵۶۷۸۹'[d]) : String(value);
  const label = s => `${digits(s.number)}. ${fa ? s.faName : s.enName}`;
  const form = document.createElement('form');
  form.id = 'verse-picker'; form.className = 'verse-picker'; form.dir = fa ? 'rtl' : 'ltr';
  form.dataset.pagefindIgnore = '';
  form.setAttribute('aria-label', fa ? 'رفتن به آیه' : 'Go to verse');
  function picker(name, title, numeric = false) {
    const wrapper = document.createElement('div'); wrapper.className = 'verse-picker-field';
    const caption = document.createElement('span'); caption.textContent = title;
    const details = document.createElement('details');
    const summary = document.createElement('summary'); summary.setAttribute('aria-label', title);
    const panel = document.createElement('div'); panel.className = 'verse-picker-panel';
    const input = document.createElement('input'); input.type = 'search'; input.autocomplete = 'off';
    input.placeholder = fa ? 'جستجو…' : 'Find…'; input.setAttribute('aria-label', `${title}: ${input.placeholder}`);
    if(numeric) input.inputMode = 'numeric';
    const list = document.createElement('div'); list.className = 'verse-picker-options';
    panel.append(input,list); details.append(summary,panel); wrapper.append(caption,details); form.append(wrapper);
    let items = [], choose;
    function render() {
      list.replaceChildren();
      const query = normalize(input.value);
      const matches = items.filter(item => normalize(item.search || item.label).includes(query));
      for(const item of matches) {
        const button = document.createElement('button'); button.type = 'button'; button.textContent = item.label;
        button.addEventListener('click', () => {summary.textContent = item.label; details.open = false; choose(item); summary.focus();});
        list.append(button);
      }
      if(!matches.length) {const empty=document.createElement('p'); empty.textContent=fa?'نتیجه‌ای نیست':'No matches'; list.append(empty);}
    }
    details.addEventListener('toggle', () => {if(details.open){form.querySelectorAll('details').forEach(other=>{if(other!==details)other.open=false;});input.value='';render();}});
    input.addEventListener('input',render);
    input.addEventListener('keydown',event=>{if(event.key==='Enter'||event.key==='ArrowDown'){event.preventDefault();list.querySelector('button')?.focus();}});
    details.addEventListener('keydown',event=>{if(event.key==='Escape'){details.open=false;summary.focus();}});
    document.addEventListener('click',event=>{if(!details.contains(event.target))details.open=false;});
    return {summary, set(next, callback){items=next;choose=callback;render();}};
  }
  const chapterPicker = picker('chapter',fa?'سوره':'Chapter');
  const versePicker = picker('verse',fa?'آیه':'Verse',true);
  const go = document.createElement('button'); go.type='submit'; go.className='verse-picker-go'; go.textContent=fa?'برو':'Go'; form.append(go);
  let selected, selectedVerse;
  function updateChapter(chapter) {
    selected=chapter; chapterPicker.summary.textContent=label(chapter);
    const verses=available[chapter.slug].map(anchor=>({label:digits(Number(anchor.slice(5))),number:Number(anchor.slice(5))}));
    selectedVerse=verses[0].number; versePicker.summary.textContent=verses[0].label;
    versePicker.set(verses,item=>{selectedVerse=item.number;});
  }
  chapterPicker.set(chapters.map(chapter=>({label:label(chapter),chapter,search:[label(chapter),chapter.enName,chapter.faName,chapter.aliases,chapter.enMeaning,chapter.faMeaning].join(' ')})), item=>updateChapter(item.chapter));
  updateChapter(chapters.find(s=>s.slug===match[2])||chapters[0]);
  const currentVerse=location.hash.match(/^#ayah-(\d+)$/);
  if(currentVerse && verseTarget(selected,currentVerse[1],available,lang)){selectedVerse=Number(currentVerse[1]);versePicker.summary.textContent=digits(selectedVerse);}
  form.addEventListener('submit',event=>{event.preventDefault();const target=verseTarget(selected,selectedVerse,available,lang);if(target)location.assign(target);});
  if (match[2] === 'surahs') {
    host.prepend(form);
    const oldSearch = document.getElementById('surahSearch');
    if(oldSearch) oldSearch.hidden = true;
  } else {
    host.insertAdjacentElement('afterend', form);
    // Keep navigation reachable when the header returns on upward scrolling.
    const primary = document.querySelector('.library-primary');
    if(primary) {const button = document.createElement('button'); button.type = 'button'; button.className = 'verse-picker-trigger'; button.textContent = fa ? 'آیه' : 'Verse'; button.addEventListener('click', () => {const trigger = document.querySelector('.quran-nav-trigger'); if(trigger)trigger.click(); else {form.scrollIntoView({block:'center'}); chapterPicker.summary.focus({preventScroll:true});}}); primary.append(button);}
  }
}
if (typeof document !== 'undefined') init();
