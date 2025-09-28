import { Calendar, Users, MapPin, Clock, Sparkles } from 'lucide-react';

function Home() {
  return (
    <div className="min-h-screen">
      {/* Hero Section */}
      <section className="hero-gradient relative py-20 lg:py-32 px-6">
        <div className="container mx-auto max-w-6xl">
          <div className="text-center space-y-8 animate-fade-in-up">
            {/* Hero Badge */}
            <div className="inline-flex items-center space-x-2 event-badge">
              <Sparkles className="h-4 w-4" />
              <span>Hangouts made easy!</span>
            </div>

            {/* Main Heading */}
            <div className="space-y-6">
              <h1 className="text-5xl sm:text-6xl lg:text-7xl font-bold leading-tight">
                <span className="text-gradient">Party is on you</span>
                <br />
                <span className="text-primary">managing is on us</span>
              </h1>
              
              <p className="text-xl sm:text-2xl leading-relaxed max-w-3xl mx-auto text-secondary">
                Connect with your community through meaningful experiences. 
                From workshops to concerts, find events that inspire you.
              </p>
            </div>

            {/* CTA Section */}
            <div className="flex flex-col sm:flex-row gap-4 justify-center items-center pt-8">
              <a 
                href="https://play.google.com/store/apps/details?id=com.lessgo.app" 
                target="_blank" 
                rel="noopener noreferrer"
                className="store-button store-button-playstore flex items-center space-x-3 px-8 py-4 text-lg no-underline"
              >
                <svg className="h-6 w-6" viewBox="0 0 24 24" fill="currentColor">
                  <path d="M3,20.5V3.5C3,2.91 3.34,2.39 3.84,2.15L13.69,12L3.84,21.85C3.34,21.61 3,21.09 3,20.5M16.81,15.12L6.05,21.34L14.54,12.85L16.81,15.12M20.16,10.81C20.5,11.08 20.75,11.5 20.75,12C20.75,12.5 20.53,12.92 20.18,13.18L17.89,14.5L15.39,12L17.89,9.5L20.16,10.81M6.05,2.66L16.81,8.88L14.54,11.15L6.05,2.66Z"/>
                </svg>
                <span>Get it from Play Store</span>
              </a>
              
              <a 
                href="https://apps.apple.com/app/lessgo/id123456789" 
                target="_blank" 
                rel="noopener noreferrer"
                className="store-button store-button-appstore flex items-center space-x-3 px-8 py-4 text-lg no-underline"
              >
                <svg className="h-6 w-6" viewBox="0 0 24 24" fill="currentColor">
                  <path d="M18.71,19.5C17.88,20.74 17,21.95 15.66,21.97C14.32,22 13.89,21.18 12.37,21.18C10.84,21.18 10.37,21.95 9.1,22C7.79,22.05 6.8,20.68 5.96,19.47C4.25,17 2.94,12.45 4.7,9.39C5.57,7.87 7.13,6.91 8.82,6.88C10.1,6.86 11.32,7.75 12.11,7.75C12.89,7.75 14.37,6.68 15.92,6.84C16.57,6.87 18.39,7.1 19.56,8.82C19.47,8.88 17.39,10.1 17.41,12.63C17.44,15.65 20.06,16.66 20.09,16.67C20.06,16.74 19.67,18.11 18.71,19.5M13,3.5C13.73,2.67 14.94,2.04 15.94,2C16.07,3.17 15.6,4.35 14.9,5.19C14.21,6.04 13.07,6.7 11.95,6.61C11.8,5.46 12.36,4.26 13,3.5Z"/>
                </svg>
                <span>Get it from App Store</span>
              </a>
            </div>
          </div>
        </div>
      </section>

      {/* Features Section */}
      <section className="py-20 px-6 bg-secondary">
        <div className="container mx-auto max-w-6xl">
          <div className="text-center mb-16">
            <h2 className="text-3xl lg:text-4xl font-bold mb-4 text-primary">
              Everything you need for great events
            </h2>
            <p className="text-lg max-w-2xl mx-auto text-secondary">
              From discovery to management, we've got you covered with powerful tools
              that make event planning delightful.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            <div className="luma-card text-center space-y-4 animate-scale-in">
              <div className="feature-icon-bg-location w-16 h-16 mx-auto rounded-full flex items-center justify-center">
                <MapPin className="h-8 w-8 icon-location" />
              </div>
              <h3 className="text-xl font-semibold text-primary">
                Location Discovery
              </h3>
              <p className="text-secondary">
                Find events happening near you with intelligent location-based recommendations.
              </p>
            </div>

            <div className="luma-card text-center space-y-4 animate-scale-in animation-delay-100">
              <div className="feature-icon-bg-community w-16 h-16 mx-auto rounded-full flex items-center justify-center">
                <Users className="h-8 w-8 icon-community" />
              </div>
              <h3 className="text-xl font-semibold text-primary">
                Community Building
              </h3>
              <p className="text-secondary">
                Connect with like-minded people and build lasting relationships through shared experiences.
              </p>
            </div>

            <div className="luma-card text-center space-y-4 animate-scale-in animation-delay-200">
              <div className="feature-icon-bg-scheduling w-16 h-16 mx-auto rounded-full flex items-center justify-center">
                <Clock className="h-8 w-8 icon-scheduling" />
              </div>
              <h3 className="text-xl font-semibold text-primary">
                Smart Scheduling
              </h3>
              <p className="text-secondary">
                AI-powered scheduling that finds the perfect time for everyone to attend.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* Featured Events Section */}
      <section className="py-20 px-6">
        <div className="container mx-auto max-w-6xl">
          <div className="flex items-center justify-between mb-12">
            <div>
              <h2 className="text-3xl lg:text-4xl font-bold mb-2 text-primary">
                Featured Events
              </h2>
              <p className="text-lg text-secondary">
                Don't miss these amazing upcoming events
              </p>
            </div>
            <button className="luma-button luma-button-secondary">
              View All Events
            </button>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {/* Event Card 1 */}
            <div className="event-card animate-fade-in-up">
              <div className="event-card-image event-card-tech">
                <div className="flex items-center justify-center h-full">
                  <Calendar className="h-12 w-12 text-white" />
                </div>
              </div>
              <div className="event-card-content">
                <div className="event-badge mb-3">Tech Meetup</div>
                <h3 className="text-lg font-semibold mb-2 text-primary">
                  React Developer Meetup
                </h3>
                <p className="text-sm mb-4 text-secondary">
                  Join fellow developers for an evening of React best practices and networking.
                </p>
                <div className="flex items-center justify-between text-sm text-muted">
                  <span>Dec 15, 2024</span>
                  <span>32 attending</span>
                </div>
              </div>
            </div>

            {/* Event Card 2 */}
            <div className="event-card animate-fade-in-up animation-delay-100">
              <div className="event-card-image event-card-workshop">
                <div className="flex items-center justify-center h-full">
                  <Users className="h-12 w-12 text-white" />
                </div>
              </div>
              <div className="event-card-content">
                <div className="event-badge mb-3">Workshop</div>
                <h3 className="text-lg font-semibold mb-2 text-primary">
                  Design Thinking Workshop
                </h3>
                <p className="text-sm mb-4 text-secondary">
                  Learn the fundamentals of design thinking and apply them to real projects.
                </p>
                <div className="flex items-center justify-between text-sm text-muted">
                  <span>Dec 18, 2024</span>
                  <span>18 attending</span>
                </div>
              </div>
            </div>

            {/* Event Card 3 */}
            <div className="event-card animate-fade-in-up animation-delay-200">
              <div className="event-card-image event-card-social">
                <div className="flex items-center justify-center h-full">
                  <MapPin className="h-12 w-12 text-white" />
                </div>
              </div>
              <div className="event-card-content">
                <div className="event-badge mb-3">Social</div>
                <h3 className="text-lg font-semibold mb-2 text-primary">
                  Coffee & Networking
                </h3>
                <p className="text-sm mb-4 text-secondary">
                  Casual networking event over coffee for local entrepreneurs and freelancers.
                </p>
                <div className="flex items-center justify-between text-sm text-muted">
                  <span>Dec 20, 2024</span>
                  <span>24 attending</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="py-20 px-6 bg-secondary">
        <div className="container mx-auto max-w-4xl text-center">
          <div className="luma-card luma-card-elevated space-y-8">
            <div className="space-y-4">
              <h2 className="text-3xl lg:text-4xl font-bold text-primary">
                Ready to create your next event?
              </h2>
              <p className="text-lg max-w-2xl mx-auto text-secondary">
                Join thousands of event organizers who trust Lessgo to bring their communities together.
              </p>
            </div>
            
            <div className="flex flex-col sm:flex-row gap-4 justify-center">
              <button className="luma-button luma-button-primary flex items-center space-x-2 px-8 py-4">
                <Calendar className="h-5 w-5" />
                <span>Create Your First Event</span>
              </button>
              
              <button className="luma-button luma-button-secondary px-8 py-4">
                Learn More
              </button>
            </div>
          </div>
        </div>
      </section>
    </div>
  );
}

export default Home;
