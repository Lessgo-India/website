import { useState } from 'react';
import { 
  Facebook, 
  Github, 
  Instagram, 
  Twitter, 
  Menu, 
  X,
  Compass,
  HelpCircle
} from 'lucide-react';
import { BrowserRouter as Router, Routes, Route, Link, useLocation } from 'react-router-dom';
import ThemeToggle from './components/ThemeToggle';
import WhatsNew from './pages/WhatsNew';
import Discover from './pages/Discover';
import Help from './pages/Help';
import Legal from './pages/Legal';
import Home from './pages/Home';
import Blog from './pages/Blog';

// Navigation Component
function Navigation() {
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const location = useLocation();

  const navItems = [
    { name: 'Discover', path: '/discover', icon: Compass },
    { name: 'Help', path: '/help', icon: HelpCircle },
  ];

  return (
    <header className="luma-header border-b">
      <nav className="container mx-auto px-6 py-4">
        <div className="flex items-center justify-between">
          {/* Logo */}
          <Link to="/" className="flex items-center space-x-3 group">
            <div className="relative">
              <img 
                src="https://lessgo-asset.s3.ap-south-1.amazonaws.com/images/logo.png" 
                alt="Lessgo Logo" 
                className="h-8 w-8 transition-transform duration-200 group-hover:scale-105" 
              />
            </div>
            <span className="text-xl font-semibold text-primary">Lessgo</span>
          </Link>

          {/* Desktop Navigation */}
          <div className="hidden md:flex items-center space-x-8">
            {navItems.map((item) => {
              const Icon = item.icon;
              const isActive = location.pathname === item.path;
              return (
                <Link
                  key={item.name}
                  to={item.path}
                  className={`nav-link flex items-center space-x-2 ${
                    isActive ? 'active' : ''
                  }`}
                >
                  <Icon className="h-4 w-4" />
                  <span>{item.name}</span>
                </Link>
              );
            })}
          </div>

          {/* Theme Toggle & Mobile Menu */}
          <div className="flex items-center space-x-4">
            <ThemeToggle />

            {/* Mobile Menu Button */}
            <button
              onClick={() => setIsMenuOpen(!isMenuOpen)}
              className="md:hidden luma-button-secondary p-2"
            >
              {isMenuOpen ? (
                <X className="h-5 w-5" />
              ) : (
                <Menu className="h-5 w-5" />
              )}
            </button>
          </div>
        </div>

        {/* Mobile Navigation */}
        {isMenuOpen && (
          <div className="md:hidden mt-4 py-4 border-t border-border-primary">
            <div className="space-y-3">
              {navItems.map((item) => {
                const Icon = item.icon;
                const isActive = location.pathname === item.path;
                return (
                  <Link
                    key={item.name}
                    to={item.path}
                    className={`nav-link flex items-center space-x-2 w-full ${
                      isActive ? 'active' : ''
                    }`}
                    onClick={() => setIsMenuOpen(false)}
                  >
                    <Icon className="h-4 w-4" />
                    <span>{item.name}</span>
                  </Link>
                );
              })}
            </div>
          </div>
        )}
      </nav>
    </header>
  );
}

// Footer Component
function Footer() {
  return (
    <footer className="luma-footer mt-16">
      <div className="container mx-auto px-6 py-12">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-8">
          {/* Company Info */}
          <div className="space-y-4">
            <div className="flex items-center space-x-3">
              <img 
                src="https://lessgo-asset.s3.ap-south-1.amazonaws.com/images/logo.png" 
                alt="Lessgo Logo" 
                className="h-8 w-8" 
              />
              <span className="text-lg font-semibold text-primary">Lessgo</span>
            </div>
            <p className="text-secondary text-sm leading-relaxed">
              Delightful events start here. Create and discover amazing events in your community.
            </p>
          </div>

          {/* Quick Links */}
          <div className="space-y-4">
            <h3 className="font-semibold text-primary">Quick Links</h3>
            <div className="space-y-2">
              <Link to="/discover" className="block text-secondary hover:text-primary transition-colors">
                Discover Events
              </Link>
              <Link to="/create" className="block text-secondary hover:text-primary transition-colors">
                Create Event
              </Link>
              <Link to="/help" className="block text-secondary hover:text-primary transition-colors">
                Help Center
              </Link>
            </div>
          </div>

          {/* Legal */}
          <div className="space-y-4">
            <h3 className="font-semibold text-primary">Legal</h3>
            <div className="space-y-2">
              <Link to="/legal" className="block text-secondary hover:text-primary transition-colors">
                Terms of Service
              </Link>
              <Link to="/privacy" className="block text-secondary hover:text-primary transition-colors">
                Privacy Policy
              </Link>
              <Link to="/security" className="block text-secondary hover:text-primary transition-colors">
                Security
              </Link>
            </div>
          </div>

          {/* Social Links */}
          <div className="space-y-4">
            <h3 className="font-semibold text-primary">Connect</h3>
            <div className="flex space-x-4">
              <a
                href="https://twitter.com/lessgo"
                target="_blank"
                rel="noopener noreferrer"
                className="text-secondary hover:text-accent transition-colors"
                aria-label="Follow us on Twitter"
              >
                <Twitter className="h-5 w-5" />
              </a>
              <a
                href="https://instagram.com/lessgo"
                target="_blank"
                rel="noopener noreferrer"
                className="text-secondary hover:text-accent transition-colors"
                aria-label="Follow us on Instagram"
              >
                <Instagram className="h-5 w-5" />
              </a>
              <a
                href="https://facebook.com/lessgo"
                target="_blank"
                rel="noopener noreferrer"
                className="text-secondary hover:text-accent transition-colors"
                aria-label="Follow us on Facebook"
              >
                <Facebook className="h-5 w-5" />
              </a>
              <a
                href="https://github.com/lessgo"
                target="_blank"
                rel="noopener noreferrer"
                className="text-secondary hover:text-accent transition-colors"
                aria-label="Visit our GitHub"
              >
                <Github className="h-5 w-5" />
              </a>
            </div>
          </div>
        </div>

        <div className="border-t border-light mt-8 pt-8 text-center">
          <p className="text-secondary text-sm">
            © 2024 Lessgo. All rights reserved.
          </p>
        </div>
      </div>
    </footer>
  );
}

// Main App Component
function App() {
  return (
    <Router>
      <div className="min-h-screen bg-primary">
        <Navigation />
        
        <main className="pt-20">
          <Routes>
            <Route path="/" element={<Home />} />
            <Route path="/whats-new" element={<WhatsNew />} />
            <Route path="/discover" element={<Discover />} />
            <Route path="/blog" element={<Blog />} />
            <Route path="/help" element={<Help />} />
            <Route path="/legal" element={<Legal />} />
          </Routes>
        </main>

        <Footer />
      </div>
    </Router>
  );
}

export default App;
