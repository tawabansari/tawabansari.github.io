let menu, status, active;
function close(focus=false){if(!active)return;const trigger=active.trigger;trigger.setAttribute('aria-expanded','false');menu.hidden=true;active=null;if(focus)trigger.focus();}
function ensureMenu(){
 if(menu)return;
 menu=document.createElement('div');menu.id='verse-copy-options';menu.className='verse-copy-options';menu.hidden=true;menu.setAttribute('role','group');menu.dataset.pagefindIgnore='';
 status=document.createElement('div');status.className='verse-copy-status';status.setAttribute('role','status');status.dataset.pagefindIgnore='';document.body.append(menu,status);
 document.addEventListener('click',event=>{if(active&&!menu.contains(event.target)&&!active.trigger.contains(event.target))close();});
 document.addEventListener('keydown',event=>{if(event.key==='Escape'&&active){event.preventDefault();close(true);}});
 document.addEventListener('focusin',event=>{if(active&&!menu.contains(event.target)&&event.target!==active.trigger)close();});
 window.addEventListener('resize',()=>close());window.addEventListener('scroll',()=>close(),{passive:true});
}
export function installVerseCopy(original,reflection,fa){
 if(!original)return;
 ensureMenu();
 const trigger=original.cloneNode(true);trigger.textContent='⧉';trigger.title=fa?'کاپی':'Copy';trigger.setAttribute('aria-label',trigger.title);trigger.setAttribute('aria-expanded','false');trigger.setAttribute('aria-controls',menu.id);original.replaceWith(trigger);
 const report=event=>{status.textContent=event.detail.success?(fa?'کاپی شد':'Copied'):(fa?'کاپی نشد؛ دوباره تلاش کنید.':'Copy failed. Please try again.');setTimeout(()=>status.textContent='',2500);};
 original.addEventListener('verse-copy-result',report);reflection?.addEventListener('verse-copy-result',report);
 trigger.addEventListener('click',()=>{
  if(active?.trigger===trigger){close();return;}close();status.textContent='';active={trigger};menu.replaceChildren();menu.dir=fa?'rtl':'ltr';menu.setAttribute('aria-label',fa?'انتخاب محتوای کاپی':'Choose what to copy');
  for(const [source,label]of [[original,fa?'آیه و ترجمه':'Verse and translation'],[reflection,fa?'آیه، ترجمه و تأویل':'Verse, translation and reflection']]){
   if(!source)continue;const option=document.createElement('button');option.type='button';option.textContent=label;option.addEventListener('click',()=>{close(true);source.click();});menu.append(option);
  }
  trigger.setAttribute('aria-expanded','true');menu.hidden=false;
  const r=trigger.getBoundingClientRect();menu.style.left=Math.max(8,Math.min(innerWidth-menu.offsetWidth-8,r.right-menu.offsetWidth))+'px';menu.style.top=(r.bottom+menu.offsetHeight+8<innerHeight?r.bottom+6:Math.max(8,r.top-menu.offsetHeight-6))+'px';
  menu.firstElementChild.focus({preventScroll:true});
 });
}
