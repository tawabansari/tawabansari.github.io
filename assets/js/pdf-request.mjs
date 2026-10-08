// One user action produces one download, even when the hosted renderer is limited.
export function createPDFClient({fetcher = fetch, local = options => import('./pdf-browser.mjs').then(m => m.localPDF(...options)), storage, now = Date.now, remoteTimeout = 190000} = {}) {
  const cooldowns = new Map();
  function key(endpoint) { return 'forqan-pdf-cooldown:' + endpoint; }
  function until(endpoint) {
    try { return Math.max(cooldowns.get(endpoint) || 0, Number(storage?.getItem(key(endpoint))) || 0); }
    catch { return cooldowns.get(endpoint) || 0; }
  }
  function cooldown(endpoint, response) {
    const retry = response?.headers.get('Retry-After');
    const seconds = retry && /^\d+$/.test(retry) ? Number(retry) : 0;
    const deadline = seconds ? now() + seconds * 1000 : retry ? Date.parse(retry) : now() + 30000;
    const value = Math.min(now() + 86400000, Math.max(now() + 1000, deadline || now() + 30000));
    cooldowns.set(endpoint,value);
    try { storage?.setItem(key(endpoint),String(value)); } catch {}
  }
  async function validate(result, signal) {
    signal?.throwIfAborted();
    if (!result.blob?.size || await result.blob.slice(0,5).text() !== '%PDF-') throw Error('Invalid PDF');
    signal?.throwIfAborted();
    return result;
  }
  return async function download(input, {endpoint, fallback = true, signal} = {}) {
    signal?.throwIfAborted();
    if (endpoint && until(endpoint) <= now()) {
      const controller = new AbortController();
      const cancel = () => controller.abort(signal.reason);
      signal?.addEventListener('abort',cancel,{once:true});
      const timer = setTimeout(() => controller.abort(),remoteTimeout);
      try {
        const response = await fetcher(endpoint,{method:'POST',credentials:'omit',signal:controller.signal,
          headers:{'Content-Type':'application/json'},body:JSON.stringify(input)});
        if (!response.ok) {
          const error = Error('PDF service unavailable');
          error.permanent = response.status >= 400 && response.status < 500 && ![408,429].includes(response.status);
          if (!error.permanent) cooldown(endpoint,response);
          throw error;
        }
        if (!response.headers.get('Content-Type')?.startsWith('application/pdf')) throw Error('Invalid PDF response');
        return await validate({blob:await response.blob(),filename:response.headers.get('Content-Disposition')?.match(/filename="([a-zA-Z0-9._-]+)"/)?.[1] || 'forqan.pdf'},signal);
      } catch (error) {
        signal?.throwIfAborted();
        if (error.permanent || !fallback) throw error;
        if (until(endpoint) <= now()) cooldown(endpoint);
      } finally {
        clearTimeout(timer); signal?.removeEventListener('abort',cancel);
      }
    }
    signal?.throwIfAborted();
    if (!fallback) throw Error('PDF service unavailable');
    return validate(await local([input,{signal}]),signal);
  };
}
