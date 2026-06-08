import React from 'react';
import { useTheme } from '../context/ThemeContext';

const Header = () => {
  const { theme, toggleTheme } = useTheme();

  return (
    <header className="header">
      <nav className="navbar">
        <div className="logo">JOITA BIOSEED AI</div>
        <div className="nav-links">
          <a href="/">Home</a>
          <a href="/about.html">About</a>
          <a href="/domains.html">Domains</a>
          <a href="/products.html">Products</a>
          <a href="/farmassist-ai.html">FarmAssist AI</a>
          <a href="/data-validation.html">Data & Field Validation</a>
          <a href="/farmers-fpos.html">Farmers & FPOs</a>
          <a href="/investors-partners.html">Investors & Partners</a>
          <a href="/join-us.html">Join Us</a>
          <a href="/contact.html">Contact</a>
        </div>
        <button 
          className="theme-toggle"
          onClick={toggleTheme}
          aria-label={`Switch to ${theme === 'light' ? 'dark' : 'light'} mode`}
        >
          {theme === 'light' ? '🌙' : '☀️'}
        </button>
      </nav>
    </header>
  );
};

export default Header;
