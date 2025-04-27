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

                // Ensure all links are visible when menu is active
                if (navbar.classList.contains('active')) {
                    // Force browser reflow to ensure all links are visible
                    navbar.style.display = 'none';
                    setTimeout(() => {
                        navbar.style.display = '';
                    }, 10);
                }
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

        // Ensure Agri-Smart Assistant link is visible and add a special button
        const assistantLink = document.getElementById('nav-assistant');
        if (assistantLink) {
            assistantLink.style.display = 'block';
            assistantLink.style.fontWeight = 'bold';

            // Create a floating button for Agri-Smart Assistant on mobile
            if (window.innerWidth <= 768) {
                const assistantButton = document.createElement('a');
                assistantButton.className = 'mobile-assistant-button';
                assistantButton.href = assistantLink.href;
                assistantButton.innerHTML = '🌱 Agri-Smart';
                assistantButton.setAttribute('aria-label', 'Open Agri-Smart Assistant');
                document.body.appendChild(assistantButton);
            }
        }
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
