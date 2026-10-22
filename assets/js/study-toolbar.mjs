// Reading tools belong together; navigation and Quran verse controls are separate.
export function compactStudy(main,study,fa){
  if(!/^\/(?:quran-terminology\/(?:fa|en)\/roots\/[^/]+|(?:fa|en)\/(?:articles|hadith-critique|quran-completeness|quran-terminology|salat)\/.+)\/?$/.test(location.pathname))return;
  const title=study.querySelector('h1');if(!title)return;
  const hero=title.closest('header,.root-hero,.article-hero')||title;
  study.classList.add('compact-study');main.classList.add('compact-study-main');
  hero.classList.add('compact-study-hero');
  const toolbar=document.createElement('div');toolbar.className='study-toolbar';
  toolbar.setAttribute('role','group');toolbar.setAttribute('aria-label',fa?'ابزار مطالعه':'Study tools');toolbar.dataset.pagefindIgnore='';
  hero.insertAdjacentElement('afterend',toolbar);
  const panels=document.createElement('div');panels.className='study-tool-panels';panels.dataset.pagefindIgnore='';toolbar.after(panels);
  function toggle(label,panel,id,focus){
    panel.id=id;panel.hidden=true;panels.append(panel);
    const button=document.createElement('button');button.type='button';button.textContent=label;
    button.setAttribute('aria-controls',id);button.setAttribute('aria-expanded','false');toolbar.append(button);
    const close=()=>{panel.hidden=true;button.setAttribute('aria-expanded','false');};
    button.addEventListener('click',()=>{const open=panel.hidden;panel.hidden=!open;button.setAttribute('aria-expanded',String(open));if(open&&focus)focus.focus();});
    panel.addEventListener('keydown',e=>{if(e.key==='Escape'){e.stopPropagation();close();button.focus();}});
    return close;
  }
  const toc=study.querySelector('.library-toc'),nativeToc=study.querySelector('.root-toc,nav[aria-label="Contents"],nav[aria-label="فهرست مقاله"],nav[aria-label="فهرست مطالب"]');
  if(toc||nativeToc){
    const panel=document.createElement('nav');panel.className='study-contents';panel.setAttribute('aria-label',fa?'فهرست مطالب':'Contents');
    if(nativeToc){panel.append(...nativeToc.childNodes);nativeToc.remove();panel.querySelector('h2')?.remove();}
    else panel.append(...Array.from(toc.children).filter(n=>n.tagName!=='SUMMARY'));
    toc?.remove();const close=toggle(fa?'فهرست':'Contents',panel,'study-contents');
    panel.addEventListener('click',e=>{if(e.target.closest('a'))close();});
  }
  const search=study.querySelector('.library-find');
  if(search)toggle(fa?'جستجو':'Search',search,'study-search',search.querySelector('input'));
  const discussion=study.querySelector('[data-tabsira-discuss]');
  const link=discussion?.querySelector('a');
  if(link){link.title=link.textContent.trim();link.textContent=fa?'تبصره ↗':'Tabsira ↗';link.classList.add('study-discuss');toolbar.append(link);discussion.remove();}
  const pdf=study.querySelector('.pdf-study-tools');
  if(pdf){toolbar.insertBefore(pdf,link||null);}
  const context=main.querySelector('.study-context');
  if(context){
    context.classList.add('compact-study-context');
    // The category links already appear in the context line.
    hero.querySelectorAll?.('.kicker,.root-kicker,.article-kicker').forEach(n=>n.hidden=true);
    const translation=context.querySelector('.study-translation');
    if(translation){translation.classList.add('study-language-note');panels.after(translation);}
  }
}
