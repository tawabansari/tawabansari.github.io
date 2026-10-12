// Only a verified embedding parent may receive reader navigation.
const parents = new Set(['https://tabsira.forqan.co', 'http://127.0.0.1:5173', 'http://127.0.0.1:8787']);
if (window.self !== window.top) {
  let parentOrigin = '', reported = '';
  function announce() {
    if (!parentOrigin || reported === location.href) return;
    reported = location.href;
    window.parent.postMessage({type: 'forqan-location', url: location.href}, parentOrigin);
  }
  window.addEventListener('message', event => {
    if (event.source !== window.parent || !parents.has(event.origin) || event.data?.type !== 'tabsira-theme' || !['dark', 'light'].includes(event.data.theme)) return;
    parentOrigin = event.origin;
    announce();
  });
  window.addEventListener('hashchange', announce);
  window.addEventListener('popstate', announce);
  // Preserve the embedded appearance on normal links. Programmatic chapter
  // navigation also inherits the tab's embedded theme in the page's head.
  document.addEventListener('click', event => {
    const anchor = event.target.closest?.('a[href]');
    if (!anchor || !parentOrigin || anchor.target === '_blank' || anchor.hasAttribute('download')) return;
    const url = new URL(anchor.href, location.href);
    if (url.origin !== location.origin) return;
    // A hash link stays in this document, so it needs no URL decoration.
    if (url.pathname === location.pathname && url.search === location.search) return;
    url.searchParams.set('reading-panel', '1');
    url.searchParams.set('reader-style', '3');
    url.searchParams.set('tabsira-theme', window.FORQAN_EMBED_THEME || 'light');
    anchor.href = url.href;
  }, true);
}
