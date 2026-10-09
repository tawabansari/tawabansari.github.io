import {createPDFClient} from './pdf-request.mjs';
import {pdfEndpoint} from './pdf-settings.mjs';

// Use the same hosted renderer and on-device fallback as the study page.
export function bindStudyPDF(button,status,path,lang){
  const endpoint=pdfEndpoint(document.querySelector('meta[name="forqan-pdf-endpoint"]')?.content,location.href);
  const fallback=document.querySelector('meta[name="forqan-pdf-fallback"]')?.content==='true';
  if(!endpoint&&!fallback){button.hidden=true;return ()=>{};}
  let storage;try{storage=window.localStorage;}catch{}
  const download=createPDFClient({storage}),fa=lang==='fa';
  let controller,downloadURL,disposed=false;
  button.addEventListener('click',async()=>{
    if(controller||disposed)return;
    const request=new AbortController();controller=request;
    const timeout=setTimeout(()=>request.abort(),600000);
    button.disabled=true;button.setAttribute('aria-busy','true');
    status.textContent=fa?'در حال آماده‌سازی PDF… نوشته‌های بلند ممکن است کمی زمان ببرند.':'Preparing your PDF… Longer studies may take a little time.';
    try{
      const result=await download({path},{endpoint,fallback,signal:request.signal});
      if(disposed||request.signal.aborted)return;
      if(downloadURL)URL.revokeObjectURL(downloadURL);
      downloadURL=URL.createObjectURL(result.blob);
      const link=document.createElement('a');link.href=downloadURL;link.download=result.filename;
      link.textContent=fa?'دریافت دوبارهٔ PDF':'Download PDF again';
      status.replaceChildren(document.createTextNode(fa?'فایل آماده است. ':'Your PDF is ready. '),link);link.click();
    }catch{
      if(!disposed)status.textContent=fa?'ساخت PDF انجام نشد. دوباره دکمهٔ دانلود را بزنید.':'The PDF could not be created. Select Download PDF to try again.';
    }finally{
      clearTimeout(timeout);controller=null;
      if(!disposed){button.disabled=false;button.removeAttribute('aria-busy');}
    }
  });
  return ()=>{disposed=true;controller?.abort();if(downloadURL)URL.revokeObjectURL(downloadURL);};
}
