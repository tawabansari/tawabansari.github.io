(function(){
  'use strict';
  const section=document.getElementById('archive-feature');if(!section)return;
  const content=document.getElementById('feature-content'),next=document.getElementById('feature-next');
  const kinds=['Quran','Roots','Terminology','Articles'];let data=[],kind=0,language='en',busy=false;
  function read(key,fallback){try{return localStorage.getItem(key)||fallback;}catch(_){return fallback;}}
  function save(key,value){try{localStorage.setItem(key,value);}catch(_){}}
  const previous=Number(read('forqan-feature-kind','-1'));kind=Number.isInteger(previous)&&previous>=-1&&previous<kinds.length?(previous+1)%kinds.length:0;
  language=read('forqan-language','en')==='fa'?'fa':'en';
  function render(){
    const pool=data.filter(d=>d.kind===kinds[kind]&&d.lang===language);if(!pool.length)return;
    const key='forqan-feature-item-'+language+'-'+kinds[kind];
    const prior=Number(read(key,'-1'));const position=prior>=0?(prior+1)%pool.length:Math.floor(Math.random()*pool.length);
    const item=pool[position];save(key,String(position));save('forqan-feature-kind',String(kind));
    const fa=language==='fa';content.replaceChildren();content.lang=language;content.dir=fa?'rtl':'ltr';
    const heading=document.createElement('h2');heading.id='feature-heading';heading.textContent=item.title;content.appendChild(heading);
    if(item.arabic){const p=document.createElement('p');p.className='feature-arabic';p.lang='ar';p.dir='rtl';p.textContent=item.arabic;content.appendChild(p);}
    const p=document.createElement('p');p.className='feature-excerpt';const label=document.createElement('span');label.className='excerpt-label';label.textContent=fa?'گزیده':'Excerpt';p.append(label,document.createTextNode(item.excerpt));content.appendChild(p);
    const a=document.createElement('a');a.className='feature-read';a.href=item.url;
    a.textContent=fa?({Quran:'مطالعه این آیه',Roots:'مطالعه این ریشه',Terminology:'مطالعهٔ مفهوم',Articles:'مطالعه مقاله'}[item.kind]):({Quran:'Read this verse',Roots:'Explore this root',Terminology:'Explore the concept',Articles:'Read the article'}[item.kind]);content.appendChild(a);
    section.querySelectorAll('[data-feature-kind]').forEach(e=>e.setAttribute('aria-current',String(e.dataset.featureKind===item.kind)));
    section.querySelectorAll('[data-feature-language]').forEach(e=>e.setAttribute('aria-pressed',String(e.dataset.featureLanguage===language)));
    next.textContent=fa?'گزیده‌ای دیگر':'Another selection';
    const homeForm=document.querySelector('.library-home form');if(homeForm){let input=homeForm.querySelector('[name="lang"]');if(!input){input=document.createElement('input');input.type='hidden';input.name='lang';homeForm.appendChild(input);}input.value=language;}
  }
  async function change(action){
    if(busy||!data.length)return;busy=true;next.disabled=true;
    const motion=!matchMedia('(prefers-reduced-motion: reduce)').matches;
    if(motion){content.classList.add('changing');await new Promise(resolve=>setTimeout(resolve,140));}
    action();render();content.classList.remove('changing');next.disabled=false;busy=false;
  }
  next.addEventListener('click',()=>change(()=>{kind=(kind+1)%kinds.length;}));
  section.querySelectorAll('[data-feature-language]').forEach(button=>button.addEventListener('click',()=>change(()=>{language=button.dataset.featureLanguage;save('forqan-language',language);})));
  window.addEventListener('pageshow',event=>{if(event.persisted&&data.length){kind=(kind+1)%kinds.length;render();}});
  fetch('/assets/data/features.json').then(r=>{if(!r.ok)throw Error('features');return r.json();}).then(items=>{data=items;render();}).catch(()=>{next.hidden=true;section.querySelector('.feature-languages').hidden=true;});
}());
