import { useState, useEffect } from 'react'
import StockCard from './StockCard'
import { getStockData } from '../utils/api'

// Stock symbols and their display names
const STOCK_SYMBOLS = [
  { symbol: "NVDA", name: "NVIDIA Corp" },
  { symbol: "AVGO", name: "Broadcom Inc" },
  { symbol: "TEM", name: "Tempus AI Inc" },
  { symbol: "AAPL", name: "Apple Inc" },
  { symbol: "MSFT", name: "Microsoft Corp" },
  { symbol: "TSLA", name: "Tesla Inc" }
]

export default function StockGrid() {
  const [stocksData, setStocksData] = useState([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const fetchStockData = async () => {
      setLoading(true)
      try {
        const symbols = STOCK_SYMBOLS.map(s => s.symbol)
        const stockDataMap = await getStockData(symbols)
        
        // Map the fetched data to include names and maintain order
        const stocks = STOCK_SYMBOLS.map(({ symbol, name }) => {
          const data = stockDataMap[symbol]
          if (data) {
            return {
              symbol,
              name,
              price: data.price,
              change: data.change,
              isPositive: data.isPositive,
              volume: data.volume
            }
          }
          // Fallback if API doesn't return data for a symbol
          return {
            symbol,
            name,
            price: "$0.00",
            change: "0.00%",
            isPositive: false,
            volume: "0"
          }
        })
        
        setStocksData(stocks)
      } catch (error) {
        console.error('Error fetching stock data:', error)
        // Fallback to empty data structure on error
        setStocksData(STOCK_SYMBOLS.map(({ symbol, name }) => ({
          symbol,
          name,
          price: "$0.00",
          change: "0.00%",
          isPositive: false,
          volume: "0"
        })))
      } finally {
        setLoading(false)
      }
    }

    fetchStockData()
    
    // Refresh every 5 minutes
    const interval = setInterval(fetchStockData, 5 * 60 * 1000)
    
    return () => clearInterval(interval)
  }, [])

  return (
    <div>
      <h2 className="text-2xl font-bold mb-6 px-6 pt-6">Stock Movements</h2>
      {loading ? (
        <div className="grid grid-cols-1 md:grid-cols-2 border-t border-black border-l">
          <div className="col-span-2 p-6 text-center text-gray-500">
            Loading stock data...
          </div>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 border-t border-black border-l">
          {stocksData.map((stock, index) => {
            const isFirst = index === 0
            const isLastInRow = (index + 1) % 2 === 0 || index === stocksData.length - 1
            return (
              <StockCard 
                key={stock.symbol} 
                {...stock}
                isFirst={isFirst}
                isLast={isLastInRow}
              />
            )
          })}
        </div>
      )}
    </div>
  )
}
