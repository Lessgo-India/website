import React, { useEffect, useState } from 'react';
import { ArrowRight, Calendar, Facebook, Github, Instagram, Twitter, Sun, Moon } from 'lucide-react';
import { BrowserRouter as Router, Routes, Route, Link } from 'react-router-dom';
import WhatsNew from './pages/WhatsNew';
import Discover from './pages/Discover';
import Help from './pages/Help';
import Legal from './pages/Legal';
import Home from './pages/Home';
import Blog from './pages/Blog';

function App() {
  const [time, setTime] = useState('');
  const [theme, setTheme] = useState(() => localStorage.getItem('theme') || 'light');

  useEffect(() => {
    const updateTime = () => {
      const now = new Date();
      setTime(now.toLocaleTimeString('en-US', {
        hour: 'numeric',
        minute: '2-digit',
        timeZone: 'Asia/Kolkata',
        hour12: true,
        timeZoneName: 'short'
      }));
    };
    
    updateTime();
    const interval = setInterval(updateTime, 60000);
    return () => clearInterval(interval);
  }, []);

  useEffect(() => {
    document.documentElement.className = theme;
    localStorage.setItem('theme', theme);
  }, [theme]);

  const toggleTheme = () => {
    setTheme((prevTheme) => (prevTheme === 'light' ? 'dark' : 'light'));
  };

  return (
    <Router>
      <div className={`min-h-screen ${theme === 'dark' ? 'bg-gray-900 text-white' : 'bg-gradient-to-br from-blue-50 via-white to-blue-50'} flex flex-col`}>
        {/* Header */}
        <header className="container mx-auto px-6 py-6 flex flex-wrap justify-between items-center">
          <Link to="/" className="flex items-center">
            <img src="https://lessgo-asset.s3.ap-south-1.amazonaws.com/images/logo.png" alt="Lessgo Logo" className="h-8 mr-2" />
            <span className="text-2xl font-bold">Lessgo</span>
            <sup className="text-blue-500 ml-1">®</sup>
          </Link>

          <nav className="hidden sm:flex items-center justify-center flex-grow order-last sm:order-none mt-4 sm:mt-0">
            <span className={`text-center ${theme === 'dark' ? 'text-gray-300' : 'text-gray-600'}`}>{time}</span>
          </nav>

          <button
            onClick={toggleTheme}
            className="px-4 py-2 rounded-full border border-gray-200 hover:border-gray-300 transition-colors"
          >
            {theme === 'light' ? <Moon className="h-5 w-5" /> : <Sun className="h-5 w-5" />}
          </button>
        </header>

        {/* Main Content */}
        <main className="flex-grow">
          <Routes>
            <Route path="/" element={<Home />} />
            <Route path="/whats-new" element={<WhatsNew />} />
            <Route path="/discover" element={<Discover />} />
            <Route path="/blog" element={<Blog />} />
            <Route path="/help" element={<Help />} />
            <Route path="/legal" element={<Legal />} />
          </Routes>
        </main>

        {/* Footer */}
        <footer className={`mt-auto ${theme === 'dark' ? 'bg-gray-800 text-gray-300 border-gray-700' : 'bg-white text-gray-600 border-gray-100'}`}>
          <div className="container mx-auto px-6 py-12">
            <div className="flex flex-col md:flex-row justify-between items-center mb-8">
              <Link to="/" className="flex items-center mb-4 md:mb-0">
                <span className="text-xl font-bold">Lessgo</span>
                <sup className="text-blue-500 ml-1">®</sup>
              </Link>
              <div className="flex space-x-4 md:space-x-6">
                <Twitter className={`h-5 w-5 ${theme === 'dark' ? 'text-gray-400 hover:text-gray-200' : 'text-gray-400 hover:text-gray-600'} cursor-pointer`} />
                <Facebook className={`h-5 w-5 ${theme === 'dark' ? 'text-gray-400 hover:text-gray-200' : 'text-gray-400 hover:text-gray-600'} cursor-pointer`} />
                <Instagram className={`h-5 w-5 ${theme === 'dark' ? 'text-gray-400 hover:text-gray-200' : 'text-gray-400 hover:text-gray-600'} cursor-pointer`} />
                <Github className={`h-5 w-5 ${theme === 'dark' ? 'text-gray-400 hover:text-gray-200' : 'text-gray-400 hover:text-gray-600'} cursor-pointer`} />
              </div>
            </div>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 md:gap-8 mb-8">
              <Link to="/whats-new" className={`${theme === 'dark' ? 'hover:text-white' : 'hover:text-gray-900'}`}>What's New</Link>
              <Link to="/discover" className={`${theme === 'dark' ? 'hover:text-white' : 'hover:text-gray-900'}`}>Discover</Link>
              <Link to="/blog" className={`${theme === 'dark' ? 'hover:text-white' : 'hover:text-gray-900'}`}>Blog</Link>
              <Link to="/help" className={`${theme === 'dark' ? 'hover:text-white' : 'hover:text-gray-900'}`}>Help</Link>
            </div>
            <div className="flex flex-col md:flex-row justify-between items-center pt-8 border-t">
              <div className="flex space-x-4 md:space-x-6 mb-4 md:mb-0">
                <Link to="/legal#terms" className={`text-sm ${theme === 'dark' ? 'text-gray-400 hover:text-gray-200' : 'text-gray-500 hover:text-gray-700'}`}>Terms</Link>
                <Link to="/legal#privacy" className={`text-sm ${theme === 'dark' ? 'text-gray-400 hover:text-gray-200' : 'text-gray-500 hover:text-gray-700'}`}>Privacy</Link>
                <Link to="/legal#security" className={`text-sm ${theme === 'dark' ? 'text-gray-400 hover:text-gray-200' : 'text-gray-500 hover:text-gray-700'}`}>Security</Link>
              </div>
              <p className={`text-sm mt-4 md:mt-0 ${theme === 'dark' ? 'text-gray-400' : 'text-gray-500'}`}>© 2025 Lessgo. All rights reserved.</p>
            </div>
          </div>
        </footer>
      </div>
    </Router>
  );
}

export default App;