import React from 'react';
import { Calendar, Star, Users } from 'lucide-react';

function WhatsNew() {
  return (
    <main className="container mx-auto px-6 py-12">
      <h1 className="text-4xl font-bold mb-2">What's New</h1>
      <div className="h-1 w-20 bg-blue-500 mb-8"></div>
      
      <div className="grid gap-8 md:grid-cols-2 lg:grid-cols-3">
        {[
          {
            title: "Enhanced Event Analytics",
            description: "Get deeper insights into your event performance with our new analytics dashboard.",
            icon: <Star className="h-6 w-6 text-blue-500" />,
            date: "March 2025"
          },
          {
            title: "Co-host Collaboration",
            description: "Now you can add multiple hosts to your events for better organization.",
            icon: <Users className="h-6 w-6 text-blue-500" />,
            date: "February 2025"
          },
          {
            title: "Calendar Integration",
            description: "Seamlessly sync your events with popular calendar applications.",
            icon: <Calendar className="h-6 w-6 text-blue-500" />,
            date: "January 2025"
          }
        ].map((feature, index) => (
          <div key={index} className="bg-white p-6 rounded-xl shadow-sm hover:shadow-md transition-shadow">
            <div className="bg-blue-50 w-12 h-12 rounded-lg flex items-center justify-center mb-4">
              {feature.icon}
            </div>
            <h3 className="text-xl font-semibold mb-2">{feature.title}</h3>
            <p className="text-gray-600 mb-4">{feature.description}</p>
            <p className="text-sm text-blue-500">{feature.date}</p>
          </div>
        ))}
      </div>
    </main>
  );
}

export default WhatsNew;