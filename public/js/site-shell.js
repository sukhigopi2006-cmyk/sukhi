/* Shared customer-facing layout for Sukhi Fireworks. */
(function () {
  const page = window.location.pathname.split('/').pop() || 'index.html';
  if (page === 'admin.html' || page === 'checkout.html' || page === 'payment.html') return;

  document.querySelectorAll('body > header, body > nav, body > footer').forEach(element => element.remove());

  const navItems = [
    ['index.html', 'Home', 'home'],
    ['shop.html', 'Shop', 'storefront'],
    ['index.html#stories', 'Stories', 'auto_awesome'],
    ['cart.html', 'Cart', 'shopping_cart'],
    ['contact.html', 'Contact', 'support_agent']
  ];

  const desktopLinks = navItems.map(([href, label]) => `
    <a href="${href}" class="site-nav-link ${page === href ? 'is-active' : ''}">${label}</a>
  `).join('');

  const mobileLinks = navItems.map(([href, label, icon]) => `
    <a href="${href}" class="site-mobile-link ${page === href ? 'is-active' : ''}">
      <span class="material-symbols-outlined">${icon}</span>
      <span>${label}</span>
    </a>
  `).join('');

  const header = document.createElement('header');
  header.className = 'site-header';
  header.innerHTML = `
    <div class="site-header-inner">
      <a href="index.html" class="site-brand" aria-label="Sukhi Fireworks home">
        <img class="site-brand-mark" src="pics/pencil_trademark_transparent.png" onerror="this.src='images/pencil_trademark_transparent.png'" alt="Pencil Trademark" />
        <span class="site-brand-company">Sukhi</span>
      </a>
      <nav class="site-desktop-nav" aria-label="Main navigation">${desktopLinks}</nav>
      <div class="site-header-actions">
        <form class="site-search" action="shop.html" role="search">
          <span class="material-symbols-outlined">search</span>
          <input name="search" type="search" placeholder="Search fireworks" aria-label="Search fireworks" />
        </form>
        <a href="cart.html" class="site-icon-link" aria-label="Shopping cart">
          <span class="material-symbols-outlined">shopping_cart</span>
          <span data-cart-count class="site-count hidden">0</span>
        </a>
        <a href="wishlist.html" class="site-icon-link" aria-label="Wishlist">
          <span class="material-symbols-outlined">favorite</span>
          <span data-wishlist-count class="site-count hidden">0</span>
        </a>
        <a href="login.html" data-auth-login class="site-login-button">Customer Login</a>
        <div data-auth-user class="site-user-menu hidden">
          <button id="site-account-btn" class="site-icon-link site-account-icon-btn" aria-label="My account" aria-expanded="false" aria-haspopup="true">
            <span class="material-symbols-outlined" style="font-variation-settings:'FILL' 1;">account_circle</span>
          </button>
          <div id="site-account-dropdown" class="site-account-dropdown" role="menu" aria-hidden="true">
            <div class="site-account-dropdown-header">
              <span class="material-symbols-outlined site-account-dropdown-avatar" style="font-variation-settings:'FILL' 1;">account_circle</span>
              <div>
                <p class="site-account-dropdown-name" data-user-name>User</p>
                <p class="site-account-dropdown-email" data-user-email></p>
              </div>
            </div>
            <div class="site-account-dropdown-divider"></div>
            <a href="account.html" class="site-account-dropdown-item" role="menuitem">
              <span class="material-symbols-outlined">manage_accounts</span>
              <span>My Account</span>
            </a>
            <a href="account.html#orders" class="site-account-dropdown-item" role="menuitem">
              <span class="material-symbols-outlined">receipt_long</span>
              <span>My Orders</span>
            </a>
            <div class="site-account-dropdown-divider"></div>
            <button onclick="Auth.logout()" type="button" class="site-account-dropdown-item site-account-dropdown-logout" role="menuitem">
              <span class="material-symbols-outlined">logout</span>
              <span>Sign Out</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  `;

  const footer = document.createElement('footer');
  footer.className = 'site-footer';
  footer.innerHTML = `
    <div class="site-footer-inner">
      <div>
        <a href="index.html" class="site-footer-brand">PENCIL TRADEMARK</a>
        <p>Celebrations, designed in light. Premium fireworks from the heart of Sivakasi.</p>
        <p class="site-copyright">© 2026 Sukhi Fireworks. Light with caution.</p>
      </div>
      <div>
        <h2>Visit us</h2>
        <address>227, Amman Kovil Patti Middle Street<br />Sivakasi - 626 189</address>
        <a class="site-footer-address-link" href="contact.html">Get directions &amp; support →</a>
      </div>
      <div>
        <h2>Explore</h2>
        <div class="site-footer-actions">
          <a href="index.html#stories">Our stories</a>
          <a href="index.html#coverage">Delivery coverage</a>
          <a href="shop.html">Shop collection</a>
        </div>
      </div>
      <div class="site-footer-actions">
        <a href="contact.html">Contact us</a>
        <a href="admin.html">Store admin</a>
      </div>
    </div>
  `;

  const mobileNav = document.createElement('nav');
  mobileNav.className = 'site-mobile-nav';
  mobileNav.setAttribute('aria-label', 'Mobile navigation');
  mobileNav.innerHTML = mobileLinks;

  document.body.prepend(header);
  document.body.append(footer, mobileNav);
  document.body.classList.add('site-page');

  const progress = document.createElement('div');
  progress.className = 'site-progress';
  progress.setAttribute('aria-hidden', 'true');
  document.body.append(progress);

  const updateChrome = () => {
    header.classList.toggle('is-scrolled', window.scrollY > 16);
    const height = document.documentElement.scrollHeight - window.innerHeight;
    progress.style.width = `${height > 0 ? Math.min(100, (window.scrollY / height) * 100) : 0}%`;
  };
  window.addEventListener('scroll', updateChrome, { passive: true });
  updateChrome();

  const revealObserver = 'IntersectionObserver' in window ? new IntersectionObserver(entries => {
    entries.forEach(entry => {
      if (entry.isIntersecting) {
        entry.target.classList.add('is-visible');
        revealObserver.unobserve(entry.target);
      }
    });
  }, { threshold: .12 }) : null;
  document.querySelectorAll('.reveal-on-scroll').forEach(element => {
    if (revealObserver) revealObserver.observe(element);
    else element.classList.add('is-visible');
  });

  const contactForm = document.querySelector('[data-contact-form]');
  if (contactForm) {
    contactForm.addEventListener('submit', event => {
      event.preventDefault();
      const status = contactForm.querySelector('.contact-status');
      if (status) status.textContent = 'Thanks — our celebration team will get back to you shortly.';
      contactForm.reset();
    });
  }

  const search = header.querySelector('input[name="search"]');
  const query = new URLSearchParams(window.location.search).get('search');
  if (search && query) search.value = query;

  // Account icon dropdown toggle
  const accountBtn = document.getElementById('site-account-btn');
  const accountDropdown = document.getElementById('site-account-dropdown');
  if (accountBtn && accountDropdown) {
    accountBtn.addEventListener('click', function(e) {
      e.stopPropagation();
      const isOpen = accountDropdown.classList.contains('is-open');
      accountDropdown.classList.toggle('is-open', !isOpen);
      accountBtn.setAttribute('aria-expanded', String(!isOpen));
      accountDropdown.setAttribute('aria-hidden', String(isOpen));
    });
    document.addEventListener('click', function(e) {
      if (!accountDropdown.contains(e.target) && e.target !== accountBtn) {
        accountDropdown.classList.remove('is-open');
        accountBtn.setAttribute('aria-expanded', 'false');
        accountDropdown.setAttribute('aria-hidden', 'true');
      }
    });
    document.addEventListener('keydown', function(e) {
      if (e.key === 'Escape') {
        accountDropdown.classList.remove('is-open');
        accountBtn.setAttribute('aria-expanded', 'false');
        accountDropdown.setAttribute('aria-hidden', 'true');
      }
    });
  }

  // Patch Auth.updateUI to also update the email display in dropdown
  const _origUpdateUI = typeof Auth !== 'undefined' ? Auth.updateUI.bind(Auth) : null;
  if (typeof Auth !== 'undefined') {
    Auth.updateUI = function() {
      if (_origUpdateUI) _origUpdateUI();
      const emailEls = document.querySelectorAll('[data-user-email]');
      emailEls.forEach(el => {
        el.textContent = (AppState && AppState.user) ? (AppState.user.email || '') : '';
      });
    };
  }
})();
