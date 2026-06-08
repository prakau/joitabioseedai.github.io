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
          <a href="/farmassist-ai.html" className="btn btn-secondary">
            Try FarmAssist AI
          </a>
        </div>
      </section>

      <section className="features-section">
        <div className="feature-card">
          <h3>AI-Powered Solutions</h3>
          <p>Offline-first advisory for better crop-stage decisions</p>
        </div>
        <div className="feature-card">
          <h3>Nano-Enabled Products</h3>
          <p>BioSynth Nano, SmartSeed Mat, and AquaSynth Nano platforms</p>
        </div>
        <div className="feature-card">
          <h3>Digital Farming</h3>
          <p>FieldProof records pilot observations and farmer feedback</p>
        </div>
      </section>
    </div>
  );
};

export default HomePage;
