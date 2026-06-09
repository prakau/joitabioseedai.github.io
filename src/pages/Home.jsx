import React from 'react';
import { Link } from 'react-router-dom';

const HomePage = () => {
  return (
    <div className="page-container">
      <section className="hero-section">
        <h1>We help farmers increase yields using AI-guided biological inputs.</h1>
        <p>AI in agriculture. Biological inputs in the field. Better decisions for farmers.</p>
        <div className="cta-buttons">
          <Link to="/products" className="btn btn-primary">
            Explore Products
          </Link>
          <a href="/farmassist/" className="btn btn-secondary">
            Open FarmAssist AI
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
          <p>BioSynth Prime, BioSynth Nano, FarmAssist AI, SmartSeedMat, and AquaSynth Nano</p>
        </div>
        <div className="feature-card">
          <h3>Digital Farming</h3>
          <p>Field records capture pilot observations and farmer feedback</p>
        </div>
      </section>
    </div>
  );
};

export default HomePage;
