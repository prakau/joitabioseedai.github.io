document.addEventListener('DOMContentLoaded', function() {
    const currentPage = window.location.pathname;
    const map = [
        ['/', 'nav-home'],
        ['/index.html', 'nav-home'],
        ['/about.html', 'nav-home'],
        ['/domains.html', 'nav-data'],
        ['/products.html', 'nav-products'],
        ['/farmassist-ai.html', 'nav-assistant'],
        ['/agri-smart-assistant.html', 'nav-assistant'],
        ['/agri-assistant.html', 'nav-assistant'],
        ['/farmassist/', 'nav-assistant'],
        ['/data-validation.html', 'nav-data'],
        ['/farmers-fpos.html', 'nav-farmers'],
        ['/investors-partners.html', 'nav-investors'],
        ['/join-us.html', 'nav-join'],
        ['/contact.html', 'nav-contact']
    ];
    const match = map.find(([path]) => currentPage === path || (path === '/farmassist/' && currentPage.startsWith(path)));
    const link = document.getElementById(match ? match[1] : 'nav-home');
    if (link) link.classList.add('active');
});
