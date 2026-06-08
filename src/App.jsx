import React from 'react';
import { BrowserRouter as Router, Routes, Route, Link } from 'react-router-dom';
import { ThemeProvider } from './context/ThemeContext';
import BaseLayout from './layouts/BaseLayout';
import HomePage from './pages/Home';
import ProductsPage from './pages/Products';
import TechnologyPage from './pages/Technology';
import './styles/global.css';

const App = () => {
  return (
    <Router basename="/">
      <ThemeProvider>
        <BaseLayout>
          <nav>
            <ul>
              <li><Link to="/">Home</Link></li>
              <li><a href="/products.html">Products</a></li>
              <li><a href="/farmassist-ai.html">FarmAssist AI</a></li>
              <li><a href="/data-validation.html">Data & Field Validation</a></li>
              <li><a href="/farmers-fpos.html">Farmers & FPOs</a></li>
              <li><a href="/investors-partners.html">Investors & Partners</a></li>
              <li><a href="/join-us.html">Join Us</a></li>
              <li><a href="/contact.html">Contact</a></li>
            </ul>
          </nav>
          <Routes>
            <Route path="/" element={<HomePage />} />
            <Route path="/products" element={<ProductsPage />} />
            <Route path="/technology" element={<TechnologyPage />} />
            <Route path="/about" element={<HomePage />} />
          </Routes>
        </BaseLayout>
      </ThemeProvider>
    </Router>
  );
};

export default App;
