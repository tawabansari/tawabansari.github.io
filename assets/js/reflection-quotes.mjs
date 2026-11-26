// Enhance only the explicit Arabic / standalone verse citation / translation pattern.
// Ordinary reflection paragraphs and the authored source remain unchanged.
export function formatReflectionQuotes(root = document) {
  root.querySelectorAll('details[data-type="reflection"] p.arabic-text').forEach(arabic => {
    if (arabic.dataset.quoteFormatted) return;
    const reference = arabic.nextElementSibling;
    const translation = reference?.nextElementSibling;
    const link = reference?.querySelector('a[href*="/quran-reflection/"][href*="#ayah-"]');
    if (reference?.tagName !== 'P' || !link ||
        reference.textContent.trim() !== link.textContent.trim() ||
        translation?.tagName !== 'P' || translation.classList.contains('arabic-text')) return;
    const citation = document.createElement('span');
    citation.className = 'reflection-quote-citation';
    citation.dir = document.documentElement.lang?.startsWith('fa') ? 'rtl' : 'ltr';
    citation.append(...reference.childNodes);
    arabic.append(document.createTextNode(' '), citation);
    reference.remove();
    arabic.dataset.quoteFormatted = 'true';
    translation.classList.add('reflection-quote-translation');
  });
}

if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', () => formatReflectionQuotes(), { once: true });
} else {
  formatReflectionQuotes();
}
