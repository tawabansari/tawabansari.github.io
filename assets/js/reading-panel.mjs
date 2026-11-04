import {afterReadingLayout} from './reading-position.mjs';
// Only references between reading pages use the panel; site navigation stays native.
const desktopReading = () => typeof window!=='undefined' && window.matchMedia('(min-width:721px)').matches;
export function studyURL(value, base, desktop = desktopReading()) {
  try {
    const url=new URL(value,base);
    if(url.origin!==new URL(base).origin)return null;
    if(!['http:','https:'].includes(url.protocol))return null;
    const readingPage = /^\/quran-reflection\/(en|fa)\/\d{3}-[^/]+\/?$/.test(url.pathname)
      || /^\/quran-terminology\/(en|fa)\/roots\/[^/]+\/?$/.test(url.pathname)
      || /^\/(en|fa)\/(articles|contributions|principles|quran-terminology|hadith-critique|quran-completeness)\/[^/]+(?:\/[^/]+)*\/?$/.test(url.pathname)
      || /^\/(en|fa)\/(salat|zakat)\/?$/.test(url.pathname)
      // Extend reading references on desktop without changing phone navigation.
      || (desktop && (/^\/(en|fa)\/introduction\/?$/.test(url.pathname)
        || /^\/quran-reflection\/(en|fa)\/\d{3}-[^/]+\/\d{3}\/?$/.test(url.pathname)));
    if(!readingPage || /\.[^/]+$/.test(url.pathname))return null;
    url.searchParams.delete('reading-panel');return url;
  }catch{return null;}
}
export function isReadingReference(link, base, desktop = desktopReading()) {
  const principleTarget = /^\/(en|fa)\/principles\/[^/]+\/?$/.test(new URL(link.href,base).pathname);
  if((!studyURL(base,base,desktop) && !principleTarget) || !studyURL(link.href,base,desktop))return false;
  if(!link.closest('#main-content,.root-popover'))return false;
  return !link.closest('nav,header,footer,.breadcrumbs,.forqan-pathway-shell,.study-context,.mirror-link,.language-mirror-link,.language-switcher,[data-language],[hreflang],[data-panel-open]');
}
// Same-surah citations in authored reading content are previews, not navigation.
export function isSamePageVerseReference(link, base, desktop = desktopReading()) {
  if (!desktop || !isReadingReference(link, base, desktop)) return false;
  const target = studyURL(link.href, base, desktop), current = new URL(base);
  return target.pathname === current.pathname && target.search === current.search
    && /^#ayah-\d+$/.test(target.hash)
    && !!link.closest('.details-content');
}
function init(){
  if(window.self!==window.top || !window.HTMLDialogElement)return;
  const fa=document.documentElement.lang.startsWith('fa');
  const dialog=document.createElement('dialog');dialog.className='study-reading-panel';dialog.setAttribute('aria-labelledby','study-panel-title');dialog.dir=fa?'rtl':'ltr';
  const label={close:fa?'بستن':'Close',open:fa?'باز کردن در زبانهٔ جدید':'Open in new tab',copy:fa?'کپی پیوند':'Copy link',print:fa?'چاپ':'Print'};
  dialog.innerHTML=`<header class="study-panel-toolbar"><h2 id="study-panel-title">${fa?'مطالعه':'Study'}</h2><button type="button" data-panel-back title="${fa?'پس':'Back'}" aria-label="${fa?'پس':'Back'}">${fa?'→':'←'}</button><button type="button" data-panel-forward title="${fa?'پیش':'Forward'}" aria-label="${fa?'پیش':'Forward'}">${fa?'←':'→'}</button><button type="button" data-panel-close title="${label.close}" aria-label="${label.close}">×</button><a data-panel-open target="_blank" rel="noopener" title="${label.open}" aria-label="${label.open}">↗</a><button type="button" data-panel-return>${fa?'بازگشت به متن':'Return to text'}</button><select data-panel-history aria-label="${fa?'تاریخچهٔ مطالعه':'Reading history'}"></select><button type="button" data-panel-copy title="${label.copy}" aria-label="${label.copy}"><svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" stroke-width="1.7" aria-hidden="true"><path d="M9 15l6-6M8 16l-1 1a4 4 0 01-6-6l4-4a4 4 0 016 0M16 8l1-1a4 4 0 016 6l-4 4a4 4 0 01-6 0"/></svg></button><button type="button" data-panel-print title="${label.print}" aria-label="${label.print}"><svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.7" aria-hidden="true"><path d="M6 9V3h12v6M6 17H3V9h18v8h-3M6 14h12v7H6z"/></svg></button><button type="button" data-panel-pdf title="PDF" aria-label="PDF">PDF</button><span class="study-panel-copy-status" role="status" aria-live="polite"></span></header><p class="study-panel-status" role="status"></p><iframe title="${fa?'متن مطالعه':'Study content'}"></iframe>`;
  document.body.append(dialog);
  const frame=dialog.querySelector('iframe'),status=dialog.querySelector('.study-panel-status'),title=dialog.querySelector('h2'),external=dialog.querySelector('[data-panel-open]'),back=dialog.querySelector('[data-panel-back]'),close=dialog.querySelector('[data-panel-close]');
  const forward=dialog.querySelector('[data-panel-forward]'),trail=dialog.querySelector('[data-panel-history]'),host=document.querySelector('[data-principle-reader]');
  let cursor=0,inline=false,originItem;
  const returnButton=dialog.querySelector('[data-panel-return]'),copyButton=dialog.querySelector('[data-panel-copy]'),printButton=dialog.querySelector('[data-panel-print]'),pdfButton=dialog.querySelector('[data-panel-pdf]');
  let currentTools=()=>({});
  printButton.addEventListener('click',()=>currentTools().print?.click());
  pdfButton.addEventListener('click',()=>currentTools().pdf?.click());
  copyButton.addEventListener('click',async()=>{const url=currentTools().url;if(!url)return;const message=dialog.querySelector('.study-panel-copy-status');try{await navigator.clipboard.writeText(url);message.textContent=fa?'پیوند کپی شد.':'Link copied.';}catch{message.textContent=url;}});
  const useInline=()=>!!host && matchMedia('(min-width:1100px)').matches;
  function place(){
    const wanted=useInline();
    if(dialog.open && wanted===inline)return;
    if(dialog.open)dialog.close();
    inline=wanted;dialog.toggleAttribute('data-inline',inline);
    (inline?host:document.body).append(dialog);
    if(inline){dialog.show();document.body.style.overflow=oldOverflow || '';host.classList.add('has-reader');}
    else{dialog.showModal();document.body.style.overflow='hidden';}
  }
  let stack=[],focusOrigin,scrollPosition=0,token=0,loadTimer,historyId,oldOverflow;
  function finish(){
    if(!dialog.open)return;
    ++token;clearTimeout(loadTimer);dialog.close();document.body.style.overflow=oldOverflow;
    frame.contentWindow.location.replace('about:blank');host?.classList.remove('has-reader');
    document.querySelectorAll('.principles-list a[aria-current]').forEach(a=>a.removeAttribute('aria-current'));
    window.scrollTo({top:scrollPosition,left:0,behavior:'instant'});
    if(focusOrigin?.isConnected)focusOrigin.focus({preventScroll:true});
  }
  function requestClose(){if(history.state?.studyPanel===historyId){history.back();}else finish();}
  window.addEventListener('popstate',()=>{if(dialog.open && history.state?.studyPanel!==historyId)finish();});
  dialog.addEventListener('cancel',event=>{event.preventDefault();requestClose();});close.addEventListener('click',requestClose);
  dialog.addEventListener('click',event=>{if(event.target===dialog){const box=dialog.getBoundingClientRect();if(event.clientX<box.left||event.clientX>box.right||event.clientY<box.top||event.clientY>box.bottom)requestClose();}});
  function go(index){if(index<0||index>=stack.length||index===cursor)return;remember();cursor=index;load(stack[cursor]);}
  returnButton.addEventListener('click',()=>{const index=stack.indexOf(originItem);if(index>=0)go(index);else requestClose();});
  back.addEventListener('click',()=>go(cursor-1));forward.addEventListener('click',()=>go(cursor+1));
  trail.addEventListener('change',()=>go(Number(trail.value)));
  function visit(item){remember();stack=stack.slice(0,cursor+1);stack.push(item);cursor=stack.length-1;load(item);}
  window.addEventListener('resize',()=>{if(dialog.open && useInline()!==inline){remember();place();load(stack[cursor]);}});
  function remember(){
    try{const item=stack[cursor];item.scrollY=frame.contentWindow.scrollY;item.openDetails=Array.from(frame.contentDocument.querySelectorAll('details[open][id]')).map(node=>node.id);}catch(_){}
  }
  async function load(item){
    const current=++token;clearTimeout(loadTimer);
    currentTools=()=>({});printButton.disabled=pdfButton.disabled=copyButton.disabled=true;
    returnButton.disabled=item===originItem;
    dialog.querySelector('.study-panel-copy-status').textContent='';
    if(inline){const top=host.getBoundingClientRect().top;if(top>100||top<70)window.scrollTo({top:window.scrollY+top-90,behavior:'instant'});}
    const outerPosition=window.scrollY;
    external.href=item.url;title.textContent=item.title || (fa?'مطالعه':'Study');back.disabled=cursor===0;forward.disabled=cursor===stack.length-1;
    trail.replaceChildren(...stack.map((entry,i)=>{const option=document.createElement('option');option.value=i;option.textContent=(i===cursor?'• ':'')+entry.title;return option;}));trail.value=String(cursor);
    const selected=new URL(item.url).pathname;
    if(/\/(fa|en)\/principles\/[^/]+\/?$/.test(selected))document.querySelectorAll('.principles-list a').forEach(a=>{if(new URL(a.href).pathname===selected)a.setAttribute('aria-current','true');else a.removeAttribute('aria-current');});
    status.hidden=false;status.textContent=fa?'در حال بارگذاری…':'Loading…';frame.hidden=false;frame.style.visibility='hidden';
    const failed=()=>{if(current===token && dialog.open){frame.hidden=true;status.hidden=false;status.textContent=fa?'بارگذاری انجام نشد. از «باز کردن در زبانهٔ جدید» استفاده کنید.':'Could not load this study. Use “Open in new tab” to continue.';}};
    loadTimer=setTimeout(failed,20000);
    try{
      const url=new URL(item.url);url.searchParams.set('reading-panel','1');
      frame.onload=()=>{
        if(current!==token||!dialog.open)return;
        const doc=frame.contentDocument;
        if(doc?.URL==='about:blank')return;
        clearTimeout(loadTimer);
        if(!doc?.querySelector('#main-content')){failed();return;}
        title.textContent=item.title || doc.querySelector('main h1')?.textContent;
        frame.title=title.textContent;
        currentTools=()=>{
          const blocks=[...doc.querySelectorAll('.ayah-block[id]')];
          const visible=blocks.find(b=>{const r=b.getBoundingClientRect();return r.bottom>80&&r.top<frame.clientHeight;});
          const block=visible||doc.getElementById(new URL(item.url).hash.slice(1));
          const area=block||doc.querySelector('.principle-detail,article,.root-study-page')||doc;
          const url=new URL(doc.querySelector('link[rel=canonical]')?.href||item.url);url.searchParams.delete('reading-panel');
          if(block)url.hash=block.id;
          return {url:url.href,print:area.querySelector('.verse-print-button,.study-print-button'),pdf:area.querySelector('.pdf-download-button')};
        };
        const syncTools=()=>{const tools=currentTools();copyButton.disabled=false;printButton.disabled=!tools.print;pdfButton.disabled=!tools.pdf;};
        syncTools();frame.contentWindow.addEventListener('scroll',syncTools,{passive:true});
        doc.querySelector('.principle-detail')?.classList.add('panel-tools-ready');
        (item.openDetails||[]).forEach(id=>{const node=doc.getElementById(id);if(node?.tagName==='DETAILS')node.open=true;});
        afterReadingLayout(()=>{
          if(current!==token || !dialog.open)return;
          if(typeof item.scrollY==='number')frame.contentWindow.scrollTo({top:item.scrollY,left:0,behavior:'instant'});
        },{win:frame.contentWindow,doc}).finally(()=>{
          if(current!==token || !dialog.open)return;
          frame.style.visibility='';status.hidden=true;
          if(inline)window.scrollTo({top:outerPosition,behavior:'instant'});
        });
        // Never nest panels. Related studies replace this frame, retaining a small back stack.
        doc.addEventListener('click',event=>{
          const link=event.target.closest?.('a[href]');if(!link || event.button!==0||event.metaKey||event.ctrlKey||event.shiftKey||event.altKey||link.hasAttribute('download'))return;
          const destination=new URL(link.href,item.url);
          if(!['http:','https:'].includes(destination.protocol))return;
          if(destination.origin===new URL(item.url).origin && destination.pathname!==new URL(item.url).pathname && !isReadingReference(link,item.url)){
            event.preventDefault();event.stopImmediatePropagation();
            destination.searchParams.delete('reading-panel');
            window.location.assign(destination.href);return;
          }
          const next=studyURL(link.href,item.url);
          event.preventDefault();event.stopImmediatePropagation();
          if(next){visit({url:next.href,title:link.textContent.trim()});}
          else {const target=new URL(link.href,item.url);if(['http:','https:','mailto:','tel:'].includes(target.protocol))window.open(target.href,'_blank','noopener');}
        },true);
        doc.addEventListener('keydown',event=>{if(event.key==='Escape'){event.preventDefault();requestClose();}});
      };
      // Replacing frame navigation avoids adding entries to the phone's Back history.
      frame.contentWindow.location.replace(url.href);
    }catch{clearTimeout(loadTimer);failed();}
  }
  document.addEventListener('click',event=>{
    const link=event.target.closest?.('a[href]');
    if(link){const target=new URL(link.href,location.href);if(['http:','https:'].includes(target.protocol)&&target.origin!==location.origin){link.target='_blank';link.rel='noopener';}}
    if(!link||link.hasAttribute('data-panel-open')||event.defaultPrevented||event.button!==0||event.metaKey||event.ctrlKey||event.shiftKey||event.altKey||link.hasAttribute('download'))return;
    if(!isReadingReference(link,location.href))return;
    const url=studyURL(link.href,location.href);if(!url)return;
    if(url.pathname===location.pathname && url.search===location.search && !isSamePageVerseReference(link,location.href))return;
    event.preventDefault();event.stopImmediatePropagation();
    if(dialog.open){visit({url:url.href,title:link.textContent.trim()});originItem=stack[cursor];returnButton.disabled=true;return;}
    focusOrigin=link;scrollPosition=window.scrollY;oldOverflow=document.body.style.overflow;
    stack=[{url:url.href,title:link.textContent.trim()}];cursor=0;originItem=host?stack[0]:null;historyId=Date.now();history.pushState({...history.state,studyPanel:historyId},'',location.href);
    place();if(!inline)close.focus();load(stack[0]);
  },true);
}
if(typeof document!=='undefined')init();
