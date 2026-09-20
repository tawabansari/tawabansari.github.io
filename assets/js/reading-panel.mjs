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
  let stack=[],focusOrigin,scrollPosition=0,token=0,controller,historyId,oldOverflow;
  function finish(){
    if(!dialog.open)return;
    ++token;controller?.abort();dialog.close();document.body.style.overflow=oldOverflow;
    frame.contentWindow.location.replace('about:blank');window.scrollTo(0,scrollPosition);
    if(focusOrigin?.isConnected)focusOrigin.focus({preventScroll:true});
  }
  function requestClose(){if(history.state?.studyPanel===historyId){history.back();}else finish();}
  window.addEventListener('popstate',()=>{if(dialog.open && history.state?.studyPanel!==historyId)finish();});
  dialog.addEventListener('cancel',event=>{event.preventDefault();requestClose();});close.addEventListener('click',requestClose);
  dialog.addEventListener('click',event=>{if(event.target===dialog){const box=dialog.getBoundingClientRect();if(event.clientX<box.left||event.clientX>box.right||event.clientY<box.top||event.clientY>box.bottom)requestClose();}});
  back.addEventListener('click',()=>{if(stack.length>1){stack.pop();load(stack.at(-1));}});
  async function load(item){
    const current=++token;controller?.abort();controller=new AbortController();
    external.href=item.url;title.textContent=item.title || (fa?'مطالعه':'Study');back.hidden=stack.length<2;
    status.hidden=false;status.textContent=fa?'در حال بارگذاری…':'Loading…';frame.hidden=true;
    try{
      const response=await fetch(item.url,{signal:controller.signal});if(!response.ok)throw Error('load');
      const text=await response.text();if(!new DOMParser().parseFromString(text,'text/html').querySelector('#main-content'))throw Error('content');
      if(current!==token)return;
      const url=new URL(item.url);url.searchParams.set('reading-panel','1');
      frame.onload=()=>{
        if(current!==token||!dialog.open)return;
        const doc=frame.contentDocument;if(!doc?.querySelector('#main-content'))return;
        title.textContent=doc.querySelector('main h1')?.textContent || item.title;
        frame.title=title.textContent;frame.hidden=false;status.hidden=true;
        // Never nest panels. Related studies replace this frame, retaining a small back stack.
        doc.addEventListener('click',event=>{
          const link=event.target.closest?.('a[href]');if(!link || event.button!==0||event.metaKey||event.ctrlKey||event.shiftKey||event.altKey||link.hasAttribute('download'))return;
          const next=studyURL(link.href,item.url);
          event.preventDefault();event.stopImmediatePropagation();
          if(next && next.pathname===new URL(item.url).pathname && next.hash){
            let anchor;try{anchor=doc.getElementById(decodeURIComponent(next.hash.slice(1)));}catch{}
            if(anchor){for(let parent=anchor.parentElement;parent;parent=parent.parentElement)if(parent.tagName==='DETAILS')parent.open=true;anchor.scrollIntoView();return;}
          }
          if(next){stack.push({url:next.href,title:link.textContent.trim()});load(stack.at(-1));}
          else {const target=new URL(link.href,item.url);if(['http:','https:','mailto:','tel:'].includes(target.protocol))window.open(target.href,'_blank','noopener');}
        },true);
        doc.addEventListener('keydown',event=>{if(event.key==='Escape'){event.preventDefault();requestClose();}});
      };
      // Replacing frame navigation avoids adding entries to the phone's Back history.
      frame.contentWindow.location.replace(url.href);
    }catch(error){if(current!==token||error.name==='AbortError')return;status.textContent=fa?'بارگذاری انجام نشد. از «باز کردن در زبانهٔ جدید» استفاده کنید.':'Could not load this study. Use “Open in new tab” to continue.';}
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
