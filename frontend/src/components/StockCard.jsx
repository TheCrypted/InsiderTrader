import { useStockLogo } from '../hooks/useImage'

export default function StockCard({ symbol, name, price, change, isPositive, volume, isFirst = false, isLast = false }) {
  const { logoUrl, loading } = useStockLogo(symbol)
  const bgColor = isPositive 
    ? 'bg-green-50' // Very subtle muted green
    : 'bg-red-50'   // Very subtle muted red
  
  return (
    <div className={`${bgColor} bg-opacity-40 border-b border-r border-black p-6 relative group hover:opacity-90 transition-opacity`}>
      {/* Blue square on top-right corner on hover */}
      <div className="absolute top-[-1px] right-[-1px] w-4 h-4 bg-blue-600 opacity-0 group-hover:opacity-100 transition-opacity z-10 border border-black"></div>
      
      <div className="flex items-start justify-between">
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-3 mb-2">
            <div className="w-12 h-12 rounded-lg flex items-center justify-center font-bold text-gray-700 bg-white border border-gray-200 overflow-hidden">
              {!loading && logoUrl ? (
                <img src={logoUrl} alt={name} className="w-full h-full object-contain p-1" onError={(e) => {
                  e.target.style.display = 'none'
                  e.target.nextElementSibling.style.display = 'block'
                }} />
              ) : null}
              <span className={!loading && logoUrl ? 'hidden' : ''}>{symbol}</span>
            </div>
            <div>
              <h3 className="font-bold text-lg">{symbol}</h3>
              <p className="text-sm text-gray-600">{name}</p>
            </div>
          </div>
          
          <div className="mt-3">
            <p className="text-2xl font-bold">{price}</p>
            <p className={`text-sm font-semibold ${isPositive ? 'text-green-700' : 'text-red-700'}`}>
              {change}
            </p>
            {volume && (
              <p className="text-xs text-gray-500 mt-1">Volume: {volume}</p>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}
