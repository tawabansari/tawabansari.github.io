import {normalize as normalizeSearch} from './search-utils.mjs';
(function () {
  'use strict';
  const settings = document.querySelector('.reading-settings');
  document.addEventListener('keydown', e => { if (e.key === 'Escape' && settings) settings.open = false; });
  document.addEventListener('click', e => { if (settings && !settings.contains(e.target)) settings.open = false; });
  const spacing = document.getElementById('reading-spacing');
  if (spacing) {
    try { spacing.value = localStorage.getItem('forqan-spacing') === 'relaxed' ? 'relaxed' : 'normal'; } catch (_) {}
    document.body.dataset.readingSpacing = spacing.value;
    spacing.addEventListener('change', () => { document.body.dataset.readingSpacing = spacing.value; try { localStorage.setItem('forqan-spacing', spacing.value); } catch (_) {} });
  }
  const continuation = document.getElementById('library-continue');
  if (continuation) ['en', 'fa'].forEach(lang => {
    try {
      const saved = JSON.parse(localStorage.getItem('forqan-last-reading-page-' + lang));
      if (!saved || !saved.url || !saved.title) return;
      const url = new URL(saved.url, location.origin);
      if (url.origin !== location.origin || !url.pathname.startsWith('/quran-reflection/')) return;
      const link = document.createElement('a'); link.href = url.pathname + url.hash;
      link.textContent = (lang === 'fa' ? 'ادامه مطالعه: ' : 'Continue reading: ') + saved.title;
      link.lang = lang; link.dir = lang === 'fa' ? 'rtl' : 'ltr'; continuation.appendChild(link); continuation.hidden = false;
    } catch (_) {}
  });
}());

(function () {
  'use strict';
  const fa = document.documentElement.lang === 'fa';
  const main = document.getElementById('main-content');
  if (!main) return;
  function reveal(target) {
    let parent=target.parentElement;
    while(parent){if(parent.tagName==='DETAILS')parent.open=true;parent=parent.parentElement;}
    target.scrollIntoView({behavior:matchMedia('(prefers-reduced-motion: reduce)').matches?'auto':'smooth',block:'start'});
  }
  const isDirectory=/\/(roots|surahs)\/$/.test(location.pathname);
  if (isDirectory) {
    const root=main.querySelector('.root-index-page,.surah-index-page');
    if(root){
      const unavailable=Array.from(root.querySelectorAll('[data-unpublished-url]'));
      unavailable.forEach(a=>{const card=a.closest('li')||a;card.classList.add('unpublished-entry');});
      const controls=document.createElement('div');controls.className='library-availability-controls';
      const label=document.createElement('label');const check=document.createElement('input');check.type='checkbox';check.id='published-only';check.checked=true;
      label.append(check,document.createTextNode(fa?' فقط مطالب منتشرشده':' Published studies only'));controls.appendChild(label);
      const note=document.createElement('span');note.className='availability-note';note.textContent=fa?'مدخل‌های منتشرنشده پیوند فعال ندارند.':'Unpublished entries are labeled and have no active link.';controls.appendChild(note);
      const hero=root.querySelector('.root-index-hero,.surah-index-tools');(hero||root.firstElementChild).insertAdjacentElement('afterend',controls);
      const search=root.querySelector('.root-search,#surahSearch');
      function filter(){
        root.querySelectorAll('.unpublished-entry').forEach(e=>e.classList.toggle('availability-hidden',check.checked));
        root.querySelectorAll('.root-letter-group').forEach(group=>{group.classList.toggle('availability-hidden',check.checked && !group.querySelector('li:not(.unpublished-entry)'));});
        const counter=root.querySelector('#surahSearchCount');
        if(counter){const visible=Array.from(root.querySelectorAll('.landing-card')).filter(e=>!e.classList.contains('availability-hidden') && e.style.display!=='none' && !e.hidden);counter.textContent=visible.length+(fa?' سوره':' surahs shown');}
      }
      check.addEventListener('change',()=>{filter();if(search)search.dispatchEvent(new Event('input'));});
      if(search)search.addEventListener('input',()=>setTimeout(filter,100));
      filter();if(search)search.dispatchEvent(new Event('input'));
    }
    return;
  }
  const study=main.querySelector('article,.root-study-page,.forqan-page-ltr,.forqan-page-rtl');
  if(!study || location.pathname==='/search/')return;
  const headings=Array.from(study.querySelectorAll('h2,h3')).filter(h=>h.textContent.trim() && !h.closest('nav'));
  if(headings.length>=3){
    const contents=document.createElement('details');contents.className='library-toc';contents.dataset.pagefindIgnore='';
    const summary=document.createElement('summary');summary.textContent=fa?'در این مطالعه':'In this study';contents.appendChild(summary);
    const list=document.createElement('ol');
    headings.forEach((heading,index)=>{
      if(!heading.id){let id='study-section-'+(index+1);while(document.getElementById(id))id+='-';heading.id=id;}
      const li=document.createElement('li');if(heading.tagName==='H3')li.className='toc-child';const a=document.createElement('a');a.href='#'+encodeURIComponent(heading.id);a.textContent=heading.textContent.trim();a.addEventListener('click',()=>reveal(heading));li.appendChild(a);list.appendChild(li);
    });contents.appendChild(list);
    const title=study.querySelector('h1');const hero=title?.closest('header,.root-hero,.surah-header-block');(hero||title||study.firstElementChild).insertAdjacentElement('afterend',contents);
  }
  const paragraphs=Array.from(study.querySelectorAll('p,li')).filter(p=>!p.closest('.library-toc,nav') && !p.querySelector('p,li') && p.textContent.trim().length>15);
  if(paragraphs.length>10){
    const form=document.createElement('form');form.className='library-find';form.dataset.pagefindIgnore='';
    const input=document.createElement('input');input.type='search';input.placeholder=fa?'جستجو در این مطالعه…':'Find in this study…';input.setAttribute('aria-label',input.placeholder);input.dir='auto';
    const button=document.createElement('button');button.type='submit';button.textContent=fa?'بعدی':'Find next';
    const status=document.createElement('span');status.className='library-find-status';status.setAttribute('role','status');
    form.append(input,button,status);const toc=study.querySelector('.library-toc');(toc||study.querySelector('h1')||study.firstElementChild).insertAdjacentElement('afterend',form);
    let matches=[],index=-1,last='';
    const normalize=normalizeSearch;
    form.addEventListener('submit',e=>{e.preventDefault();const q=normalize(input.value.trim());study.querySelectorAll('.library-found').forEach(p=>p.classList.remove('library-found'));if(!q){status.textContent='';return;}if(q!==last){matches=paragraphs.filter(p=>normalize(p.textContent).includes(q));index=-1;last=q;}if(!matches.length){status.textContent=fa?'نتیجه‌ای نیست':'No matches';return;}index=(index+1)%matches.length;matches[index].classList.add('library-found');reveal(matches[index]);status.textContent=(index+1)+' / '+matches.length;});
  }
  const highlight=new URLSearchParams(location.search).get('highlight');
  let anchor=null;
  try { anchor=document.getElementById(decodeURIComponent(location.hash.slice(1))); } catch (_) {}
  if(highlight){
    const tokens=normalizeSearch(highlight).split(' ').filter(Boolean);
    const target=paragraphs.find(p=>tokens.every(t=>normalizeSearch(p.textContent).includes(t))) || paragraphs.find(p=>tokens.some(t=>normalizeSearch(p.textContent).includes(t)));
    if(target)target.classList.add('library-found');
    if(anchor||target)reveal(anchor||target);
  } else if(anchor) reveal(anchor);
}());
