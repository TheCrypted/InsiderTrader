import { Routes, Route, Navigate, Link } from 'react-router-dom'
import CongressmanTradingPage from './pages/CongressmanTradingPage'
import './App.css'
import Header from './components/Header'
import SearchSection from './components/SearchSection'
import CongressmanGrid from './components/CongressmanGrid'
import StockGrid from './components/StockGrid'

function App() {
  const handleSearch = (query) => {
    // Handle search functionality
    console.log('Searching for:', query)
  }


  return (
    <div className="min-h-screen bg-white text-black">
      <Header />
      
      <main className="container mx-auto px-6">
        {/* Top Half - Search Section */}
        <div className="h-[50vh] flex items-center justify-center">
          <SearchSection onSearch={handleSearch} />
        </div>

        {/* Separator Line */}
        <div className="border-t border-black my-8"></div>

        {/* Bottom Half - Two Grids */}
        <div className="grid grid-cols-1 lg:grid-cols-2 pb-12  ">
          {/* Left Grid - Congressmen */}
          <div className=" border-black">
            <CongressmanGrid />
          </div>

          {/* Right Grid - Stock Movements */}
          <div>
            <StockGrid />
          </div>
        </div>
      </main>
    </div>
  )

  return (
    <Routes>
      <Route path="/" element={<DashboardPage />} />
      <Route path="/congressman/:id/trading" element={<CongressmanTradingPage />} />
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  )
}

export default App
