(function () {
  'use strict';
  if (window.self !== window.top) return;
  var key = 'forqan-language';
  var supported = function (value) { return value === 'fa' || value === 'en'; };

  // Remember explicit language choices without redirecting reading links.
  document.addEventListener('click', function (event) {
    var link = event.target.closest && event.target.closest('a[data-language]');
    if (!link || event.defaultPrevented || event.button !== 0 || event.metaKey || event.ctrlKey || event.shiftKey || event.altKey) return;
    var language = link.getAttribute('data-language');
    if (supported(language)) {
      try { localStorage.setItem(key, language); } catch (_) {}
    }
  });

  if (location.pathname !== '/') return;
  var language;
  try { language = localStorage.getItem(key); } catch (_) {}
  if (!supported(language)) {
    var preferences = navigator.languages || [navigator.language || 'en'];
    language = preferences.map(function (value) {
      return value.toLowerCase().split('-')[0];
    }).find(supported) || 'en';
  }
  location.replace('/' + language + '/' + location.search + location.hash);
}());
