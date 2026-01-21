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
    <main className="container mx-auto px-4 sm:px-6 py-8 sm:py-12">
      <h1 className="text-2xl sm:text-3xl md:text-4xl font-bold mb-2 text-text-light-primary dark:text-text-dark-primary">Lessgo Blog</h1>
      <div className="h-1 w-16 sm:w-20 bg-secondary-accent mb-6 sm:mb-8"></div>

      <div className="grid gap-6 sm:gap-8 md:gap-12 grid-cols-1 sm:grid-cols-2 lg:grid-cols-3">
        {posts.map((post, index) => (
          <div key={index} className="bg-bg-light-secondary dark:bg-bg-dark-secondary rounded-xl overflow-hidden shadow-sm hover:shadow-md transition-shadow flex flex-col">
            <img src={post.image} alt={post.title} className="w-full h-40 sm:h-48 object-cover" />
            <div className="p-4 sm:p-6 flex flex-col flex-grow">
              <h3 className="text-lg sm:text-xl font-semibold mb-2 sm:mb-3 text-text-light-primary dark:text-text-dark-primary line-clamp-2">{post.title}</h3>
              <div className="flex flex-wrap items-center gap-3 sm:gap-4 text-xs sm:text-sm text-text-light-secondary dark:text-text-dark-secondary mb-3 sm:mb-4">
                <div className="flex items-center">
                  <Calendar className="h-3.5 w-3.5 sm:h-4 sm:w-4 mr-1 sm:mr-1.5 flex-shrink-0" />
                  <span>{post.date}</span>
                </div>
                <div className="flex items-center">
                  <User className="h-3.5 w-3.5 sm:h-4 sm:w-4 mr-1 sm:mr-1.5 flex-shrink-0" />
                  <span>{post.author}</span>
                </div>
              </div>
              <p className="text-sm sm:text-base text-text-light-secondary dark:text-text-dark-secondary mb-3 sm:mb-4 flex-grow line-clamp-3">{post.excerpt}</p>
              <a href="#" className="btn-animated-fill self-start text-sm sm:text-base py-2">Read More →</a>
            </div>
          </div>
        ))}
      </div>
    </main>
  );
}

export default Blog;
