import React from 'react';
import { useTheme } from '../context/ThemeContext';
import Header from '../components/Header';
import Footer from '../components/Footer';

const BaseLayout = ({ children }) => {
  const { theme } = useTheme();
  
  return (
    <div className={`app ${theme}`}>
      <Header />
      <main className="main-content">
        {children}
      </main>
      <Footer />
    </div>
  );
};

export default BaseLayout;
