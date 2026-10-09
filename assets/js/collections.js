import {browse,initial} from './collection-browser.mjs';
import {initStudyPreviews} from './study-preview.mjs';
(function () {
  'use strict';
  const directory=document.querySelector('.collection-directory');
  const key='forqan-collection-context';
  if(directory){
    const list=directory.querySelector('.study-list');
    if(list){
      const fa=directory.lang==='fa',concepts=directory.dataset.collection==='terminology';
      const reflections=directory.dataset.collection==='reflections';
      const defaultSort=concepts?'alphabetical':reflections?'newest':'suggested';
      const sorts=concepts?['alphabetical']:reflections?['newest','alphabetical']:['suggested','alphabetical'];
      const rows=Array.from(list.children).map(element=>({element,...element.dataset}));
      const controls=directory.querySelector('.collection-browser-controls');
      const form=document.createElement('form');form.setAttribute('role','search');
      const label=document.createElement('label');label.htmlFor='collection-filter';label.textContent=fa?(concepts?'یافتن مفهوم':'یافتن نوشته'):(concepts?'Find a concept':'Find a study');
      const input=document.createElement('input');input.id='collection-filter';input.type='search';input.dir='auto';input.autocomplete='off';
      const reset=document.createElement('button');reset.type='button';reset.textContent=fa?'پاک کردن':'Clear';
      form.append(label,input,reset);controls.appendChild(form);
      const tools=document.createElement('div');tools.className='collection-browse-tools';controls.appendChild(tools);
      const status=directory.querySelector('.collection-count');status.className='collection-result-count';status.setAttribute('role','status');tools.appendChild(status);
      const select=document.createElement('select');select.id='collection-sort';
      for(const value of sorts){const option=document.createElement('option');option.value=value;option.textContent=({alphabetical:fa?'الفبایی':'Alphabetical',newest:fa?'تازه‌ترین‌ها':'Newest first',suggested:fa?'ترتیب پیشنهادی مطالعه':'Suggested reading order'})[value];select.appendChild(option);}
      if(!concepts){const sortLabel=document.createElement('label');sortLabel.htmlFor=select.id;sortLabel.textContent=fa?'ترتیب:':'Sort:';sortLabel.appendChild(select);tools.appendChild(sortLabel);}
      const alphabet=document.createElement('nav');alphabet.className='collection-alphabet';alphabet.setAttribute('aria-label',fa?'رفتن به حرف':'Jump to a letter');
      if(concepts)controls.appendChild(alphabet);
      const empty=document.createElement('p');empty.className='collection-empty';empty.textContent=fa?'نوشته‌ای پیدا نشد. عبارت دیگری را امتحان کنید یا جستجو را پاک کنید.':'No studies found. Try another term or clear your search.';empty.hidden=true;list.after(empty);
      const number=n=>n.toLocaleString(fa?'fa':'en');
      function writeURL(){
        const url=new URL(location.href);url.hash='';
        for(const name of ['q','sort','page','letter'])url.searchParams.delete(name);
        if(input.value.trim())url.searchParams.set('q',input.value.trim());
        if(select.value!==defaultSort)url.searchParams.set('sort',select.value);
        history.replaceState(null,'',url.pathname+url.search);
      }
      function render(write=false){
        directory.dispatchEvent(new Event('collection-render'));
        const view=browse(rows,{query:input.value,sort:select.value,lang:directory.lang});
        const visible=new Set(view.visible);
        rows.forEach(row=>{row.element.hidden=!visible.has(row);});
        for(const row of view.visible)list.appendChild(row.element);
        status.textContent=input.value.trim()?(fa?`${number(view.total)} نتیجه از ${number(rows.length)} نوشته`:`${number(view.total)} of ${number(rows.length)} studies`):(fa?`${number(rows.length)} نوشته`:`${number(rows.length)} studies`);
        empty.hidden=view.total>0;
        alphabet.replaceChildren();
        if(concepts){
          const prompt=document.createElement('span');prompt.textContent=fa?'رفتن به حرف:':'Jump to:';alphabet.appendChild(prompt);
          const letters=new Map();for(const row of view.visible){const letter=initial(row.initial);if(!letters.has(letter))letters.set(letter,row);}
          for(const [letter,row] of letters){
            const jump=document.createElement('a');jump.href='#'+row.element.id;jump.textContent=letter.toLocaleUpperCase(directory.lang);
            jump.addEventListener('click',event=>{if(event.button||event.metaKey||event.ctrlKey||event.shiftKey||event.altKey)return;event.preventDefault();history.replaceState(null,'',location.pathname+location.search+jump.hash);row.element.scrollIntoView({block:'start'});row.element.querySelector('[data-study-link]').focus({preventScroll:true});});
            alphabet.appendChild(jump);
          }
          alphabet.hidden=view.total===0;
        }
        if(write)writeURL();
      }
      function restore(){
        const params=new URLSearchParams(location.search);input.value=params.get('q')||'';
        select.value=sorts.includes(params.get('sort'))?params.get('sort'):defaultSort;render();
        // Older letter-filtered URLs still reach the corresponding title.
        const letter=initial(params.get('letter')||'');
        const visible=browse(rows,{query:input.value,sort:select.value,lang:directory.lang}).visible;
        const target=visible.find(row=>'#'+row.element.id===location.hash)||(concepts&&letter?visible.find(row=>initial(row.initial)===letter):null);
        if(target)target.element.scrollIntoView({block:'start'});
      }
      form.addEventListener('submit',event=>{event.preventDefault();render(true);});
      input.addEventListener('input',()=>render(true));select.addEventListener('change',()=>render(true));
      reset.addEventListener('click',()=>{input.value='';render(true);input.focus();});
      window.addEventListener('popstate',restore);window.addEventListener('pageshow',event=>{if(event.persisted)restore();});restore();
    }
    initStudyPreviews(directory);
    directory.addEventListener('click',event=>{
      if(event.defaultPrevented)return;
      const link=event.target.closest('a[data-study-link]');if(!link)return;
      const anchor=link.dataset.studyAnchor||link.closest('.study-row')?.id;if(!anchor)return;
      try{sessionStorage.setItem(key,JSON.stringify({study:new URL(link.href).pathname,list:location.pathname,search:location.search,anchor,at:Date.now()}));}catch(_){}
    });
    if(location.hash.startsWith('#study-'))document.getElementById(location.hash.slice(1))?.querySelector('a[data-study-link]')?.focus({preventScroll:true});
  }
  const back=document.querySelector('.study-back');if(!back)return;
  try{
    const context=JSON.parse(sessionStorage.getItem(key)||'null');
    const referrer=document.referrer?new URL(document.referrer):null;
    if(context&&context.study===location.pathname&&Date.now()-context.at<1800000&&
      /^\/(en|fa)\/(quran-terminology|quran-completeness|hadith-critique|articles\/reflections|salat|zakat)\/$/.test(context.list)&&
      /^study-[a-z0-9-]+$/.test(context.anchor)&&referrer&&referrer.origin===location.origin&&referrer.pathname===context.list){
      const saved=new URLSearchParams(context.search||''),safe=new URLSearchParams();
      for(const name of ['q','sort','letter','page'])if(saved.has(name))safe.set(name,saved.get(name));
      back.href=context.list+(safe.size?'?'+safe.toString():'')+'#'+context.anchor;back.hidden=false;
    }
  }catch(_){}
}());
