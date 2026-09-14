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
document.querySelectorAll('[data-language]').forEach(a=>a.addEventListener('click',()=>{try{localStorage.setItem('forqan-language',a.dataset.language);}catch(_){}}));
