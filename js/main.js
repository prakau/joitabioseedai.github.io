document.addEventListener('DOMContentLoaded', initializePageElements);

// Handle navigation with improved transitions
document.body.addEventListener('click', e => {
    const link = e.target.closest('a');
    if (link && link.href && link.href.startsWith(window.location.origin)) {
        e.preventDefault();

        // Start transition
        document.body.style.opacity = '0';
        document.body.style.transition = 'opacity 0.3s ease';

        // Wait for fade out
        setTimeout(() => {
            // Load new page
            window.location.href = link.href;
        }, 300);
    }
});

// Initialize page elements and animations
function initializePageElements() {
    // Reset body opacity
    document.body.style.opacity = '1';
    
    // Initialize animations immediately for elements in viewport
    const animatedSections = document.querySelectorAll('.reveal');
    const header = document.querySelector('.animated-header');
    const progressBars = document.querySelectorAll('.progress-bar');
    const techFeatures = document.querySelectorAll('.tech-feature');
    const floatingElements = document.querySelectorAll('.float');

    // Add active class to current nav link
    const currentPath = window.location.pathname;
    document.querySelectorAll('nav a').forEach(link => {
        if (link.getAttribute('href') === currentPath || 
            (currentPath.endsWith(link.getAttribute('href')) && link.getAttribute('href') !== 'index.html')) {
            link.classList.add('active');
        } else {
            link.classList.remove('active');
        }
    });

    // Initialize elements in viewport
    animatedSections.forEach(section => {
        requestAnimationFrame(() => {
            if (isElementInViewport(section)) {
                section.classList.add('active');
            }
        });
    });

    // Initialize progress bars
    progressBars.forEach(bar => {
        if (isElementInViewport(bar)) {
            requestAnimationFrame(() => {
                bar.classList.add('animate');
            });
        }
    });

    // Initialize tech features with staggered animation
    techFeatures.forEach((feature, index) => {
        if (isElementInViewport(feature)) {
            requestAnimationFrame(() => {
                setTimeout(() => {
                    feature.style.opacity = '1';
                    feature.style.transform = 'translateY(0)';
                }, index * 200);
            });
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
                if (isElementInViewport(section) && !section.classList.contains('active')) {
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
            if (header) {
                if (window.scrollY > 50) {
                    header.classList.add('scrolled');
                } else {
                    header.classList.remove('scrolled');
                }
            }
        });
    });

    // Initialize floating animations
    floatingElements.forEach((element, index) => {
        requestAnimationFrame(() => {
            element.style.animationDelay = `${index * 0.2}s`;
        });
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

    // Ensure all elements are visible after initialization
    setTimeout(() => {
        document.querySelectorAll('.fade-in, .slide-in-left, .slide-in-right').forEach(element => {
            element.style.opacity = '1';
            element.style.transform = 'translateX(0)';
        });
    }, 100);
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
