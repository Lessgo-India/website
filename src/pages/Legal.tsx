import React from 'react';
import { Shield, Lock, FileText } from 'lucide-react';

function Legal() {
  return (
    <main className="container mx-auto px-4 sm:px-6 py-8 sm:py-12">
      <h1 className="text-2xl sm:text-3xl md:text-4xl font-bold mb-2">Legal Information</h1>
      <div className="h-1 w-16 sm:w-20 bg-blue-500 mb-6 sm:mb-8"></div>

      <div className="max-w-4xl mx-auto space-y-6 sm:space-y-8 md:space-y-12">
        <section id="terms" className="bg-white dark:bg-gray-800 p-4 sm:p-6 md:p-8 rounded-xl shadow-sm">
          <div className="flex items-center mb-4 sm:mb-6">
            <FileText className="h-6 w-6 sm:h-8 sm:w-8 text-blue-500 mr-2 sm:mr-3 flex-shrink-0" />
            <h2 className="text-xl sm:text-2xl font-bold">Terms of Service</h2>
          </div>
          <div className="prose max-w-none">
            <p className="text-gray-600 dark:text-gray-400 mb-3 sm:mb-4 text-sm sm:text-base">
              By using Lessgo's services, you agree to these terms, which are designed to make clear what we expect from our users and what you can expect from us.
            </p>
            <h3 className="text-lg sm:text-xl font-semibold mb-2">1. Account Terms</h3>
            <p className="text-gray-600 dark:text-gray-400 mb-3 sm:mb-4 text-sm sm:text-base">
              You must be 13 years or older to use this service. You must provide accurate information when creating your account.
            </p>
            <h3 className="text-lg sm:text-xl font-semibold mb-2">2. Event Creation</h3>
            <p className="text-gray-600 dark:text-gray-400 text-sm sm:text-base">
              Events must comply with local laws and regulations. Lessgo reserves the right to remove events that violate our policies.
            </p>
          </div>
        </section>

        <section id="privacy" className="bg-white dark:bg-gray-800 p-4 sm:p-6 md:p-8 rounded-xl shadow-sm">
          <div className="flex items-center mb-4 sm:mb-6">
            <Lock className="h-6 w-6 sm:h-8 sm:w-8 text-blue-500 mr-2 sm:mr-3 flex-shrink-0" />
            <h2 className="text-xl sm:text-2xl font-bold">Privacy Policy</h2>
          </div>
          <div className="prose max-w-none">
            <p className="text-gray-600 dark:text-gray-400 mb-3 sm:mb-4 text-sm sm:text-base">
              We take your privacy seriously. This policy explains how we collect, use, and protect your personal information.
            </p>
            <h3 className="text-lg sm:text-xl font-semibold mb-2">Data Collection</h3>
            <p className="text-gray-600 dark:text-gray-400 mb-3 sm:mb-4 text-sm sm:text-base">
              We collect information you provide directly to us, including your name, email address, and event details.
            </p>
            <h3 className="text-lg sm:text-xl font-semibold mb-2">Data Usage</h3>
            <p className="text-gray-600 dark:text-gray-400 text-sm sm:text-base">
              Your information is used to provide and improve our services, communicate with you, and ensure platform security.
            </p>
          </div>
        </section>

        <section id="security" className="bg-white dark:bg-gray-800 p-4 sm:p-6 md:p-8 rounded-xl shadow-sm">
          <div className="flex items-center mb-4 sm:mb-6">
            <Shield className="h-6 w-6 sm:h-8 sm:w-8 text-blue-500 mr-2 sm:mr-3 flex-shrink-0" />
            <h2 className="text-xl sm:text-2xl font-bold">Security</h2>
          </div>
          <div className="prose max-w-none">
            <p className="text-gray-600 dark:text-gray-400 mb-3 sm:mb-4 text-sm sm:text-base">
              We implement industry-standard security measures to protect your data and ensure platform integrity.
            </p>
            <h3 className="text-lg sm:text-xl font-semibold mb-2">Data Protection</h3>
            <p className="text-gray-600 dark:text-gray-400 mb-3 sm:mb-4 text-sm sm:text-base">
              All data is encrypted in transit and at rest. We regularly audit our security measures to ensure your information remains protected.
            </p>
            <h3 className="text-lg sm:text-xl font-semibold mb-2">Incident Response</h3>
            <p className="text-gray-600 dark:text-gray-400 text-sm sm:text-base">
              We have comprehensive procedures in place to respond to and resolve any security incidents promptly.
            </p>
          </div>
        </section>
      </div>
    </main>
  );
}

export default Legal;