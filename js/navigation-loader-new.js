// This script loads the navigation bar into all pages
document.addEventListener('DOMContentLoaded', function() {
    // Find the navbar container
    const navbarContainer = document.getElementById('navbar-container');
    
    if (navbarContainer) {
        // Check if we're in the root directory or a subdirectory
        const isRoot = !window.location.pathname.includes('/pages/');
        
        // Load the appropriate navigation
        fetch(isRoot ? 'includes/navigation.html' : '../includes/navigation.html')
            .then(response => response.text())
            .then(html => {
                // Create a temporary div to hold the HTML
                const tempDiv = document.createElement('div');
                tempDiv.innerHTML = html;
                
                // Get the appropriate navigation based on the current directory
                const navElement = isRoot 
                    ? tempDiv.querySelector('.root-nav')
                    : tempDiv.querySelector('.pages-nav');
                
                if (navElement) {
                    // Clear the container and add the navbar
                    navbarContainer.innerHTML = '';
                    navbarContainer.appendChild(navElement);
                    
                    // Set the active class for the current page
                    setActiveNavLink();
                }
            })
            .catch(error => {
                console.error('Error loading navigation:', error);
            });
    }
});

// Function to set the active navigation link based on the current page
function setActiveNavLink() {
    // Get the current page URL
    const currentPage = window.location.pathname;
    
    // Extract the page name from the URL
    let pageName = currentPage.split('/').pop();
    
    // If it's the home page
    if (pageName === '' || pageName === 'index.html') {
        const homeLink = document.getElementById('nav-home');
        if (homeLink) homeLink.classList.add('active');
    }
    // About page
    else if (pageName === 'about-us.html') {
        const aboutLink = document.getElementById('nav-about');
        if (aboutLink) aboutLink.classList.add('active');
    }
    // Products page
    else if (pageName === 'products.html' || currentPage.includes('/products/')) {
        const productsLink = document.getElementById('nav-products');
        if (productsLink) productsLink.classList.add('active');
    }
    // Technology page
    else if (pageName === 'technology.html') {
        const techLink = document.getElementById('nav-technology');
        if (techLink) techLink.classList.add('active');
    }
    // Sustainability page
    else if (pageName === 'sustainability.html') {
        const sustainabilityLink = document.getElementById('nav-sustainability');
        if (sustainabilityLink) sustainabilityLink.classList.add('active');
    }
    // Farmers page
    else if (pageName === 'farmers.html') {
        const farmersLink = document.getElementById('nav-farmers');
        if (farmersLink) farmersLink.classList.add('active');
    }
    // Investors page
    else if (pageName === 'investors.html') {
        const investorsLink = document.getElementById('nav-investors');
        if (investorsLink) investorsLink.classList.add('active');
    }
    // News page
    else if (pageName === 'news.html') {
        const newsLink = document.getElementById('nav-news');
        if (newsLink) newsLink.classList.add('active');
    }
    // Contact page
    else if (pageName === 'contact-us.html') {
        const contactLink = document.getElementById('nav-contact');
        if (contactLink) contactLink.classList.add('active');
    }
    // What Makes Us Different page
    else if (pageName === 'what-makes-us-different.html') {
        const differentLink = document.getElementById('nav-different');
        if (differentLink) differentLink.classList.add('active');
    }
    // Our North Star page
    else if (pageName === 'north-star.html') {
        const northStarLink = document.getElementById('nav-north-star');
        if (northStarLink) northStarLink.classList.add('active');
    }
    // Agri-Smart Assistant page
    else if (pageName === 'agri-assistant.html') {
        const assistantLink = document.getElementById('nav-assistant');
        if (assistantLink) assistantLink.classList.add('active');
    }
}
