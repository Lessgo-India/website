import React from 'react';
import { Shield, Lock, FileText } from 'lucide-react';

function Legal() {
  return (
    <main className="container mx-auto px-6 py-12">
      <h1 className="text-4xl font-bold mb-2">Legal Information</h1>
      <div className="h-1 w-20 bg-blue-500 mb-8"></div>

      <div className="max-w-4xl mx-auto space-y-12">
        <section id="terms" className="bg-white p-8 rounded-xl shadow-sm">
          <div className="flex items-center mb-6">
            <FileText className="h-8 w-8 text-blue-500 mr-3" />
            <h2 className="text-2xl font-bold">Terms of Service</h2>
          </div>
          <div className="prose max-w-none">
            <p className="text-gray-600 mb-4">
              By using Lessgo's services, you agree to these terms, which are designed to make clear what we expect from our users and what you can expect from us.
            </p>
            <h3 className="text-xl font-semibold mb-2">1. Account Terms</h3>
            <p className="text-gray-600 mb-4">
              You must be 13 years or older to use this service. You must provide accurate information when creating your account.
            </p>
            <h3 className="text-xl font-semibold mb-2">2. Event Creation</h3>
            <p className="text-gray-600">
              Events must comply with local laws and regulations. Lessgo reserves the right to remove events that violate our policies.
            </p>
          </div>
        </section>

        <section id="privacy" className="bg-white p-8 rounded-xl shadow-sm">
          <div className="flex items-center mb-6">
            <Lock className="h-8 w-8 text-blue-500 mr-3" />
            <h2 className="text-2xl font-bold">Privacy Policy</h2>
          </div>
          <div className="prose max-w-none">
            <p className="text-gray-600 mb-4">
              We take your privacy seriously. This policy explains how we collect, use, and protect your personal information.
            </p>
            <h3 className="text-xl font-semibold mb-2">Data Collection</h3>
            <p className="text-gray-600 mb-4">
              We collect information you provide directly to us, including your name, email address, and event details.
            </p>
            <h3 className="text-xl font-semibold mb-2">Data Usage</h3>
            <p className="text-gray-600">
              Your information is used to provide and improve our services, communicate with you, and ensure platform security.
            </p>
          </div>
        </section>

        <section id="security" className="bg-white p-8 rounded-xl shadow-sm">
          <div className="flex items-center mb-6">
            <Shield className="h-8 w-8 text-blue-500 mr-3" />
            <h2 className="text-2xl font-bold">Security</h2>
          </div>
          <div className="prose max-w-none">
            <p className="text-gray-600 mb-4">
              We implement industry-standard security measures to protect your data and ensure platform integrity.
            </p>
            <h3 className="text-xl font-semibold mb-2">Data Protection</h3>
            <p className="text-gray-600 mb-4">
              All data is encrypted in transit and at rest. We regularly audit our security measures to ensure your information remains protected.
            </p>
            <h3 className="text-xl font-semibold mb-2">Incident Response</h3>
            <p className="text-gray-600">
              We have comprehensive procedures in place to respond to and resolve any security incidents promptly.
            </p>
          </div>
        </section>
      </div>
    </main>
  );
}

export default Legal;