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
    const progressBars = document.querySelectorAll('.progress-bar');
    const techFeatures = document.querySelectorAll('.tech-feature');
    const floatingElements = document.querySelectorAll('.float');

    // Initialize animations immediately for elements in viewport
    animatedSections.forEach(section => {
        if (isElementInViewport(section)) {
            section.classList.add('active');
        }
    });

    // Initialize progress bars
    progressBars.forEach(bar => {
        if (isElementInViewport(bar)) {
            setTimeout(() => bar.classList.add('animate'), 300);
        }
    });

    // Initialize tech features with staggered animation
    techFeatures.forEach((feature, index) => {
        if (isElementInViewport(feature)) {
            setTimeout(() => {
                feature.style.opacity = '1';
                feature.style.transform = 'translateY(0)';
            }, index * 200);
        }
    });

    // Add scroll event listener with debouncing
    let scrollTimeout;
    window.addEventListener('scroll', () => {
        if (scrollTimeout) {
            window.cancelAnimationFrame(scrollTimeout);
        }

        scrollTimeout = requestAnimationFrame(() => {
            // Reveal animations on scroll
            animatedSections.forEach(section => {
                if (isElementInViewport(section)) {
                    section.classList.add('active');
                }
            });

            // Animate progress bars on scroll
            progressBars.forEach(bar => {
                if (isElementInViewport(bar) && !bar.classList.contains('animate')) {
                    bar.classList.add('animate');
                }
            });

            // Animate tech features on scroll
            techFeatures.forEach((feature, index) => {
                if (isElementInViewport(feature) && feature.style.opacity !== '1') {
                    setTimeout(() => {
                        feature.style.opacity = '1';
                        feature.style.transform = 'translateY(0)';
                    }, index * 200);
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

    // Initialize floating animations
    floatingElements.forEach((element, index) => {
        element.style.animationDelay = `${index * 0.2}s`;
    });

    // Handle hover effects for interactive elements
    const interactiveElements = document.querySelectorAll('.tech-feature, .nano-tech');
    interactiveElements.forEach(element => {
        element.addEventListener('mouseenter', () => {
            element.style.transform = 'translateY(-5px)';
            element.style.boxShadow = '0 8px 20px rgba(0, 0, 0, 0.15)';
        });

        element.addEventListener('mouseleave', () => {
            element.style.transform = 'translateY(0)';
            element.style.boxShadow = '0 5px 15px rgba(0, 0, 0, 0.1)';
        });
    });
}

// Check if element is in viewport
function isElementInViewport(el) {
    const rect = el.getBoundingClientRect();
    const buffer = 50; // Add a buffer zone for smoother transitions
    return (
        rect.top >= -buffer &&
        rect.left >= 0 &&
        rect.bottom <= (window.innerHeight || document.documentElement.clientHeight) + buffer &&
        rect.right <= (window.innerWidth || document.documentElement.clientWidth)
    );
}
