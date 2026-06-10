document.addEventListener('DOMContentLoaded', () => {
  document.documentElement.classList.add('has-js');
  const prefersReducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  const header = document.querySelector('.site-header');

  const syncHeader = () => {
    if (!header) return;
    header.classList.toggle('scrolled', window.scrollY > 10);
  };
  syncHeader();
  window.addEventListener('scroll', syncHeader, { passive: true });

  const items = document.querySelectorAll('.reveal');
  items.forEach((item, index) => {
    item.style.setProperty('--reveal-index', Math.min(index % 6, 5));
  });

  if (!('IntersectionObserver' in window)) {
    items.forEach((item) => item.classList.add('is-visible'));
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

  if (prefersReducedMotion) return;

  const interactiveCards = document.querySelectorAll('.card, .tile');
  interactiveCards.forEach((card) => {
    card.addEventListener('pointermove', (event) => {
      const rect = card.getBoundingClientRect();
      const x = ((event.clientX - rect.left) / rect.width) * 100;
      const y = ((event.clientY - rect.top) / rect.height) * 100;
      card.style.setProperty('--mx', `${x.toFixed(1)}%`);
      card.style.setProperty('--my', `${y.toFixed(1)}%`);
    });
  });
});
