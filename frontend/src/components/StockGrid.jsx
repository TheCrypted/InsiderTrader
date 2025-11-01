import StockCard from './StockCard'

const STOCKS_DATA = [
  {
    symbol: "NVDA",
    name: "NVIDIA Corp",
    price: "$202.49",
    change: "-0.13%",
    isPositive: false,
    volume: "45.2M"
  },
  {
    symbol: "AVGO",
    name: "Broadcom Inc",
    price: "$369.63",
    change: "-1.79%",
    isPositive: false,
    volume: "2.1M"
  },
  {
    symbol: "TEM",
    name: "Tempus AI Inc",
    price: "$89.85",
    change: "+4.30%",
    isPositive: true,
    volume: "850K"
  },
  {
    symbol: "AAPL",
    name: "Apple Inc",
    price: "$185.20",
    change: "+1.25%",
    isPositive: true,
    volume: "52.3M"
  },
  {
    symbol: "MSFT",
    name: "Microsoft Corp",
    price: "$425.80",
    change: "+0.85%",
    isPositive: true,
    volume: "28.7M"
  },
  {
    symbol: "TSLA",
    name: "Tesla Inc",
    price: "$248.50",
    change: "-2.15%",
    isPositive: false,
    volume: "98.5M"
  }
]

export default function StockGrid() {
  return (
    <div>
      <h2 className="text-2xl font-bold mb-6 px-6 pt-6">Stock Movements</h2>
      <div className="grid grid-cols-1 md:grid-cols-2 border-t border-black border-l ">
        {STOCKS_DATA.map((stock, index) => {
          const isFirst = index === 0
          const isLastInRow = (index + 1) % 2 === 0 || index === STOCKS_DATA.length - 1
          return (
            <StockCard 
              key={index} 
              {...stock}
              isFirst={isFirst}
              isLast={isLastInRow}
            />
          )
        })}
      </div>
    </div>
  )
}

