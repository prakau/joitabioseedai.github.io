document.addEventListener('DOMContentLoaded', function() {
    // Add scroll-based animation triggers
    const animatedSections = document.querySelectorAll('.reveal');
    const header = document.querySelector('.animated-header');

    window.addEventListener('scroll', () => {
        // Reveal animations on scroll
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