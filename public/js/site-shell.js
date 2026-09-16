/* Shared customer-facing layout for Sukhi Fireworks. */
(function () {
  const page = window.location.pathname.split('/').pop() || 'index.html';
  if (page === 'admin.html') return;

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
        <span class="material-symbols-outlined">local_fire_department</span>
        <span>SKYRA</span>
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
        <a href="admin.html" class="site-icon-link" title="Admin Portal" aria-label="Admin Portal">
          <span class="material-symbols-outlined">admin_panel_settings</span>
        </a>
        <a href="login.html" data-auth-login class="site-login-button">Customer Login</a>
        <div data-auth-user class="site-user-menu hidden">
          <span data-user-name></span>
          <button onclick="Auth.logout()" type="button">Logout</button>
        </div>
      </div>
    </div>
  `;

  const footer = document.createElement('footer');
  footer.className = 'site-footer';
  footer.innerHTML = `
    <div class="site-footer-inner">
      <div>
        <a href="index.html" class="site-footer-brand">SKYRA Fireworks</a>
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
})();
