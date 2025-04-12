import { Calendar } from 'lucide-react';

function Home() {
  return (
    <main className="container mx-auto px-6 grid grid-cols-1 lg:grid-cols-2 gap-12 py-12 items-center"> {/* items-center helps vertically align grid items */}
      {/* Left Column - justify-center handles vertical centering */}
      <div className="flex flex-col justify-center min-h-[650px]"> 
        <h1 className="text-6xl font-bold text-gray-900 mb-2">
          Hangouts
        </h1>
        <h2 className="text-6xl font-bold mb-6">
          <span className="bg-gradient-to-r from-blue-500 to-blue-600 bg-clip-text text-transparent">
            made easy
          </span>
          <span className="text-blue-500">!</span>
        </h2>
        <p className="text-xl text-gray-600 mb-8 max-w-lg">
          Manage your Trips, Plans and Hangouts at ease. <br />Detail's on us, Fun's on you!
        </p>
        <div className="flex flex-col sm:flex-row gap-4">
          <button className="group relative bg-gradient-to-r from-blue-500 to-blue-700 text-white px-8 py-4 rounded-full text-lg font-medium transition-all duration-300 hover:scale-105 hover:shadow-[0_0_30px_rgba(59,130,246,0.5)] overflow-hidden">
            <div className="absolute inset-0 bg-gradient-to-r from-blue-600 to-blue-800 opacity-0 group-hover:opacity-100 transition-opacity duration-300"></div>
            <div className="relative flex items-center justify-center">
              <img src="https://upload.wikimedia.org/wikipedia/commons/6/67/App_Store_%28iOS%29.svg" alt="App Store" className="w-6 h-6 mr-3" />
              <span>Download on App Store</span>
            </div>
          </button>
          <button className="group relative bg-gradient-to-r from-blue-500 to-blue-700 text-white px-8 py-4 rounded-full text-lg font-medium transition-all duration-300 hover:scale-105 hover:shadow-[0_0_30px_rgba(59,130,246,0.5)] overflow-hidden">
            <div className="absolute inset-0 bg-gradient-to-r from-blue-600 to-blue-800 opacity-0 group-hover:opacity-100 transition-opacity duration-300"></div>
            <div className="relative flex items-center justify-center">
              <img src="https://upload.wikimedia.org/wikipedia/commons/d/d0/Google_Play_Arrow_logo.svg" alt="Play Store" className="w-6 h-6 mr-3" />
              <span>Get it on Play Store</span>
            </div>
          </button>
        </div>
      </div>

      {/* Right Column */}
      <div className="relative flex items-center justify-center min-h-[650px]"> 
        
        {/* Decorative Background Elements */}
        {/* Gradient Circle 1 */}
        <div className="absolute top-10 left-10 w-32 h-32 bg-gradient-to-br from-pink-300 to-purple-300 rounded-full opacity-50 blur-xl"></div>
        {/* Gradient Circle 2 */}
        <div className="absolute bottom-10 right-10 w-40 h-40 bg-gradient-to-tl from-teal-200 to-lime-200 rounded-full opacity-40 blur-lg"></div>
        {/* Small Shape 1 */}
        <div className="absolute top-1/4 right-5 w-8 h-8 bg-yellow-300 rounded-md transform rotate-12 opacity-70"></div>
        {/* Small Shape 2 */}
        <div className="absolute bottom-1/4 left-5 w-10 h-10 bg-orange-300 rounded-full opacity-60"></div>
        
        {/* Emojis */}
        {/* Outer Ring */}
        <span className="absolute top-16 right-20 text-4xl opacity-80 transform -rotate-12">🎉</span>
        <span className="absolute bottom-16 left-20 text-4xl opacity-80 transform rotate-12">☀️</span>
        <span className="absolute bottom-32 right-1/4 text-3xl opacity-70">🚀</span>
        <span className="absolute top-1/3 left-1/4 text-3xl opacity-70">✨</span>
        <span className="absolute top-5 left-1/2 text-3xl opacity-70 transform -translate-x-1/2">🎈</span>
        <span className="absolute bottom-5 right-1/2 text-3xl opacity-70 transform translate-x-1/2 rotate-6">🍕</span>
        <span className="absolute top-1/2 -left-5 text-4xl opacity-80 transform -translate-y-1/2 -rotate-15">🏖️</span>
        <span className="absolute top-1/2 -right-5 text-4xl opacity-80 transform -translate-y-1/2 rotate-15">🎵</span>
        <span className="absolute top-3/4 left-10 text-3xl opacity-70">🗺️</span>
        <span className="absolute bottom-1/3 right-10 text-3xl opacity-70">📸</span>

        {/* Inner Ring - New Emojis */}
        <span className="absolute top-1/3 right-1/4 text-3xl opacity-70 transform translate-x-4 -translate-y-4 rotate-10">😊</span>
        <span className="absolute bottom-1/3 left-1/4 text-3xl opacity-70 transform -translate-x-4 translate-y-4 -rotate-10">🚗</span>
        <span className="absolute top-2/3 left-1/3 text-3xl opacity-70 transform -translate-x-4 -translate-y-4">🐶</span>
        <span className="absolute bottom-2/3 right-1/3 text-3xl opacity-70 transform translate-x-4 translate-y-4 rotate-12">🥳</span>
        <span className="absolute top-1/4 left-1/3 text-2xl opacity-60">⭐</span>
        <span className="absolute bottom-1/4 right-1/3 text-2xl opacity-60">🍔</span>

        {/* Image Card Container */}
        <div className="relative p-4 w-full max-w-sm z-10"> 
          <div className="bg-white rounded-3xl shadow-xl overflow-hidden transform rotate-3 h-[600px] flex items-center justify-center">
            <img
              src="https://lessgo-asset.s3.ap-south-1.amazonaws.com/images/splash_event.jpg"
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