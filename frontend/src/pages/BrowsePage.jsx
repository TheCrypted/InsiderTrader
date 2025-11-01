import { useState, useMemo } from 'react';
import { Link } from 'react-router-dom';
import Header from '../components/Header';
import { graphCongressmen, graphBills } from '../utils/graphData';
import { getLegislationDetails } from '../utils/legislationData';

const BrowsePage = () => {
  const [activeTab, setActiveTab] = useState('congressmen'); // 'congressmen' or 'legislation'
  const [congressmanFilter, setCongressmanFilter] = useState('all'); // 'all', 'active', 'inactive', 'party', 'chamber'
  const [legislationFilter, setLegislationFilter] = useState('all'); // 'all', 'passed', 'failed', 'pending', 'sector'
  const [sortBy, setSortBy] = useState('name'); // For congressmen: 'name', 'trades', 'networth'. For bills: 'title', 'odds', 'date'

  // Prepare congressmen data with all from graphData
  const allCongressmen = useMemo(() => {
    return graphCongressmen.map(congressman => ({
      ...congressman,
      isCurrentMember: congressman.isCurrentMember !== false, // Default to true if not specified
      // Add inactive congressmen (mock some as inactive)
      ...(congressman.id === 'M000303' || congressman.id === 'L000174' ? { isCurrentMember: false } : {})
    }));
  }, []);

  // Prepare legislation data with odds
  const allLegislation = useMemo(() => {
    return graphBills.map(bill => {
      const details = getLegislationDetails(bill.id);
      return {
        ...bill,
        ...details,
        // Add passing/failing odds (mock calculation based on cosponsors, status, etc.)
        passingOdds: details?.yesPrice || (bill.cosponsors > 40 ? 0.65 : bill.cosponsors > 25 ? 0.45 : 0.30),
        failingOdds: details?.noPrice || (bill.cosponsors > 40 ? 0.35 : bill.cosponsors > 25 ? 0.55 : 0.70),
        isPassed: bill.status === 'Passed House' || bill.status === 'Passed Senate' || bill.status === 'Enacted',
        isFailed: false // Mock - in real app would check actual status
      };
    });
  }, []);

  // Filter congressmen
  const filteredCongressmen = useMemo(() => {
    let filtered = [...allCongressmen];

    if (congressmanFilter === 'active') {
      filtered = filtered.filter(c => c.isCurrentMember);
    } else if (congressmanFilter === 'inactive') {
      filtered = filtered.filter(c => !c.isCurrentMember);
    } else if (congressmanFilter === 'Democratic') {
      filtered = filtered.filter(c => c.party === 'Democratic');
    } else if (congressmanFilter === 'Republican') {
      filtered = filtered.filter(c => c.party === 'Republican');
    } else if (congressmanFilter === 'House') {
      filtered = filtered.filter(c => c.chamber === 'House');
    } else if (congressmanFilter === 'Senate') {
      filtered = filtered.filter(c => c.chamber === 'Senate');
    }

    // Sort
    filtered.sort((a, b) => {
      switch (sortBy) {
        case 'trades':
          return b.totalTrades - a.totalTrades;
        case 'networth':
          return b.netWorth - a.netWorth;
        case 'name':
        default:
          return a.name.localeCompare(b.name);
      }
    });

    return filtered;
  }, [allCongressmen, congressmanFilter, sortBy]);

  // Filter legislation
  const filteredLegislation = useMemo(() => {
    let filtered = [...allLegislation];

    if (legislationFilter === 'passed') {
      filtered = filtered.filter(b => b.isPassed);
    } else if (legislationFilter === 'failed') {
      filtered = filtered.filter(b => b.isFailed);
    } else if (legislationFilter === 'pending') {
      filtered = filtered.filter(b => !b.isPassed && !b.isFailed);
    } else if (legislationFilter === 'Technology') {
      filtered = filtered.filter(b => b.sector === 'Technology');
    } else if (legislationFilter === 'Financials') {
      filtered = filtered.filter(b => b.sector === 'Financials');
    } else if (legislationFilter === 'Energy') {
      filtered = filtered.filter(b => b.sector === 'Energy');
    } else if (legislationFilter === 'Healthcare') {
      filtered = filtered.filter(b => b.sector === 'Healthcare');
    }

    // Sort
    filtered.sort((a, b) => {
      switch (sortBy) {
        case 'odds':
          return b.passingOdds - a.passingOdds;
        case 'date':
          return new Date(b.date) - new Date(a.date);
        case 'title':
        default:
          return a.title.localeCompare(b.title);
      }
    });

    return filtered;
  }, [allLegislation, legislationFilter, sortBy]);

  const formatCurrency = (value) => {
    if (value >= 1000000) {
      return `$${(value / 1000000).toFixed(1)}M`;
    }
    return `$${(value / 1000).toFixed(0)}K`;
  };

  return (
    <div className="min-h-screen bg-white text-black">
      <Header />
      <div className="mb-6 border-b border-black">
        <div className="container mx-auto px-6 py-4">
          <Link
            to="/"
            className="inline-flex items-center gap-2 text-gray-700 hover:text-gray-900 transition-colors mb-4"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
            </svg>
            Back to Dashboard
          </Link>
          <h1 className="text-4xl font-bold mb-2">Browse All</h1>
          <p className="text-gray-600">View and filter all congressmen and legislation</p>
        </div>
      </div>

      <div className="container mx-auto px-6">
        {/* Tabs */}
        <div className="mb-6 border-b border-black">
          <div className="flex gap-4">
            <button
              onClick={() => setActiveTab('congressmen')}
              className={`px-6 py-3 font-medium border-b-2 transition-colors ${
                activeTab === 'congressmen'
                  ? 'border-black text-black'
                  : 'border-transparent text-gray-500 hover:text-gray-700'
              }`}
            >
              Congressmen ({allCongressmen.length})
            </button>
            <button
              onClick={() => setActiveTab('legislation')}
              className={`px-6 py-3 font-medium border-b-2 transition-colors ${
                activeTab === 'legislation'
                  ? 'border-black text-black'
                  : 'border-transparent text-gray-500 hover:text-gray-700'
              }`}
            >
              Legislation ({allLegislation.length})
            </button>
          </div>
        </div>

        {/* Filters and Sort */}
        <div className="mb-6 flex flex-wrap items-center gap-4">
          <div className="flex items-center gap-2">
            <span className="text-sm font-medium text-gray-700">Filter:</span>
            {activeTab === 'congressmen' ? (
              <select
                value={congressmanFilter}
                onChange={(e) => setCongressmanFilter(e.target.value)}
                className="px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-black focus:border-transparent"
              >
                <option value="all">All</option>
                <option value="active">Active</option>
                <option value="inactive">Inactive</option>
                <option value="Democratic">Democratic</option>
                <option value="Republican">Republican</option>
                <option value="House">House</option>
                <option value="Senate">Senate</option>
              </select>
            ) : (
              <select
                value={legislationFilter}
                onChange={(e) => setLegislationFilter(e.target.value)}
                className="px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-black focus:border-transparent"
              >
                <option value="all">All</option>
                <option value="passed">Passed</option>
                <option value="failed">Failed</option>
                <option value="pending">Pending</option>
                <option value="Technology">Technology</option>
                <option value="Financials">Financials</option>
                <option value="Energy">Energy</option>
                <option value="Healthcare">Healthcare</option>
              </select>
            )}
          </div>

          <div className="flex items-center gap-2">
            <span className="text-sm font-medium text-gray-700">Sort by:</span>
            <select
              value={sortBy}
              onChange={(e) => setSortBy(e.target.value)}
              className="px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-black focus:border-transparent"
            >
              {activeTab === 'congressmen' ? (
                <>
                  <option value="name">Name</option>
                  <option value="trades">Total Trades</option>
                  <option value="networth">Net Worth</option>
                </>
              ) : (
                <>
                  <option value="title">Title</option>
                  <option value="odds">Passing Odds</option>
                  <option value="date">Date</option>
                </>
              )}
            </select>
          </div>

          <div className="ml-auto text-sm text-gray-600">
            Showing {activeTab === 'congressmen' ? filteredCongressmen.length : filteredLegislation.length} results
          </div>
        </div>

        {/* Congressmen List */}
        {activeTab === 'congressmen' && (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-0 border-t border-l border-black">
            {filteredCongressmen.map((congressman, index) => {
              const isLastInRow = (index + 1) % 3 === 0;
              const isInLastRow = index >= filteredCongressmen.length - (filteredCongressmen.length % 3 || 3);
              return (
              <Link
                key={congressman.id}
                to={`/congressman/${congressman.id}/trading`}
                className={`bg-white border-b border-r border-black p-6 hover:bg-gray-50 transition-colors relative group ${
                  isLastInRow ? 'border-r-0' : ''
                }`}
              >
                {/* Blue square on top-right corner on hover */}
                <div className="absolute top-[-1px] right-[-1px] w-4 h-4 bg-blue-600 opacity-0 group-hover:opacity-100 transition-opacity z-10 border border-black"></div>
                <div className="flex items-start gap-4 mb-4">
                  <img
                    src={congressman.image}
                    alt={congressman.name}
                    className="w-16 h-16 rounded-full object-cover border-2 border-gray-200"
                    onError={(e) => {
                      e.target.style.display = 'none';
                    }}
                  />
                  <div className="flex-1">
                    <h3 className="text-lg font-bold text-gray-900 mb-1">{congressman.name}</h3>
                    <div className="flex items-center gap-2 mb-1">
                      <span className={`px-2 py-0.5 rounded text-xs font-medium ${
                        congressman.party === 'Democratic'
                          ? 'bg-blue-100 text-blue-800'
                          : 'bg-red-100 text-red-800'
                      }`}>
                        {congressman.party}
                      </span>
                      <span className="px-2 py-0.5 rounded text-xs font-medium bg-gray-100 text-gray-700">
                        {congressman.chamber}
                      </span>
                      {congressman.isCurrentMember && (
                        <span className="px-2 py-0.5 rounded text-xs font-medium bg-green-100 text-green-800">
                          Active
                        </span>
                      )}
                    </div>
                    <p className="text-xs text-gray-600">{congressman.state}</p>
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-3 text-sm border-t border-gray-200 pt-4">
                  <div>
                    <div className="text-gray-500 text-xs">Net Worth</div>
                    <div className="font-semibold text-gray-900">{formatCurrency(congressman.netWorth)}</div>
                  </div>
                  <div>
                    <div className="text-gray-500 text-xs">Total Trades</div>
                    <div className="font-semibold text-gray-900">{congressman.totalTrades}</div>
                  </div>
                </div>
              </Link>
              );
            })}
          </div>
        )}

        {/* Legislation List */}
        {activeTab === 'legislation' && (
          <div className="space-y-0 border-t border-l border-black">
            {filteredLegislation.map((bill, index) => (
              <Link
                key={bill.id}
                to={`/legislation/${bill.id}/bet`}
                className={`block bg-white border-b border-r border-black p-6 hover:bg-gray-50 transition-colors relative group ${
                  index === filteredLegislation.length - 1 ? 'border-b-0' : ''
                }`}
              >
                {/* Blue square on top-right corner on hover */}
                <div className="absolute top-[-1px] right-[-1px] w-4 h-4 bg-blue-600 opacity-0 group-hover:opacity-100 transition-opacity z-10 border border-black"></div>
                <div className="flex items-start justify-between mb-4">
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-2">
                      <h3 className="text-lg font-bold text-gray-900">{bill.id}</h3>
                      <span className={`px-2 py-0.5 rounded text-xs font-medium ${
                        bill.status === 'Passed House' || bill.status === 'Passed Senate' || bill.status === 'Enacted'
                          ? 'bg-green-100 text-green-800'
                          : bill.status === 'In Committee'
                          ? 'bg-yellow-100 text-yellow-800'
                          : 'bg-gray-100 text-gray-800'
                      }`}>
                        {bill.status}
                      </span>
                    </div>
                    <h4 className="text-xl font-semibold text-gray-900 mb-2">{bill.title}</h4>
                    <p className="text-sm text-gray-600 mb-3 line-clamp-2">{bill.summary || 'No summary available'}</p>
                    <div className="flex items-center gap-4 text-xs text-gray-500">
                      <span>Cosponsors: {bill.cosponsors}</span>
                      <span>•</span>
                      <span>Sector: {bill.sector}</span>
                      <span>•</span>
                      <span>{new Date(bill.date).toLocaleDateString()}</span>
                    </div>
                  </div>
                  
                  {/* Odds Display */}
                  <div className="ml-6 flex flex-col gap-3 min-w-[200px]">
                    <div className="bg-green-50 border-2 border-green-200 rounded-lg p-4 text-center">
                      <div className="text-xs text-gray-600 mb-1">Passing Odds</div>
                      <div className="text-2xl font-bold text-green-700">
                        {(bill.passingOdds * 100).toFixed(1)}%
                      </div>
                    </div>
                    <div className="bg-red-50 border-2 border-red-200 rounded-lg p-4 text-center">
                      <div className="text-xs text-gray-600 mb-1">Failing Odds</div>
                      <div className="text-2xl font-bold text-red-700">
                        {(bill.failingOdds * 100).toFixed(1)}%
                      </div>
                    </div>
                  </div>
                </div>
              </Link>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};

export default BrowsePage;

