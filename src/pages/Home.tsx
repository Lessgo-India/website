import { Calendar } from 'lucide-react';

function Home() {
  return (
    <main className="container mx-auto px-6 grid grid-cols-1 lg:grid-cols-2 gap-8 lg:gap-12 py-8 lg:py-12 items-center"> {/* items-center helps vertically align grid items */}
      {/* Left Column - justify-center handles vertical centering */}
      <div className="flex flex-col justify-center lg:min-h-[650px]"> 
        <h1 className="text-3xl xs:text-4xl sm:text-5xl lg:text-6xl font-bold text-text-light-primary dark:text-text-dark-primary mb-2 animate-slide-in-left-fast">
          Hangouts
        </h1>
        <h2 className="text-3xl xs:text-4xl sm:text-5xl lg:text-6xl font-bold mb-6 animate-slide-in-left-medium">
          <span className="bg-gradient-to-r from-secondary-accent to-blue-600 bg-clip-text text-transparent">
            made easy
          </span>
          <span className="text-secondary-accent">!</span>
        </h2>
        <p className="text-lg sm:text-xl leading-relaxed text-text-light-secondary dark:text-text-dark-secondary mb-8 max-w-lg animate-slide-in-left-slow">
          Manage your Trips, Plans and Hangouts at ease. <br />Detail's on us, Fun's on you!
        </p>
        <div className="flex flex-col sm:flex-row gap-4 animate-slide-in-bottom-buttons w-full sm:w-auto">
          <button className="relative btn-animated-fill text-lg w-full sm:w-auto">
            <div className="relative flex items-center justify-center">
              <img src="https://upload.wikimedia.org/wikipedia/commons/6/67/App_Store_%28iOS%29.svg" alt="App Store" className="w-6 h-6 mr-3" />
              <span>Download on App Store</span>
            </div>
          </button>
          <button className="relative btn-animated-fill text-lg w-full sm:w-auto">
            <div className="relative flex items-center justify-center">
              <img src="https://upload.wikimedia.org/wikipedia/commons/d/d0/Google_Play_Arrow_logo.svg" alt="Play Store" className="w-6 h-6 mr-3" />
              <span>Get it on Play Store</span>
            </div>
          </button>
        </div>
      </div>

      {/* Right Column */}
      <div className="relative flex items-center justify-center lg:min-h-[650px]"> 
        
        {/* Decorative Background Elements - Updated and New */}
        {/* Existing Light Mode - changed to new decorative color */}
        <div className="absolute top-10 left-10 w-32 h-32 bg-decorative-accent-4/30 rounded-full blur-xl animate-fade-in-delay-0_2s animate-float"></div>
        {/* Existing Light Mode - no change to color, only ensuring it's there */}
        <div className="absolute bottom-10 right-10 w-40 h-40 bg-gradient-to-tl from-teal-200 to-lime-200 rounded-full opacity-30 blur-lg dark:hidden animate-fade-in-delay-0_4s animate-pulse-subtle"></div>
        {/* Existing Solid color elements */}
        <div className="absolute top-1/4 right-5 w-8 h-8 bg-yellow-300 rounded-md transform rotate-12 opacity-40 dark:hidden animate-fade-in-delay-0_6s animate-float hidden sm:block"></div>
        <div className="absolute bottom-1/4 left-5 w-10 h-10 bg-orange-300 rounded-full opacity-40 dark:hidden animate-fade-in-delay-0_8s animate-pulse-subtle"></div>

        {/* Existing Dark Mode - changed to new decorative color (same as light mode change for consistency) */}
        <div className="absolute top-10 left-10 w-32 h-32 bg-decorative-accent-4/30 rounded-full blur-xl hidden dark:block animate-fade-in-delay-0_2s animate-float"></div>
         {/* Existing Dark Mode - no change to color, only ensuring it's there */}
        <div className="absolute bottom-10 right-10 w-40 h-40 bg-gradient-to-tl from-teal-800 to-green-900 rounded-full opacity-30 blur-lg hidden dark:block animate-fade-in-delay-0_4s animate-pulse-subtle"></div>
        {/* Existing Solid color elements */}
        <div className="absolute top-1/4 right-5 w-8 h-8 bg-yellow-600 rounded-md transform rotate-12 opacity-40 hidden dark:block animate-fade-in-delay-0_6s animate-float hidden sm:block"></div>
        <div className="absolute bottom-1/4 left-5 w-10 h-10 bg-orange-700 rounded-full opacity-40 hidden dark:block animate-fade-in-delay-0_8s animate-pulse-subtle"></div>

        {/* New Decorative Circles - Visible in both light and dark modes */}
        <div className="absolute top-1/2 left-1/4 w-20 h-20 bg-decorative-accent-1/30 rounded-full blur-2xl animate-fade-in-delay-0_3s animate-pulse-subtle hidden sm:block"></div>
        <div className="absolute bottom-1/3 right-1/3 w-28 h-28 bg-decorative-accent-2/40 rounded-full blur-xl animate-fade-in-delay-0_5s animate-float"></div>
        <div className="absolute top-20 right-1/3 w-24 h-24 bg-decorative-accent-3/30 rounded-full blur-2xl animate-fade-in-delay-0_7s animate-pulse-subtle"></div>
        
        {/* Emojis for Light Mode */}
        <span className="absolute top-16 right-20 text-4xl opacity-80 transform -rotate-12 dark:hidden animate-fade-in-delay-0s animate-float">🎉</span>
        <span className="absolute bottom-16 left-20 text-4xl opacity-80 transform rotate-12 dark:hidden animate-fade-in-delay-0_2s animate-pulse-subtle">☀️</span>
        <span className="absolute bottom-32 right-1/4 text-3xl opacity-70 dark:hidden animate-fade-in-delay-0_4s animate-float">🚀</span>
        <span className="absolute top-1/3 left-1/4 text-3xl opacity-70 dark:hidden animate-fade-in-delay-0_6s">✨</span>
        <span className="absolute top-5 left-1/2 text-3xl opacity-70 transform -translate-x-1/2 dark:hidden animate-fade-in-delay-0_8s animate-pulse-subtle">🎈</span>
        {/* Pizza emoji removed as per implied instruction to make space for new emojis */}
        <span className="absolute top-1/2 -left-5 text-4xl opacity-80 transform -translate-y-1/2 -rotate-15 dark:hidden animate-fade-in-delay-0_4s animate-float">🏖️</span>
        <span className="absolute top-1/2 -right-5 text-4xl opacity-80 transform -translate-y-1/2 rotate-15 dark:hidden animate-fade-in-delay-0_6s animate-pulse-subtle">🎵</span>
        <span className="absolute top-3/4 left-10 text-3xl opacity-70 dark:hidden animate-fade-in-delay-0_8s">🗺️</span>
        <span className="absolute bottom-1/3 right-10 text-3xl opacity-70 dark:hidden animate-fade-in-delay-1s animate-float">📸</span>

        {/* Emojis for Dark Mode */}
        <span className="absolute top-16 right-20 text-4xl opacity-80 transform -rotate-12 hidden dark:block animate-fade-in-delay-0s animate-float">🌌</span>
        <span className="absolute bottom-16 left-20 text-4xl opacity-80 transform rotate-12 hidden dark:block animate-fade-in-delay-0_2s animate-pulse-subtle">🌙</span>
        <span className="absolute bottom-32 right-1/4 text-3xl opacity-70 hidden dark:block animate-fade-in-delay-0_4s animate-float">🌟</span>
        <span className="absolute top-1/3 left-1/4 text-3xl opacity-70 hidden dark:block animate-fade-in-delay-0_6s">💫</span>
        <span className="absolute top-5 left-1/2 text-3xl opacity-70 transform -translate-x-1/2 hidden dark:block animate-fade-in-delay-0_8s animate-pulse-subtle">🌠</span>
        {/* Second dark mode Pizza equivalent (🌌) removed */}
        <span className="absolute top-1/2 -left-5 text-4xl opacity-80 transform -translate-y-1/2 -rotate-15 hidden dark:block animate-fade-in-delay-0_4s animate-float">🌃</span>
        <span className="absolute top-1/2 -right-5 text-4xl opacity-80 transform -translate-y-1/2 rotate-15 hidden dark:block animate-fade-in-delay-0_6s animate-pulse-subtle">🎶</span>
        <span className="absolute top-3/4 left-10 text-3xl opacity-70 hidden dark:block animate-fade-in-delay-0_8s">🌉</span>
        <span className="absolute bottom-1/3 right-10 text-3xl opacity-70 hidden dark:block animate-fade-in-delay-1s animate-float">📷</span>

        {/* Inner Ring - New Emojis */}
        <span className="absolute top-1/3 right-1/4 text-3xl opacity-70 transform translate-x-4 -translate-y-4 rotate-10 animate-fade-in-delay-0_2s animate-pulse-subtle">😊</span>
        <span className="absolute bottom-1/3 left-1/4 text-3xl opacity-70 transform -translate-x-4 translate-y-4 -rotate-10 animate-fade-in-delay-0_4s animate-float">🚗</span>
        <span className="absolute top-2/3 left-1/3 text-3xl opacity-70 transform -translate-x-4 -translate-y-4 animate-fade-in-delay-0_6s animate-pulse-subtle">🐶</span>
        <span className="absolute bottom-2/3 right-1/3 text-3xl opacity-70 transform translate-x-4 translate-y-4 rotate-12 animate-fade-in-delay-0_8s hidden sm:inline-block">🥳</span>
        <span className="absolute top-1/4 left-1/3 text-2xl opacity-60 animate-fade-in-delay-1s animate-float">⭐</span>
        <span className="absolute bottom-1/4 right-1/3 text-2xl opacity-60 animate-fade-in-delay-0_2s">🍔</span>
        
        {/* New Emojis - Visible in both light and dark modes */}
        <span className="absolute bottom-5 right-1/2 text-4xl opacity-75 transform translate-x-3/4 rotate-12 animate-fade-in-delay-0_9s animate-float">💖</span>
        <span className="absolute top-1/3 right-10 text-3xl opacity-70 transform -translate-y-1/2 animate-fade-in-delay-0_7s animate-pulse-subtle">💡</span>
        <span className="absolute bottom-1/4 left-10 text-4xl opacity-75 transform -rotate-6 animate-fade-in-delay-0_5s animate-float hidden sm:inline-block">🧭</span>


        {/* Image Card Container */}
        <div className="relative p-4 w-full max-w-sm z-10 animate-scale-up-fade-in-delayed"> 
          <div className="rounded-3xl shadow-2xl backdrop-blur-xl bg-bg-light-secondary/75 dark:bg-bg-dark-secondary/75 overflow-hidden transform rotate-3 h-[400px] xs:h-[450px] sm:h-[500px] lg:h-[600px] flex items-center justify-center">
            <img
              src="https://lessgo-asset.s3.ap-south-1.amazonaws.com/images/event_screen.jpg"
              alt="Hangout illustration"
              className="w-full h-full object-contain" 
            />
          </div>
        </div>
      </div>
    </main>
  );
}

export default Home;