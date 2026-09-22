// Compact directories keep their shape; a preview supplies context on demand.
export function initStudyPreviews(directory){
  if(!directory || typeof HTMLDialogElement==='undefined')return;
  const fa=directory.lang==='fa';
  let panel,origin,openTimer,closeTimer,suppressFocus=false;
  const touch=()=>matchMedia('(max-width: 600px)').matches || !matchMedia('(hover: hover) and (pointer: fine)').matches;
  function close(returnFocus=false){
    clearTimeout(openTimer);clearTimeout(closeTimer);
    if(!panel)return;
    const old=origin;
    if(panel.tagName==='DIALOG' && panel.open)panel.close();
    panel.remove();panel=null;origin=null;
    old?.setAttribute('aria-expanded','false');
    if(returnFocus && old?.isConnected){suppressFocus=true;old.focus({preventScroll:true});queueMicrotask(()=>suppressFocus=false);}
  }
  function position(){
    if(!panel || panel.tagName==='DIALOG')return;
    const box=origin.getBoundingClientRect(),preview=panel.getBoundingClientRect();
    const topLimit=Math.max(12,(document.querySelector('.library-header')?.getBoundingClientRect().bottom||0)+12);
    const left=fa?box.right-preview.width:box.left;
    panel.style.left=Math.max(12,Math.min(left,innerWidth-preview.width-12))+'px';
    const below=box.bottom+8;
    panel.style.top=Math.max(topLimit,Math.min(below+preview.height<=innerHeight-12?below:box.top-preview.height-8,innerHeight-preview.height-12))+'px';
  }
  function show(link,modal=false){
    clearTimeout(openTimer);clearTimeout(closeTimer);
    if(origin===link && panel)return;
    close();origin=link;
    panel=document.createElement(modal?'dialog':'div');
    panel.className='study-preview';panel.dir=fa?'rtl':'ltr';panel.lang=directory.lang;
    panel.id='study-preview';panel.setAttribute('role','dialog');panel.setAttribute('aria-labelledby','study-preview-title');
    const dismiss=document.createElement('button');dismiss.type='button';dismiss.className='study-preview-close';dismiss.textContent=fa?'بستن':'Close';
    dismiss.addEventListener('click',()=>close(true));
    const title=document.createElement('h3');title.id='study-preview-title';title.textContent=link.dataset.previewTitle;
    const summary=document.createElement('p');summary.className='study-preview-summary';summary.textContent=link.dataset.previewSummary;
    const full=document.createElement('a');full.className='study-preview-read';full.href=link.href;full.textContent=fa?'مطالعهٔ کامل':'Read full study';
    // The usual collection context handler also sees this real link inside its row.
    full.dataset.studyLink='';
    panel.append(dismiss,title,summary,full);link.closest('.study-row').appendChild(panel);
    link.setAttribute('aria-expanded','true');
    panel.addEventListener('pointerenter',()=>clearTimeout(closeTimer));
    panel.addEventListener('pointerleave',()=>scheduleClose());
    panel.addEventListener('cancel',event=>{event.preventDefault();close(true);});
    if(modal){panel.addEventListener('click',event=>{if(event.target===panel){const b=panel.getBoundingClientRect();if(event.clientX<b.left||event.clientX>b.right||event.clientY<b.top||event.clientY>b.bottom)close(true);}});panel.showModal();}
    else position();
  }
  function scheduleClose(){clearTimeout(closeTimer);closeTimer=setTimeout(()=>{if(panel?.contains(document.activeElement)||origin===document.activeElement)return;close();},200);}
  directory.querySelectorAll('[data-preview-summary]').forEach(link=>{
    link.removeAttribute('title');link.setAttribute('aria-haspopup','dialog');link.setAttribute('aria-expanded','false');
    link.addEventListener('pointerenter',event=>{if(event.pointerType!=='mouse'||touch())return;clearTimeout(closeTimer);openTimer=setTimeout(()=>show(link),280);});
    link.addEventListener('pointerleave',()=>{clearTimeout(openTimer);scheduleClose();});
    link.addEventListener('focus',()=>{if(!touch()&&!suppressFocus)show(link);});
    link.addEventListener('keydown',event=>{if(event.key==='ArrowDown'){event.preventDefault();show(link);panel.querySelector('.study-preview-read').focus();}});
    link.addEventListener('click',event=>{
      if(event.button!==0||event.metaKey||event.ctrlKey||event.shiftKey||event.altKey)return;
      if(touch()){event.preventDefault();show(link,true);}
      // On desktop the title still navigates directly, including new-tab clicks.
    });
  });
  directory.addEventListener('focusout',()=>setTimeout(()=>{if(panel && !panel.contains(document.activeElement) && document.activeElement!==origin)close();},0));
  document.addEventListener('keydown',event=>{if(event.key==='Escape'&&panel){event.preventDefault();close(true);}});
  document.addEventListener('pointerdown',event=>{if(panel&&!panel.contains(event.target)&&event.target!==origin&&!origin.contains(event.target))close();});
  directory.addEventListener('collection-render',()=>close());
  window.addEventListener('resize',()=>close());
  window.addEventListener('scroll',()=>{
    if(panel && panel.tagName!=='DIALOG'){
      if(panel.contains(document.activeElement)||origin===document.activeElement)position();
      else close();
    }
  },{passive:true});
}
