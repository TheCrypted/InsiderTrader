import { useCongressmanImage } from '../hooks/useImage'

export default function CongressmanCard({ name, party, position, trades, isFirst = false, isLast = false }) {
  const { imageUrl, loading } = useCongressmanImage(name)
  const borderClasses = isLast 
    ? "border-b border-black" 
    : "border-b border-r border-black"
    
  return (
    <div className={`bg-white ${borderClasses} p-6 relative group hover:bg-gray-50 transition-colors`}>
      {/* Blue square on top-right corner on hover */}
      <div className="absolute top-[-1px] right-[-1px] w-4 h-4 bg-blue-600 opacity-0 group-hover:opacity-100 transition-opacity z-10 border border-black"></div>
      
      <div className="flex items-start gap-4">
        {/* Image/Avatar */}
        <div className="w-16 h-16 bg-gray-300 rounded-full flex items-center justify-center flex-shrink-0 overflow-hidden">
          {!loading && imageUrl ? (
            <img src={imageUrl} alt={name} className="w-full h-full rounded-full object-cover" onError={(e) => {
              e.target.style.display = 'none'
              e.target.nextElementSibling.style.display = 'flex'
            }} />
          ) : null}
          <div className={`w-full h-full rounded-full flex items-center justify-center ${!loading && imageUrl ? 'hidden' : ''}`}>
            <span className="text-xl font-bold text-gray-600">{name.split(' ').map(n => n[0]).join('')}</span>
          </div>
        </div>
        
        {/* Content */}
        <div className="flex-1 min-w-0">
          <h3 className="font-bold text-lg mb-1">{name}</h3>
          <p className="text-sm text-gray-600 mb-2">{party} - {position}</p>
          {trades && (
            <p className="text-xs text-gray-500">Recent trades: {trades}</p>
          )}
        </div>
      </div>
    </div>
  )
}

