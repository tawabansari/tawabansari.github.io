import {browse,initial,availableLetters} from './collection-browser.mjs';
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
      const label=document.createElement('label');label.htmlFor='collection-filter';label.className='visually-hidden';label.textContent=fa?(concepts?'یافتن مفهوم':'یافتن نوشته'):(concepts?'Find a concept':'Find a study');
      const input=document.createElement('input');input.id='collection-filter';input.type='search';input.dir='auto';input.autocomplete='off';input.placeholder=label.textContent+'…';
      const letters=availableLetters(rows,directory.lang);
      const letter=document.createElement('select');letter.id='collection-letter';
      for(const value of ['',...letters]){const option=document.createElement('option');option.value=value;option.textContent=value?value.toLocaleUpperCase(directory.lang):(fa?'همهٔ حروف':'All letters');letter.appendChild(option);}
      const letterLabel=document.createElement('label');letterLabel.htmlFor=letter.id;letterLabel.className='visually-hidden';letterLabel.textContent=fa?'حرف اول عنوان':'First letter of title';
      const reset=document.createElement('button');reset.type='button';reset.className='collection-reset';reset.textContent='×';reset.title=fa?'پاک کردن فیلترها':'Clear filters';reset.setAttribute('aria-label',reset.title);
      const searchField=document.createElement('div');searchField.className='collection-search-field';searchField.append(label,input,reset);
      form.append(letterLabel,letter,searchField);controls.appendChild(form);
      const tools=document.createElement('div');tools.className='collection-browse-tools';controls.appendChild(tools);
      const status=directory.querySelector('.collection-count');status.className='collection-result-count';status.setAttribute('role','status');tools.appendChild(status);
      const formats=['all',...['book','study','essay'].filter(value=>rows.some(row=>row.format===value))];
      const format=document.createElement('select');format.id='collection-format';
      for(const value of formats){const option=document.createElement('option');option.value=value;option.textContent=({all:fa?'همه':'All',book:fa?'کتاب‌ها':'Books',study:fa?'پژوهش‌ها':'Studies',essay:fa?'مقاله‌ها':'Articles'})[value];format.appendChild(option);}
      if(formats.length>2){const label=document.createElement('label');label.htmlFor=format.id;label.textContent=fa?'نوع:':'Type:';label.appendChild(format);tools.appendChild(label);}
      const select=document.createElement('select');select.id='collection-sort';
      for(const value of sorts){const option=document.createElement('option');option.value=value;option.textContent=({alphabetical:fa?'الفبایی':'Alphabetical',newest:fa?'تازه‌ترین‌ها':'Newest first',suggested:fa?'ترتیب پیشنهادی مطالعه':'Suggested reading order'})[value];select.appendChild(option);}
      if(!concepts){const sortLabel=document.createElement('label');sortLabel.htmlFor=select.id;sortLabel.textContent=fa?'ترتیب:':'Sort:';sortLabel.appendChild(select);tools.appendChild(sortLabel);}
      const empty=document.createElement('p');empty.className='collection-empty';empty.textContent=fa?'نوشته‌ای پیدا نشد. حرف یا عبارت دیگری را انتخاب کنید یا فیلترها را پاک کنید.':'No studies found. Try a different letter or term, or clear the filters.';empty.hidden=true;list.after(empty);
      const number=n=>n.toLocaleString(fa?'fa':'en');
      function writeURL(){
        const url=new URL(location.href);url.hash='';
        for(const name of ['q','sort','format','page','letter'])url.searchParams.delete(name);
        if(input.value.trim())url.searchParams.set('q',input.value.trim());
        if(select.value!==defaultSort)url.searchParams.set('sort',select.value);
        if(format.value!=='all')url.searchParams.set('format',format.value);
        if(letter.value)url.searchParams.set('letter',letter.value);
        history.replaceState(null,'',url.pathname+url.search);
      }
      function render(write=false){
        directory.dispatchEvent(new Event('collection-render'));
        const view=browse(rows,{query:input.value,sort:select.value,lang:directory.lang,format:format.value,letter:letter.value});
        const visible=new Set(view.visible);
        rows.forEach(row=>{row.element.hidden=!visible.has(row);});
        for(const row of view.visible)list.appendChild(row.element);
        const filtered=input.value.trim()||format.value!=='all'||letter.value;
        status.textContent=filtered?(fa?`${number(view.total)} نتیجه از ${number(rows.length)} نوشته`:`${number(view.total)} of ${number(rows.length)} studies`):(fa?`${number(rows.length)} نوشته`:`${number(rows.length)} studies`);
        reset.disabled=!filtered;
        empty.hidden=view.total>0;
        if(write)writeURL();
        return view;
      }
      function restore(){
        const params=new URLSearchParams(location.search);input.value=params.get('q')||'';
        format.value=formats.includes(params.get('format'))?params.get('format'):'all';
        const savedLetter=initial(params.get('letter'));letter.value=letters.includes(savedLetter)?savedLetter:'';
        select.value=sorts.includes(params.get('sort'))?params.get('sort'):defaultSort;
        const target=render().visible.find(row=>'#'+row.element.id===location.hash);
        if(target)target.element.scrollIntoView({block:'start'});
      }
      form.addEventListener('submit',event=>{event.preventDefault();render(true);});
      input.addEventListener('input',()=>render(true));select.addEventListener('change',()=>render(true));format.addEventListener('change',()=>render(true));letter.addEventListener('change',()=>render(true));
      reset.addEventListener('click',()=>{input.value='';letter.value='';format.value='all';render(true);input.focus();});
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
      for(const name of ['q','sort','format','letter','page'])if(saved.has(name))safe.set(name,saved.get(name));
      back.href=context.list+(safe.size?'?'+safe.toString():'')+'#'+context.anchor;back.hidden=false;
    }
  }catch(_){}
}());
