import { useEffect, useState } from 'react';
import { Facebook, Github, Instagram, Twitter, Sun, Moon } from 'lucide-react';
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
      <div className={`min-h-screen ${theme === 'dark' ? 'bg-bg-dark-primary text-text-dark-primary' : 'bg-bg-light-primary text-text-light-primary'} flex flex-col`}>
        {/* Header */}
        <header className={`container mx-auto px-4 sm:px-6 py-6 flex flex-wrap justify-between items-center backdrop-blur-lg border-b ${theme === 'dark' ? 'bg-bg-dark-secondary/75 border-border-dark/80' : 'bg-bg-light-primary/90 border-border-light'} shadow-md`}>
          <Link to="/" className="flex items-center">
            <img src="https://lessgo-asset.s3.ap-south-1.amazonaws.com/images/logo.png" alt="Lessgo Logo" className="h-8 mr-2" />
            <span className="text-xl sm:text-2xl font-bold text-secondary-accent">Lessgo</span>
            <sup className="text-secondary-accent ml-1">®</sup>
          </Link>

          <nav className="hidden sm:flex items-center justify-center flex-grow order-last sm:order-none mt-4 sm:mt-0">
            <span className={`text-center ${theme === 'dark' ? 'text-text-dark-secondary' : 'text-text-light-secondary'}`}>{time}</span>
          </nav>

          <button
            onClick={toggleTheme}
            className="px-3 py-1.5 sm:px-4 sm:py-2 rounded-full border border-gray-200 hover:border-gray-300 transition-all duration-300 ease-in-out"
          >
            {theme === 'light' ? <Moon className="h-5 w-5 text-primary-accent" /> : <Sun className="h-5 w-5 text-primary-accent" />}
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
        <footer className={`mt-auto ${theme === 'dark' ? 'bg-bg-dark-secondary text-text-dark-secondary border-t border-border-dark' : 'bg-bg-light-secondary text-text-light-secondary border-t border-border-light'}`}>
          <div className="container mx-auto px-4 sm:px-6 py-12">
            <div className="flex flex-col md:flex-row justify-between items-center mb-8">
              <Link to="/" className="flex items-center mb-4 md:mb-0">
                <span className="text-xl font-bold text-secondary-accent">Lessgo</span>
                <sup className="text-secondary-accent ml-1">®</sup>
              </Link>
              <div className="flex space-x-4 md:space-x-6">
                <Twitter className={`h-5 w-5 ${theme === 'dark' ? 'text-text-dark-secondary hover:text-primary-accent-hover' : 'text-text-light-secondary hover:text-primary-accent-hover'} cursor-pointer transition-all duration-300 ease-in-out`} />
                <Facebook className={`h-5 w-5 ${theme === 'dark' ? 'text-text-dark-secondary hover:text-primary-accent-hover' : 'text-text-light-secondary hover:text-primary-accent-hover'} cursor-pointer transition-all duration-300 ease-in-out`} />
                <Instagram className={`h-5 w-5 ${theme === 'dark' ? 'text-text-dark-secondary hover:text-primary-accent-hover' : 'text-text-light-secondary hover:text-primary-accent-hover'} cursor-pointer transition-all duration-300 ease-in-out`} />
                <Github className={`h-5 w-5 ${theme === 'dark' ? 'text-text-dark-secondary hover:text-primary-accent-hover' : 'text-text-light-secondary hover:text-primary-accent-hover'} cursor-pointer transition-all duration-300 ease-in-out`} />
              </div>
            </div>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 md:gap-8 mb-8">
              <Link to="/whats-new" className={`${theme === 'dark' ? 'hover:text-primary-accent' : 'hover:text-primary-accent'} transition-all duration-300 ease-in-out`}>What's New</Link>
              <Link to="/discover" className={`${theme === 'dark' ? 'hover:text-primary-accent' : 'hover:text-primary-accent'} transition-all duration-300 ease-in-out`}>Discover</Link>
              <Link to="/blog" className={`${theme === 'dark' ? 'hover:text-primary-accent' : 'hover:text-primary-accent'} transition-all duration-300 ease-in-out`}>Blog</Link>
              <Link to="/help" className={`${theme === 'dark' ? 'hover:text-primary-accent' : 'hover:text-primary-accent'} transition-all duration-300 ease-in-out`}>Help</Link>
            </div>
            <div className="flex flex-col md:flex-row justify-between items-center pt-8 border-t">
              <div className="flex space-x-4 md:space-x-6 mb-4 md:mb-0">
                <Link to="/legal#terms" className={`text-sm ${theme === 'dark' ? 'text-text-dark-secondary hover:text-primary-accent' : 'text-text-light-secondary hover:text-primary-accent'} transition-all duration-300 ease-in-out`}>Terms</Link>
                <Link to="/legal#privacy" className={`text-sm ${theme === 'dark' ? 'text-text-dark-secondary hover:text-primary-accent' : 'text-text-light-secondary hover:text-primary-accent'} transition-all duration-300 ease-in-out`}>Privacy</Link>
                <Link to="/legal#security" className={`text-sm ${theme === 'dark' ? 'text-text-dark-secondary hover:text-primary-accent' : 'text-text-light-secondary hover:text-primary-accent'} transition-all duration-300 ease-in-out`}>Security</Link>
              </div>
              <p className={`text-sm mt-4 md:mt-0 ${theme === 'dark' ? 'text-text-dark-secondary' : 'text-text-light-secondary'}`}>© 2025 Lessgo. All rights reserved.</p>
            </div>
          </div>
        </footer>
      </div>
    </Router>
  );
}

export default App;