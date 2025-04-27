// This script loads the navigation bar into all pages
document.addEventListener('DOMContentLoaded', function() {
    // Check if we're in the root directory or a subdirectory
    const isRoot = !window.location.pathname.includes('/pages/');
    
    // Create the navigation HTML
    let navHTML = `
        <div class="navbar">
            <a href="${isRoot ? '' : '../'}index.html" id="nav-home">Home</a>
            <a href="${isRoot ? 'pages/' : ''}about-us.html" id="nav-about">About</a>
            <a href="${isRoot ? 'pages/' : ''}products.html" id="nav-products">Products</a>
            <a href="${isRoot ? 'pages/' : ''}technology.html" id="nav-technology">Technology</a>
            <a href="${isRoot ? 'pages/' : ''}sustainability.html" id="nav-sustainability">Sustainability</a>
            <a href="${isRoot ? 'pages/' : ''}farmers.html" id="nav-farmers">Farmers</a>
            <a href="${isRoot ? 'pages/' : ''}investors.html" id="nav-investors">Investors</a>
            <a href="${isRoot ? 'pages/' : ''}news.html" id="nav-news">News</a>
            <a href="${isRoot ? 'pages/' : ''}contact-us.html" id="nav-contact">Contact</a>
            <a href="${isRoot ? '' : '../'}agri-assistant.html" id="nav-assistant">Agri-Smart Assistant</a>
        </div>
    `;
    
    // Find the navbar container
    const navbarContainer = document.getElementById('navbar-container');
    
    // If the container exists, insert the navigation
    if (navbarContainer) {
        navbarContainer.innerHTML = navHTML;
    }
});
