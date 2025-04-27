// Mobile Navigation Handler using Context7 MCP approach
document.addEventListener('DOMContentLoaded', function() {
    // Add page transition effect on load
    document.body.classList.add('page-transition');
    // Create mobile navigation toggle button
    const navbarContainer = document.getElementById('navbar-container');
    if (navbarContainer) {
        // Create the toggle button with improved accessibility
        const mobileNavToggle = document.createElement('button');
        mobileNavToggle.className = 'mobile-nav-toggle';
        mobileNavToggle.setAttribute('aria-label', 'Toggle navigation menu');
        mobileNavToggle.setAttribute('aria-expanded', 'false');
        mobileNavToggle.innerHTML = '☰';
        navbarContainer.parentNode.insertBefore(mobileNavToggle, navbarContainer);

        // Get the current page path to highlight active link
        const currentPath = window.location.pathname;
        const pageName = currentPath.split('/').pop() || 'index.html';

        // Toggle navigation on button click with improved animation
        mobileNavToggle.addEventListener('click', function(event) {
            event.stopPropagation(); // Prevent document click from firing
            const navbar = document.querySelector('.navbar');
            if (navbar) {
                const isActive = navbar.classList.contains('active');
                navbar.classList.toggle('active');

                // Update ARIA attributes for accessibility
                mobileNavToggle.setAttribute('aria-expanded', !isActive ? 'true' : 'false');

                // Change button icon based on menu state
                mobileNavToggle.innerHTML = !isActive ? '✕' : '☰';

                // Prevent body scrolling when menu is open
                document.body.style.overflow = !isActive ? 'hidden' : '';

                // Add a small vibration feedback on mobile devices
                if ('vibrate' in navigator) {
                    navigator.vibrate(50);
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
                    mobileNavToggle.setAttribute('aria-expanded', 'false');
                    document.body.style.overflow = '';
                }
            }
        });

        // Enhance navigation links with active state and smooth transitions
        const navLinks = document.querySelectorAll('.navbar a');
        navLinks.forEach(link => {
            // Highlight current page in navigation
            const linkHref = link.getAttribute('href');
            if (linkHref && (linkHref.includes(pageName) ||
                (pageName === 'index.html' && linkHref === '../index.html') ||
                (pageName === '' && linkHref === '../index.html'))) {
                link.classList.add('active');
                link.setAttribute('aria-current', 'page');
            }

            // Add click handler with transition effect
            link.addEventListener('click', function(event) {
                const navbar = document.querySelector('.navbar');
                if (navbar && navbar.classList.contains('active')) {
                    // Add a small delay to allow for a visual feedback before closing
                    link.style.backgroundColor = 'rgba(255, 255, 255, 0.2)';

                    // Don't add page transition for external links or anchors
                    if (link.getAttribute('href').indexOf('#') === -1 &&
                        !link.getAttribute('href').startsWith('http')) {
                        // Prevent default navigation
                        event.preventDefault();

                        // Get the target URL
                        const targetUrl = link.getAttribute('href');

                        // Close the menu
                        navbar.classList.remove('active');
                        mobileNavToggle.innerHTML = '☰';
                        mobileNavToggle.setAttribute('aria-expanded', 'false');
                        document.body.style.overflow = '';

                        // Add transition effect and navigate
                        document.body.classList.add('page-transition');

                        // Navigate after a short delay
                        setTimeout(() => {
                            window.location.href = targetUrl;
                        }, 300);
                    } else {
                        // For anchors and external links, just close the menu
                        setTimeout(() => {
                            navbar.classList.remove('active');
                            mobileNavToggle.innerHTML = '☰';
                            mobileNavToggle.setAttribute('aria-expanded', 'false');
                            document.body.style.overflow = '';
                        }, 150);
                    }
                }
            });
        });

        // Create a floating button for Agri-Smart Assistant on mobile
        const assistantLink = document.getElementById('nav-assistant');
        if (assistantLink) {
            // Ensure the link is visible and styled properly
            assistantLink.style.display = 'flex';
            assistantLink.style.fontWeight = 'bold';

            // Create a floating button for quick access
            if (window.matchMedia('(max-width: 768px)').matches) {
                const assistantButton = document.createElement('a');
                assistantButton.className = 'mobile-assistant-button';
                assistantButton.href = assistantLink.href;
                assistantButton.innerHTML = '🌱 Agri-Smart';
                assistantButton.setAttribute('aria-label', 'Open Agri-Smart Assistant');

                // Add touch feedback
                assistantButton.addEventListener('touchstart', function() {
                    this.style.transform = 'scale(0.95)';
                });

                assistantButton.addEventListener('touchend', function() {
                    this.style.transform = 'scale(1)';
                });

                document.body.appendChild(assistantButton);
            }
        }

        // Add swipe gesture support for mobile
        let touchStartX = 0;
        let touchEndX = 0;

        document.addEventListener('touchstart', function(event) {
            touchStartX = event.changedTouches[0].screenX;
        }, false);

        document.addEventListener('touchend', function(event) {
            touchEndX = event.changedTouches[0].screenX;
            handleSwipe();
        }, false);

        function handleSwipe() {
            const navbar = document.querySelector('.navbar');
            if (!navbar) return;

            // Swipe right to open menu
            if (touchEndX - touchStartX > 100 && !navbar.classList.contains('active')) {
                navbar.classList.add('active');
                mobileNavToggle.innerHTML = '✕';
                mobileNavToggle.setAttribute('aria-expanded', 'true');
                document.body.style.overflow = 'hidden';

                if ('vibrate' in navigator) {
                    navigator.vibrate(50);
                }
            }

            // Swipe left to close menu
            if (touchStartX - touchEndX > 100 && navbar.classList.contains('active')) {
                navbar.classList.remove('active');
                mobileNavToggle.innerHTML = '☰';
                mobileNavToggle.setAttribute('aria-expanded', 'false');
                document.body.style.overflow = '';
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
