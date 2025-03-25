document.addEventListener('DOMContentLoaded', function() {
    // Initialize page elements and animations
    initializePageElements();

    // Handle navigation with improved transitions
    document.body.addEventListener('click', e => {
        const link = e.target.closest('a');
        if (link && link.href && link.href.startsWith(window.location.origin)) {
            e.preventDefault();
            
            // Start transition
            document.body.style.opacity = '0.5';
            
            // Fetch and load new page content
            fetch(link.href)
                .then(response => response.text())
                .then(html => {
                    const parser = new DOMParser();
                    const newDoc = parser.parseFromString(html, 'text/html');
                    
                    // Update page content
                    document.title = newDoc.title;
                    document.body.innerHTML = newDoc.body.innerHTML;
                    
                    // Update URL without reload
                    window.history.pushState({}, '', link.href);
                    
                    // Complete transition
                    document.body.style.opacity = '1';
                    
                    // Reinitialize page elements
                    initializePageElements();

                    // Scroll to top
                    window.scrollTo(0, 0);
                })
                .catch(error => {
                    console.error('Navigation error:', error);
                    window.location.href = link.href; // Fallback to normal navigation
                });
        }
    });

    // Handle browser back/forward buttons
    window.addEventListener('popstate', () => {
        fetch(window.location.href)
            .then(response => response.text())
            .then(html => {
                const parser = new DOMParser();
                const newDoc = parser.parseFromString(html, 'text/html');
                document.title = newDoc.title;
                document.body.innerHTML = newDoc.body.innerHTML;
                initializePageElements();
            });
    });
});

// Initialize page elements and animations
function initializePageElements() {
    // Initialize animations immediately for elements in viewport
    const animatedSections = document.querySelectorAll('.reveal');
    const header = document.querySelector('.animated-header');
    const progressBars = document.querySelectorAll('.progress-bar');
    const techFeatures = document.querySelectorAll('.tech-feature');
    const floatingElements = document.querySelectorAll('.float');

    // Add active class to current nav link
    const currentPath = window.location.pathname;
    document.querySelectorAll('nav a').forEach(link => {
        if (link.getAttribute('href') === currentPath) {
            link.classList.add('active');
        } else {
            link.classList.remove('active');
        }
    });

    // Initialize elements in viewport
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
