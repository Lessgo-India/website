import React from 'react';
import { Search, Book, MessageCircle, Phone } from 'lucide-react';

function Help() {
  return (
    <main className="container mx-auto px-6 py-12">
      <h1 className="text-4xl font-bold mb-2">Help Center</h1>
      <div className="h-1 w-20 bg-blue-500 mb-8"></div>

      <div className="max-w-2xl mx-auto mb-12">
        <div className="relative">
          <input
            type="text"
            placeholder="Search for help..."
            className="w-full py-4 px-6 pr-12 rounded-full border border-gray-200 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
          />
          <Search className="absolute right-4 top-1/2 transform -translate-y-1/2 text-gray-400 h-5 w-5" />
        </div>
      </div>

      <div className="grid gap-8 md:grid-cols-2 lg:grid-cols-3">
        <div className="bg-white p-6 rounded-xl shadow-sm hover:shadow-md transition-shadow">
          <Book className="h-8 w-8 text-blue-500 mb-4" />
          <h3 className="text-xl font-semibold mb-2">Documentation</h3>
          <p className="text-gray-600 mb-4">Comprehensive guides and tutorials to help you get started.</p>
          <a href="#" className="text-blue-500 hover:text-blue-600">Browse docs →</a>
        </div>

        <div className="bg-white p-6 rounded-xl shadow-sm hover:shadow-md transition-shadow">
          <MessageCircle className="h-8 w-8 text-blue-500 mb-4" />
          <h3 className="text-xl font-semibold mb-2">Community</h3>
          <p className="text-gray-600 mb-4">Join our community forum to get help from other users.</p>
          <a href="#" className="text-blue-500 hover:text-blue-600">Visit forum →</a>
        </div>

        <div className="bg-white p-6 rounded-xl shadow-sm hover:shadow-md transition-shadow">
          <Phone className="h-8 w-8 text-blue-500 mb-4" />
          <h3 className="text-xl font-semibold mb-2">Contact Support</h3>
          <p className="text-gray-600 mb-4">Get in touch with our support team for direct assistance.</p>
          <a href="#" className="text-blue-500 hover:text-blue-600">Contact us →</a>
        </div>
      </div>
    </main>
  );
}

export default Help;