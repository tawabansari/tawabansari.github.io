// Enhance explicitly marked Quran quotations and their adjacent translations.
// Ordinary reflection paragraphs and the authored source remain unchanged.
const arabicSelector = 'p.arabic-text,p.arabic,p.arabic-quote,p.quran-quote,p.quran-text,p.ayah-arabic,p.verse-arabic,blockquote.arabic-quote';

function isReference(element) {
  if (!element?.matches('p')) return false;
  if (element.matches('.verse-ref,.verse-reference,.principle-verse-reference')) return true;
  const link = element.querySelector('a[href*="/quran-reflection/"][href*="#ayah-"]');
  return !!link && element.textContent.trim() === link.textContent.trim();
}

export function formatReflectionQuotes(root = document) {
  root.querySelectorAll(arabicSelector).forEach(arabic => {
    if (arabic.dataset.quoteFormatted || arabic.closest('[data-quote-formatted]')) return;
    // Main reader verses have their own controls and layout.
    if (arabic.closest('.ayah-block') && !arabic.closest('details[data-type="reflection"]')) return;
    const next = arabic.nextElementSibling;
    let reference, translation;
    if (isReference(next)) {
      reference = next;
      translation = next.nextElementSibling;
    } else if (next?.matches('p') && !next.matches(arabicSelector) && isReference(next.nextElementSibling)) {
      translation = next;
      reference = next.nextElementSibling;
    } else if (next?.matches('p.translation,p.farsi-verse,p.english-verse')) {
      translation = next;
    }
    if (!translation?.matches('p') || translation.matches(arabicSelector) || isReference(translation)) return;
    if (reference) {
      const citation = document.createElement('span');
      citation.className = 'reflection-quote-citation';
      if (reference.querySelectorAll('a').length <= 1) citation.classList.add('single-citation');
      citation.dir = document.documentElement.lang?.startsWith('fa') ? 'rtl' : 'ltr';
      citation.append(...reference.childNodes);
      // An Arabic-only blockquote may contain its text in a single paragraph.
      const target = arabic.matches('blockquote') && arabic.children.length === 1 && arabic.firstElementChild.matches('p')
        ? arabic.firstElementChild : arabic;
      target.append(document.createTextNode(' '), citation);
      reference.remove();
    }
    arabic.dataset.quoteFormatted = 'true';
    translation.classList.add('reflection-quote-translation');
  });
}

if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', () => formatReflectionQuotes(), { once: true });
} else {
  formatReflectionQuotes();
}
