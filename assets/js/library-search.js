import {normalize,suggest,categoryOrder,excerpt,selectPassage,highlightedParts} from './search-utils.mjs';

const form=document.getElementById('archive-search-form');
if(form){
  const query=document.getElementById('archive-query'),language=document.getElementById('search-language'),type=document.getElementById('search-type');
  const status=document.getElementById('search-status'),results=document.getElementById('search-results');
  document.getElementById('search-more').hidden=true;
  const params=new URLSearchParams(location.search);
  query.value=params.get('q')||'';
  language.value=params.get('lang')==='fa'||(!params.has('lang')&&/[\u0600-\u06ff]/.test(query.value))?'fa':'en';
  type.value=['Quran','Roots','Terminology','Articles','Reflection'].includes(params.get('type'))?params.get('type'):'';
  document.documentElement.lang=language.value;
  const fa=language.value==='fa';results.dir=fa?'rtl':'ltr';
  const labels=fa?{Quran:'متن آیات و ترجمه',Reflection:'تأویل و تأمل',Terminology:'مفاهیم قرآنی',Articles:'مقاله‌ها',Roots:'ریشه‌ها',Guide:'راهنما',Exact:'تطبیق دقیق عنوان'}:{Quran:'Verse text and translations',Reflection:'Ta’wil and reflections',Terminology:'Qur’an Terminology',Articles:'Articles',Roots:'Roots',Guide:'Guides',Exact:'Exact title match'};
  let generation=0,timer,enginePromise,manifestPromise,aliasPromise,vocabPromise,versesPromise;
  let failedGroups=0;
  const json=url=>fetch(url).then(r=>{if(!r.ok)throw Error('Could not load '+url);return r.json();});
  const manifest=()=>manifestPromise||(manifestPromise=json('/assets/data/library.json'));
  const verses=()=>versesPromise||(versesPromise=json('/assets/data/verses.json').catch(error=>{versesPromise=null;throw error;}));
  const engine=()=>enginePromise||(enginePromise=import('/pagefind/pagefind.js').then(async pf=>{await pf.options({excerptLength:35});return pf;}));
  function aliases(){return aliasPromise||(aliasPromise=new Promise((resolve,reject)=>{if(window.FORQAN_ROOT_SEARCH_DATA)return resolve(window.FORQAN_ROOT_SEARCH_DATA);const script=document.createElement('script');script.src='/assets/js/root-search-data.js';script.onload=()=>resolve(window.FORQAN_ROOT_SEARCH_DATA);script.onerror=reject;document.head.appendChild(script);}));}
  function href(value,highlight,kind){const url=new URL(value,location.origin);if(url.origin!==location.origin)return null;if(highlight)url.searchParams.set('highlight',highlight);if(kind==='Reflection')url.searchParams.set('in','reflection');return url.pathname+url.search+url.hash;}
  function card(record,container,raw){
    let passages=record.passages||[];
    if(typeof passages==='string'){try{passages=JSON.parse(passages);}catch{passages=[];}}
    const chosen=selectPassage(passages,raw,record.description,record.original||record.excerpt||'');
    const destination=new URL(record.url,location.origin);
    if(record.kind!=='Quran' && chosen.anchor)destination.hash=chosen.anchor;
    const target=href(destination.href,raw,record.kind);if(!target)return;
    const article=document.createElement('article');article.className='search-result';
    const meta=document.createElement('small');meta.textContent=(labels[record.kind]||labels.Guide)+' · '+(fa?'فارسی':'English');article.appendChild(meta);
    const heading=document.createElement('h3'),link=document.createElement('a');link.href=target;link.textContent=record.title;heading.appendChild(link);article.appendChild(heading);
    if(record.kind==='Quran' && record.arabic){
      const arabic=document.createElement('p');arabic.className='verse-arabic';arabic.lang='ar';arabic.dir='rtl';arabic.textContent=record.arabic;article.appendChild(arabic);
      if(record.translation){const translation=document.createElement('p');translation.className='verse-translation';translation.lang=language.value;translation.dir=fa?'rtl':'ltr';translation.textContent=record.translation;article.appendChild(translation);}
    }else{
      const body=chosen.text;
      if(body){const p=document.createElement('p');for(const part of highlightedParts(excerpt(body,raw,280),raw)){if(part.match){const mark=document.createElement('mark');mark.textContent=part.text;p.append(mark);}else p.append(document.createTextNode(part.text));}article.appendChild(p);}
    }
    if(record.rootMatch){const note=document.createElement('small');note.textContent=fa?'تطبیق با ریشهٔ نشانه‌گذاری‌شده در متن آیه':'Matched an annotated root in the verse text';article.appendChild(note);}
    container.appendChild(article);
  }
  function group(kind){const section=document.createElement('section');section.className='search-result-group';const h=document.createElement('h2');h.textContent=labels[kind];section.appendChild(h);const list=document.createElement('div');section.appendChild(list);results.appendChild(section);return {section,list};}
  async function renderGroup(kind,found,quick,raw,token,pinned){
    if(!found.length&&!quick.length)return;
    const {section,list}=group(kind);let cursor=0;const seen=new Set(pinned);
    quick.forEach(r=>{if(!seen.has(r.url)){seen.add(r.url);card(r,list,raw);}});
    const button=document.createElement('button');button.className='library-more';button.type='button';button.textContent=fa?'نتیجه‌های بیشتر در این بخش':'More '+labels[kind].toLowerCase();section.appendChild(button);
    async function load(){
      button.disabled=true;const checkpoint=cursor;
      try{
        let added=0;
        while(cursor<found.length&&added<5){
          const batch=found.slice(cursor,cursor+5-added);cursor+=batch.length;
          const records=await Promise.all(batch.map(r=>r.data()));if(token!==generation)return;
          records.forEach(r=>{const key=new URL(r.url,location.origin).pathname+new URL(r.url,location.origin).hash;if(seen.has(key))return;seen.add(key);added++;card({url:r.url,title:r.meta.title,kind,original:r.meta.original,passages:r.meta.passages,description:r.meta.description,verse:r.meta.verse,arabic:r.meta.arabic,translation:r.meta.translation},list,raw);});
        }
        button.hidden=cursor>=found.length;
        if(!list.children.length)section.hidden=true;
      }catch(error){cursor=checkpoint;if(token===generation){failedGroups++;section.hidden=false;button.textContent=fa?'بارگذاری انجام نشد؛ تلاش دوباره':'Could not load results. Retry';button.hidden=false;}}
      finally{button.disabled=false;}
    }
    button.addEventListener('click',load);await load();
  }
  async function correction(raw,token){
    if(type.value==='Roots')return;
    const vocabulary=await (vocabPromise||(vocabPromise=json('/assets/data/vocabulary-'+language.value+'.json')));
    if(token!==generation)return;
    const proposed=suggest(raw,vocabulary);if(!proposed)return;
    const pf=await engine();const check=await pf.search(proposed,{filters:type.value?{type:type.value}:{}});
    if(token!==generation||!check.results.length)return;
    const box=document.createElement('p');box.className='search-suggestion';box.append(document.createTextNode(fa?'آیا منظورتان این بود؟ ':'Did you mean '));
    const button=document.createElement('button');button.type='button';button.textContent=proposed;button.addEventListener('click',()=>{query.value=proposed;run();query.focus();});box.appendChild(button);results.prepend(box);
  }
  async function run(){
    const token=++generation;failedGroups=0;results.replaceChildren();
    const raw=query.value.trim(),q=normalize(raw);
    const url=new URL('/search/',location.origin);if(raw)url.searchParams.set('q',raw);url.searchParams.set('lang',language.value);if(type.value)url.searchParams.set('type',type.value);history.replaceState(null,'',url.pathname+url.search);
    if(!q){status.textContent=fa?'یک واژه، موضوع یا شماره آیه وارد کنید.':'Enter a word, topic, or verse reference. Try 2:2 or justice.';return;}
    status.textContent=fa?'در حال جستجو…':'Searching…';
    try{
      const data=await manifest();if(token!==generation)return;
      const published=data.pages.filter(p=>p.lang===language.value&&(!type.value||p.kind===type.value));
      const reference=q.match(/^(\d{1,3})\s*:\s*(\d{1,3})$/);
      if(reference){
        const surah=published.find(p=>p.kind==='Quran'&&Number(p.url.match(/\/(\d{3})-/)?.[1])===Number(reference[1]));
        const anchor=surah?.anchors?.find(id=>new RegExp('^ayah-0*'+Number(reference[2])+'$').test(id));
        if(anchor){const matched=(await verses()).find(v=>v.lang===language.value&&v.url===surah.url+'#'+anchor);if(token!==generation)return;const {list}=group('Quran');card(matched||{...surah,url:surah.url+'#'+anchor},list,'');status.textContent=fa?'آیه پیدا شد.':'Verse found.';}
        else {status.textContent=fa?'این آیه هنوز در آرشیو منتشر نشده است.':'This verse is not yet published in the archive.';if(surah){const {list}=group('Quran');card(surah,list,'');}}return;
      }
      const order=categoryOrder(raw,type.value);
      const pinned=new Set();
      const pf=await engine();if(token!==generation)return;
      const searches=await Promise.all(order.map(async kind=>{
        try{return {kind,found:(await pf.search(q,{filters:{type:kind}})).results};}
        catch(error){return {kind,found:[],failed:true};}
      }));
      if(token!==generation)return;
      let rootMatches=[],rootVerses=[];
      if(order.includes('Roots')||order.includes('Quran')){
        try{const rootData=await aliases();if(token!==generation)return;
          const matches=new Set(Object.entries(rootData.entries||{}).filter(([slug,terms])=>normalize(slug)===q||terms.some(t=>normalize(t)===q)).map(([slug])=>slug));
          rootMatches=published.filter(p=>p.kind==='Roots'&&matches.has(p.url.split('/').filter(Boolean).pop()));
          // Expand only explicit root forms, using annotations in the Arabic verse itself.
          const rootForm=/^[\u0600-\u06ff]{3,4}$/.test(q.replace(/\s/g,''))||/^(?:[a-z]+[ -]){2,3}[a-z]+$/i.test(raw.trim());
          if(rootForm&&matches.size&&order.includes('Quran'))rootVerses=(await verses()).filter(v=>v.lang===language.value&&v.roots.some(r=>matches.has(r))).map(v=>({...v,rootMatch:true}));

        }catch(_){/* Full text search remains available if optional aliases fail. */}
      }
      for(const {kind,found,failed} of searches){
        if(token!==generation)return;
        if(failed){
          failedGroups++;
          const {section}=group(kind);const retry=document.createElement('button');retry.type='button';retry.className='library-more';retry.textContent=fa?'بارگذاری این بخش انجام نشد؛ تلاش دوباره':'This section could not load. Retry';retry.addEventListener('click',run);section.appendChild(retry);
        }
        // Exact titles stay within their category, never above verse-text matches.
        const exact=published.filter(p=>p.kind===kind&&kind!=='Quran'&&normalize(p.title)===q);
        const quick=kind==='Roots'?[...exact,...rootMatches]:kind==='Quran'?rootVerses:exact;
        await renderGroup(kind,found,quick,raw,token,pinned);
      }
      if(token!==generation)return;
      const hasResults=results.querySelector('.search-result');
      status.textContent=hasResults?(fa?'نتایج در مطالب منتشرشدهٔ این مجموعه.':'Results from published content in this archive.'):(fa?'نتیجه‌ای پیدا نشد. واژه‌ای کوتاه‌تر یا زبان دیگر را امتحان کنید.':'No results. Try a shorter phrase or the other language.');
      if(type.value)status.textContent=hasResults?(fa?'نتیجه‌های مرتبط در بخش انتخاب‌شده.':'Relevant results in your selected category.') : status.textContent;
      if(failedGroups)status.textContent=fa?'بعضی بخش‌ها بارگذاری نشدند؛ از دکمهٔ تلاش دوباره استفاده کنید.':'Some sections could not load. Use their Retry buttons.';
      if(!hasResults&&!failedGroups)await correction(raw,token).catch(()=>{});
    }catch(error){if(token!==generation)return;status.textContent=fa?'جستجو در دسترس نیست. دوباره تلاش کنید.':'Search could not load. Please try again.';const retry=document.createElement('button');retry.type='button';retry.className='library-more';retry.textContent=fa?'تلاش دوباره':'Retry search';retry.addEventListener('click',run);results.appendChild(retry);enginePromise=null;manifestPromise=null;vocabPromise=null;aliasPromise=null;}
  }
  form.addEventListener('submit',e=>{e.preventDefault();clearTimeout(timer);run();});
  query.addEventListener('input',()=>{clearTimeout(timer);timer=setTimeout(run,250);});
  type.addEventListener('change',()=>{clearTimeout(timer);run();});
  language.addEventListener('change',()=>{const u=new URL('/search/',location.origin);u.searchParams.set('q',query.value);u.searchParams.set('lang',language.value);if(type.value)u.searchParams.set('type',type.value);try{localStorage.setItem('forqan-language',language.value);}catch(_){}location.assign(u.pathname+u.search);});
  run();
}
