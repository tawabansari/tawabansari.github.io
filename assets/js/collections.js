import {browse,initial} from './collection-browser.mjs';
import {initStudyPreviews} from './study-preview.mjs';
(function () {
  'use strict';
  const directory = document.querySelector('.collection-directory');
  const key = 'forqan-collection-context';
  if (directory) {
    const list=directory.querySelector('.study-list');
    if(list){
      const fa=directory.lang==='fa',concepts=directory.dataset.collection==='terminology';
      const rows=Array.from(list.children).map(element=>({element,search:element.dataset.search,initial:element.dataset.initial}));
      const controls=directory.querySelector('.collection-browser-controls');
      const pagination=directory.querySelector('.collection-pagination');
      const form=document.createElement('form');form.setAttribute('role','search');
      const label=document.createElement('label');label.htmlFor='collection-filter';label.textContent=fa?(concepts?'یافتن مفهوم':'یافتن نوشته'):(concepts?'Find a concept':'Find a study');
      const input=document.createElement('input');input.id='collection-filter';input.type='search';input.dir='auto';input.autocomplete='off';
      const reset=document.createElement('button');reset.type='button';reset.textContent=fa?'پاک کردن':'Clear';
      form.append(label,input,reset);controls.appendChild(form);
      const alphabet=document.createElement('nav');alphabet.className='collection-alphabet';alphabet.setAttribute('aria-label',fa?'فیلتر الفبایی':'Filter by first letter');
      if(concepts)controls.appendChild(alphabet);
      const status=document.createElement('p');status.className='collection-result-count';status.setAttribute('role','status');controls.appendChild(status);
      let letter='',page=1;
      const size=concepts?24:10;
      const letters=[...new Set(rows.map(r=>initial(r.initial)))];
      function button(text,action){const b=document.createElement('button');b.type='button';b.textContent=text;b.addEventListener('click',action);return b;}
      function render(write=false){
        directory.dispatchEvent(new Event('collection-render'));
        const view=browse(rows,{query:input.value,letter,page,size});page=view.page;
        rows.forEach(r=>r.element.hidden=!view.visible.includes(r));
        status.textContent=fa?`${view.total} نتیجه · صفحهٔ ${page} از ${view.pages}`:`${view.total} results · Page ${page} of ${view.pages}`;
        alphabet.replaceChildren();
        if(concepts)for(const value of ['',...letters]){const b=button(value?value.toLocaleUpperCase():fa?'همه':'All',()=>{letter=value;page=1;render(true);Array.from(alphabet.children).find(x=>x.dataset.letter===value)?.focus();});b.dataset.letter=value;b.setAttribute('aria-pressed',String(letter===value));alphabet.appendChild(b);}
        pagination.replaceChildren();pagination.hidden=view.pages<=1;
        function go(n){page=n;render(true);input.focus({preventScroll:true});controls.scrollIntoView({block:'start'});}
        const prev=button(fa?'قبلی':'Previous',()=>go(page-1));prev.disabled=page===1;pagination.appendChild(prev);
        const numbers=[...new Set([1,page-1,page,page+1,view.pages])].filter(n=>n>=1&&n<=view.pages).sort((a,b)=>a-b);
        let previous=0;
        for(const n of numbers){if(previous&&n>previous+1){const dots=document.createElement('span');dots.textContent='…';pagination.appendChild(dots);}const b=button(String(n),()=>go(n));b.setAttribute('aria-label',(fa?'صفحهٔ ':'Page ')+n);if(n===page)b.setAttribute('aria-current','page');pagination.appendChild(b);previous=n;}
        const next=button(fa?'بعدی':'Next',()=>go(page+1));next.disabled=page===view.pages;pagination.appendChild(next);
        if(write){const url=new URL(location.href);url.hash='';for(const k of ['q','letter','page'])url.searchParams.delete(k);if(input.value.trim())url.searchParams.set('q',input.value.trim());if(letter)url.searchParams.set('letter',letter);if(page>1)url.searchParams.set('page',String(page));history.replaceState(null,'',url.pathname+url.search);}
      }
      function restore(){const params=new URLSearchParams(location.search);input.value=params.get('q')||'';letter=concepts&&letters.includes(initial(params.get('letter')||''))?initial(params.get('letter')):'';page=Number(params.get('page')||1);render();
        const target=rows.find(r=>'#'+r.element.id===location.hash);
        if(target){const view=browse(rows,{query:input.value,letter,page,size});const position=view.filtered.indexOf(target);if(position>=0){page=Math.floor(position/size)+1;render();target.element.scrollIntoView({block:'start'});}}
      }
      form.addEventListener('submit',e=>{e.preventDefault();page=1;render(true);});input.addEventListener('input',()=>{page=1;render(true);});reset.addEventListener('click',()=>{input.value='';letter='';page=1;render(true);input.focus();});
      window.addEventListener('popstate',restore);window.addEventListener('pageshow',e=>{if(e.persisted)restore();});restore();
    }
    initStudyPreviews(directory);
    directory.addEventListener('click', function (event) {
      if(event.defaultPrevented)return;
      const link = event.target.closest('a[data-study-link]');
      if (!link) return;
      const row = link.closest('.study-row');
      try {
        sessionStorage.setItem(key, JSON.stringify({
          study: new URL(link.href).pathname,
          list: location.pathname,
          search: location.search,
          anchor: row.id,
          at: Date.now()
        }));
      } catch (_) {}
    });
    // Native history restores scrolling; an explicit return link uses the row anchor.
    if (location.hash.startsWith('#study-')) {
      const row = document.getElementById(location.hash.slice(1));
      const link = row && row.querySelector('a[data-study-link]');
      if (link) link.focus({preventScroll:true});
    }
  }
  const back = document.querySelector('.study-back');
  if (!back) return;
  try {
    const context = JSON.parse(sessionStorage.getItem(key) || 'null');
    const referrer = document.referrer ? new URL(document.referrer) : null;
    if (context && context.study === location.pathname && Date.now() - context.at < 1800000 &&
        /^\/(en|fa)\/(quran-terminology|quran-completeness|hadith-critique|articles\/reflections|salat|zakat)\/$/.test(context.list) &&
        /^study-[a-z0-9-]+$/.test(context.anchor) && referrer &&
        referrer.origin === location.origin && referrer.pathname === context.list) {
      const saved=new URLSearchParams(context.search||'');const safe=new URLSearchParams();for(const name of ['q','letter','page'])if(saved.has(name))safe.set(name,saved.get(name));
      back.href = context.list + (safe.size?'?'+safe.toString():'') + '#' + context.anchor;
      back.hidden = false;
    }
  } catch (_) {}
}());
