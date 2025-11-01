import { Routes, Route, Navigate, Link } from 'react-router-dom'
import CongressmanTradingPage from './pages/CongressmanTradingPage'
import LegislationBetPage from './pages/LegislationBetPage'
import GraphPage from './pages/GraphPage'
import BrowsePage from './pages/BrowsePage'
import './App.css'
import Header from './components/Header'
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
      
      <main>
        {/* Top Half - Search Section */}
        <SearchSection onSearch={handleSearch} />

        {/* Separator Line */}
        <div className="border-t border-black"></div>

        {/* Bottom Half - Two Column Layout */}
        <div className="container mx-auto px-6">
          <div className="grid grid-cols-1 lg:grid-cols-2 pb-12 pt-8 gap-0">
          {/* Left Grid - Congressmen */}
          <div className="border-black">
            <CongressmanGrid />
          </div>

          {/* Right Grid - Stock Movements and Live News */}
          <div className="border-black border-l flex flex-col">
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
