import {headerState} from './header-state.mjs';
const header=document.querySelector('.library-header');
if(header){
  let state={y:Math.max(0,scrollY),turn:Math.max(0,scrollY),direction:0,hidden:false},scheduled=false;
  function size(){document.documentElement.style.setProperty('--library-header-height',header.offsetHeight+'px');}
  function update(){
    scheduled=false;
    const engaged=header.querySelector(':focus-visible')||header.querySelector('#site-menu:not([hidden])');
    state=headerState(state,scrollY,header.offsetHeight,!!engaged);
    header.classList.toggle('header-away',state.hidden);
  }
  window.addEventListener('scroll',()=>{if(!scheduled){scheduled=true;requestAnimationFrame(update);}},{passive:true});
  header.addEventListener('focusin',()=>{state.hidden=false;header.classList.remove('header-away');});
  window.addEventListener('resize',size,{passive:true});
  if(typeof ResizeObserver!=='undefined')new ResizeObserver(size).observe(header);
  size();
}
document.querySelectorAll('[data-language]').forEach(a=>a.addEventListener('click',()=>{
  try{localStorage.setItem('forqan-language',a.dataset.language);}catch(_){}
  const chapter=location.pathname.match(/^\/quran-reflection\/(en|fa)\/([^/]+)\/$/);
  if(!chapter)return;
  const target=new URL(a.href,location.href);
  const available=window.FORQAN_READING_AVAILABILITY?.[a.dataset.language]?.[chapter[2]];
  if(!available || target.pathname!==`/quran-reflection/${a.dataset.language}/${chapter[2]}/`)return;
  let verse;
  try{verse=document.getElementById(decodeURIComponent(location.hash.slice(1)))?.closest('.ayah-block');}catch(_){}
  if(!verse){
    const line=innerHeight*.38;
    verse=Array.from(document.querySelectorAll('.ayah-block[id]')).reduce((best,node)=>
      !best||Math.abs(node.getBoundingClientRect().top-line)<Math.abs(best.getBoundingClientRect().top-line)?node:best,null);
  }
  target.hash=verse && available.includes(verse.id)?verse.id:'';
  a.href=target.pathname+target.search+target.hash;
}));
