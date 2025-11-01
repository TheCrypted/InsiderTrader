import { useState } from 'react';
import LoadingSpinner from '../shared/LoadingSpinner';

const CongressmanProfile = ({ congressman, loading }) => {
  const [showDetails, setShowDetails] = useState(false);

  if (loading) {
    return (
      <div className="bg-white rounded-lg shadow-sm p-8">
        <LoadingSpinner size="lg" />
      </div>
    );
  }

  if (!congressman) {
    return <div className="bg-white rounded-lg shadow-sm p-8">No data available</div>;
  }

  return (
    <div className="bg-white rounded-lg shadow-sm p-4">
      <div className="flex items-center gap-4">
        {/* Profile Image */}
        <div className="flex-shrink-0">
          <img
            src={congressman.image}
            alt={congressman.name}
            className="w-20 h-20 rounded-full object-cover border-2 border-gray-100"
            onError={(e) => {
              e.target.src = 'https://via.placeholder.com/200?text=' + congressman.name.charAt(0);
            }}
          />
        </div>

        {/* Profile Info */}
        <div className="flex-1">
          <h2 className="text-xl font-light mb-1">{congressman.name}</h2>
          <p className="text-sm text-gray-600 mb-3">
            {congressman.party} / {congressman.chamber} / {congressman.state}
          </p>

          {/* Stats Grid */}
          <div className="grid grid-cols-4 gap-3">
            <div className="flex flex-col">
              <strong className="text-lg font-semibold text-gray-900">{congressman.netWorth}</strong>
              <span className="text-xs text-gray-600 mt-0.5">Net Worth Est.</span>
            </div>
            <div className="flex flex-col">
              <strong className="text-lg font-semibold text-gray-900">{congressman.tradeVolume}</strong>
              <span className="text-xs text-gray-600 mt-0.5">Trade Volume</span>
            </div>
            <div className="flex flex-col">
              <strong className="text-lg font-semibold text-gray-900">{congressman.totalTrades}</strong>
              <span className="text-xs text-gray-600 mt-0.5">Total Trades</span>
            </div>
            <div className="flex flex-col">
              <strong className="text-lg font-semibold text-gray-900">{congressman.lastTraded}</strong>
              <span className="text-xs text-gray-600 mt-0.5">Last Traded</span>
            </div>
          </div>

          {/* Expandable Details */}
          <div className="mt-2">
            <button
              onClick={() => setShowDetails(!showDetails)}
              className="flex items-center gap-1 text-xs text-gray-700 hover:text-gray-900 transition-colors"
            >
              <span>{showDetails ? 'Show Less' : 'Show More'}</span>
              <svg
                className={`w-3 h-3 transition-transform ${showDetails ? 'rotate-180' : ''}`}
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
              </svg>
            </button>

            {showDetails && (
              <ul className="mt-2 space-y-1 text-xs text-gray-600">
                <li className="flex justify-between gap-4">
                  <strong className="text-gray-900">Current Member</strong>
                  <span className={congressman.isCurrentMember ? 'text-gresearch-vivid-green' : 'text-gray-500'}>
                    {congressman.isCurrentMember ? 'Yes' : 'No'}
                  </span>
                </li>
                <li className="flex justify-between gap-4">
                  <strong className="text-gray-900">Years Active</strong>
                  <span>{congressman.yearsActive}</span>
                </li>
                {congressman.age && (
                  <li className="flex justify-between gap-4">
                    <strong className="text-gray-900">Age</strong>
                    <span>{congressman.age}</span>
                  </li>
                )}
              </ul>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default CongressmanProfile;

