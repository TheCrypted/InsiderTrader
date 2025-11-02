import { Routes, Route, Navigate, Link } from 'react-router-dom'
import CongressmanTradingPage from './pages/CongressmanTradingPage'
import LegislationBetPage from './pages/LegislationBetPage'
import GraphPage from './pages/GraphPage'
import BrowsePage from './pages/BrowsePage'
import './App.css'
import Header from './components/Header'
import CryptoMarquee from './components/CryptoMarquee'
import SearchSection from './components/SearchSection'
import CongressmanGrid from './components/CongressmanGrid'
import StockGrid from './components/StockGrid'
import LiveNews from './components/LiveNews'

function App() {
  const handleSearch = (query) => {
    // Handle search functionality
    console.log('Searching for:', query)
  }

  const DashboardPage = () => (
    <div className="min-h-screen bg-white text-black">
      <Header />
      
      {/* Crypto Market Data Marquee */}
      <CryptoMarquee />
      
      <main>
        {/* Top Half - Search Section */}
        <SearchSection onSearch={handleSearch} />

        {/* Separator Line */}
        <div className="border-t border-black"></div>

        {/* Bottom Half - Two Column Layout */}
        <div className="container mx-auto px-6">
          <div className="flex gap-8 pb-12 pt-8">
          {/* Left Grid - Congressmen (35%) */}
          <div className="flex-[0.35] border-black min-w-0">
            <CongressmanGrid />
          </div>

          {/* Divider - vertical line in the middle */}
          <div className="w-px bg-black"></div>

          {/* Right Grid - Stock Movements and Live News (65%) */}
          <div className="flex-[0.65] border-black flex flex-col min-w-0">
            <StockGrid />
            {/* Live News - Below Stock Movements in same column */}
            <div className="border-t border-black">
              <LiveNews />
            </div>
          </div>
        </div>
        </div>
      </main>
    </div>
  )

  return (
    <Routes>
      <Route path="/" element={<DashboardPage />} />
      <Route path="/congressman/:id/trading" element={<CongressmanTradingPage />} />
      <Route path="/legislation/:billId/bet" element={<LegislationBetPage />} />
      <Route path="/graph" element={<GraphPage />} />
      <Route path="/browse" element={<BrowsePage />} />
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  )
}

export default App
