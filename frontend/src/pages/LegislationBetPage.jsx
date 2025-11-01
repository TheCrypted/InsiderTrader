import { useState, useEffect, useRef } from 'react';
import { useParams, Link } from 'react-router-dom';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, ReferenceLine } from 'recharts';
import Header from '../components/Header';
import Container from '../components/shared/Container';
import LoadingSpinner from '../components/shared/LoadingSpinner';
import { getLegislationDetails } from '../utils/legislationData';

const LegislationBetPage = () => {
  const { billId } = useParams();
  const [timeRange, setTimeRange] = useState('7d'); // '1d', '7d', '30d', 'all'
  const [aiSummary, setAiSummary] = useState(null);
  const [isSummarizing, setIsSummarizing] = useState(false);
  // Chart hover interaction state (from friend's changes)
  const [hoveredIndex, setHoveredIndex] = useState(null);
  const [hoverPosition, setHoverPosition] = useState(null);
  const chartContainerRef = useRef(null);
  // Async data loading state (from our changes)
  const [legislation, setLegislation] = useState(null);
  const [loading, setLoading] = useState(true);

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

  // Fetch legislation details from API with fallback to mock data
  useEffect(() => {
    const fetchLegislation = async () => {
      if (!billId) {
        console.error('No billId provided');
        setLoading(false);
        return;
      }
      
      try {
        setLoading(true);
        console.log(`Fetching legislation for billId: ${billId}`);
        
        // Also try to get data from graphBills for this bill
        const { graphBills } = await import('../utils/graphData');
        const graphBill = graphBills.find(b => b.id === billId);
        
        // Fetch legislation data - this will be fast as stock fetching has timeout
        const legislationDataPromise = getLegislationDetails(billId);
        
        // Set a timeout to prevent page from hanging
        const timeoutPromise = new Promise((resolve) => {
          setTimeout(() => {
            resolve(null); // Return null if timeout
          }, 2000); // 2 second max wait
        });
        
        const legislationData = await Promise.race([legislationDataPromise, timeoutPromise]);
        
        // If timeout, use graphBill data immediately
        if (!legislationData && graphBill) {
          console.log('Using graphBill data due to timeout');
          const quickLegislation = {
            id: billId,
            title: graphBill.title,
            question: `Will ${billId} pass Congress?`,
            summary: `${graphBill.title} - ${graphBill.sector} sector legislation.`,
            sponsor: `Sponsor of ${billId}`,
            status: graphBill.status || 'Pending',
            cosponsors: graphBill.cosponsors || 0,
            yesPrice: graphBill.cosponsors > 40 ? 0.65 : graphBill.cosponsors > 25 ? 0.45 : 0.30,
            noPrice: graphBill.cosponsors > 40 ? 0.35 : graphBill.cosponsors > 25 ? 0.55 : 0.70,
            volume24h: 0,
            liquidity: 0,
            marketCap: 0,
            resolutionDate: new Date(Date.now() + 365 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
            resolutionCriteria: 'This market resolves based on bill passage.',
            billUrl: `https://www.congress.gov/bill/117th-congress/${billId.includes('H') ? 'house-bill' : 'senate-bill'}/${billId.replace(/[^0-9]/g, '')}`,
            committees: graphBill.committees || [],
            date: graphBill.date || new Date().toISOString().split('T')[0],
            affectedStocks: [],
            supportingCongressmen: [],
            activitySummary: {
              totalTrades: 0,
              suspiciousTrades: 0,
              totalVolume: '$0',
              averageExcessReturn: 0
            },
            aiSummary: null,
          };
          
          setLegislation({
            ...quickLegislation,
            priceHistory: generatePriceHistory(30),
          });
          
          // Continue fetching in background and update when ready
          legislationDataPromise.then((fullData) => {
            if (fullData) {
              setLegislation({
                ...fullData,
                priceHistory: generatePriceHistory(30),
              });
            }
          }).catch(() => {
            // Already set quickLegislation, so ignore error
          });
          
          setLoading(false);
          return;
        }
        
        console.log('Legislation data received:', legislationData);
        
        // Ensure all required fields exist
        // Use graphBill data if available, otherwise use legislationData
        const completeLegislation = {
          id: billId,
          title: graphBill?.title || legislationData.title || `${billId} - Legislation`,
          question: legislationData.question || `Will ${billId} pass Congress?`,
          summary: legislationData.summary || graphBill?.summary || `${graphBill?.title || billId} - ${graphBill?.sector || 'General'} sector legislation.`,
          sponsor: legislationData.sponsor || `Sponsor of ${billId}`,
          status: graphBill?.status || legislationData.status || 'Pending',
          cosponsors: graphBill?.cosponsors || legislationData.cosponsors || 0,
          yesPrice: legislationData.yesPrice || (graphBill && graphBill.cosponsors > 40 ? 0.65 : graphBill && graphBill.cosponsors > 25 ? 0.45 : 0.30),
          noPrice: legislationData.noPrice || (graphBill && graphBill.cosponsors > 40 ? 0.35 : graphBill && graphBill.cosponsors > 25 ? 0.55 : 0.70),
          volume24h: legislationData.volume24h || 0,
          liquidity: legislationData.liquidity || 0,
          marketCap: legislationData.marketCap || 0,
          resolutionDate: legislationData.resolutionDate || new Date(Date.now() + 365 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
          resolutionCriteria: legislationData.resolutionCriteria || 'This market resolves based on bill passage.',
          billUrl: legislationData.billUrl || `https://www.congress.gov/bill/117th-congress/house-bill/${billId.replace(/[^0-9]/g, '')}`,
          committees: legislationData.committees || graphBill?.committees || [],
          date: graphBill?.date || legislationData.date || new Date().toISOString().split('T')[0],
          affectedStocks: legislationData.affectedStocks || [],
          supportingCongressmen: legislationData.supportingCongressmen || [],
          activitySummary: legislationData.activitySummary || {
            totalTrades: 0,
            suspiciousTrades: 0,
            totalVolume: '$0',
            averageExcessReturn: 0
          },
          aiSummary: legislationData.aiSummary || null,
          priceHistory: generatePriceHistory(30),
        };
        
        setLegislation(completeLegislation);
      } catch (error) {
        console.error('Error fetching legislation:', error);
        // Try to get from graphBills as fallback
        const { graphBills } = await import('../utils/graphData');
        const graphBill = graphBills.find(b => b.id === billId);
        
        if (graphBill) {
          // Use graphBill data
          setLegislation({
            id: billId,
            title: graphBill.title,
            question: `Will ${billId} pass Congress?`,
            summary: `${graphBill.title} - ${graphBill.sector} sector legislation.`,
            sponsor: `Sponsor of ${billId}`,
            status: graphBill.status || 'Pending',
            cosponsors: graphBill.cosponsors || 0,
            yesPrice: graphBill.cosponsors > 40 ? 0.65 : graphBill.cosponsors > 25 ? 0.45 : 0.30,
            noPrice: graphBill.cosponsors > 40 ? 0.35 : graphBill.cosponsors > 25 ? 0.55 : 0.70,
            volume24h: 0,
            liquidity: 0,
            marketCap: 0,
            resolutionDate: new Date(Date.now() + 365 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
            resolutionCriteria: 'This market resolves based on bill passage.',
            billUrl: `https://www.congress.gov/bill/117th-congress/${billId.includes('H') ? 'house-bill' : 'senate-bill'}/${billId.replace(/[^0-9]/g, '')}`,
            committees: graphBill.committees || [],
            date: graphBill.date || new Date().toISOString().split('T')[0],
            affectedStocks: [],
            supportingCongressmen: [],
            activitySummary: {
              totalTrades: 0,
              suspiciousTrades: 0,
              totalVolume: '$0',
              averageExcessReturn: 0
            },
            aiSummary: null,
            priceHistory: generatePriceHistory(30),
          });
        } else {
          // Final fallback: use mock data
          const { legislationDetails } = await import('../utils/legislationData');
          const fallbackData = legislationDetails[billId] || legislationDetails['H.R.1234'];
          setLegislation({
            ...fallbackData,
            id: billId,
            priceHistory: generatePriceHistory(30)
          });
        }
      } finally {
        setLoading(false);
      }
    };

    if (billId) {
      fetchLegislation();
    }
  }, [billId]);

  // Get sponsor congressman image
  const sponsorCongressman = legislation.supportingCongressmen?.find(c => c.role === 'Sponsor') || 
                               (legislation.sponsorId && legislation.supportingCongressmen?.find(c => c.id === legislation.sponsorId)) ||
                               legislation.supportingCongressmen?.[0];

  // Filter price history based on time range
  const getFilteredHistory = () => {
    if (!legislation || !legislation.priceHistory) return [];
    
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

  // Show loading spinner while fetching data
  if (loading || !legislation) {
    return (
      <div className="min-h-screen bg-gresearch-grey-200">
        <Header />
        <Container>
          <div className="flex items-center justify-center min-h-[80vh]">
            <LoadingSpinner size="lg" />
          </div>
        </Container>
      </div>
    );
  }

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
    <div className="min-h-screen bg-white">
      <Header />
      <div className="border-b border-black">
        <div className="container mx-auto px-6 py-4">
          {/* Back Link */}
          <Link
            to="/"
            className="inline-flex items-center gap-2 text-gray-700 hover:text-gray-900 transition-colors mb-4"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
            </svg>
            Back to Dashboard
          </Link>
        </div>
      </div>

      <div className="container mx-auto px-6 py-6">
        {/* Main Content */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-0 border-l border-r border-black">
          {/* Left Column - Market Info */}
          <div className="lg:col-span-2 space-y-0 p-0">
            {/* Title Section */}
            <div className="bg-white border-b border-black p-6">
              <div className="flex items-start justify-between mb-4 gap-4">
                <div className="flex-1">
                  <div className="text-sm text-gray-600 mb-2">{legislation.id}</div>
                  <h1 className="text-2xl font-bold text-gray-900 mb-3">{legislation.title}</h1>
                  <p className="text-lg font-semibold text-gray-700 mb-4">{legislation.question}</p>
                </div>
                {sponsorCongressman && sponsorCongressman.image && (
                  <div className="flex-shrink-0">
                    <img 
                      src={sponsorCongressman.image} 
                      alt={sponsorCongressman.name}
                      className="w-20 h-20 object-cover border border-black"
                      onError={(e) => {
                        e.target.style.display = 'none';
                      }}
                    />
                  </div>
                )}
              </div>
              
              <div className="border-t border-black pt-4">
                <p className="text-sm text-gray-600 mb-4">{legislation.summary}</p>
                <div className="grid grid-cols-2 gap-0">
                  <div className="p-3 border-r border-black">
                    <span className="text-xs text-gray-500">Sponsor:</span>
                    <div className="text-sm font-medium text-gray-900 mt-1">{legislation.sponsor}</div>
                  </div>
                  <div className="p-3">
                    <span className="text-xs text-gray-500">Status:</span>
                    <div className="text-sm font-medium text-gray-900 mt-1">{legislation.status}</div>
                  </div>
                  <div className="p-3 border-r border-black">
                    <span className="text-xs text-gray-500">Cosponsors:</span>
                    <div className="text-sm font-medium text-gray-900 mt-1">{legislation.cosponsors}</div>
                  </div>
                  <div className="p-3">
                    <span className="text-xs text-gray-500">Resolution Date:</span>
                    <div className="text-sm font-medium text-gray-900 mt-1">
                      {new Date(legislation.resolutionDate).toLocaleDateString()}
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* Historical Price Chart */}
            <div className="bg-white border-b border-black p-6 relative" ref={chartContainerRef}>
              <div className="flex items-center justify-between mb-4 border-b border-black pb-3">
                <h3 className="text-lg font-semibold text-gray-900">Price History</h3>
                <div className="flex gap-0 border border-black">
                  {['1d', '7d', '30d', 'all'].map((range, idx) => (
                    <button
                      key={range}
                      onClick={() => setTimeRange(range)}
                      className={`px-4 py-2 text-xs font-medium transition-all border-r border-black last:border-r-0 ${
                        timeRange === range
                          ? 'bg-black text-white'
                          : 'bg-white text-gray-900 hover:bg-gray-50'
                      }`}
                    >
                      {range.toUpperCase()}
                    </button>
                  ))}
                </div>
              </div>
              
              {priceHistory.length > 0 && (
                <div className="relative">
                  <ResponsiveContainer width="100%" height={350}>
                    <LineChart 
                      data={priceHistory} 
                      margin={{ top: 10, right: 120, left: 20, bottom: 20 }}
                    >
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
                          border: '1px solid black',
                          borderRadius: '0',
                          padding: '8px'
                        }}
                        cursor={{ stroke: '#000', strokeWidth: 1 }}
                        content={({ active, payload, label, coordinate }) => {
                          if (active && payload && payload.length && coordinate) {
                            const dataPoint = priceHistory.find(d => d.displayDate === label);
                            if (dataPoint) {
                              const index = priceHistory.indexOf(dataPoint);
                              setHoveredIndex(index);
                              setHoverPosition(coordinate.y);
                              return null; // We'll render custom tooltip
                            }
                          } else {
                            setHoveredIndex(null);
                            setHoverPosition(null);
                          }
                          return null;
                        }}
                      />
                      {hoveredIndex !== null && (
                        <ReferenceLine 
                          x={priceHistory[hoveredIndex]?.displayDate} 
                          stroke="#000" 
                          strokeWidth={1}
                          strokeDasharray="none"
                        />
                      )}
                      <Line 
                        type="monotone" 
                        dataKey="yesPrice" 
                        stroke="#22c55e" 
                        strokeWidth={2}
                        dot={false}
                        activeDot={{ r: 4 }}
                        name="YES"
                        animationDuration={500}
                      />
                      <Line 
                        type="monotone" 
                        dataKey="noPrice" 
                        stroke="#ef4444" 
                        strokeWidth={2}
                        dot={false}
                        activeDot={{ r: 4 }}
                        name="NO"
                        animationDuration={500}
                      />
                    </LineChart>
                  </ResponsiveContainer>
                  
                  {/* Custom hover labels on the right */}
                  {hoveredIndex !== null && priceHistory[hoveredIndex] && hoverPosition !== null && (
                    <div 
                      className="absolute right-0 flex flex-col gap-2 z-10 pointer-events-none"
                      style={{ 
                        top: `${hoverPosition}px`,
                        transform: 'translateY(-50%)',
                        right: '10px'
                      }}
                    >
                      <div 
                        className="px-3 py-2 border border-black text-xs font-medium whitespace-nowrap"
                        style={{ backgroundColor: '#22c55e' }}
                      >
                        <div className="text-white">YES</div>
                        <div className="text-white font-bold">
                          {(priceHistory[hoveredIndex].yesPrice * 100).toFixed(1)}%
                        </div>
                      </div>
                      <div 
                        className="px-3 py-2 border border-black text-xs font-medium whitespace-nowrap"
                        style={{ backgroundColor: '#ef4444' }}
                      >
                        <div className="text-white">NO</div>
                        <div className="text-white font-bold">
                          {(priceHistory[hoveredIndex].noPrice * 100).toFixed(1)}%
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              )}
              
              <div className="flex gap-6 mt-4 text-xs border-t border-black pt-4">
                <div className="flex items-center gap-2">
                  <div className="w-3 h-3 border border-black" style={{ backgroundColor: '#22c55e' }}></div>
                  <span className="text-gray-600">YES Price</span>
                </div>
                <div className="flex items-center gap-2">
                  <div className="w-3 h-3 border border-black" style={{ backgroundColor: '#ef4444' }}></div>
                  <span className="text-gray-600">NO Price</span>
                </div>
              </div>
            </div>

            {/* Market Prediction Cards - Information Only */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-0 border-t border-black">
              {/* YES Outcome */}
              <div className="bg-white p-6 border-r border-black">
                <div className="flex items-center justify-between mb-4">
                  <div className="text-2xl font-bold text-gray-900">YES</div>
                  <div className="text-3xl font-bold text-gray-900">{formatPercent(legislation.yesPrice)}</div>
                </div>
                <div className="text-sm text-gray-600 mb-4">Market prediction: Bill will pass</div>
                <div className="h-2 bg-gray-200 border border-black overflow-hidden">
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
              <div className="bg-white p-6">
                <div className="flex items-center justify-between mb-4">
                  <div className="text-2xl font-bold text-gray-900">NO</div>
                  <div className="text-3xl font-bold text-gray-900">{formatPercent(legislation.noPrice)}</div>
                </div>
                <div className="text-sm text-gray-600 mb-4">Market prediction: Bill will fail</div>
                <div className="h-2 bg-gray-200 border border-black overflow-hidden">
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

            {/* Congressmen Supporters Section */}
            <div className="bg-white border-t border-black p-6">
              <div className="flex items-center justify-between mb-4 border-b border-black pb-3">
                <div>
                  <h3 className="text-lg font-semibold text-gray-900">Congressmen Supporters</h3>
                  <p className="text-sm text-gray-600 mt-1">
                    {legislation.supportingCongressmen?.length || 0} supporters with trading activity
                  </p>
                </div>
                {legislation.activitySummary && (
                  <div className="text-right">
                    <div className="text-xs text-gray-500">Trades</div>
                    <div className="text-xl font-semibold text-gresearch-vivid-red">
                      {legislation.activitySummary.suspiciousTrades}
                    </div>
                  </div>
                )}
              </div>
              
              <div className="space-y-0">
                {legislation.supportingCongressmen && legislation.supportingCongressmen.map((congressman, idx) => (
                  <div key={idx} className={`border-b border-black p-4 ${idx === legislation.supportingCongressmen.length - 1 ? 'border-b-0' : ''}`}>
                    <div className="flex items-stretch gap-4 mb-3 border-b border-black pb-3 relative" style={{ minHeight: '64px' }}>
                      <div className="w-16 h-16 border border-black flex-shrink-0 self-center relative flex items-center justify-center bg-gray-200">
                        {congressman.image ? (
                          <img 
                            src={congressman.image} 
                            alt={congressman.name}
                            className="w-full h-full object-cover"
                            onError={(e) => {
                              e.target.style.display = 'none';
                              e.target.nextElementSibling.style.display = 'flex';
                            }}
                          />
                        ) : null}
                        <div className={`absolute inset-0 flex items-center justify-center bg-gray-200 text-gray-600 font-bold text-sm ${congressman.image ? 'hidden' : 'flex'}`}>
                          {congressman.name.split(' ').map(n => n[0]).join('').slice(0, 2)}
                        </div>
                      </div>
                      <div className="flex-1 flex flex-col justify-center">
                        <Link
                          to={`/congressman/${congressman.id}/trading`}
                          className="font-semibold text-gray-900 hover:text-gresearch-vivid-cyan-blue transition-colors"
                        >
                          {congressman.name}
                        </Link>
                        <div className="text-xs text-gray-600">
                          {congressman.chamber} / {congressman.state}
                        </div>
                      </div>
                      <div className="flex flex-col border-l border-black self-stretch">
                        <div 
                          className={`flex items-center justify-center flex-1 px-3 border-b border-black ${
                            congressman.party === 'Democratic' 
                              ? 'bg-blue-100 text-blue-800' 
                              : 'bg-red-100 text-red-800'
                          }`}
                        >
                          <span className="font-bold text-base">
                            {congressman.party === 'Democratic' ? 'D' : 'R'}
                          </span>
                        </div>
                        <div 
                          className="flex items-center justify-center flex-1 px-3 bg-gray-100 text-gray-700"
                        >
                          <span className="font-bold text-sm">
                            {congressman.role === 'Sponsor' ? 'S' : 'CS'}
                          </span>
                        </div>
                      </div>
                    </div>
                    
                    {congressman.tradingActivity && congressman.tradingActivity.length > 0 ? (
                      <div className="mt-3 pt-3">
                        <div className="text-xs font-semibold text-gray-700 mb-2">Trading Activity:</div>
                        <div className="space-y-0">
                          {congressman.tradingActivity.map((trade, tradeIdx) => (
                            <div key={tradeIdx} className={`bg-white p-3 ${tradeIdx > 0 ? 'border-t border-black' : ''}`}>
                              <div className="flex items-center justify-between mb-1">
                                <div className="flex items-center gap-2">
                                  <span className="font-semibold text-gray-900">{trade.stock}</span>
                                  <span className={`px-2 py-0.5 text-xs font-medium border border-black ${
                                    trade.action === 'Purchase' 
                                      ? 'bg-gresearch-yellow/20 text-gray-900'
                                      : 'bg-gresearch-vivid-red/20 text-gresearch-vivid-red'
                                  }`}>
                                    {trade.action}
                                  </span>
                                  {trade.status !== 'Suspicious' && (
                                    <span className="px-2 py-0.5 text-xs font-medium bg-red-100 text-red-800 border border-black">
                                      {trade.status}
                                    </span>
                                  )}
                                </div>
                                <span className={`text-sm font-semibold ${
                                  trade.excessReturn >= 0 ? 'text-gresearch-vivid-green' : 'text-gresearch-vivid-red'
                                }`}>
                                  {trade.excessReturn >= 0 ? '+' : ''}{trade.excessReturn.toFixed(1)}% return
                                </span>
                              </div>
                              <div className="flex gap-2 text-xs text-gray-600 mt-2">
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
                      <div className="mt-3 pt-3">
                        <div className="text-xs text-gray-500">No trading activity on affected stocks</div>
                      </div>
                    )}
                  </div>
                ))}
              </div>

            </div>

            {/* Activity Summary */}
            <div className="bg-white border-t border-black p-6">
              <h3 className="text-lg font-semibold text-gray-900 mb-4 border-b border-black pb-3">Activity Summary</h3>
              {legislation.activitySummary && legislation.activitySummary.totalTrades > 0 ? (
                <div className="grid grid-cols-2 md:grid-cols-4 gap-0">
                  <div className="p-3 border-r border-black">
                    <div className="text-xs text-gray-500 mb-1">Total Trades</div>
                    <div className="text-sm font-semibold text-gray-900">{legislation.activitySummary.totalTrades}</div>
                  </div>
                  <div className="p-3 border-r border-black md:border-r-0 md:border-r border-black">
                    <div className="text-xs text-gray-500 mb-1">Trades</div>
                    <div className="text-sm font-semibold text-gresearch-vivid-red">{legislation.activitySummary.suspiciousTrades}</div>
                  </div>
                  <div className="p-3 border-r border-black border-t border-black md:border-t-0">
                    <div className="text-xs text-gray-500 mb-1">Total Volume</div>
                    <div className="text-sm font-semibold text-gray-900">{legislation.activitySummary.totalVolume}</div>
                  </div>
                  <div className="p-3 border-t border-black md:border-t-0">
                    <div className="text-xs text-gray-500 mb-1">Avg Excess Return</div>
                    <div className="text-sm font-semibold text-gresearch-vivid-green">+{legislation.activitySummary.averageExcessReturn.toFixed(1)}%</div>
                  </div>
                </div>
              ) : (
                <div className="text-sm text-gray-600">No activity summary available</div>
              )}
            </div>
          </div>

          {/* Right Column - Market Stats */}
          <div className="space-y-0 border-l border-black p-0">
            {/* Market Statistics */}
            <div className="bg-white border-b border-black p-6">
              <h3 className="text-lg font-semibold text-gray-900 mb-4 border-b border-black pb-3">Market Statistics</h3>
              <div className="space-y-0">
                <div className="p-4 border-b border-black">
                  <div className="text-xs text-gray-500 mb-1">24h Volume</div>
                  <div className="text-xl font-semibold text-gray-900">{formatCurrency(legislation.volume24h)}</div>
                </div>
                <div className="p-4 border-b border-black">
                  <div className="text-xs text-gray-500 mb-1">Liquidity</div>
                  <div className="text-xl font-semibold text-gray-900">{formatCurrency(legislation.liquidity)}</div>
                </div>
                <div className="p-4">
                  <div className="text-xs text-gray-500 mb-1">Market Cap</div>
                  <div className="text-xl font-semibold text-gray-900">{formatCurrency(legislation.marketCap)}</div>
                </div>
              </div>
            </div>

            {/* Affected Stocks Section */}
            <div className="bg-white border-b border-black p-6">
              <h3 className="text-lg font-semibold text-gray-900 mb-4 border-b border-black pb-3">Affected Stocks</h3>
              <p className="text-sm text-gray-600 mb-4">
                Companies that would be impacted by this legislation
              </p>
              <div className="space-y-0">
                {legislation.affectedStocks && legislation.affectedStocks.map((stock, idx) => (
                  <div 
                    key={idx} 
                    className={`p-4 ${idx === legislation.affectedStocks.length - 1 ? '' : 'border-b border-black'}`}
                    style={{
                      backgroundColor: stock.change >= 0 ? 'rgba(34, 211, 153, 0.1)' : 'rgba(248, 113, 113, 0.1)'
                    }}
                  >
                    <div className="flex items-center justify-between gap-4">
                      <div className="flex items-center gap-3 flex-1 min-w-0">
                        <div className="w-10 h-10 bg-gray-100 border border-black flex items-center justify-center font-bold text-gray-700 flex-shrink-0">
                          {stock.symbol}
                        </div>
                        <div className="min-w-0 flex-1">
                          <div className="font-semibold text-gray-900 truncate">{stock.name}</div>
                          <div className="text-xs text-gray-500 truncate">{stock.sector}</div>
                        </div>
                      </div>
                      <div className="text-right ml-4 flex-shrink-0">
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

            {/* Quick Stats */}
            <div className="bg-white p-6">
              <h3 className="text-lg font-semibold text-gray-900 mb-4 border-b border-black pb-3">Bill Details</h3>
              <div className="space-y-4">
                <div className="space-y-0">
                  <div className="p-3 border-b border-black">
                    <span className="text-xs text-gray-500">Introduced:</span>
                    <div className="text-sm font-medium text-gray-900 mt-1">
                      {new Date(legislation.date).toLocaleDateString()}
                    </div>
                  </div>
                  <div className="p-3">
                    <span className="text-xs text-gray-500">Committees:</span>
                    <div className="mt-1">
                      {legislation.committees.map((committee, idx) => (
                        <span key={idx} className="inline-block mr-2 mb-1 px-2 py-1 bg-gray-100 text-xs text-gray-700 border border-black">
                          {committee}
                        </span>
                      ))}
                    </div>
                  </div>
                </div>
                
                {/* Bill Link */}
                <div className="pt-3 border-t border-black">
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
                <div className="pt-3 border-t border-black">
                  <button
                    onClick={handleAISummarize}
                    disabled={isSummarizing}
                    className="w-full px-4 py-3 bg-black text-white font-medium disabled:opacity-50 disabled:cursor-not-allowed text-sm hover:bg-stone-900 transition-colors"
                  >
                    {isSummarizing ? (
                      <span className="flex items-center gap-2 justify-center">
                        <LoadingSpinner size="sm" />
                        Generating Summary...
                      </span>
                    ) : aiSummary ? (
                      'Hide AI Summary'
                    ) : (
                      <span className="flex items-center gap-2 justify-center">
                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z" />
                        </svg>
                        AI Summarize Bill
                      </span>
                    )}
                  </button>
                  
                  {/* AI Summary Display */}
                  {aiSummary && (
                    <div className="mt-4 p-4 bg-gray-50 border border-black animate-fade-in">
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
      </div>
    </div>
  );
};

export default LegislationBetPage;

