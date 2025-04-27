// Function to set the active navigation link based on the current page
document.addEventListener('DOMContentLoaded', function() {
    // Get the current page URL
    const currentPage = window.location.pathname;

    // Extract the page name from the URL
    let pageName = currentPage.split('/').pop();

    // Clear any existing text content issues
    const navLinks = document.querySelectorAll('.navbar a');
    navLinks.forEach(link => {
        // Get the ID of the link
        const id = link.getAttribute('id');

        // Set the text content based on the ID
        switch(id) {
            case 'nav-home':
                link.textContent = 'Home';
                break;
            case 'nav-about':
                link.textContent = 'About';
                break;
            case 'nav-products':
                link.textContent = 'Products';
                break;
            case 'nav-technology':
                link.textContent = 'Technology';
                break;
            case 'nav-sustainability':
                link.textContent = 'Sustainability';
                break;
            case 'nav-farmers':
                link.textContent = 'Farmers';
                break;
            case 'nav-investors':
                link.textContent = 'Investors';
                break;
            case 'nav-news':
                link.textContent = 'News';
                break;
            case 'nav-contact':
                link.textContent = 'Contact';
                break;
            case 'nav-different':
                link.textContent = 'What Makes Us Different';
                break;
            case 'nav-north-star':
                link.textContent = 'Our North Star';
                break;
            case 'nav-assistant':
                link.textContent = 'Agri-Smart Assistant';
                break;
        }
    });

    // If it's the home page
    if (pageName === '' || pageName === 'index.html') {
        document.getElementById('nav-home').classList.add('active');
    }
    // About page
    else if (pageName === 'about-us.html') {
        document.getElementById('nav-about').classList.add('active');
    }
    // Products page
    else if (pageName === 'products.html' || currentPage.includes('/products/')) {
        document.getElementById('nav-products').classList.add('active');
    }
    // Technology page
    else if (pageName === 'technology.html') {
        document.getElementById('nav-technology').classList.add('active');
    }
    // Sustainability page
    else if (pageName === 'sustainability.html') {
        document.getElementById('nav-sustainability').classList.add('active');
    }
    // Farmers page
    else if (pageName === 'farmers.html') {
        document.getElementById('nav-farmers').classList.add('active');
    }
    // Investors page
    else if (pageName === 'investors.html') {
        document.getElementById('nav-investors').classList.add('active');
    }
    // News page
    else if (pageName === 'news.html') {
        document.getElementById('nav-news').classList.add('active');
    }
    // Contact page
    else if (pageName === 'contact-us.html') {
        document.getElementById('nav-contact').classList.add('active');
    }
    // What Makes Us Different page
    else if (pageName === 'what-makes-us-different.html') {
        document.getElementById('nav-different').classList.add('active');
    }
    // Our North Star page
    else if (pageName === 'north-star.html') {
        document.getElementById('nav-north-star').classList.add('active');
    }
    // Agri-Smart Assistant page
    else if (pageName === 'agri-assistant.html') {
        document.getElementById('nav-assistant').classList.add('active');
    }
});
