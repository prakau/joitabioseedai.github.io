// Load navigation from nav.html and insert into page
document.addEventListener('DOMContentLoaded', function() {
    const navContainer = document.getElementById('nav-container');
    if (!navContainer) return;

    fetch('nav.html')
        .then(res => res.text())
        .then(html => {
            navContainer.innerHTML = html;
            // Set active page based on current URL
            const path = window.location.pathname.split('/').pop();
            const navLinks = document.querySelectorAll('.nav-link');
            navLinks.forEach(link => {
                if (link.getAttribute('href').includes(path)) {
                    link.classList.add('active');
                }
            });
        })
        .catch(err => console.error('Error loading navigation:', err));
});
