import React from 'react';
import { BrowserRouter as Router, Routes, Route, Link } from 'react-router-dom';
import { ThemeProvider } from './context/themeContext';
import BaseLayout from './layout/BaseLayout';
import HomePage from './pages/Home';
import AboutPage from './pages/About';
import ProductPage from './pages/Product';
import TechnologyPage from './pages/Technology';
import AgriAssistantPage from './pages/AgriAssistant';
import './styles/global.css';

const App = () => {
  return (
    <Router basename="/">
      <ThemeProvider>
        <BaseLayout>
          <nav>
            <ul>
              <li><Link to="/">Home</Link></li>
              <li><Link to="/about">About</Link></li>
              <li><Link to="/products">Products</Link></li>
              <li><Link to="/technology">Technology</Link></li>
              <li><Link to="/agri-assistant">Agri Assistant</Link></li>
            </ul>
          </nav>
          <Routes>
            <Route path="/" element={<HomePage />} />
            <Route path="/about" element={<AboutPage />} />
            <Route path="/products" element={<ProductPage />} />
            <Route path="/technology" element={<TechnologyPage />} />
            <Route path="/agri-assistant" element={<AgriAssistantPage />} />
          </Routes>
        </BaseLayout>
      </ThemeProvider>
    </Router>
  );
};

export default App;
