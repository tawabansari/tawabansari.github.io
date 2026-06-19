// Keeps root study pages aligned with the site theme toggle.
(function () {
    function parseRGB(value) {
      var match = String(value || '').match(/rgba?\((\d+),\s*(\d+),\s*(\d+)/i);
      if (!match) return null;
      return [Number(match[1]), Number(match[2]), Number(match[3])];
    }

    function luminance(rgb) {
      if (!rgb) return 255;
      return (0.2126 * rgb[0]) + (0.7152 * rgb[1]) + (0.0722 * rgb[2]);
    }

    function hasToken(text, token) {
      return new RegExp('(^|\\s|_|-)' + token + '($|\\s|_|-)', 'i').test(String(text || ''));
    }

    function savedThemePreference() {
      try {
        return localStorage.getItem('forqan-theme');
      } catch (e) {
        return null;
      }
    }

    function detectForqanTheme() {
      var html = document.documentElement;
      var body = document.body;
      var saved = savedThemePreference();

      if (saved === 'dark' || saved === 'light') return saved;

      var marker = [
        html.className,
        body ? body.className : '',
        html.getAttribute('data-theme'),
        body ? body.getAttribute('data-theme') : '',
        html.getAttribute('data-bs-theme'),
        body ? body.getAttribute('data-bs-theme') : ''
      ].join(' ');

      if (hasToken(marker, 'dark')) return 'dark';
      if (hasToken(marker, 'light')) return 'light';

      if (body || html) {
        var bg = parseRGB(getComputedStyle(body || html).backgroundColor) ||
                 parseRGB(getComputedStyle(html).backgroundColor);
        if (bg) return luminance(bg) < 128 ? 'dark' : 'light';
      }

      return 'light';
    }

    function applyForqanRootTheme() {
      var theme = detectForqanTheme();
      var isDark = theme === 'dark';
      var html = document.documentElement;
      var page = document.querySelector('.root-study-page');

      html.classList.toggle('forqan-root-pre-dark', isDark);
      html.classList.toggle('forqan-root-pre-light', !isDark);

      if (page) {
        page.classList.toggle('forqan-root-dark', isDark);
        page.classList.toggle('forqan-root-light', !isDark);
      }
    }

    applyForqanRootTheme();
    document.addEventListener('DOMContentLoaded', applyForqanRootTheme);
    window.addEventListener('load', applyForqanRootTheme);
    window.addEventListener('storage', applyForqanRootTheme);

    if (window.MutationObserver) {
      var observer = new MutationObserver(applyForqanRootTheme);
      observer.observe(document.documentElement, {
        attributes: true,
        attributeFilter: ['class', 'data-theme', 'data-bs-theme']
      });

      function observeBody() {
        if (!document.body) return;
        observer.observe(document.body, {
          attributes: true,
          attributeFilter: ['class', 'data-theme', 'data-bs-theme']
        });
      }

      observeBody();
      document.addEventListener('DOMContentLoaded', observeBody);
    }
  })();
