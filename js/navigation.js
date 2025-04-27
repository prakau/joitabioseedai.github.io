// Function to set the active navigation link based on the current page
document.addEventListener('DOMContentLoaded', function() {
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
});
