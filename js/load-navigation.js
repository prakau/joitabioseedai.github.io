// Function to load navigation from nav.html into all pages
document.addEventListener('DOMContentLoaded', function() {
    const navbarContainer = document.getElementById('navbar-container');
    if (!navbarContainer) return;

    // Fetch the navigation HTML
    fetch('../nav.html')
        .then(response => response.text())
        .then(html => {
            // Create a temporary div to parse the HTML
            const tempDiv = document.createElement('div');
            tempDiv.innerHTML = html;
            
            // Extract the navbar div content
            const navbarContent = tempDiv.querySelector('.navbar');
            if (navbarContent) {
                navbarContainer.innerHTML = navbarContent.outerHTML;
                
                // Load the navigation script to handle active states
                const script = document.createElement('script');
                script.src = '../js/navigation.js';
                document.body.appendChild(script);
            }
        })
        .catch(error => {
            console.error('Error loading navigation:', error);
        });
});
