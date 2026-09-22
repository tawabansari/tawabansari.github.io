import assert from 'node:assert/strict';
import {afterReadingLayout} from '../assets/js/reading-position.mjs';

function browser(){
  const win=new EventTarget(),frames=[];
  let ready;
  win.document={readyState:'loading',fonts:{ready:new Promise(resolve=>{ready=resolve;})}};
  win.requestAnimationFrame=fn=>frames.push(fn);
  return {win,frames,ready};
}
const tick=()=>new Promise(resolve=>setImmediate(resolve));
{
  const {win,frames,ready}=browser();let restores=0;
  const done=afterReadingLayout(()=>restores++,{win});
  win.dispatchEvent(new Event('load'));await tick();assert.equal(restores,0);
  ready();await tick();frames.shift()();frames.shift()();
  assert.equal(await done,true);assert.equal(restores,1);
  win.dispatchEvent(new Event('load'));await tick();assert.equal(restores,1);
}
for(const name of ['touchstart','wheel','pointerdown','hashchange','pagehide','keydown']){
  const {win,frames,ready}=browser();let restores=0;
  const done=afterReadingLayout(()=>restores++,{win});
  const event=new Event(name);if(name==='keydown')event.key='PageDown';win.dispatchEvent(event);
  assert.equal(await done,false);
  win.dispatchEvent(new Event('load'));ready();await tick();frames.forEach(fn=>fn());
  assert.equal(restores,0,name+' must cancel restoration');
}
console.log('Passed one-time restoration after fonts/layout and cancellation on touch, scrolling, keyboard, navigation, and departure.');
