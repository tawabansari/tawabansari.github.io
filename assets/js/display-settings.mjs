import {afterReadingLayout} from './reading-position.mjs';
const panel=document.querySelector('.display-settings');
if(panel){
 const fa=document.documentElement.lang==='fa', body=document.body;
 panel.dir=fa?'rtl':'ltr';
 const key='forqan-display-settings', defaults={lines:0,arabic:0,text:0,gap:0,width:'normal',translation:true};
 let state={...defaults};
 try{const saved=JSON.parse(localStorage.getItem(key));for(const k of ['lines','arabic','text','gap'])if(Number.isInteger(saved?.[k])&&Math.abs(saved[k])<=3)state[k]=saved[k];if(['narrow','normal','wide'].includes(saved?.width))state.width=saved.width;if(typeof saved?.translation==='boolean')state.translation=saved.translation;}catch{}
 const quran=!!document.querySelector('.ayah-block'), controls=panel.querySelector('[data-display-controls]');
 const labels={lines:['فاصلهٔ خطوط','Line spacing'],arabic:['اندازهٔ متن عربی','Arabic text size'],text:['اندازهٔ ترجمه و توضیحات','Translation and explanation size'],gap:['فاصلهٔ آیات','Verse spacing']};
 for(const k of Object.keys(labels)){
  if(!quran&&['arabic','gap'].includes(k))continue;
  const row=document.createElement('div');row.className='display-setting-row';
  const label=labels[k][fa?0:1];
  row.innerHTML=`<span id="display-label-${k}">${label}</span><div class="display-stepper" role="group" aria-labelledby="display-label-${k}" dir="ltr"><button type="button" data-step="-1" data-setting="${k}" aria-label="${fa?'کاهش':'Decrease'} ${label}">−</button><output data-level="${k}" aria-live="polite"></output><button type="button" data-step="1" data-setting="${k}" aria-label="${fa?'افزایش':'Increase'} ${label}">+</button></div>`;
  controls.append(row);
 }
 const widthRow=document.createElement('label');widthRow.className='display-setting-row display-width';widthRow.innerHTML=`<span>${fa?'پهنای متن':'Reading width'}</span><select data-display-width><option value="narrow">${fa?'باریک':'Narrow'}</option><option value="normal">${fa?'معمولی':'Normal'}</option><option value="wide">${fa?'پهن':'Wide'}</option></select>`;controls.append(widthRow);
 const translation=document.createElement('label');translation.className='display-setting-row';translation.hidden=true;translation.innerHTML=`<span>${fa?'نمایش ترجمه':'Show translation'}</span><input type="checkbox" data-display-translation>`;if(quran)controls.append(translation);
 function apply(preserve=false){
  const anchor=preserve&&scrollY>100?[...document.querySelectorAll('#main-content .ayah-block, #main-content p')].find(el=>el.getBoundingClientRect().bottom>Math.max(100,document.querySelector('.library-header')?.getBoundingClientRect().bottom||0)):null;
  const top=anchor?.getBoundingClientRect().top;
  for(const k of ['lines','arabic','text','gap']){
   body.dataset['display'+k[0].toUpperCase()+k.slice(1)]=String(state[k]);
   const output=panel.querySelector(`[data-level="${k}"]`);if(output)output.textContent=state[k]===0?(fa?'معمولی':'Normal'):(state[k]>0?'+':'')+state[k];
   panel.querySelectorAll(`[data-setting="${k}"]`).forEach(b=>b.disabled=state[k]+Number(b.dataset.step)>3||state[k]+Number(b.dataset.step)<-3);
  }
  body.style.setProperty('--display-arabic-scale',1+state.arabic*.09);
  body.style.setProperty('--display-text-scale',1+state.text*.08);
  body.style.setProperty('--display-line-height',1.85+state.lines*.14);
  body.style.setProperty('--display-arabic-line-height',2.4+state.lines*.14);
  body.style.setProperty('--display-verse-gap',`${.6+state.gap*.15}rem`);
  body.dataset.displayWidth=state.width;body.dataset.displayTranslation=String(state.translation);
  widthRow.querySelector('select').value=state.width;translation.querySelector('input').checked=state.translation;
  try{localStorage.setItem(key,JSON.stringify(state));}catch{}
  if(anchor)afterReadingLayout(()=>scrollBy({top:anchor.getBoundingClientRect().top-top,behavior:'instant'}));
 }
 panel.addEventListener('click',e=>{
  const step=e.target.closest('[data-step]');if(step){const k=step.dataset.setting;state[k]=Math.max(-3,Math.min(3,state[k]+Number(step.dataset.step)));apply(true);}
  if(e.target.closest('[data-display-reset]')){state={...defaults};apply(true);}
  if(e.target.closest('[data-display-close]')){document.getElementById('site-menu-toggle').click();document.getElementById('site-menu-toggle').focus();}
 });
 widthRow.querySelector('select').addEventListener('change',e=>{state.width=e.target.value;apply(true);});
 translation.querySelector('input').addEventListener('change',e=>{state.translation=e.target.checked;apply(true);});
 const updateContext=()=>{translation.hidden=!body.classList.contains('quran-reading-mode');};
 new MutationObserver(updateContext).observe(body,{attributes:true,attributeFilter:['class']});updateContext();apply();
}

// A single desktop tooltip also supports keyboard navigation and dynamic verse links.
const header=document.querySelector('.library-header');
if(header){
 const fa=document.documentElement.lang==='fa', desktop=matchMedia('(min-width:801px) and (hover:hover) and (pointer:fine)');
 const tip=document.createElement('div');tip.id='header-purpose-tooltip';tip.className='header-purpose-tooltip';tip.role='tooltip';tip.hidden=true;document.body.append(tip);
 const descriptions=[['انتخاب سوره و آیه برای روخوانی یا مطالعهٔ قرآن','Choose a surah and verse to read or study'],['بررسی ریشهٔ واژه‌های قرآن و مشتق‌های آن‌ها','Explore Quranic word roots and their derivatives'],['مطالعهٔ مفاهیم و اصطلاحات قرآن','Study Quranic concepts and terminology'],['مطالعهٔ اصول قرآنی همراه با شواهد آیات','Study Quranic principles and their verse evidence'],['مرور مجموعه‌های کتاب، مقاله و پژوهش','Browse books, articles and research']];
 header.querySelectorAll('.library-primary > a').forEach((el,i)=>{if(descriptions[i])el.dataset.purpose=descriptions[i][fa?0:1];});
 const descriptionsBySelector={'.forqan-home-link':['بازگشت به صفحهٔ اصلی فرقان','Return to the Forqan homepage'],'.library-search-link':['جستجوی آیه، واژه، ریشه یا موضوع در فرقان','Search Forqan for a verse, word, root or topic'],'.language-switcher a':['تغییر زبان نمایش سایت','Change the website language'],'.sibling-site-link':['ورود به تبصره برای گفت‌وگو و ثبت دیدگاه','Visit Tabsira for discussions and comments'],'#site-menu-toggle':['تنظیمات نمایش','Display settings']};
 for(const [selector,text]of Object.entries(descriptionsBySelector))header.querySelectorAll(selector).forEach(el=>el.dataset.purpose=text[fa?0:1]);
 let active,timer,oldDescription;
 function hide(){clearTimeout(timer);tip.hidden=true;if(active){if(oldDescription===null)active.removeAttribute('aria-describedby');else active.setAttribute('aria-describedby',oldDescription);}active=null;}
 function show(el){if(!desktop.matches||!el)return;hide();let text=el.dataset.purpose||el.getAttribute('aria-label');if(el.classList.contains('verse-picker-trigger'))text=fa?'رفتن به سوره و آیهٔ دلخواه':'Go to a surah and verse';if(el.id==='theme-toggle-btn')text=document.body.classList.contains('dark-theme')?(fa?'فعال‌کردن نمای روشن':'Switch to light theme'):(fa?'فعال‌کردن نمای تاریک':'Switch to dark theme');if(!text)return;active=el;oldDescription=el.getAttribute('aria-describedby');timer=setTimeout(()=>{tip.textContent=text;tip.dir=fa?'rtl':'ltr';tip.hidden=false;el.setAttribute('aria-describedby',[oldDescription,tip.id].filter(Boolean).join(' '));const r=el.getBoundingClientRect();tip.style.top=`${r.bottom+9}px`;tip.style.left=`${Math.max(8,Math.min(innerWidth-tip.offsetWidth-8,r.left+r.width/2-tip.offsetWidth/2))}px`;},250);}
 header.addEventListener('pointerover',e=>{const el=e.target.closest('a,button');if(el!==active)show(el);});
 header.addEventListener('pointerout',e=>{if(active&&!active.contains(e.relatedTarget))hide();});
 header.addEventListener('focusin',e=>show(e.target.closest('a,button')));header.addEventListener('focusout',hide);header.addEventListener('click',hide);window.addEventListener('scroll',hide,{passive:true});document.addEventListener('keydown',e=>{if(e.key==='Escape')hide();});desktop.addEventListener('change',hide);
}
