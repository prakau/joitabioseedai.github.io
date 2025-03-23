document.addEventListener('DOMContentLoaded', function() {
    // Initialize page prefetching
    const links = document.querySelectorAll('a');
    links.forEach(link => {
        if (link.href && link.href.startsWith(window.location.origin)) {
            const prefetchLink = document.createElement('link');
            prefetchLink.rel = 'prefetch';
            prefetchLink.href = link.href;
            document.head.appendChild(prefetchLink);
        }
    });

    // Instant page transitions
    document.body.addEventListener('click', e => {
        if (e.target.tagName === 'A' && e.target.href && e.target.href.startsWith(window.location.origin)) {
            e.preventDefault();
            document.body.style.opacity = '0.5';
            fetch(e.target.href)
                .then(response => response.text())
                .then(html => {
                    const parser = new DOMParser();
                    const newDoc = parser.parseFromString(html, 'text/html');
                    document.title = newDoc.title;
                    document.body.innerHTML = newDoc.body.innerHTML;
                    window.history.pushState({}, '', e.target.href);
                    document.body.style.opacity = '1';
                    initializePageElements();
                });
        }
    });

    initializePageElements();
});

// Initialize page elements and animations
function initializePageElements() {
    // Add scroll-based animation triggers
    const animatedSections = document.querySelectorAll('.reveal');
    const header = document.querySelector('.animated-header');

    // Initialize animations immediately for elements in viewport
    animatedSections.forEach(section => {
        if (isElementInViewport(section)) {
            section.classList.add('active');
        }
    });

    window.addEventListener('scroll', () => {
        // Reveal animations on scroll with debouncing
        requestAnimationFrame(() => {
            animatedSections.forEach(section => {
                if (isElementInViewport(section)) {
                    section.classList.add('active');
                }
            });

            // Header shadow on scroll
            if (window.scrollY > 50) {
                header.classList.add('scrolled');
            } else {
                header.classList.remove('scrolled');
            }
        });
    });
}

// Check if element is in viewport
function isElementInViewport(el) {
    const rect = el.getBoundingClientRect();
    return (
        rect.top >= 0 &&
        rect.left >= 0 &&
        rect.bottom <= (window.innerHeight || document.documentElement.clientHeight) &&
        rect.right <= (window.innerWidth || document.documentElement.clientWidth)
    );
}