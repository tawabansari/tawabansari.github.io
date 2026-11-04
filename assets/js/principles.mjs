import {normalize} from './search-utils.mjs';
const directory=document.querySelector('[data-principles]');
if(directory){
 const form=directory.querySelector('form'),groups=[...directory.querySelectorAll('.principles-group')],lang=directory.lang,fa=lang==='fa';
 const collator=new Intl.Collator(lang,{sensitivity:'base'}),rows=[...directory.querySelectorAll('li[data-verse]')];
 const params=new URLSearchParams(location.search);
 for(const name of ['q','category','polarity','sort'])if(params.has(name))form.elements[name].value=params.get(name);
 function update(){
  const q=normalize(form.elements.q.value).split(' ').filter(Boolean),category=form.elements.category.value,polarity=form.elements.polarity.value,sort=form.elements.sort.value;
  for(const row of rows){const text=normalize(row.textContent+' '+row.dataset.search);row.hidden=!q.every(t=>text.includes(t))||(category&&!row.dataset.categories.split(' ').includes(category))||(polarity&&row.closest('[data-polarity]').dataset.polarity!==polarity);}
  for(const group of groups){const list=group.querySelector('ul');[...list.children].sort((a,b)=>{const verse=r=>{const [s,v]=r.dataset.verse.split(':').map(Number);return s*1000+v;};return (sort==='verse'?verse(a)-verse(b):0)||collator.compare(a.textContent.trim(),b.textContent.trim());}).forEach(r=>list.append(r));group.hidden=![...list.children].some(r=>!r.hidden);}
  const count=rows.filter(r=>!r.hidden).length;directory.querySelector('[role=status]').textContent=count?(fa?`${count.toLocaleString('fa')} اصل`: `${count} principles`):(fa?'اصلی با این جستجو پیدا نشد.':'No principles match this search.');
 }
 form.addEventListener('submit',e=>e.preventDefault());form.addEventListener('input',e=>{if(e.target.name==='q')update();});form.addEventListener('change',e=>{if(e.target.tagName==='SELECT')update();});update();
}
const copy=document.querySelector('[data-copy-principle]');
if(copy)copy.addEventListener('click',async()=>{const fa=document.documentElement.lang==='fa',status=copy.nextElementSibling,url=new URL(location.pathname,'https://forqan.co');try{await navigator.clipboard.writeText(url.href);status.textContent=fa?'پیوند کپی شد.':'Link copied.';}catch{status.textContent=url.href;}});
