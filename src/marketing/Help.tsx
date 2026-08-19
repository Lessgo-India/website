import React from 'react';
import { Search, Book, MessageCircle, Phone } from 'lucide-react';

function Help() {
  return (
    <main className="container mx-auto px-4 sm:px-6 py-8 sm:py-12">
      <h1 className="text-2xl sm:text-3xl md:text-4xl font-bold mb-2 text-text-light-primary dark:text-text-dark-primary">Help Center</h1>
      <div className="h-1 w-16 sm:w-20 bg-secondary-accent mb-6 sm:mb-8"></div>

      <div className="max-w-2xl mx-auto mb-8 sm:mb-12">
        <div className="relative">
          <input
            type="text"
            placeholder="Search for help..."
            className="w-full py-3 sm:py-4 px-4 sm:px-6 pr-10 sm:pr-12 rounded-full border focus:outline-none focus:ring-2 focus:border-transparent border-border-light dark:border-border-dark bg-bg-light-secondary dark:bg-bg-dark-secondary text-text-light-primary dark:text-text-dark-primary focus:ring-secondary-accent dark:focus:ring-secondary-accent-hover placeholder-text-light-secondary dark:placeholder-text-dark-secondary text-sm sm:text-base"
          />
          <Search className="absolute right-3 sm:right-4 top-1/2 transform -translate-y-1/2 text-text-light-secondary dark:text-text-dark-secondary h-4 w-4 sm:h-5 sm:w-5" />
        </div>
      </div>

      <div className="grid gap-4 sm:gap-6 md:gap-8 grid-cols-1 sm:grid-cols-2 lg:grid-cols-3">
        <div className="bg-bg-light-secondary dark:bg-bg-dark-secondary p-4 sm:p-6 rounded-xl shadow-sm hover:shadow-md transition-shadow">
          <Book className="h-6 w-6 sm:h-8 sm:w-8 text-secondary-accent mb-3 sm:mb-4" />
          <h3 className="text-lg sm:text-xl font-semibold mb-2 text-text-light-primary dark:text-text-dark-primary">Documentation</h3>
          <p className="text-sm sm:text-base text-text-light-secondary dark:text-text-dark-secondary mb-3 sm:mb-4">Comprehensive guides and tutorials to help you get started.</p>
          <a href="#" className="btn-animated-fill text-sm sm:text-base inline-block py-2">Browse docs →</a>
        </div>

        <div className="bg-bg-light-secondary dark:bg-bg-dark-secondary p-4 sm:p-6 rounded-xl shadow-sm hover:shadow-md transition-shadow">
          <MessageCircle className="h-6 w-6 sm:h-8 sm:w-8 text-secondary-accent mb-3 sm:mb-4" />
          <h3 className="text-lg sm:text-xl font-semibold mb-2 text-text-light-primary dark:text-text-dark-primary">Community</h3>
          <p className="text-sm sm:text-base text-text-light-secondary dark:text-text-dark-secondary mb-3 sm:mb-4">Join our community forum to get help from other users.</p>
          <a href="#" className="btn-animated-fill text-sm sm:text-base inline-block py-2">Visit forum →</a>
        </div>

        <div className="bg-bg-light-secondary dark:bg-bg-dark-secondary p-4 sm:p-6 rounded-xl shadow-sm hover:shadow-md transition-shadow sm:col-span-2 lg:col-span-1">
          <Phone className="h-6 w-6 sm:h-8 sm:w-8 text-secondary-accent mb-3 sm:mb-4" />
          <h3 className="text-lg sm:text-xl font-semibold mb-2 text-text-light-primary dark:text-text-dark-primary">Contact Support</h3>
          <p className="text-sm sm:text-base text-text-light-secondary dark:text-text-dark-secondary mb-3 sm:mb-4">Get in touch with our support team for direct assistance.</p>
          <a href="#" className="btn-animated-fill text-sm sm:text-base inline-block py-2">Contact us →</a>
        </div>
      </div>
    </main>
  );
}

export default Help;