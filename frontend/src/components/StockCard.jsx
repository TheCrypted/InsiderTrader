import TrendingCard from './TrendingCard'

export default function StockCard({ symbol, name, price, change, isPositive, logoBg = "bg-green-600" }) {
  return (
    <TrendingCard>
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3 flex-1">
          <div className={`${logoBg} w-12 h-12 rounded-lg flex items-center justify-center text-white font-bold`}>
            {symbol}
          </div>
          <div className="flex-1 min-w-0">
            <div className="font-semibold truncate">{symbol}</div>
            <div className="text-sm text-gray-400 truncate">{name}</div>
          </div>
        </div>
        <div className="text-right">
          <div className="font-semibold">{price}</div>
          <div className={`text-sm ${isPositive ? 'text-green-500' : 'text-red-500'}`}>
            {change}
          </div>
        </div>
      </div>
    </TrendingCard>
  )
}

