import React, { useEffect, useState } from 'react';
import { ArrowRight, Calendar, Facebook, Github, Instagram, Twitter } from 'lucide-react';
import { BrowserRouter as Router, Routes, Route, Link } from 'react-router-dom';
import WhatsNew from './pages/WhatsNew';
import Discover from './pages/Discover';
// Remove Pricing import
// import Pricing from './pages/Pricing';
import Help from './pages/Help';
import Legal from './pages/Legal';
import Home from './pages/Home';
// Add Blog import
import Blog from './pages/Blog';

function App() {
  const [time, setTime] = useState('');

  useEffect(() => {
    const updateTime = () => {
      const now = new Date();
      setTime(now.toLocaleTimeString('en-US', {
        hour: 'numeric',
        minute: '2-digit',
        timeZone: 'Asia/Kolkata',
        timeZoneName: 'short'
      }));
    };
    
    updateTime();
    const interval = setInterval(updateTime, 60000);
    return () => clearInterval(interval);
  }, []);

  return (
    <Router>
      <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-blue-50 flex flex-col">
        {/* Header */}
        <header className="container mx-auto px-6 py-6 flex justify-between items-center">
          <Link to="/" className="flex items-center">
            {/* Include both image logo and text */}
            <img src="https://lessgo-asset.s3.ap-south-1.amazonaws.com/images/logo.png" alt="Lessgo Logo" className="h-8 mr-2" /> {/* Added mr-2 for spacing */}
            <span className="text-2xl font-bold">Lessgo</span>
            <sup className="text-blue-500 ml-1">®</sup>
          </Link>
          <nav className="flex items-center space-x-8">
            <span className="text-gray-600">{time}</span>
            {/* Remove Explore Events link */}
            {/* <Link to="/discover" className="flex items-center text-gray-700 hover:text-gray-900">
              Explore Events <ArrowRight className="ml-2 h-4 w-4" />
            </Link> */}
            {/* Remove Sign In button */}
            {/* <button className="px-4 py-2 rounded-full border border-gray-200 hover:border-gray-300 transition-colors">
              Sign In
            </button> */}
          </nav>
        </header>

        {/* Main Content */}
        <main className="flex-grow">
          <Routes>
            <Route path="/" element={<Home />} />
            <Route path="/whats-new" element={<WhatsNew />} />
            <Route path="/discover" element={<Discover />} />
            {/* Replace Pricing route with Blog route */}
            {/* <Route path="/pricing" element={<Pricing />} /> */}
            <Route path="/blog" element={<Blog />} />
            <Route path="/help" element={<Help />} />
            <Route path="/legal" element={<Legal />} />
          </Routes>
        </main>

        {/* Footer */}
        <footer className="bg-white border-t border-gray-100 mt-auto">
          <div className="container mx-auto px-6 py-12">
            <div className="flex justify-between items-center mb-8">
              <Link to="/" className="flex items-center">
                <span className="text-xl font-bold">Lessgo</span>
                <sup className="text-blue-500 ml-1">®</sup>
              </Link>
              <div className="flex space-x-6">
                <Twitter className="h-5 w-5 text-gray-400 hover:text-gray-600 cursor-pointer" />
                <Facebook className="h-5 w-5 text-gray-400 hover:text-gray-600 cursor-pointer" />
                <Instagram className="h-5 w-5 text-gray-400 hover:text-gray-600 cursor-pointer" />
                <Github className="h-5 w-5 text-gray-400 hover:text-gray-600 cursor-pointer" />
              </div>
            </div>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-8 mb-8">
              <Link to="/whats-new" className="text-gray-600 hover:text-gray-900">What's New</Link>
              <Link to="/discover" className="text-gray-600 hover:text-gray-900">Discover</Link>
              {/* Update Pricing link to Blog link */}
              {/* <Link to="/pricing" className="text-gray-600 hover:text-gray-900">Pricing</Link> */}
              <Link to="/blog" className="text-gray-600 hover:text-gray-900">Blog</Link>
              <Link to="/help" className="text-gray-600 hover:text-gray-900">Help</Link>
            </div>
            <div className="flex justify-between items-center pt-8 border-t border-gray-100">
              <div className="flex space-x-6">
                <Link to="/legal#terms" className="text-sm text-gray-500 hover:text-gray-700">Terms</Link>
                <Link to="/legal#privacy" className="text-sm text-gray-500 hover:text-gray-700">Privacy</Link>
                <Link to="/legal#security" className="text-sm text-gray-500 hover:text-gray-700">Security</Link>
              </div>
              <p className="text-sm text-gray-500">© 2025 Lessgo. All rights reserved.</p>
            </div>
          </div>
        </footer>
      </div>
    </Router>
  );
}

export default App;