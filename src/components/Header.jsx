import React from 'react';
import { useTheme } from '../context/ThemeContext';
import { NavLink } from 'react-router-dom';

const Header = () => {
  const { theme, toggleTheme } = useTheme();

  return (
    <header className="header">
      <nav className="navbar">
        <div className="logo">JOITA BIOSEED AI</div>
        <div className="nav-links">
          <NavLink to="/" exact activeClassName="active">Home</NavLink>
          <NavLink to="/about" activeClassName="active">About</NavLink>
          <NavLink to="/products" activeClassName="active">Products</NavLink>
          <NavLink to="/technology" activeClassName="active">Technology</NavLink>
          <NavLink to="/agri-assistant" activeClassName="active">Agri Assistant</NavLink>
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
