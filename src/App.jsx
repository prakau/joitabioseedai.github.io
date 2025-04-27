import React from 'react';
import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import { ThemeProvider } from './context/ThemeContext';
import BaseLayout from './layouts/BaseLayout';
import HomePage from './pages/Home';
import AboutPage from './pages/About';
import ProductsPage from './pages/Products';
import TechnologyPage from './pages/Technology';
import AgriAssistantPage from './pages/AgriAssistant';
import './styles/global.css';

const App = () => {
  return (
    <Router basename="/">
      <ThemeProvider>
        <BaseLayout>
          <Routes>
            <Route path="/" element={<HomePage />} />
            <Route path="/about" element={<AboutPage />} />
            <Route path="/products" element={<ProductsPage />} />
            <Route path="/technology" element={<TechnologyPage />} />
            <Route path="/agri-assistant" element={<AgriAssistantPage />} />
          </Routes>
        </BaseLayout>
      </ThemeProvider>
    </Router>
  );
};

export default App;
