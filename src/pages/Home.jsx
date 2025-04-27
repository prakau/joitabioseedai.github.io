import React from 'react';
import { Link } from 'react-router-dom';

const HomePage = () => {
  return (
    <div className="page-container">
      <section className="hero-section">
        <h1>Welcome to JOITA BIOSEED AI</h1>
        <p>Innovative agricultural solutions powered by AI and nanotechnology</p>
        <div className="cta-buttons">
          <Link to="/products" className="btn btn-primary">
            Explore Our Products
          </Link>
          <Link to="/technology" className="btn btn-secondary">
            Learn About Our Technology
          </Link>
        </div>
      </section>

      <section className="features-section">
        <div className="feature-card">
          <h3>AI-Powered Solutions</h3>
          <p>Smart farming technology for increased yields</p>
        </div>
        <div className="feature-card">
          <h3>Nano-Enabled Products</h3>
          <p>Advanced bio-protection for sustainable agriculture</p>
        </div>
        <div className="feature-card">
          <h3>Digital Farming</h3>
          <p>Comprehensive platform for modern farming</p>
        </div>
      </section>
    </div>
  );
};

export default HomePage;
