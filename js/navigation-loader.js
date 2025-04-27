// This script loads the navigation bar into all pages
document.addEventListener('DOMContentLoaded', function() {
    // Check if we're in the root directory or a subdirectory
    const isRoot = !window.location.pathname.includes('/pages/');

    // Find the navbar container
    const navbarContainer = document.getElementById('navbar-container');

    // If the container exists, create the navigation
    if (navbarContainer) {
        // Create the navbar div
        const navbar = document.createElement('div');
        navbar.className = 'navbar';

        // Create navigation links with proper text
        const links = [
            { id: 'nav-home', text: 'Home', href: `${isRoot ? '' : '../'}index.html` },
            { id: 'nav-about', text: 'About', href: `${isRoot ? 'pages/' : ''}about-us.html` },
            { id: 'nav-products', text: 'Products', href: `${isRoot ? 'pages/' : ''}products.html` },
            { id: 'nav-technology', text: 'Technology', href: `${isRoot ? 'pages/' : ''}technology.html` },
            { id: 'nav-sustainability', text: 'Sustainability', href: `${isRoot ? 'pages/' : ''}sustainability.html` },
            { id: 'nav-farmers', text: 'Farmers', href: `${isRoot ? 'pages/' : ''}farmers.html` },
            { id: 'nav-investors', text: 'Investors', href: `${isRoot ? 'pages/' : ''}investors.html` },
            { id: 'nav-news', text: 'News', href: `${isRoot ? 'pages/' : ''}news.html` },
            { id: 'nav-contact', text: 'Contact', href: `${isRoot ? 'pages/' : ''}contact-us.html` },
            { id: 'nav-different', text: 'What Makes Us Different', href: `${isRoot ? 'pages/' : ''}what-makes-us-different.html` },
            { id: 'nav-north-star', text: 'Our North Star', href: `${isRoot ? 'pages/' : ''}north-star.html` },
            { id: 'nav-assistant', text: 'Agri-Smart Assistant', href: `${isRoot ? '' : '../'}agri-assistant.html` }
        ];

        // Add each link to the navbar
        links.forEach(link => {
            const a = document.createElement('a');
            a.href = link.href;
            a.id = link.id;
            a.textContent = link.text;
            navbar.appendChild(a);
        });

        // Clear the container and add the navbar
        navbarContainer.innerHTML = '';
        navbarContainer.appendChild(navbar);
    }
});
