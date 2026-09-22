import {afterReadingLayout} from './reading-position.mjs';
// Same-origin studies stay connected to the verse; original anchors remain real links.
export function studyURL(value, base) {
  try {
    const url=new URL(value,base);
    if(url.origin!==new URL(base).origin)return null;
    if(!(/^\/quran-terminology\/(en|fa)\/roots\/[^/]+\//.test(url.pathname)||/^\/(en|fa)\/(articles|quran-terminology|hadith-critique|quran-completeness|salat|zakat)\//.test(url.pathname)))return null;
    url.searchParams.delete('reading-panel');return url;
  }catch{return null;}
}
function init(){
  if(window.self!==window.top || !/^\/quran-reflection\/(en|fa)\/\d/.test(location.pathname) || !window.HTMLDialogElement)return;
  const fa=document.documentElement.lang.startsWith('fa');
  const dialog=document.createElement('dialog');dialog.className='study-reading-panel';dialog.setAttribute('aria-labelledby','study-panel-title');dialog.dir=fa?'rtl':'ltr';
  dialog.innerHTML=`<header class="study-panel-toolbar"><button type="button" data-panel-back>${fa?'قبلی':'Back'}</button><h2 id="study-panel-title">${fa?'مطالعه':'Study'}</h2><a data-panel-open target="_blank" rel="noopener">${fa?'باز کردن در زبانهٔ جدید':'Open in new tab'}</a><button type="button" data-panel-close>${fa?'بازگشت به آیه':'Close'}</button></header><p class="study-panel-status" role="status"></p><iframe title="${fa?'متن مطالعه':'Study content'}"></iframe>`;
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
        if(!doc?.querySelector('#main-content[data-pagefind-filter]')){failed();return;}
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
          const next=studyURL(link.href,item.url);
          event.preventDefault();event.stopImmediatePropagation();
          if(next && next.pathname===new URL(item.url).pathname && next.hash){
            let anchor;try{anchor=doc.getElementById(decodeURIComponent(next.hash.slice(1)));}catch{}
            if(anchor){for(let parent=anchor.parentElement;parent;parent=parent.parentElement)if(parent.tagName==='DETAILS')parent.open=true;anchor.scrollIntoView();return;}
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
    const link=event.target.closest?.('a[href]');if(!link||event.defaultPrevented||event.button!==0||event.metaKey||event.ctrlKey||event.shiftKey||event.altKey||link.hasAttribute('download'))return;
    if(!link.closest('.ayah-block,.root-popover,#main-content'))return;
    const url=studyURL(link.href,location.href);if(!url)return;
    event.preventDefault();event.stopImmediatePropagation();
    focusOrigin=link;scrollPosition=window.scrollY;oldOverflow=document.body.style.overflow;
    stack=[{url:url.href,title:link.textContent.trim()}];historyId=Date.now();history.pushState({...history.state,studyPanel:historyId},'',location.href);
    dialog.showModal();document.body.style.overflow='hidden';close.focus();load(stack[0]);
  },true);
}
if(typeof document!=='undefined')init();
