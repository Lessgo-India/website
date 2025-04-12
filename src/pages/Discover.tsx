import { MapPin, Calendar, Users } from 'lucide-react';

function Discover() {
  const events = [
    {
      title: "Tech Conference 2025",
      image: "https://images.unsplash.com/photo-1540575467063-178a50c2df87?auto=format&fit=crop&w=800&q=80",
      date: "Apr 15",
      location: "San Francisco",
      attendees: 1200
    },
    {
      title: "Music Festival",
      image: "https://images.unsplash.com/photo-1533174072545-7a4b6ad7a6c3?auto=format&fit=crop&w=800&q=80",
      date: "May 20",
      location: "Los Angeles",
      attendees: 5000
    },
    {
      title: "Food & Wine Expo",
      image: "https://images.unsplash.com/photo-1510812431401-41d2bd2722f3?auto=format&fit=crop&w=800&q=80",
      date: "Jun 10",
      location: "New York",
      attendees: 800
    }
  ];

  return (
    <main className="container mx-auto px-6 py-12">
      <h1 className="text-4xl font-bold mb-2">Discover Events</h1>
      <div className="h-1 w-20 bg-blue-500 mb-8"></div>

      <div className="grid gap-8 md:grid-cols-2 lg:grid-cols-3">
        {events.map((event, index) => (
          <div key={index} className="bg-white rounded-xl overflow-hidden shadow-sm hover:shadow-md transition-shadow">
            <img src={event.image} alt={event.title} className="w-full h-48 object-cover" />
            <div className="p-6">
              <h3 className="text-xl font-semibold mb-4">{event.title}</h3>
              <div className="flex items-center space-x-4 text-gray-600">
                <div className="flex items-center">
                  <Calendar className="h-4 w-4 mr-2 text-blue-500" />
                  {event.date}
                </div>
                <div className="flex items-center">
                  <MapPin className="h-4 w-4 mr-2 text-blue-500" />
                  {event.location}
                </div>
                <div className="flex items-center">
                  <Users className="h-4 w-4 mr-2 text-blue-500" />
                  {event.attendees}
                </div>
              </div>
            </div>
          </div>
        ))}
      </div>
    </main>
  );
}

export default Discover;