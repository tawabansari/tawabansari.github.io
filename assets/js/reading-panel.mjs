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
      || /^\/(en|fa)\/(articles|contributions|quran-terminology|hadith-critique|quran-completeness)\/[^/]+(?:\/[^/]+)*\/?$/.test(url.pathname)
      || /^\/(en|fa)\/(salat|zakat)\/?$/.test(url.pathname)
      // Extend reading references on desktop without changing phone navigation.
      || (desktop && (/^\/(en|fa)\/introduction\/?$/.test(url.pathname)
        || /^\/quran-reflection\/(en|fa)\/\d{3}-[^/]+\/\d{3}\/?$/.test(url.pathname)));
    if(!readingPage || /\.[^/]+$/.test(url.pathname))return null;
    url.searchParams.delete('reading-panel');return url;
  }catch{return null;}
}
export function isReadingReference(link, base, desktop = desktopReading()) {
  if(!studyURL(base,base,desktop) || !studyURL(link.href,base,desktop))return false;
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
  dialog.innerHTML=`<header class="study-panel-toolbar"><button type="button" data-panel-back>${fa?'قبلی':'Back'}</button><h2 id="study-panel-title">${fa?'مطالعه':'Study'}</h2><a data-panel-open target="_blank" rel="noopener">${fa?'باز کردن در زبانهٔ جدید':'Open in new tab'}</a><button type="button" data-panel-close>${fa?'بازگشت به متن':'Close'}</button></header><p class="study-panel-status" role="status"></p><iframe title="${fa?'متن مطالعه':'Study content'}"></iframe>`;
  document.body.append(dialog);
  const frame=dialog.querySelector('iframe'),status=dialog.querySelector('[role=status]'),title=dialog.querySelector('h2'),external=dialog.querySelector('[data-panel-open]'),back=dialog.querySelector('[data-panel-back]'),close=dialog.querySelector('[data-panel-close]');
  let stack=[],focusOrigin,scrollPosition=0,token=0,loadTimer,historyId,oldOverflow;
  function finish(){
    if(!dialog.open)return;
    ++token;clearTimeout(loadTimer);dialog.close();document.body.style.overflow=oldOverflow;
    frame.contentWindow.location.replace('about:blank');window.scrollTo({top:scrollPosition,left:0,behavior:'instant'});
    if(focusOrigin?.isConnected)focusOrigin.focus({preventScroll:true});
  }
  function requestClose(){if(history.state?.studyPanel===historyId){history.back();}else finish();}
  window.addEventListener('popstate',()=>{if(dialog.open && history.state?.studyPanel!==historyId)finish();});
  dialog.addEventListener('cancel',event=>{event.preventDefault();requestClose();});close.addEventListener('click',requestClose);
  dialog.addEventListener('click',event=>{if(event.target===dialog){const box=dialog.getBoundingClientRect();if(event.clientX<box.left||event.clientX>box.right||event.clientY<box.top||event.clientY>box.bottom)requestClose();}});
  back.addEventListener('click',()=>{if(stack.length>1){stack.pop();load(stack.at(-1));}});
  function remember(){
    try{const item=stack.at(-1);item.scrollY=frame.contentWindow.scrollY;item.openDetails=Array.from(frame.contentDocument.querySelectorAll('details[open][id]')).map(node=>node.id);}catch(_){}
  }
  async function load(item){
    const current=++token;clearTimeout(loadTimer);
    external.href=item.url;title.textContent=item.title || (fa?'مطالعه':'Study');back.hidden=stack.length<2;
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
        title.textContent=doc.querySelector('main h1')?.textContent || item.title;
        frame.title=title.textContent;
        (item.openDetails||[]).forEach(id=>{const node=doc.getElementById(id);if(node?.tagName==='DETAILS')node.open=true;});
        afterReadingLayout(()=>{
          if(current!==token || !dialog.open)return;
          if(typeof item.scrollY==='number')frame.contentWindow.scrollTo({top:item.scrollY,left:0,behavior:'instant'});
        },{win:frame.contentWindow,doc}).finally(()=>{
          if(current!==token || !dialog.open)return;
          frame.style.visibility='';status.hidden=true;
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
          if(next && next.pathname===new URL(item.url).pathname && next.hash){
            let anchor;try{anchor=doc.getElementById(decodeURIComponent(next.hash.slice(1)));}catch{}
            if(anchor){for(let parent=anchor;parent;parent=parent.parentElement)if(parent.tagName==='DETAILS')parent.open=true;anchor.scrollIntoView();return;}
          }
          if(next){remember();stack.push({url:next.href,title:link.textContent.trim()});load(stack.at(-1));}
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
    focusOrigin=link;scrollPosition=window.scrollY;oldOverflow=document.body.style.overflow;
    stack=[{url:url.href,title:link.textContent.trim()}];historyId=Date.now();history.pushState({...history.state,studyPanel:historyId},'',location.href);
    dialog.showModal();document.body.style.overflow='hidden';close.focus();load(stack[0]);
  },true);
}
if(typeof document!=='undefined')init();
