import React from 'react';
import { Calendar, User } from 'lucide-react';

function Blog() {
  const posts = [
    {
      title: "Planning the Perfect Weekend Getaway",
      image: "https://images.unsplash.com/photo-1501785888041-af3ef285b470?auto=format&fit=crop&w=800&q=80",
      date: "March 15, 2025",
      author: "Alex Johnson",
      excerpt: "Discover tips and tricks for organizing a stress-free and memorable weekend trip with friends or family using Lessgo."
    },
    {
      title: "Top 5 Features You Might Not Know About Lessgo",
      image: "https://images.unsplash.com/photo-1516321497487-e288fb19713f?auto=format&fit=crop&w=800&q=80",
      date: "March 1, 2025",
      author: "Maria Garcia",
      excerpt: "Unlock the full potential of Lessgo! We dive into some powerful features that can make your event planning even easier."
    },
    {
      title: "Community Spotlight: How Lessgo Helped Plan a Charity Event",
      image: "https://images.unsplash.com/photo-1593113598332-cd288d649433?auto=format&fit=crop&w=800&q=80",
      date: "February 20, 2025",
      author: "Lessgo Team",
      excerpt: "Read about how a local community group used Lessgo to successfully organize their annual fundraising gala."
    }
  ];

  return (
    <main className="container mx-auto px-6 py-12">
      <h1 className="text-4xl font-bold mb-2">Lessgo Blog</h1>
      <div className="h-1 w-20 bg-blue-500 mb-8"></div>

      <div className="grid gap-12 md:grid-cols-2 lg:grid-cols-3">
        {posts.map((post, index) => (
          <div key={index} className="bg-white rounded-xl overflow-hidden shadow-sm hover:shadow-md transition-shadow flex flex-col">
            <img src={post.image} alt={post.title} className="w-full h-48 object-cover" />
            <div className="p-6 flex flex-col flex-grow">
              <h3 className="text-xl font-semibold mb-3">{post.title}</h3>
              <div className="flex items-center space-x-4 text-sm text-gray-500 mb-4">
                <div className="flex items-center">
                  <Calendar className="h-4 w-4 mr-1.5" />
                  {post.date}
                </div>
                <div className="flex items-center">
                  <User className="h-4 w-4 mr-1.5" />
                  {post.author}
                </div>
              </div>
              <p className="text-gray-600 mb-4 flex-grow">{post.excerpt}</p>
              <a href="#" className="text-blue-500 hover:text-blue-600 font-medium self-start">Read More →</a>
            </div>
          </div>
        ))}
      </div>
    </main>
  );
}

export default Blog;
