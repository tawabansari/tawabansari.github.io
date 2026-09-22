// One restoration after fonts and layout settle. Reader input always wins.
export function afterReadingLayout(restore, {win=window, doc=win.document}={}) {
  return new Promise(resolve => {
    let finished=false;
    const events=['pointerdown','touchstart','wheel','keydown','hashchange','pagehide'];
    function finish(restored=false){
      if(finished)return;
      finished=true;
      events.forEach(name=>win.removeEventListener(name,cancel,true));
      resolve(restored);
    }
    function cancel(event){
      if(event.type==='keydown' && !['ArrowUp','ArrowDown','PageUp','PageDown','Home','End',' ','Tab','Escape'].includes(event.key))return;
      finish();
    }
    events.forEach(name=>win.addEventListener(name,cancel,{capture:true,passive:true}));
    const loaded=doc.readyState==='complete'?Promise.resolve():new Promise(done=>win.addEventListener('load',done,{once:true}));
    loaded.then(()=>doc.fonts?.ready).then(()=>{
      if(finished)return;
      win.requestAnimationFrame(()=>win.requestAnimationFrame(()=>{
        if(finished)return;
        try{restore();}finally{finish(true);}
      }));
    }).catch(()=>finish());
  });
}
