import LoadingSpinner from '../shared/LoadingSpinner';

const CongressmanProfile = ({ congressman, loading }) => {
  if (loading) {
    return (
      <div className="bg-white p-8">
        <LoadingSpinner size="lg" />
      </div>
    );
  }

  if (!congressman) {
    return <div className="bg-white p-8">No data available</div>;
  }

  return (
    <div className="bg-white">
      {/* Taller rectangular image */}
      <div className="w-full aspect-[2/3] bg-gray-200 overflow-hidden border-b border-black relative">
        {congressman.image ? (
          <img 
            src={congressman.image} 
            alt={congressman.name} 
            className="w-full h-full object-cover object-top" 
            loading="lazy"
            referrerPolicy="no-referrer"
            onError={(e) => {
              e.target.style.display = 'none'
              e.target.nextElementSibling.style.display = 'flex'
            }} 
          />
        ) : null}
        <div className={`w-full h-full flex items-center justify-center bg-gray-300 ${congressman.image ? 'hidden' : 'flex'}`}>
          <span className="text-4xl font-bold text-gray-500">{congressman.name.split(' ').map(n => n[0]).join('')}</span>
        </div>
      </div>
      
      {/* Text block below image with bordered grid */}
      <div className="p-6 space-y-0">
        {/* Name - Bordered section */}
        <div className="border-b border-black p-4">
          <h2 className="font-bold text-xl">{congressman.name}</h2>
        </div>
        
        {/* Position/Title - Bordered section */}
        <div className="border-b border-black p-4">
          <p className="text-base text-gray-700">
            {congressman.party} / {congressman.chamber} / {congressman.state}
          </p>
        </div>

        {/* Stats Grid with borders */}
        <div className="grid grid-cols-2 border-b border-black">
          <div className="border-r border-black p-4 flex flex-col">
            <strong className="text-lg font-semibold text-gray-900">{congressman.netWorth}</strong>
            <span className="text-xs text-gray-600 mt-1">Net Worth Est.</span>
          </div>
          <div className="p-4 flex flex-col">
            <strong className="text-lg font-semibold text-gray-900">{congressman.totalTrades}</strong>
            <span className="text-xs text-gray-600 mt-1">Total Trades</span>
          </div>
          <div className="border-r border-t border-black p-4 flex flex-col">
            <strong className="text-lg font-semibold text-gray-900">{congressman.tradeVolume}</strong>
            <span className="text-xs text-gray-600 mt-1">Trade Volume</span>
          </div>
          <div className="border-t border-black p-4 flex flex-col">
            <strong className="text-lg font-semibold text-gray-900">{congressman.lastTraded}</strong>
            <span className="text-xs text-gray-600 mt-1">Last Traded</span>
          </div>
        </div>

        {/* Additional Details - Bordered sections */}
        {congressman.isCurrentMember !== undefined && (
          <div className="border-b border-black p-4 flex justify-between items-center">
            <span className="text-sm text-gray-700">Current Member</span>
            <span className={`text-sm font-semibold ${congressman.isCurrentMember ? 'text-gresearch-vivid-green' : 'text-gray-500'}`}>
              {congressman.isCurrentMember ? 'Yes' : 'No'}
            </span>
          </div>
        )}
        {congressman.yearsActive && (
          <div className="border-b border-black p-4 flex justify-between items-center">
            <span className="text-sm text-gray-700">Years Active</span>
            <span className="text-sm font-semibold text-gray-900">{congressman.yearsActive}</span>
          </div>
        )}
        {congressman.age && (
          <div className="border-b border-black p-4 flex justify-between items-center">
            <span className="text-sm text-gray-700">Age</span>
            <span className="text-sm font-semibold text-gray-900">{congressman.age}</span>
          </div>
        )}
      </div>
    </div>
  );
};

export default CongressmanProfile;

