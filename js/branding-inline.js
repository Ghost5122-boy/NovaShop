(function () {
  var NAME = 'Nexus Market';
  var INITIALS = 'NM';
  var NOVA = /nova\s*shop/gi;

  function fix() {
    document.querySelectorAll('.logo').forEach(function (logo) {
      var icon = logo.querySelector('.logo-icon');
      if (icon) icon.textContent = INITIALS;
      logo.childNodes.forEach(function (node) {
        if (node.nodeType === 3 && node.textContent.trim()) {
          node.textContent = ' ' + NAME;
        }
      });
      if (NOVA.test(logo.textContent)) {
        logo.childNodes.forEach(function (node) {
          if (node.nodeType === 3) node.textContent = ' ' + NAME;
        });
      }
    });

    var loginTitle = document.querySelector('#login-view h1');
    if (loginTitle) loginTitle.textContent = loginTitle.textContent.replace(NOVA, NAME);

    document.querySelectorAll('footer p, .footer p').forEach(function (el) {
      el.innerHTML = el.innerHTML
        .replace(NOVA, NAME)
        .replace(/©\s*2024/gi, '© 2026');
    });

    document.title = document.title.replace(NOVA, NAME);
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', fix);
  } else {
    fix();
  }
})();
