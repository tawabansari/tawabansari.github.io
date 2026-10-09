// Desktop previews occupy their own column. Titles always remain real links.
export function initStudyPreviews(directory){
  const layout=directory?.querySelector('.collection-layout');
  if(!layout || typeof HTMLDialogElement==='undefined')return;
  const fa=directory.lang==='fa',wide=matchMedia('(min-width: 1100px)');
  let panel,origin,trigger,openTimer,suppressFocus=false;
  const rail=document.createElement('aside');rail.className='study-preview-rail';rail.setAttribute('aria-label',fa?'پیش‌نمایش نوشته':'Study preview');
  const placeholder=document.createElement('p');placeholder.className='study-preview-placeholder';placeholder.textContent=fa?'برای دیدن خلاصه، روی عنوان مکث کنید یا دکمهٔ اطلاعات را بزنید.':'Pause over a title or select its information button to preview the study.';
  rail.appendChild(placeholder);layout.appendChild(rail);directory.classList.add('has-study-previews');
  function close(returnFocus=false){
    clearTimeout(openTimer);
    if(!panel)return;
    const oldTrigger=trigger;
    origin?.closest('.study-row')?.classList.remove('is-previewed');
    origin?.closest('.study-row')?.querySelector('.study-preview-toggle')?.setAttribute('aria-expanded','false');
    if(panel.tagName==='DIALOG'&&panel.open)panel.close();
    panel.remove();panel=null;origin=null;trigger=null;placeholder.hidden=false;
    if(returnFocus&&oldTrigger?.isConnected){suppressFocus=true;oldTrigger.focus({preventScroll:true});queueMicrotask(()=>suppressFocus=false);}
  }
  function show(link,control=link,focus=false){
    clearTimeout(openTimer);
    if(origin===link&&panel){if(focus){trigger=control;panel.querySelector('.study-preview-read').focus({preventScroll:true});}return;}
    // Do not replace a panel while its links are being used with the keyboard.
    if(!focus&&panel?.contains(document.activeElement))return;
    close();origin=link;trigger=control;
    const modal=!wide.matches;
    panel=document.createElement(modal?'dialog':'section');panel.className='study-preview';panel.dir=fa?'rtl':'ltr';panel.lang=directory.lang;
    panel.id='study-preview';panel.setAttribute('aria-labelledby','study-preview-title');
    const heading=document.createElement('div');heading.className='study-preview-heading';
    const caption=document.createElement('span');caption.textContent=fa?'پیش‌نمایش':'Preview';
    const dismiss=document.createElement('button');dismiss.type='button';dismiss.className='study-preview-close';dismiss.textContent=fa?'بستن':'Close';dismiss.addEventListener('click',()=>close(true));
    heading.append(caption,dismiss);
    const title=document.createElement('h3');title.id='study-preview-title';title.textContent=link.dataset.previewTitle;
    const summary=document.createElement('p');summary.className='study-preview-summary';summary.textContent=link.dataset.previewSummary;
    const full=document.createElement('a');full.className='study-preview-read';full.href=link.href;full.textContent=fa?'مطالعهٔ کامل':'Read full study';
    full.dataset.studyLink='';full.dataset.studyAnchor=link.closest('.study-row').id;
    panel.append(heading,title,summary,full);
    link.closest('.study-row').classList.add('is-previewed');
    link.closest('.study-row').querySelector('.study-preview-toggle').setAttribute('aria-expanded','true');
    if(modal){
      directory.appendChild(panel);
      panel.addEventListener('cancel',event=>{event.preventDefault();close(true);});
      panel.addEventListener('click',event=>{if(event.target===panel){const box=panel.getBoundingClientRect();if(event.clientX<box.left||event.clientX>box.right||event.clientY<box.top||event.clientY>box.bottom)close(true);}});
      panel.showModal();full.focus({preventScroll:true});
    }else{placeholder.hidden=true;rail.appendChild(panel);if(focus)full.focus({preventScroll:true});}
  }
  directory.querySelectorAll('[data-preview-summary]').forEach(link=>{
    link.removeAttribute('title');
    const toggle=document.createElement('button');toggle.type='button';toggle.className='study-preview-toggle';
    toggle.setAttribute('aria-label',(fa?'خلاصهٔ ':'Preview: ')+link.dataset.previewTitle);toggle.setAttribute('aria-expanded','false');toggle.setAttribute('aria-controls','study-preview');
    toggle.innerHTML='<svg viewBox="0 0 24 24" width="20" height="20" aria-hidden="true" fill="none" stroke="currentColor" stroke-width="1.5"><circle cx="12" cy="12" r="9"/><path d="M12 11v6"/><circle cx="12" cy="7" r=".8" fill="currentColor" stroke="none"/></svg>';
    link.closest('.study-card-heading').appendChild(toggle);
    toggle.addEventListener('click',()=>show(link,toggle,true));
    link.addEventListener('pointerenter',event=>{if(event.pointerType==='mouse'&&wide.matches){clearTimeout(openTimer);openTimer=setTimeout(()=>show(link),450);}});
    link.addEventListener('pointerleave',()=>clearTimeout(openTimer));
    link.addEventListener('focus',()=>{if(wide.matches&&!suppressFocus)show(link);});
    link.addEventListener('keydown',event=>{if(event.key==='ArrowDown'){event.preventDefault();show(link,link,true);}});
  });
  document.addEventListener('keydown',event=>{if(event.key==='Escape'&&panel){event.preventDefault();close(true);}});
  directory.addEventListener('collection-render',()=>close());
  wide.addEventListener('change',()=>close(true));
}
