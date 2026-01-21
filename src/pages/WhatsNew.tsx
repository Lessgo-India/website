import React from 'react';
import { Calendar, Star, Users } from 'lucide-react';

function WhatsNew() {
  return (
    <main className="container mx-auto px-4 sm:px-6 py-8 sm:py-12">
      <h1 className="text-2xl sm:text-3xl md:text-4xl font-bold mb-2">What's New</h1>
      <div className="h-1 w-16 sm:w-20 bg-blue-500 mb-6 sm:mb-8"></div>
      
      <div className="grid gap-4 sm:gap-6 md:gap-8 grid-cols-1 sm:grid-cols-2 lg:grid-cols-3">
        {[
          {
            title: "Enhanced Event Analytics",
            description: "Get deeper insights into your event performance with our new analytics dashboard.",
            icon: <Star className="h-5 w-5 sm:h-6 sm:w-6 text-blue-500" />,
            date: "March 2025"
          },
          {
            title: "Co-host Collaboration",
            description: "Now you can add multiple hosts to your events for better organization.",
            icon: <Users className="h-5 w-5 sm:h-6 sm:w-6 text-blue-500" />,
            date: "February 2025"
          },
          {
            title: "Calendar Integration",
            description: "Seamlessly sync your events with popular calendar applications.",
            icon: <Calendar className="h-5 w-5 sm:h-6 sm:w-6 text-blue-500" />,
            date: "January 2025"
          }
        ].map((feature, index) => (
          <div key={index} className="bg-white dark:bg-gray-800 p-4 sm:p-6 rounded-xl shadow-sm hover:shadow-md transition-shadow">
            <div className="bg-blue-50 dark:bg-gray-700 w-10 h-10 sm:w-12 sm:h-12 rounded-lg flex items-center justify-center mb-3 sm:mb-4">
              {feature.icon}
            </div>
            <h3 className="text-lg sm:text-xl font-semibold mb-2">{feature.title}</h3>
            <p className="text-gray-600 dark:text-gray-400 mb-3 sm:mb-4 text-sm sm:text-base">{feature.description}</p>
            <p className="text-xs sm:text-sm text-blue-500">{feature.date}</p>
          </div>
        ))}
      </div>
    </main>
  );
}

export default WhatsNew;