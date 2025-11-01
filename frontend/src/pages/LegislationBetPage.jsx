import { useState, useEffect } from 'react';
import { useParams, Link } from 'react-router-dom';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, AreaChart, Area } from 'recharts';
import Container from '../components/shared/Container';
import LoadingSpinner from '../components/shared/LoadingSpinner';
import { getLegislationDetails } from '../utils/legislationData';

const LegislationBetPage = () => {
  const { billId } = useParams();
  const [timeRange, setTimeRange] = useState('7d'); // '1d', '7d', '30d', 'all'
  const [aiSummary, setAiSummary] = useState(null);
  const [isSummarizing, setIsSummarizing] = useState(false);

  // Generate historical price data
  const generatePriceHistory = (days = 30) => {
    const data = [];
    const today = new Date();
    let basePrice = 0.45; // Start at 45%
    
    for (let i = days; i >= 0; i--) {
      const date = new Date(today);
      date.setDate(date.getDate() - i);
      
      // Simulate price movement with some volatility
      const change = (Math.random() - 0.48) * 0.03; // Small random changes
      basePrice = Math.max(0.15, Math.min(0.95, basePrice + change));
      
      const volume = Math.floor(Math.random() * 15000 + 5000);
      
      data.push({
        date: date.toISOString().split('T')[0],
        timestamp: date.getTime(),
        yesPrice: basePrice,
        noPrice: 1 - basePrice,
        volume: volume,
        displayDate: date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })
      });
    }
    
    return data;
  };

  // Get legislation details with stocks, congressmen, and trading activity
  const legislationData = getLegislationDetails(billId);
  const legislation = {
    ...legislationData,
    priceHistory: generatePriceHistory(30)
  };

  // Filter price history based on time range
  const getFilteredHistory = () => {
    if (!legislation.priceHistory) return [];
    
    const today = new Date();
    const ranges = {
      '1d': 1,
      '7d': 7,
      '30d': 30,
      'all': Infinity
    };
    
    const days = ranges[timeRange] || 30;
    const cutoffDate = new Date(today);
    cutoffDate.setDate(cutoffDate.getDate() - days);
    
    return legislation.priceHistory.filter(item => {
      if (days === Infinity) return true;
      return new Date(item.date) >= cutoffDate;
    });
  };

  const priceHistory = getFilteredHistory();

  const formatCurrency = (value) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(value);
  };

  const formatPercent = (value) => {
    return `${(value * 100).toFixed(1)}%`;
  };

  const handleAISummarize = () => {
    if (aiSummary) {
      // If summary already exists, just toggle it
      setAiSummary(null);
      return;
    }
    
    setIsSummarizing(true);
    // Simulate AI API call
    setTimeout(() => {
      setIsSummarizing(false);
      setAiSummary(legislation.aiSummary || 'AI summary loading...');
    }, 1500);
  };

  if (!legislation) {
    return (
      <div className="min-h-screen bg-gresearch-grey-200 py-12">
        <Container>
          <div className="text-center">
            <h1 className="text-2xl font-semibold mb-4">Legislation not found</h1>
            <Link to="/" className="c-btn c-btn--yellow">Return to Home</Link>
          </div>
        </Container>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gresearch-grey-200 py-8">
      <Container>
        {/* Back Link */}
        <div className="mb-6">
          <Link
            to="/"
            className="inline-flex items-center gap-2 text-gray-700 hover:text-gray-900 transition-colors"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
            </svg>
            Back to Dashboard
          </Link>
        </div>

        {/* Main Content */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Left Column - Market Info */}
          <div className="lg:col-span-2 space-y-6">
            {/* Title Section */}
            <div className="bg-white rounded-lg shadow-sm p-6">
              <div className="flex items-start justify-between mb-4">
                <div className="flex-1">
                  <div className="text-sm text-gray-500 mb-2">{legislation.id}</div>
                  <h1 className="text-2xl font-light text-gray-900 mb-3">{legislation.title}</h1>
                  <p className="text-lg font-semibold text-gray-700 mb-4">{legislation.question}</p>
                </div>
              </div>
              
              <div className="border-t border-gray-200 pt-4">
                <p className="text-sm text-gray-600 mb-4">{legislation.summary}</p>
                <div className="grid grid-cols-2 gap-4 text-sm">
                  <div>
                    <span className="text-gray-500">Sponsor:</span>
                    <span className="ml-2 font-medium text-gray-900">{legislation.sponsor}</span>
                  </div>
                  <div>
                    <span className="text-gray-500">Status:</span>
                    <span className="ml-2 font-medium text-gray-900">{legislation.status}</span>
                  </div>
                  <div>
                    <span className="text-gray-500">Cosponsors:</span>
                    <span className="ml-2 font-medium text-gray-900">{legislation.cosponsors}</span>
                  </div>
                  <div>
                    <span className="text-gray-500">Resolution Date:</span>
                    <span className="ml-2 font-medium text-gray-900">
                      {new Date(legislation.resolutionDate).toLocaleDateString()}
                    </span>
                  </div>
                </div>
              </div>
            </div>

            {/* Historical Price Chart */}
            <div className="bg-white rounded-lg shadow-sm p-6">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-lg font-semibold text-gray-900">Price History</h3>
                <div className="flex gap-2">
                  {['1d', '7d', '30d', 'all'].map((range) => (
                    <button
                      key={range}
                      onClick={() => setTimeRange(range)}
                      className={`px-3 py-1 rounded-full text-xs font-medium transition-all ${
                        timeRange === range
                          ? 'c-btn c-btn--yellow'
                          : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                      }`}
                    >
                      {range.toUpperCase()}
                    </button>
                  ))}
                </div>
              </div>
              
              {priceHistory.length > 0 && (
                <ResponsiveContainer width="100%" height={350}>
                  <AreaChart data={priceHistory} margin={{ top: 10, right: 30, left: 20, bottom: 20 }}>
                    <defs>
                      <linearGradient id="yesGradient" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor="#e5fc54" stopOpacity={0.4}/>
                        <stop offset="95%" stopColor="#e5fc54" stopOpacity={0.05}/>
                      </linearGradient>
                      <linearGradient id="noGradient" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor="#cf2e2e" stopOpacity={0.4}/>
                        <stop offset="95%" stopColor="#cf2e2e" stopOpacity={0.05}/>
                      </linearGradient>
                    </defs>
                    <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
                    <XAxis 
                      dataKey="displayDate" 
                      stroke="#6b7280"
                      tick={{ fontSize: 11 }}
                      interval="preserveStartEnd"
                      angle={-45}
                      textAnchor="end"
                      height={60}
                    />
                    <YAxis 
                      stroke="#6b7280"
                      domain={[0, 1]}
                      tickFormatter={(value) => `${(value * 100).toFixed(0)}%`}
                      width={50}
                    />
                    <Tooltip
                      formatter={(value, name) => {
                        if (name === 'yesPrice') return [`${(value * 100).toFixed(1)}%`, 'YES'];
                        if (name === 'noPrice') return [`${(value * 100).toFixed(1)}%`, 'NO'];
                        return value;
                      }}
                      labelFormatter={(label) => `Date: ${label}`}
                      contentStyle={{
                        backgroundColor: 'white',
                        border: '1px solid #e5e7eb',
                        borderRadius: '8px',
                        boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1)'
                      }}
                    />
                    <Area 
                      type="monotone" 
                      dataKey="yesPrice" 
                      stroke="#e5fc54" 
                      strokeWidth={2}
                      fill="url(#yesGradient)"
                      name="YES"
                      animationDuration={500}
                    />
                    <Area 
                      type="monotone" 
                      dataKey="noPrice" 
                      stroke="#cf2e2e" 
                      strokeWidth={2}
                      fill="url(#noGradient)"
                      name="NO"
                      animationDuration={500}
                    />
                  </AreaChart>
                </ResponsiveContainer>
              )}
              
              <div className="flex gap-6 mt-4 text-xs">
                <div className="flex items-center gap-2">
                  <div className="w-3 h-3 bg-gresearch-yellow rounded-full"></div>
                  <span className="text-gray-600">YES Price</span>
                </div>
                <div className="flex items-center gap-2">
                  <div className="w-3 h-3 bg-gresearch-vivid-red rounded-full"></div>
                  <span className="text-gray-600">NO Price</span>
                </div>
              </div>
            </div>

            {/* Market Prediction Cards - Information Only */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {/* YES Outcome */}
              <div className="bg-white rounded-lg shadow-sm p-6 border-2 border-gray-200">
                <div className="flex items-center justify-between mb-4">
                  <div className="text-2xl font-bold text-gray-900">YES</div>
                  <div className="text-3xl font-light text-gray-900">{formatPercent(legislation.yesPrice)}</div>
                </div>
                <div className="text-sm text-gray-500 mb-4">Market prediction: Bill will pass</div>
                <div className="h-2 bg-gray-200 rounded-full overflow-hidden">
                  <div 
                    className="h-full bg-gresearch-vivid-green transition-all"
                    style={{ width: `${legislation.yesPrice * 100}%` }}
                  />
                </div>
                <div className="mt-4 text-xs text-gray-500">
                  Based on current market sentiment and analysis
                </div>
              </div>

              {/* NO Outcome */}
              <div className="bg-white rounded-lg shadow-sm p-6 border-2 border-gray-200">
                <div className="flex items-center justify-between mb-4">
                  <div className="text-2xl font-bold text-gray-900">NO</div>
                  <div className="text-3xl font-light text-gray-900">{formatPercent(legislation.noPrice)}</div>
                </div>
                <div className="text-sm text-gray-500 mb-4">Market prediction: Bill will fail</div>
                <div className="h-2 bg-gray-200 rounded-full overflow-hidden">
                  <div 
                    className="h-full bg-gresearch-vivid-red transition-all"
                    style={{ width: `${legislation.noPrice * 100}%` }}
                  />
                </div>
                <div className="mt-4 text-xs text-gray-500">
                  Based on current market sentiment and analysis
                </div>
              </div>
            </div>

            {/* Affected Stocks Section */}
            <div className="bg-white rounded-lg shadow-sm p-6">
              <h3 className="text-lg font-semibold text-gray-900 mb-4">Affected Stocks</h3>
              <p className="text-sm text-gray-600 mb-4">
                Companies that would be impacted by this legislation
              </p>
              <div className="space-y-3">
                {legislation.affectedStocks && legislation.affectedStocks.map((stock, idx) => (
                  <div key={idx} className="border border-gray-200 rounded-lg p-4 hover:border-gray-300 transition-colors">
                    <div className="flex items-start justify-between mb-2">
                      <div className="flex-1">
                        <div className="flex items-center gap-3 mb-1">
                          <div className="w-10 h-10 bg-gray-100 rounded-full flex items-center justify-center font-bold text-gray-700">
                            {stock.symbol}
                          </div>
                          <div>
                            <div className="font-semibold text-gray-900">{stock.name}</div>
                            <div className="text-xs text-gray-500">{stock.sector}</div>
                          </div>
                        </div>
                        <p className="text-xs text-gray-600 mt-2">{stock.relevance}</p>
                      </div>
                      <div className="text-right ml-4">
                        <div className="text-lg font-semibold text-gray-900">${stock.currentPrice.toFixed(2)}</div>
                        <div className={`text-sm font-medium ${stock.change >= 0 ? 'text-gresearch-vivid-green' : 'text-gresearch-vivid-red'}`}>
                          {stock.change >= 0 ? '+' : ''}{stock.change.toFixed(2)} ({stock.changePercent >= 0 ? '+' : ''}{stock.changePercent.toFixed(2)}%)
                        </div>
                        <div className="text-xs text-gray-500 mt-1">Mkt Cap: {stock.marketCap}</div>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Congressmen Supporters Section */}
            <div className="bg-white rounded-lg shadow-sm p-6">
              <div className="flex items-center justify-between mb-4">
                <div>
                  <h3 className="text-lg font-semibold text-gray-900">Congressmen Supporters</h3>
                  <p className="text-sm text-gray-600 mt-1">
                    {legislation.supportingCongressmen?.length || 0} supporters with trading activity
                  </p>
                </div>
                {legislation.activitySummary && (
                  <div className="text-right">
                    <div className="text-xs text-gray-500">Suspicious Trades</div>
                    <div className="text-xl font-semibold text-gresearch-vivid-red">
                      {legislation.activitySummary.suspiciousTrades}
                    </div>
                  </div>
                )}
              </div>
              
              <div className="space-y-4">
                {legislation.supportingCongressmen && legislation.supportingCongressmen.map((congressman, idx) => (
                  <div key={idx} className="border border-gray-200 rounded-lg p-4">
                    <div className="flex items-start gap-4 mb-3">
                      <img 
                        src={congressman.image} 
                        alt={congressman.name}
                        className="w-16 h-16 rounded-full object-cover border-2 border-gray-200"
                        onError={(e) => {
                          e.target.style.display = 'none';
                        }}
                      />
                      <div className="flex-1">
                        <div className="flex items-center gap-2 mb-1">
                          <Link
                            to={`/congressman/${congressman.id}/trading`}
                            className="font-semibold text-gray-900 hover:text-gresearch-vivid-cyan-blue transition-colors"
                          >
                            {congressman.name}
                          </Link>
                          <span className={`px-2 py-0.5 rounded text-xs font-medium ${
                            congressman.party === 'Democratic' 
                              ? 'bg-blue-100 text-blue-800' 
                              : 'bg-red-100 text-red-800'
                          }`}>
                            {congressman.party}
                          </span>
                          <span className="px-2 py-0.5 rounded text-xs font-medium bg-gray-100 text-gray-700">
                            {congressman.role}
                          </span>
                        </div>
                        <div className="text-xs text-gray-600">
                          {congressman.chamber} / {congressman.state}
                        </div>
                      </div>
                    </div>
                    
                    {congressman.tradingActivity && congressman.tradingActivity.length > 0 ? (
                      <div className="mt-3 border-t border-gray-200 pt-3">
                        <div className="text-xs font-semibold text-gray-700 mb-2">Trading Activity:</div>
                        <div className="space-y-2">
                          {congressman.tradingActivity.map((trade, tradeIdx) => (
                            <div key={tradeIdx} className="bg-red-50 border border-red-200 rounded-lg p-3">
                              <div className="flex items-center justify-between mb-1">
                                <div className="flex items-center gap-2">
                                  <span className="font-semibold text-gray-900">{trade.stock}</span>
                                  <span className={`px-2 py-0.5 rounded text-xs font-medium ${
                                    trade.action === 'Purchase' 
                                      ? 'bg-gresearch-yellow/20 text-gray-900 border border-gresearch-yellow/40'
                                      : 'bg-gresearch-vivid-red/20 text-gresearch-vivid-red border border-gresearch-vivid-red/40'
                                  }`}>
                                    {trade.action}
                                  </span>
                                  <span className="px-2 py-0.5 rounded text-xs font-medium bg-red-100 text-red-800 border border-red-200">
                                    {trade.status}
                                  </span>
                                </div>
                                <span className={`text-sm font-semibold ${
                                  trade.excessReturn >= 0 ? 'text-gresearch-vivid-green' : 'text-gresearch-vivid-red'
                                }`}>
                                  {trade.excessReturn >= 0 ? '+' : ''}{trade.excessReturn.toFixed(1)}% return
                                </span>
                              </div>
                              <div className="grid grid-cols-3 gap-2 text-xs text-gray-600 mt-2">
                                <div>
                                  <span className="text-gray-500">Date:</span> {new Date(trade.date).toLocaleDateString()}
                                </div>
                                <div>
                                  <span className="text-gray-500">Amount:</span> {trade.amount}
                                </div>
                                <div>
                                  <span className="text-gray-500">{trade.daysBeforeBill} days before bill</span>
                                </div>
                              </div>
                            </div>
                          ))}
                        </div>
                      </div>
                    ) : (
                      <div className="mt-3 border-t border-gray-200 pt-3">
                        <div className="text-xs text-gray-500">No trading activity on affected stocks</div>
                      </div>
                    )}
                  </div>
                ))}
              </div>

              {/* Activity Summary */}
              {legislation.activitySummary && legislation.activitySummary.totalTrades > 0 && (
                <div className="mt-6 bg-gray-50 rounded-lg p-4 border border-gray-200">
                  <h4 className="text-sm font-semibold text-gray-900 mb-3">Activity Summary</h4>
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
                    <div>
                      <div className="text-gray-500 mb-1">Total Trades</div>
                      <div className="font-semibold text-gray-900">{legislation.activitySummary.totalTrades}</div>
                    </div>
                    <div>
                      <div className="text-gray-500 mb-1">Suspicious</div>
                      <div className="font-semibold text-gresearch-vivid-red">{legislation.activitySummary.suspiciousTrades}</div>
                    </div>
                    <div>
                      <div className="text-gray-500 mb-1">Total Volume</div>
                      <div className="font-semibold text-gray-900">{legislation.activitySummary.totalVolume}</div>
                    </div>
                    <div>
                      <div className="text-gray-500 mb-1">Avg Excess Return</div>
                      <div className="font-semibold text-gresearch-vivid-green">+{legislation.activitySummary.averageExcessReturn.toFixed(1)}%</div>
                    </div>
                  </div>
                </div>
              )}
            </div>

            {/* Resolution Criteria */}
            <div className="bg-white rounded-lg shadow-sm p-6">
              <h3 className="text-lg font-semibold text-gray-900 mb-3">Resolution Criteria</h3>
              <p className="text-sm text-gray-600">{legislation.resolutionCriteria}</p>
            </div>
          </div>

          {/* Right Column - Market Stats */}
          <div className="space-y-6">
            {/* Market Statistics */}
            <div className="bg-white rounded-lg shadow-sm p-6">
              <h3 className="text-lg font-semibold text-gray-900 mb-4">Market Statistics</h3>
              <div className="space-y-4">
                <div>
                  <div className="text-xs text-gray-500 mb-1">24h Volume</div>
                  <div className="text-xl font-semibold text-gray-900">{formatCurrency(legislation.volume24h)}</div>
                </div>
                <div>
                  <div className="text-xs text-gray-500 mb-1">Liquidity</div>
                  <div className="text-xl font-semibold text-gray-900">{formatCurrency(legislation.liquidity)}</div>
                </div>
                <div>
                  <div className="text-xs text-gray-500 mb-1">Market Cap</div>
                  <div className="text-xl font-semibold text-gray-900">{formatCurrency(legislation.marketCap)}</div>
                </div>
              </div>
            </div>

            {/* Quick Stats */}
            <div className="bg-white rounded-lg shadow-sm p-6">
              <h3 className="text-lg font-semibold text-gray-900 mb-4">Bill Details</h3>
              <div className="space-y-4">
                <div className="space-y-3 text-sm">
                  <div>
                    <span className="text-gray-500">Introduced:</span>
                    <span className="ml-2 font-medium text-gray-900">
                      {new Date(legislation.date).toLocaleDateString()}
                    </span>
                  </div>
                  <div>
                    <span className="text-gray-500">Committees:</span>
                    <div className="mt-1">
                      {legislation.committees.map((committee, idx) => (
                        <span key={idx} className="inline-block mr-2 mb-1 px-2 py-1 bg-gray-100 rounded text-xs text-gray-700">
                          {committee}
                        </span>
                      ))}
                    </div>
                  </div>
                </div>
                
                {/* Bill Link */}
                <div className="pt-3 border-t border-gray-200">
                  <a
                    href={legislation.billUrl || '#'}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center gap-2 text-sm text-blue-600 hover:text-blue-800 transition-colors mb-3"
                  >
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
                    </svg>
                    View Full Bill on Congress.gov
                  </a>
                </div>

                {/* AI Summarize Button */}
                <div className="pt-3 border-t border-gray-200">
                  <button
                    onClick={handleAISummarize}
                    disabled={isSummarizing}
                    className="w-full c-btn c-btn--yellow disabled:opacity-50 disabled:cursor-not-allowed text-sm"
                  >
                    {isSummarizing ? (
                      <span className="flex items-center gap-2">
                        <LoadingSpinner size="sm" />
                        Generating Summary...
                      </span>
                    ) : aiSummary ? (
                      'Hide AI Summary'
                    ) : (
                      <span className="flex items-center gap-2">
                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z" />
                        </svg>
                        AI Summarize Bill
                      </span>
                    )}
                  </button>
                  
                  {/* AI Summary Display */}
                  {aiSummary && (
                    <div className="mt-4 p-4 bg-gray-50 rounded-lg animate-fade-in">
                      <div className="flex items-center gap-2 mb-2">
                        <svg className="w-4 h-4 text-gresearch-vivid-cyan-blue" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z" />
                        </svg>
                        <span className="text-xs font-semibold text-gray-700">AI Summary</span>
                      </div>
                      <p className="text-sm text-gray-700 leading-relaxed">{aiSummary}</p>
                    </div>
                  )}
                </div>
              </div>
            </div>
          </div>
        </div>
      </Container>
    </div>
  );
};

export default LegislationBetPage;

