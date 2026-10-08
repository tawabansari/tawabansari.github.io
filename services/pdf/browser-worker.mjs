import {renderBrowserPDF} from './browser-render.mjs';
import {mergePDFs} from './browser-merge.mjs';
self.onmessage = async ({data:{model,origin,blobs}}) => {
  try { self.postMessage({blob:blobs ? await mergePDFs(blobs,model) : await renderBrowserPDF(model,origin)}); }
  catch (error) { self.postMessage({error:error?.message || 'PDF generation failed'}); }
};
