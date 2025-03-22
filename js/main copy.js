// Nano Particles Background Animation
function createParticles() {
    const container = document.querySelector('.nano-particles');
    const particleCount = 50;
    
    // Vibrant color palette
    const colors = [
        '#00e676', // Vibrant Green
        '#2979ff', // Bright Blue
        '#00bfa5', // Teal
        '#64ffda', // Light Teal
        '#69f0ae', // Bright Green
        '#40c4ff', // Light Blue
        '#00b0ff', // Sky Blue
        '#00e5ff'  // Cyan
    ];

    for (let i = 0; i < particleCount; i++) {
        const particle = document.createElement('div');
        particle.className = 'particle';
        
        // Enhanced random particle properties
        const size = Math.random() * 6 + 3; // Slightly larger particles
        const color = colors[Math.floor(Math.random() * colors.length)];
        const startPositionX = Math.random() * window.innerWidth;
        const startPositionY = Math.random() * window.innerHeight + window.innerHeight;
        const duration = Math.random() * 15 + 15; // Longer duration for more visible effect
        const delay = Math.random() * 5;

        particle.style.width = `${size}px`;
        particle.style.height = `${size}px`;
        particle.style.background = color;
        particle.style.left = `${startPositionX}px`;
        particle.style.top = `${startPositionY}px`;
        particle.style.animationDuration = `${duration}s`;
        particle.style.animationDelay = `${delay}s`;
        
        // Add glow effect based on color
        particle.style.boxShadow = `0 0 ${size * 2}px ${color}`;
        particle.style.filter = 'brightness(1.5)'; // Make particles brighter

        container.appendChild(particle);
    }
}

// Section Reveal on Scroll with Enhanced Effect
function revealOnScroll() {
    const reveals = document.querySelectorAll('.reveal');
    
    reveals.forEach(element => {
        const elementTop = element.getBoundingClientRect().top;
        const windowHeight = window.innerHeight;
        
        if (elementTop < windowHeight - 100) {
            element.classList.add('active');
            
            // Add sparkle effect to newly revealed elements
            if (!element.dataset.sparkleAdded) {
                addSparkleEffect(element);
                element.dataset.sparkleAdded = 'true';
            }
        }
    });
}

// Sparkle Effect for Revealed Elements
function addSparkleEffect(element) {
    const sparkleCount = 3;
    const colors = ['#00e676', '#2979ff', '#00bfa5'];
    
    for (let i = 0; i < sparkleCount; i++) {
        const sparkle = document.createElement('div');
        sparkle.className = 'nano-dot';
        sparkle.style.background = colors[i % colors.length];
        sparkle.style.left = `${Math.random() * 100}%`;
        sparkle.style.top = `${Math.random() * 100}%`;
        element.appendChild(sparkle);
    }
}

// Create Enhanced Nano Technology Dots
function createNanoDots() {
    const containers = document.querySelectorAll('.nano-tech');
    const colors = ['#00e676', '#2979ff', '#00bfa5', '#69f0ae'];
    
    containers.forEach(container => {
        const dotCount = 20;
        
        for (let i = 0; i < dotCount; i++) {
            const dot = document.createElement('div');
            dot.className = 'nano-dot';
            
            // Enhanced random properties
            const left = Math.random() * 100;
            const top = Math.random() * 100;
            const delay = Math.random() * 2;
            const color = colors[Math.floor(Math.random() * colors.length)];
            const size = Math.random() * 3 + 2;
            
            dot.style.left = `${left}%`;
            dot.style.top = `${top}%`;
            dot.style.animationDelay = `${delay}s`;
            dot.style.background = color;
            dot.style.width = `${size}px`;
            dot.style.height = `${size}px`;
            dot.style.boxShadow = `0 0 ${size * 2}px ${color}`;
            
            container.appendChild(dot);
        }
    });
}

// Animated Company Name with Enhanced Effects
function animateCompanyName() {
    const companyName = document.querySelector('.company-name');
    if (companyName) {
        const text = companyName.textContent;
        companyName.textContent = '';
        
        // Create spans for each letter with enhanced animation
        text.split('').forEach((letter, index) => {
            const span = document.createElement('span');
            span.textContent = letter;
            span.style.animationDelay = `${index * 0.1}s`;
            span.style.opacity = '0';
            span.style.transform = 'translateY(20px)';
            span.style.display = 'inline-block';
            
            // Add transition for smooth animation
            span.style.transition = 'all 0.5s ease';
            
            // Trigger animation after a small delay
            setTimeout(() => {
                span.style.opacity = '1';
                span.style.transform = 'translateY(0)';
            }, index * 100);
            
            companyName.appendChild(span);
        });
    }
}

// Page Loading Animation with Enhanced Spinner
function showLoadingSpinner() {
    const spinner = document.createElement('div');
    spinner.className = 'loading-spinner';
    document.body.appendChild(spinner);
    
    // Remove spinner and add enhanced page transition
    window.addEventListener('load', () => {
        spinner.style.opacity = '0';
        setTimeout(() => {
            spinner.remove();
            document.body.classList.add('fade-in');
        }, 300);
    });
}

// Initialize All Animations
function initAnimations() {
    // Add nano particles container if it doesn't exist
    if (!document.querySelector('.nano-particles')) {
        const particlesContainer = document.createElement('div');
        particlesContainer.className = 'nano-particles';
        document.body.insertBefore(particlesContainer, document.body.firstChild);
    }

    // Initialize all animations
    createParticles();
    createNanoDots();
    showLoadingSpinner();
    animateCompanyName();

    // Add scroll event listener for reveal animations
    window.addEventListener('scroll', revealOnScroll);
    
    // Add reveal class to sections
    document.querySelectorAll('section').forEach(section => {
        section.classList.add('reveal');
    });

    // Add enhanced hover effects
    document.querySelectorAll('.product-card, .feature-card, .info-card').forEach(card => {
        card.classList.add('hover-grow');
    });

    document.querySelectorAll('.cta a, .learn-more, button[type="submit"]').forEach(button => {
        button.classList.add('animated-button');
    });

    // Add animated header class
    document.querySelector('header').classList.add('animated-header');
}

// Run animations when DOM is loaded
document.addEventListener('DOMContentLoaded', initAnimations);

// Enhanced particle recreation on window resize
let resizeTimeout;
window.addEventListener('resize', () => {
    clearTimeout(resizeTimeout);
    resizeTimeout = setTimeout(() => {
        const container = document.querySelector('.nano-particles');
        container.innerHTML = '';
        createParticles();
    }, 250);
});

// Enhanced page transitions
document.querySelectorAll('a').forEach(link => {
    link.addEventListener('click', (e) => {
        if (link.href && link.href.startsWith(window.location.origin)) {
            e.preventDefault();
            document.body.classList.remove('fade-in');
            setTimeout(() => {
                window.location.href = link.href;
            }, 300);
        }
    });
});