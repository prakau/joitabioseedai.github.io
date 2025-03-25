document.addEventListener('DOMContentLoaded', function() {
    // Make sure content is visible immediately
    document.body.style.opacity = '1';
    
    // Initialize all elements that should be visible
    document.querySelectorAll('.fade-in, .slide-in-left, .slide-in-right, .scale-up, .tech-feature').forEach(el => {
        el.style.opacity = '1';
        el.style.transform = 'none';
    });

    // Add active class to current nav link
    const currentPath = window.location.pathname;
    document.querySelectorAll('nav a').forEach(link => {
        if (link.getAttribute('href') === currentPath || 
            currentPath.endsWith(link.getAttribute('href'))) {
            link.classList.add('active');
        } else {
            link.classList.remove('active');
        }
    });

    // Progress bars should be visible immediately
    document.querySelectorAll('.progress-bar').forEach(bar => {
        bar.classList.add('animate');
    });

    // Simple scroll handler for header shadow
    const header = document.querySelector('.animated-header');
    if (header) {
        window.addEventListener('scroll', () => {
            if (window.scrollY > 50) {
                header.classList.add('scrolled');
            } else {
                header.classList.remove('scrolled');
            }
        });
    }

    // Handle hover effects
    document.querySelectorAll('.tech-feature, .nano-tech').forEach(element => {
        element.addEventListener('mouseenter', () => {
            element.style.transform = 'translateY(-5px)';
            element.style.boxShadow = '0 8px 20px rgba(0, 0, 0, 0.15)';
        });

        element.addEventListener('mouseleave', () => {
            element.style.transform = 'translateY(0)';
            element.style.boxShadow = '0 5px 15px rgba(0, 0, 0, 0.1)';
        });
    });

    // Basic reveal on scroll
    const observerCallback = (entries, observer) => {
        entries.forEach(entry => {
            if (entry.isIntersecting) {
                entry.target.classList.add('active');
                observer.unobserve(entry.target);
            }
        });
    };

    const observerOptions = {
        root: null,
        rootMargin: '0px',
        threshold: 0.1
    };

    const observer = new IntersectionObserver(observerCallback, observerOptions);

    document.querySelectorAll('.reveal').forEach(element => {
        observer.observe(element);
    });
});
