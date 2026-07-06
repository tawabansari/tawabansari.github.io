// Keeps root study pages aligned with the single Forqan site theme.
(function () {
  function currentTheme() {
    var theme = document.documentElement.getAttribute('data-forqan-theme');
    if (theme === 'dark' || theme === 'light') return theme;

    try {
      var saved = localStorage.getItem('forqan-theme');
      if (saved === 'dark' || saved === 'light') return saved;
    } catch (e) {}

    return document.body && document.body.classList.contains('dark-theme') ? 'dark' : 'light';
  }

  function applyRootTheme() {
    var theme = currentTheme();
    var isDark = theme === 'dark';
    var html = document.documentElement;
    var page = document.querySelector('.root-study-page');

    html.setAttribute('data-forqan-theme', theme);
    html.setAttribute('data-theme', theme);
    html.classList.toggle('forqan-root-pre-dark', isDark);
    html.classList.toggle('forqan-root-pre-light', !isDark);
    html.classList.toggle('forqan-theme-dark', isDark);
    html.classList.toggle('forqan-theme-light', !isDark);

    if (document.body) {
      document.body.classList.toggle('dark-theme', isDark);
      document.body.classList.toggle('light-theme', !isDark);
    }

    if (page) {
      page.classList.toggle('forqan-root-dark', isDark);
      page.classList.toggle('forqan-root-light', !isDark);
    }
  }

  applyRootTheme();
  document.addEventListener('DOMContentLoaded', applyRootTheme);
  window.addEventListener('forqan-theme-change', applyRootTheme);
  window.addEventListener('storage', function (event) {
    if (!event || event.key === 'forqan-theme') applyRootTheme();
  });
})();
