document.addEventListener('DOMContentLoaded', function() {
    const navbarContainer = document.getElementById('navbar-container');
    if (!navbarContainer) return;

    const navbar = document.createElement('div');
    navbar.className = 'navbar';

    [
        { id: 'nav-home', text: 'Home', href: '/' },
        { id: 'nav-products', text: 'Products', href: '/products.html' },
        { id: 'nav-assistant', text: 'FarmAssist AI', href: '/farmassist-ai.html' },
        { id: 'nav-data', text: 'Data & Field Validation', href: '/data-validation.html' },
        { id: 'nav-farmers', text: 'Farmers & FPOs', href: '/farmers-fpos.html' },
        { id: 'nav-investors', text: 'Investors & Partners', href: '/investors-partners.html' },
        { id: 'nav-join', text: 'Join Us', href: '/join-us.html' },
        { id: 'nav-contact', text: 'Contact', href: '/contact.html' }
    ].forEach(link => {
        const a = document.createElement('a');
        a.href = link.href;
        a.id = link.id;
        a.textContent = link.text;
        navbar.appendChild(a);
    });

    navbarContainer.innerHTML = '';
    navbarContainer.appendChild(navbar);
});
