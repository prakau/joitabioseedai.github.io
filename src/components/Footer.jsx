import React from 'react';
import { useTheme } from '../context/ThemeContext';

const Footer = () => {
  const { theme } = useTheme();

  return (
    <footer className={`footer ${theme}`}>
      <div className="footer-content">
        <p>Copyright 2025-2026 JOITA Bioseed AI. All rights reserved.</p>
        <p className="footer-disclaimer">
          JOITA products and technologies are under continuous field validation. Crop response may vary by crop, season, location, soil, weather, and management practices.
        </p>
        <div className="footer-links">
          <a href="/products.html">Products</a>
          <a href="/farmassist-ai.html">FarmAssist AI</a>
          <a href="/join-us.html">Join Us</a>
          <a href="/contact.html">Contact</a>
        </div>
      </div>
    </footer>
  );
};

export default Footer;
