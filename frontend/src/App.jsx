import './App.css'
import Header from './components/Header'
import HeroSection from './components/HeroSection'
import TrendingSection from './components/TrendingSection'
import IsometricIllustration from './components/IsometricIllustration'
import TrendingNewsFeed from './components/TrendingNewsFeed'

function App() {
  const handleSearch = (query) => {
    // Handle search functionality
    console.log('Searching for:', query)
  }

  return (
    <div className="min-h-screen bg-black text-white">
      <Header />
      
      <main className="container mx-auto px-6 py-12">
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-12">
          {/* Left Column - Hero and Trending */}
          <div>
            <HeroSection onSearch={handleSearch} />
            <TrendingSection />
          </div>

          {/* Right Column - Isometric Illustration */}
          <div className="hidden lg:block relative">
            <div className="sticky top-12">
              <IsometricIllustration />
            </div>
          </div>
        </div>
      </main>

      <TrendingNewsFeed />
    </div>
  )
}

export default App
