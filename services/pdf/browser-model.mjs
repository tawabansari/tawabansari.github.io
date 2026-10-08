import {prepareDocument} from './document.mjs';

const arabic = '.arabic-text,.arabic-quote,.quran-text,.ayah-arabic,.verse-arabic,.arabic,.arabic-large,.morph-form,[lang="ar"]';
const structural = /^(MAIN|ARTICLE|SECTION|DIV|HEADER|FOOTER|ASIDE|FIGURE|BLOCKQUOTE)$/;
const blocks = /^(P|H[1-6]|UL|OL|TABLE|HR|PRE|FIGCAPTION)$/;

// A small semantic tree crosses into the worker; no source script is executed.
export function browserDocument(selection, html, sourceURL) {
  const doc = document.implementation.createHTMLDocument('');
  prepareDocument({...selection,html,sourceURL},doc);
  doc.querySelectorAll('.root-toc,.page-intro-nav,.surah-nav,.study-back,.kicker').forEach(n=>n.remove());
  const fa = selection.lang === 'fa';
  function style(node, inherited = {}) {
    const result = {...inherited};
    if (node.dir) result.direction = node.dir;
    if (node.matches(arabic)) Object.assign(result,{arabic:true,direction:'rtl',bold:false,italic:false});
    if (node.matches('b,strong') && !result.arabic) result.bold = true;
    if (node.matches('i,em') && !result.arabic) result.italic = true;
    if (node.matches('sup')) result.super = true;
    if (node.matches('sub')) result.sub = true;
    return result;
  }
  function inline(node, inherited = {}) {
    if (node.nodeType === 3) return [{text:node.textContent.replace(/\s+/g,' '),style:inherited}];
    if (node.nodeType !== 1) return [];
    if (node.tagName === 'BR') return [{text:'\n',style:inherited}];
    const next = style(node,inherited);
    if (node.matches('a[href]')) next.href = node.getAttribute('href');
    return [...node.childNodes].flatMap(n=>inline(n,next));
  }
  function children(node, inherited = {}) {
    const result = []; let run = [];
    function flush() {
      if (run.some(r=>r.text.trim())) result.push({type:'text',runs:run,style:inherited});
      run = [];
    }
    for (const child of node.childNodes) {
      if (child.nodeType === 1 && (structural.test(child.tagName) || blocks.test(child.tagName) || child.tagName === 'IMG')) {
        flush(); result.push(...block(child,inherited));
      } else run.push(...inline(child,inherited));
    }
    flush(); return result;
  }
  function block(node, inherited = {}) {
    const next = style(node,inherited), cls = [...node.classList];
    if (node.matches('.pdf-opening')) return [{type:'opening',children:children(node,next)}];
    if (node.matches('.pdf-contents')) return [{type:'contents',title:node.querySelector('h2').textContent,
      items:[...node.querySelectorAll('a')].map(a=>({text:a.textContent,href:a.getAttribute('href')}))}];
    if (node.matches('.pdf-verse')) return [{type:'verse',id:node.id,children:children(node,next)}];
    if (node.tagName === 'HR') return [{type:'rule'}];
    if (node.tagName === 'IMG') {
      const url = new URL(node.getAttribute('src'),sourceURL);
      if (url.origin !== new URL(sourceURL).origin || !['http:','https:'].includes(url.protocol)) throw Error('Image must be hosted on the site');
      return [{type:'image',src:url.href,alt:node.alt}];
    }
    if (node.tagName === 'TABLE') {
      const rows = [...node.rows].map(row=>[...row.cells].map(cell=>({span:cell.colSpan,header:cell.tagName==='TH',children:children(cell,next)})));
      return [{type:'table',rows,style:next}];
    }
    if (node.matches('ul,ol')) return [{type:'list',style:next,items:[...node.children].map((item,i)=>({
      marker:node.tagName==='OL' ? `${new Intl.NumberFormat(selection.lang).format(i+Number(node.start||1))}.` : '•',children:children(item,next)}))}];
    if (node.tagName === 'BLOCKQUOTE') return [{type:'quote',children:children(node,next)}];
    if (structural.test(node.tagName)) return children(node,next);
    return [{type:'text',runs:inline(node,next),style:next,tag:node.tagName,classes:cls,id:node.id}];
  }
  return {lang:selection.lang,title:doc.title,sourceURL,blocks:children(doc.body,{direction:fa?'rtl':'ltr'}),
    text:doc.body.textContent};
}
