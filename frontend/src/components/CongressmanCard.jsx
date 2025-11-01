import { Link } from 'react-router-dom'
import { useCongressmanImage } from '../hooks/useImage'

export default function CongressmanCard({ name, party, position, trades, id, isFirst = false, isLast = false }) {
  const { imageUrl, loading } = useCongressmanImage(name)
  const borderClasses = isLast 
    ? "border-b border-black" 
    : "border-b border-r border-black"
  
  // Generate the route path for the trading page
  const tradingPagePath = id ? `/congressman/${id}/trading` : '#'
    
  return (
    <Link 
      to={tradingPagePath}
      className={`block bg-white ${borderClasses} relative group hover:bg-gray-50 transition-colors cursor-pointer`}
    >
      {/* Blue square on top-right corner on hover */}
      <div className="absolute top-[-1px] right-[-1px] w-4 h-4 bg-blue-600 opacity-0 group-hover:opacity-100 transition-opacity z-10 border border-black"></div>
      
      {/* Large rectangular image */}
      <div className="w-full aspect-[4/3] bg-gray-200 overflow-hidden">
        {!loading && imageUrl ? (
          <img 
            src={imageUrl} 
            alt={name} 
            className="w-full h-full object-cover object-top" 
            onError={(e) => {
              e.target.style.display = 'none'
              e.target.nextElementSibling.style.display = 'flex'
            }} 
          />
        ) : null}
        <div className={`w-full h-full flex items-center justify-center bg-gray-300 ${!loading && imageUrl ? 'hidden' : ''}`}>
          <span className="text-4xl font-bold text-gray-500">{name.split(' ').map(n => n[0]).join('')}</span>
        </div>
      </div>
      
      {/* Text block below image */}
      <div className="p-6">
        {/* Name */}
        <h3 className="font-bold text-xl mb-1">{name}</h3>
        
        {/* Position/Title */}
        <p className="text-base text-gray-700 mb-2">{party} - {position}</p>
        
        {/* Analytical description */}
        {trades && (
          <p className="text-sm text-gray-500">Recent trades: {trades}</p>
        )}
      </div>
    </Link>
  )
}

