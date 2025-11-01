import { useState, useEffect } from 'react';
import { useParams, Link } from 'react-router-dom';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, AreaChart, Area } from 'recharts';
import Container from '../components/shared/Container';
import LoadingSpinner from '../components/shared/LoadingSpinner';

const LegislationBetPage = () => {
  const { billId } = useParams();
  const [selectedOutcome, setSelectedOutcome] = useState(null); // 'yes' or 'no'
  const [betAmount, setBetAmount] = useState('');
  const [isLoading, setIsLoading] = useState(false);
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

  // Mock legislation data - in real app, fetch from API
  const mockLegislation = {
    'H.R.1234': {
      id: 'H.R.1234',
      title: 'AI Transparency and Accountability Act',
      question: 'Will the AI Transparency and Accountability Act pass Congress?',
      summary: 'Requires transparency in AI decision-making processes and establishes accountability frameworks for AI systems used in government and private sectors.',
      sponsor: 'Rep. Nancy Pelosi',
      status: 'In Committee',
      date: '2025-09-15',
      committees: ['Science, Space, and Technology', 'Energy and Commerce'],
      cosponsors: 45,
      yesPrice: 0.68, // 68% probability
      noPrice: 0.32, // 32% probability
      volume24h: 245000,
      liquidity: 125000,
      marketCap: 890000,
      resolutionDate: '2025-12-31',
      resolutionCriteria: 'This market resolves to YES if the bill is signed into law before the resolution date. It resolves to NO if the bill fails to pass, is vetoed, or the resolution date passes without enactment.',
      priceHistory: generatePriceHistory(30),
      billUrl: 'https://www.congress.gov/bill/118th-congress/house-bill/1234',
      aiSummary: 'This legislation mandates comprehensive transparency requirements for AI systems deployed by government agencies and private entities. It establishes accountability frameworks including mandatory disclosure of AI decision-making processes, algorithmic bias assessments, and consumer notification protocols. The bill creates new regulatory oversight mechanisms through the FTC and requires periodic audits of high-risk AI applications.'
    },
    'H.R.2456': {
      id: 'H.R.2456',
      title: 'Financial Technology Innovation Act',
      question: 'Will the Financial Technology Innovation Act pass Congress?',
      summary: 'Promotes innovation in financial technology while ensuring consumer protection and regulatory compliance.',
      sponsor: 'Rep. Ro Khanna',
      status: 'In Committee',
      date: '2025-08-20',
      committees: ['Financial Services'],
      cosponsors: 32,
      yesPrice: 0.42,
      noPrice: 0.58,
      volume24h: 189000,
      liquidity: 98000,
      marketCap: 645000,
      resolutionDate: '2025-12-31',
      resolutionCriteria: 'This market resolves to YES if the bill is signed into law before the resolution date.',
      priceHistory: generatePriceHistory(30),
      billUrl: 'https://www.congress.gov/bill/118th-congress/house-bill/2456',
      aiSummary: 'This act promotes innovation in financial technology by streamlining regulatory processes, establishing sandbox programs for fintech startups, and creating new pathways for digital banking services. It balances innovation with consumer protection through enhanced disclosure requirements and regulatory coordination between federal agencies. The legislation provides funding for fintech research and development initiatives.'
    }
  };

  const legislation = mockLegislation[billId] || mockLegislation['H.R.1234'];

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

  const handlePlaceBet = () => {
    if (!selectedOutcome || !betAmount || parseFloat(betAmount) <= 0) {
      return;
    }
    setIsLoading(true);
    // Simulate API call
    setTimeout(() => {
      setIsLoading(false);
      alert(`Bet placed: ${formatCurrency(parseFloat(betAmount))} on ${selectedOutcome === 'yes' ? 'YES' : 'NO'}`);
      setBetAmount('');
      setSelectedOutcome(null);
    }, 1000);
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

            {/* Outcome Cards */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {/* YES Outcome */}
              <div 
                className={`bg-white rounded-lg shadow-sm p-6 border-2 transition-all cursor-pointer ${
                  selectedOutcome === 'yes' 
                    ? 'border-gresearch-yellow bg-gresearch-yellow/5' 
                    : 'border-transparent hover:border-gray-300'
                }`}
                onClick={() => setSelectedOutcome('yes')}
              >
                <div className="flex items-center justify-between mb-4">
                  <div className="text-2xl font-bold text-gray-900">YES</div>
                  <div className="text-3xl font-light text-gray-900">{formatPercent(legislation.yesPrice)}</div>
                </div>
                <div className="text-sm text-gray-500 mb-4">Buy YES shares to bet it passes</div>
                <div className="h-2 bg-gray-200 rounded-full overflow-hidden">
                  <div 
                    className="h-full bg-gresearch-vivid-green transition-all"
                    style={{ width: `${legislation.yesPrice * 100}%` }}
                  />
                </div>
                <div className="mt-4 text-xs text-gray-400">
                  Current price: ${legislation.yesPrice.toFixed(2)} per share
                </div>
              </div>

              {/* NO Outcome */}
              <div 
                className={`bg-white rounded-lg shadow-sm p-6 border-2 transition-all cursor-pointer ${
                  selectedOutcome === 'no' 
                    ? 'border-gresearch-yellow bg-gresearch-yellow/5' 
                    : 'border-transparent hover:border-gray-300'
                }`}
                onClick={() => setSelectedOutcome('no')}
              >
                <div className="flex items-center justify-between mb-4">
                  <div className="text-2xl font-bold text-gray-900">NO</div>
                  <div className="text-3xl font-light text-gray-900">{formatPercent(legislation.noPrice)}</div>
                </div>
                <div className="text-sm text-gray-500 mb-4">Buy NO shares to bet it fails</div>
                <div className="h-2 bg-gray-200 rounded-full overflow-hidden">
                  <div 
                    className="h-full bg-gresearch-vivid-red transition-all"
                    style={{ width: `${legislation.noPrice * 100}%` }}
                  />
                </div>
                <div className="mt-4 text-xs text-gray-400">
                  Current price: ${legislation.noPrice.toFixed(2)} per share
                </div>
              </div>
            </div>

            {/* Trading Interface */}
            {selectedOutcome && (
              <div className="bg-white rounded-lg shadow-sm p-6 animate-fade-in">
                <h3 className="text-lg font-semibold text-gray-900 mb-4">
                  Place {selectedOutcome === 'yes' ? 'YES' : 'NO'} Order
                </h3>
                <div className="space-y-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Amount ($)
                    </label>
                    <input
                      type="number"
                      value={betAmount}
                      onChange={(e) => setBetAmount(e.target.value)}
                      placeholder="0.00"
                      min="0"
                      step="0.01"
                      className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-gresearch-yellow focus:border-transparent"
                    />
                  </div>
                  {betAmount && parseFloat(betAmount) > 0 && (
                    <div className="bg-gray-50 rounded-lg p-4 text-sm">
                      <div className="flex justify-between mb-2">
                        <span className="text-gray-600">Shares:</span>
                        <span className="font-semibold text-gray-900">
                          {(parseFloat(betAmount) / (selectedOutcome === 'yes' ? legislation.yesPrice : legislation.noPrice)).toFixed(2)}
                        </span>
                      </div>
                      <div className="flex justify-between mb-2">
                        <span className="text-gray-600">Price per share:</span>
                        <span className="font-semibold text-gray-900">
                          ${(selectedOutcome === 'yes' ? legislation.yesPrice : legislation.noPrice).toFixed(2)}
                        </span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-gray-600">Total cost:</span>
                        <span className="font-semibold text-gray-900">{formatCurrency(parseFloat(betAmount))}</span>
                      </div>
                    </div>
                  )}
                  <button
                    onClick={handlePlaceBet}
                    disabled={!betAmount || parseFloat(betAmount) <= 0 || isLoading}
                    className="w-full c-btn c-btn--yellow disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    {isLoading ? 'Processing...' : `Buy ${selectedOutcome === 'yes' ? 'YES' : 'NO'}`}
                  </button>
                </div>
              </div>
            )}

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

