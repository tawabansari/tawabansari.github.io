import {normalize,suggest,categoryOrder,excerpt} from './search-utils.mjs';

const form=document.getElementById('archive-search-form');
if(form){
  const query=document.getElementById('archive-query'),language=document.getElementById('search-language'),type=document.getElementById('search-type');
  const status=document.getElementById('search-status'),results=document.getElementById('search-results');
  document.getElementById('search-more').hidden=true;
  const params=new URLSearchParams(location.search);
  query.value=params.get('q')||'';
  language.value=params.get('lang')==='fa'||(!params.has('lang')&&/[\u0600-\u06ff]/.test(query.value))?'fa':'en';
  type.value=['Quran','Roots','Articles'].includes(params.get('type'))?params.get('type'):'';
  document.documentElement.lang=language.value;
  const fa=language.value==='fa';results.dir=fa?'rtl':'ltr';
  const labels=fa?{Quran:'آیات و تأمل قرآنی',Articles:'مقاله‌ها',Roots:'ریشه‌ها',Guide:'راهنما',Exact:'تطبیق دقیق عنوان'}:{Quran:'Qur’an passages',Articles:'Articles',Roots:'Roots',Guide:'Guides',Exact:'Exact title match'};
  let generation=0,timer,enginePromise,manifestPromise,aliasPromise,vocabPromise;
  const json=url=>fetch(url).then(r=>{if(!r.ok)throw Error('Could not load '+url);return r.json();});
  const manifest=()=>manifestPromise||(manifestPromise=json('/assets/data/library.json'));
  const engine=()=>enginePromise||(enginePromise=import('/pagefind/pagefind.js').then(async pf=>{await pf.options({excerptLength:35});return pf;}));
  function aliases(){return aliasPromise||(aliasPromise=new Promise((resolve,reject)=>{if(window.FORQAN_ROOT_SEARCH_DATA)return resolve(window.FORQAN_ROOT_SEARCH_DATA);const script=document.createElement('script');script.src='/assets/js/root-search-data.js';script.onload=()=>resolve(window.FORQAN_ROOT_SEARCH_DATA);script.onerror=reject;document.head.appendChild(script);}));}
  function href(value,highlight){const url=new URL(value,location.origin);if(url.origin!==location.origin)return null;if(highlight)url.searchParams.set('highlight',highlight);return url.pathname+url.search+url.hash;}
  function card(record,container,raw){
    const target=href(record.url,raw);if(!target)return;
    const article=document.createElement('article');article.className='search-result';
    const meta=document.createElement('small');meta.textContent=(labels[record.kind]||labels.Guide)+' · '+(fa?'فارسی':'English');article.appendChild(meta);
    const heading=document.createElement('h3'),link=document.createElement('a');link.href=target;link.textContent=record.title;heading.appendChild(link);article.appendChild(heading);
    const body=record.original||record.excerpt;
    if(body){const p=document.createElement('p');p.textContent=excerpt(body,raw,280);article.appendChild(p);}
    if(record.kind==='Quran'&&record.verse && !normalize(record.verse).includes(normalize(raw))){const note=document.createElement('small');note.textContent=fa?'تطبیق در تأمل و توضیح این آیه':'Match in the reflection or explanation of this verse';article.appendChild(note);}
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
          records.forEach(r=>{const key=new URL(r.url,location.origin).pathname+new URL(r.url,location.origin).hash;if(seen.has(key))return;seen.add(key);added++;card({url:r.url,title:r.meta.title,kind,original:r.meta.original,verse:r.meta.verse},list,raw);});
        }
        button.hidden=cursor>=found.length;
        if(!list.children.length)section.hidden=true;
      }catch(error){cursor=checkpoint;if(token===generation){button.textContent=fa?'بارگذاری انجام نشد؛ تلاش دوباره':'Could not load results. Retry';button.hidden=false;}}
      finally{button.disabled=false;}
    }
    button.addEventListener('click',load);await load();
  }
  async function correction(raw,token){
    if(type.value==='Roots'||categoryOrder(raw,'')[0]==='Roots')return;
    const vocabulary=await (vocabPromise||(vocabPromise=json('/assets/data/vocabulary-'+language.value+'.json')));
    if(token!==generation)return;
    const proposed=suggest(raw,vocabulary);if(!proposed)return;
    const pf=await engine();const check=await pf.search(proposed,{filters:type.value?{type:type.value}:{}});
    if(token!==generation||!check.results.length)return;
    const box=document.createElement('p');box.className='search-suggestion';box.append(document.createTextNode(fa?'آیا منظورتان این بود؟ ':'Did you mean '));
    const button=document.createElement('button');button.type='button';button.textContent=proposed;button.addEventListener('click',()=>{query.value=proposed;run();query.focus();});box.appendChild(button);results.prepend(box);
  }
  async function run(){
    const token=++generation;results.replaceChildren();
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
        if(anchor){const {list}=group('Quran');card({...surah,title:surah.title+' · '+reference[1]+':'+reference[2],url:surah.url+'#'+anchor},list,'');status.textContent=fa?'آیه پیدا شد.':'Verse found.';}
        else {status.textContent=fa?'این آیه هنوز در آرشیو منتشر نشده است.':'This verse is not yet published in the archive.';if(surah){const {list}=group('Quran');card(surah,list,'');}}return;
      }
      const order=categoryOrder(raw,type.value);
      const exact=published.filter(p=>normalize(p.title)===q);const pinned=new Set(exact.map(p=>p.url));
      if(exact.length){const {list}=group('Exact');exact.forEach(p=>card(p,list,raw));}
      const pf=await engine();if(token!==generation)return;
      const searches=await Promise.all(order.map(async kind=>({kind,found:(await pf.search(q,{filters:{type:kind}})).results})));
      if(token!==generation)return;
      let rootMatches=[];
      if(order.includes('Roots')){
        try{const rootData=await aliases();if(token!==generation)return;
          const matches=new Set(Object.entries(rootData.entries||{}).filter(([slug,terms])=>normalize(slug)===q||terms.some(t=>normalize(t)===q)).map(([slug])=>slug));
          rootMatches=published.filter(p=>p.kind==='Roots'&&matches.has(p.url.split('/').filter(Boolean).pop()));
        }catch(_){/* Full text search remains available if optional aliases fail. */}
      }
      for(const {kind,found} of searches){
        if(token!==generation)return;
        const quick=kind==='Roots'?rootMatches:published.filter(p=>p.kind===kind&&kind==='Quran'&&(normalize(p.title).includes(q)||(/^\d+$/.test(q)&&Number(p.url.match(/\/(\d{3})-/)?.[1])===Number(q))));
        await renderGroup(kind,found,quick,raw,token,pinned);
      }
      if(token!==generation)return;
      const hasResults=results.querySelector('.search-result');
      status.textContent=hasResults?(fa?'آیات، سپس مقاله‌ها و ریشه‌ها؛ تطبیق دقیق عنوان در ابتدا.':'Qur’an passages first, followed by articles and roots. Exact titles take priority.'):(fa?'نتیجه‌ای پیدا نشد. واژه‌ای کوتاه‌تر یا زبان دیگر را امتحان کنید.':'No results. Try a shorter phrase or the other language.');
      if(type.value||order[0]==='Roots')status.textContent=hasResults?(fa?'نتیجه‌های مرتبط در بخش انتخاب‌شده.':'Relevant results in your selected category.') : status.textContent;
      if(!hasResults)await correction(raw,token);
    }catch(error){if(token!==generation)return;status.textContent=fa?'جستجو در دسترس نیست. دوباره تلاش کنید.':'Search could not load. Please try again.';enginePromise=null;manifestPromise=null;vocabPromise=null;}
  }
  form.addEventListener('submit',e=>{e.preventDefault();clearTimeout(timer);run();});
  query.addEventListener('input',()=>{clearTimeout(timer);timer=setTimeout(run,250);});
  type.addEventListener('change',()=>{clearTimeout(timer);run();});
  language.addEventListener('change',()=>{const u=new URL('/search/',location.origin);u.searchParams.set('q',query.value);u.searchParams.set('lang',language.value);if(type.value)u.searchParams.set('type',type.value);try{localStorage.setItem('forqan-language',language.value);}catch(_){}location.assign(u.pathname+u.search);});
  run();
}
