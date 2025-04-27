// Mobile Navigation Handler
document.addEventListener('DOMContentLoaded', function() {
    // Create mobile navigation toggle button
    const navbarContainer = document.getElementById('navbar-container');
    if (navbarContainer) {
        const mobileNavToggle = document.createElement('button');
        mobileNavToggle.className = 'mobile-nav-toggle';
        mobileNavToggle.setAttribute('aria-label', 'Toggle navigation menu');
        mobileNavToggle.innerHTML = '☰';
        navbarContainer.parentNode.insertBefore(mobileNavToggle, navbarContainer);
        
        // Toggle navigation on button click
        mobileNavToggle.addEventListener('click', function() {
            const navbar = document.querySelector('.navbar');
            if (navbar) {
                navbar.classList.toggle('active');
                // Change button icon based on menu state
                mobileNavToggle.innerHTML = navbar.classList.contains('active') ? '✕' : '☰';
            }
        });
        
        // Close menu when clicking outside
        document.addEventListener('click', function(event) {
            const navbar = document.querySelector('.navbar');
            if (navbar && navbar.classList.contains('active')) {
                if (!navbar.contains(event.target) && event.target !== mobileNavToggle) {
                    navbar.classList.remove('active');
                    mobileNavToggle.innerHTML = '☰';
                }
            }
        });
        
        // Close menu when clicking a navigation link
        const navLinks = document.querySelectorAll('.navbar a');
        navLinks.forEach(link => {
            link.addEventListener('click', function() {
                const navbar = document.querySelector('.navbar');
                if (navbar && navbar.classList.contains('active')) {
                    navbar.classList.remove('active');
                    mobileNavToggle.innerHTML = '☰';
                }
            });
        });
    }
    
    // Add touch detection
    if ('ontouchstart' in window || navigator.maxTouchPoints > 0) {
        document.body.classList.add('touch-device');
    }
    
    // Handle viewport height for mobile browsers (fix for the 100vh issue)
    function setVhProperty() {
        let vh = window.innerHeight * 0.01;
        document.documentElement.style.setProperty('--vh', `${vh}px`);
    }
    
    // Set the property on initial load
    setVhProperty();
    
    // Update the property on resize
    window.addEventListener('resize', setVhProperty);
    
    // Update on orientation change
    window.addEventListener('orientationchange', setVhProperty);
});
