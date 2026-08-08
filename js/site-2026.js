document.addEventListener('DOMContentLoaded', () => {
  document.documentElement.classList.add('has-js');
  const prefersReducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  const header = document.querySelector('.site-header');
  const progress = document.createElement('span');
  progress.className = 'scroll-progress';
  progress.setAttribute('aria-hidden', 'true');
  header?.appendChild(progress);

  const navLinks = Array.from(document.querySelectorAll('.nav-links a'));
  navLinks.forEach((link, index) => {
    link.style.setProperty('--nav-index', index);
  });
  const siteNav = document.querySelector('.site-nav');
  const navContainer = document.querySelector('.nav-links');
  if (siteNav && navContainer) {
    const menuButton = document.createElement('button');
    menuButton.type = 'button';
    menuButton.className = 'mobile-menu-toggle';
    menuButton.setAttribute('aria-label', 'Open navigation menu');
    menuButton.setAttribute('aria-expanded', 'false');
    menuButton.innerHTML = '<span></span><span></span><span></span><strong>Menu</strong>';
    siteNav.insertBefore(menuButton, navContainer);
    menuButton.addEventListener('click', () => {
      const isOpen = header?.classList.toggle('menu-open') || false;
      menuButton.setAttribute('aria-expanded', String(isOpen));
      menuButton.setAttribute('aria-label', isOpen ? 'Close navigation menu' : 'Open navigation menu');
    });
    navLinks.forEach((link) => link.addEventListener('click', () => {
      header?.classList.remove('menu-open');
      menuButton.setAttribute('aria-expanded', 'false');
      menuButton.setAttribute('aria-label', 'Open navigation menu');
    }));
  }
  const normalizePath = (value) => {
    if (!value || value === '/index.html') return '/';
    return value.endsWith('/') && value !== '/' ? value.slice(0, -1) : value;
  };
  const currentPath = normalizePath(window.location.pathname);
  const activeMap = {
    '/': '/',
    '/products.html': '/products.html',
    '/agritrust-trileaf-edge-node.html': '/products.html',
    '/farmassist-ai.html': '/farmassist-ai.html',
    '/agri-smart-assistant.html': '/farmassist-ai.html',
    '/agri-assistant.html': '/farmassist-ai.html',
    '/data-validation.html': '/data-validation.html',
    '/farmers-fpos.html': '/farmers-fpos.html',
    '/investors-partners.html': '/investors-partners.html',
    '/join-us.html': '/join-us.html',
    '/contact.html': '/contact.html',
    '/contact-us.html': '/contact.html'
  };
  const activeHref = activeMap[currentPath] || currentPath;
  navLinks.forEach((link) => {
    const linkPath = normalizePath(new URL(link.href, window.location.origin).pathname);
    const isActive = linkPath === activeHref;
    link.classList.toggle('active', isActive);
    if (isActive) link.setAttribute('aria-current', 'page');
    else link.removeAttribute('aria-current');
  });

  const isFarmAssistApp = currentPath === '/farmassist' || currentPath.startsWith('/farmassist/');
  if (!isFarmAssistApp && !document.querySelector('.floating-farmassist')) {
    const floatingFarmAssist = document.createElement('a');
    floatingFarmAssist.className = 'floating-farmassist';
    floatingFarmAssist.href = '/farmassist/';
    floatingFarmAssist.textContent = 'Ask FarmAssist';
    floatingFarmAssist.setAttribute('aria-label', 'Open JOITA FarmAssist AI');
    document.body.appendChild(floatingFarmAssist);
    window.setTimeout(() => floatingFarmAssist.classList.add('is-visible'), 700);
  }

  const syncHeader = () => {
    const scrollable = document.documentElement.scrollHeight - window.innerHeight;
    const progressWidth = scrollable > 0 ? Math.min(100, Math.max(0, (window.scrollY / scrollable) * 100)) : 0;
    progress.style.width = `${progressWidth.toFixed(2)}%`;
    header?.classList.toggle('scrolled', window.scrollY > 10);
  };
  syncHeader();
  window.addEventListener('scroll', syncHeader, { passive: true });

  const items = document.querySelectorAll('.reveal');
  const sections = document.querySelectorAll('section, .page-hero, .hero');
  items.forEach((item, index) => {
    item.style.setProperty('--reveal-index', Math.min(index % 6, 5));
  });

  if (!('IntersectionObserver' in window)) {
    items.forEach((item) => item.classList.add('is-visible'));
    sections.forEach((section) => section.classList.add('section-in-view'));
    return;
  }
  const observer = new IntersectionObserver((entries) => {
    entries.forEach((entry) => {
      if (entry.isIntersecting) {
        entry.target.classList.add('is-visible');
        observer.unobserve(entry.target);
      }
    });
  }, { threshold: 0.14 });
  items.forEach((item) => observer.observe(item));

  const sectionObserver = new IntersectionObserver((entries) => {
    entries.forEach((entry) => {
      entry.target.classList.toggle('section-in-view', entry.isIntersecting);
    });
  }, { rootMargin: '-10% 0px -72% 0px', threshold: 0.01 });
  sections.forEach((section) => sectionObserver.observe(section));

  if (prefersReducedMotion) return;

  const magneticButtons = document.querySelectorAll('.button');
  magneticButtons.forEach((button) => {
    button.addEventListener('pointermove', (event) => {
      const rect = button.getBoundingClientRect();
      const x = ((event.clientX - rect.left) / rect.width - 0.5) * 6;
      const y = ((event.clientY - rect.top) / rect.height - 0.5) * 5;
      button.style.setProperty('--btn-x', `${x.toFixed(2)}px`);
      button.style.setProperty('--btn-y', `${y.toFixed(2)}px`);
    });
    button.addEventListener('pointerleave', () => {
      button.style.setProperty('--btn-x', '0px');
      button.style.setProperty('--btn-y', '0px');
    });
  });

  const interactiveCards = document.querySelectorAll('.card, .tile');
  interactiveCards.forEach((card) => {
    card.addEventListener('pointermove', (event) => {
      const rect = card.getBoundingClientRect();
      const x = ((event.clientX - rect.left) / rect.width) * 100;
      const y = ((event.clientY - rect.top) / rect.height) * 100;
      const rx = ((50 - y) / 50) * 2.2;
      const ry = ((x - 50) / 50) * 2.4;
      card.style.setProperty('--mx', `${x.toFixed(1)}%`);
      card.style.setProperty('--my', `${y.toFixed(1)}%`);
      card.style.setProperty('--rx', `${rx.toFixed(2)}deg`);
      card.style.setProperty('--ry', `${ry.toFixed(2)}deg`);
    });
    card.addEventListener('pointerleave', () => {
      card.style.setProperty('--rx', '0deg');
      card.style.setProperty('--ry', '0deg');
    });
  });
});
