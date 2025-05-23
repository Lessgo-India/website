import React from 'react';
import { Search, Book, MessageCircle, Phone } from 'lucide-react';

function Help() {
  return (
    <main className="container mx-auto px-6 py-12">
      <h1 className="text-4xl font-bold mb-2 text-text-light-primary dark:text-text-dark-primary">Help Center</h1>
      <div className="h-1 w-20 bg-secondary-accent mb-8"></div>

      <div className="max-w-2xl mx-auto mb-12">
        <div className="relative">
          <input
            type="text"
            placeholder="Search for help..."
            className="w-full py-4 px-6 pr-12 rounded-full border focus:outline-none focus:ring-2 focus:border-transparent border-border-light dark:border-border-dark bg-bg-light-secondary dark:bg-bg-dark-secondary text-text-light-primary dark:text-text-dark-primary focus:ring-secondary-accent dark:focus:ring-secondary-accent-hover placeholder-text-light-secondary dark:placeholder-text-dark-secondary"
          />
          <Search className="absolute right-4 top-1/2 transform -translate-y-1/2 text-text-light-secondary dark:text-text-dark-secondary h-5 w-5" />
        </div>
      </div>

      <div className="grid gap-8 md:grid-cols-2 lg:grid-cols-3">
        <div className="bg-bg-light-secondary dark:bg-bg-dark-secondary p-6 rounded-xl shadow-sm hover:shadow-md transition-shadow">
          <Book className="h-8 w-8 text-secondary-accent mb-4" />
          <h3 className="text-xl font-semibold mb-2 text-text-light-primary dark:text-text-dark-primary">Documentation</h3>
          <p className="text-text-light-secondary dark:text-text-dark-secondary mb-4">Comprehensive guides and tutorials to help you get started.</p>
          <a href="#" className="px-4 py-2 rounded-lg bg-secondary-accent text-text-on-secondary hover-gradient-glow font-medium">Browse docs →</a>
        </div>

        <div className="bg-bg-light-secondary dark:bg-bg-dark-secondary p-6 rounded-xl shadow-sm hover:shadow-md transition-shadow">
          <MessageCircle className="h-8 w-8 text-secondary-accent mb-4" />
          <h3 className="text-xl font-semibold mb-2 text-text-light-primary dark:text-text-dark-primary">Community</h3>
          <p className="text-text-light-secondary dark:text-text-dark-secondary mb-4">Join our community forum to get help from other users.</p>
          <a href="#" className="px-4 py-2 rounded-lg bg-secondary-accent text-text-on-secondary hover-gradient-glow font-medium">Visit forum →</a>
        </div>

        <div className="bg-bg-light-secondary dark:bg-bg-dark-secondary p-6 rounded-xl shadow-sm hover:shadow-md transition-shadow">
          <Phone className="h-8 w-8 text-secondary-accent mb-4" />
          <h3 className="text-xl font-semibold mb-2 text-text-light-primary dark:text-text-dark-primary">Contact Support</h3>
          <p className="text-text-light-secondary dark:text-text-dark-secondary mb-4">Get in touch with our support team for direct assistance.</p>
          <a href="#" className="px-4 py-2 rounded-lg bg-secondary-accent text-text-on-secondary hover-gradient-glow font-medium">Contact us →</a>
        </div>
      </div>
    </main>
  );
}

export default Help;