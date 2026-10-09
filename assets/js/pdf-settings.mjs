// An HTTPS service is primary; the optional browser renderer is the fallback.
export function pdfEndpoint(value, base) {
  try {
    if (!value) return null;
    const url = new URL(value, base);
    if (url.protocol !== 'https:' && !(url.protocol === 'http:' && ['localhost', '127.0.0.1', '[::1]'].includes(url.hostname))) return null;
    if (url.username || url.password) return null;
    return url.href;
  } catch { return null; }
}
