import { useState, useEffect, useRef, useCallback } from 'react';
import { useParams, Link } from 'react-router-dom';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, ReferenceLine } from 'recharts';
import Header from '../components/Header';
import Container from '../components/shared/Container';
import LoadingSpinner from '../components/shared/LoadingSpinner';
import { getLegislationDetails } from '../utils/legislationData';
import { getPolymarketOddsForBill, getPolymarketBills, getBillRelevantStocks, getBillInfo, getCongressman, getBillPriceHistory, getMLPrediction, getBillCosponsors, getTrades } from '../utils/api';
import { useStockLogo } from '../hooks/useImage';
import { useSignalR } from '../hooks/useSignalR';

// Component to display stock logo with ticker fallback
const StockLogo = ({ ticker }) => {
  const { logoUrl, loading: logoLoading } = useStockLogo(ticker);
  
  return (
    <div className="w-10 h-10 rounded flex items-center justify-center font-bold text-xs text-gray-900 bg-white border border-gray-200 overflow-hidden flex-shrink-0 relative">
      {logoUrl && !logoLoading ? (
        <img 
          src={logoUrl} 
          alt={ticker} 
          className="w-full h-full object-contain p-1" 
          loading="lazy"
          onError={(e) => {
            // Hide image on error and show ticker symbol
            e.target.style.display = 'none';
            const tickerSpan = e.target.parentElement.querySelector('.ticker-fallback');
            if (tickerSpan) {
              tickerSpan.style.display = 'flex';
            }
          }} 
        />
      ) : null}
      <span 
        className={`ticker-fallback absolute inset-0 flex items-center justify-center ${logoUrl && !logoLoading ? 'hidden' : 'flex'}`}
        style={{ fontSize: '9px', fontWeight: '600' }}
      >
        {ticker && ticker !== '-' ? ticker : 'N/A'}
      </span>
    </div>
  );
};

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
  const [stocksLoading, setStocksLoading] = useState(false); // Loading state for affected stocks from /match API
  const [hasPolymarketData, setHasPolymarketData] = useState(false); // Whether bill exists in Polymarket
  const [priceHistoryLoading, setPriceHistoryLoading] = useState(false); // Loading state for price history
  const [mlPrediction, setMlPrediction] = useState(null); // ML model prediction percentage for yes
  const [mlPredictionLoading, setMlPredictionLoading] = useState(false); // Loading state for ML prediction
  const [tradeNotification, setTradeNotification] = useState(null); // Notification for trade/lobbying activity
  const [showNotification, setShowNotification] = useState(false); // Whether to show notification
  const [supportersPage, setSupportersPage] = useState(1); // Pagination state for supporters
  const supportersPerPage = 10;
  
  // Helper function to fetch and set supporters
  const fetchSupportersForBill = async (billId) => {
    if (!billId) return;
    
    try {
      const supporterData = await getBillCosponsors(billId);
      const { sponsors, cosponsors } = supporterData;
      
      // Combine sponsors and cosponsors
      const allSupporters = [
        ...sponsors.map(s => ({ ...s, role: 'Sponsor' })),
        ...cosponsors.map(c => ({ ...c, role: 'Cosponsor' }))
      ];
      
      if (allSupporters.length === 0) {
        return; // No supporters found
      }
      
      // Fetch congressman info for each supporter to get image, party, chamber
      const supportersWithInfo = await Promise.all(
        allSupporters.map(async (supporter) => {
          const bioguideId = supporter.bioguide_id || supporter.bioguideId;
          if (!bioguideId) {
            return {
              id: null,
              name: supporter.name || supporter.fullName || 'Unknown',
              party: supporter.party || 'Unknown',
              chamber: supporter.state ? (supporter.district ? 'House' : 'Senate') : 'Unknown',
              state: supporter.state || 'Unknown',
              image: null,
              role: supporter.role || 'Cosponsor',
              tradingActivity: [], // Optional - can be fetched later if needed
            };
          }
          
          try {
            const [congressman, trades] = await Promise.all([
              getCongressman(bioguideId),
              getTrades(bioguideId).catch(() => []) // Fetch trades, but don't fail if it errors
            ]);
            
            // Get top 2-3 trades sorted by date (most recent first)
            const topTrades = trades
              .sort((a, b) => {
                const dateA = a.traded ? new Date(a.traded) : new Date(0);
                const dateB = b.traded ? new Date(b.traded) : new Date(0);
                return dateB - dateA; // Most recent first
              })
              .slice(0, 3)
              .map(trade => ({
                stock: trade.stock || trade.ticker || '-',
                action: trade.transaction === 'Sale' ? 'Sale' : 'Purchase',
                date: trade.traded || trade.filed || new Date().toISOString(),
                amount: trade.amount || 'N/A',
                excessReturn: trade.excessReturn || 0,
                status: trade.excessReturn > 0 ? 'Suspicious' : null,
              }));
            
            if (congressman) {
              return {
                id: bioguideId,
                name: congressman.name || supporter.name || supporter.fullName || 'Unknown',
                party: congressman.party || supporter.party || 'Unknown',
                chamber: congressman.chamber || (supporter.district ? 'House' : 'Senate') || 'Unknown',
                state: congressman.state || supporter.state || 'Unknown',
                image: congressman.image || null,
                role: supporter.role || 'Cosponsor',
                tradingActivity: topTrades, // Top 2-3 trades
              };
            }
          } catch (error) {
            console.warn(`Error fetching congressman info for ${bioguideId}:`, error);
          }
          
          // Fallback if congressman fetch fails - try to get trades anyway
          let topTrades = [];
          try {
            const trades = await getTrades(bioguideId);
            topTrades = trades
              .sort((a, b) => {
                const dateA = a.traded ? new Date(a.traded) : new Date(0);
                const dateB = b.traded ? new Date(b.traded) : new Date(0);
                return dateB - dateA;
              })
              .slice(0, 3)
              .map(trade => ({
                stock: trade.stock || trade.ticker || '-',
                action: trade.transaction === 'Sale' ? 'Sale' : 'Purchase',
                date: trade.traded || trade.filed || new Date().toISOString(),
                amount: trade.amount || 'N/A',
                excessReturn: trade.excessReturn || 0,
                status: trade.excessReturn > 0 ? 'Suspicious' : null,
              }));
          } catch (err) {
            // Ignore trade fetch errors
          }
          
          return {
            id: bioguideId,
            name: supporter.name || supporter.fullName || 'Unknown',
            party: supporter.party || 'Unknown',
            chamber: supporter.district ? 'House' : 'Senate',
            state: supporter.state || 'Unknown',
            image: null,
            role: supporter.role || 'Cosponsor',
            tradingActivity: topTrades,
          };
        })
      );
      
      // Update legislation with supporters
      setLegislation(prev => {
        if (!prev) return prev;
        return {
          ...prev,
          supportingCongressmen: supportersWithInfo,
        };
      });
    } catch (error) {
      console.error('Error fetching supporters:', error);
      // Don't update on error - keep existing data
    }
  };

  // Helper function to build correct Congress.gov URL
  const buildCongressGovUrl = (billId) => {
    if (!billId) return '#';
    
    // Parse bill ID (e.g., "H.R.1234", "HR.1234", "S.567", "SJRES.88")
    const normalized = billId.toUpperCase().replace(/\./g, '');
    const billNumber = billId.replace(/[^0-9]/g, '');
    
    let billTypePath = 'house-bill';
    if (normalized.startsWith('S') && !normalized.startsWith('SJRES') && !normalized.startsWith('SRES') && !normalized.startsWith('SCONRES')) {
      billTypePath = 'senate-bill';
    } else if (normalized.startsWith('SJRES')) {
      billTypePath = 'senate-joint-resolution';
    } else if (normalized.startsWith('HJRES')) {
      billTypePath = 'house-joint-resolution';
    } else if (normalized.startsWith('SRES')) {
      billTypePath = 'senate-resolution';
    } else if (normalized.startsWith('HRES')) {
      billTypePath = 'house-resolution';
    } else if (normalized.startsWith('SCONRES')) {
      billTypePath = 'senate-concurrent-resolution';
    } else if (normalized.startsWith('HCONRES')) {
      billTypePath = 'house-concurrent-resolution';
    }
    // Default is 'house-bill' for HR, H.R., etc.
    
    return `https://www.congress.gov/bill/119th-congress/${billTypePath}/${billNumber}`;
  };

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
          
          // Check if bill exists in Polymarket
          const polymarketBills = await getPolymarketBills().catch(() => []);
          const normalizeBillId = (id) => {
            if (!id) return null;
            return id.replace(/\./g, '').replace(/\s/g, '').toUpperCase();
          };
          const billIdNormalized = normalizeBillId(billId);
          const existsInPolymarket = polymarketBills.some(bill => {
            const bId = normalizeBillId(bill.bill_id || bill.bill);
            return bId === billIdNormalized;
          });
          setHasPolymarketData(existsInPolymarket);
          
          const quickTitle = graphBill.title || `${billId} - Legislation`;
          const quickLegislation = {
            id: billId,
            title: quickTitle,
            question: `Will ${quickTitle} pass Congress?`, // Use actual bill title
            summary: `${quickTitle} - ${graphBill.sector} sector legislation.`,
            sponsor: `Sponsor of ${billId}`,
            sponsorBioguideId: null,
            status: graphBill.status || 'Pending',
            cosponsors: graphBill.cosponsors || 0,
            yesPrice: graphBill.cosponsors > 40 ? 0.65 : graphBill.cosponsors > 25 ? 0.45 : 0.30,
            noPrice: graphBill.cosponsors > 40 ? 0.35 : graphBill.cosponsors > 25 ? 0.55 : 0.70,
            volume24h: null,
            liquidity: null,
            marketCap: null,
            resolutionDate: new Date(Date.now() + 365 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
            resolutionCriteria: 'This market resolves based on bill passage.',
            billUrl: buildCongressGovUrl(billId),
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
            priceHistory: existsInPolymarket ? generatePriceHistory(30) : [],
          };
          
          setLegislation(quickLegislation);
          
          // Continue fetching in background and update when ready
          legislationDataPromise.then((fullData) => {
            if (fullData) {
              // Re-check Polymarket when full data arrives
              getPolymarketBills().then(polymarketBills => {
                const normalizeBillId = (id) => {
                  if (!id) return null;
                  return id.replace(/\./g, '').replace(/\s/g, '').toUpperCase();
                };
                const billIdNormalized = normalizeBillId(billId);
                const existsInPolymarket = polymarketBills.some(bill => {
                  const bId = normalizeBillId(bill.bill_id || bill.bill);
                  return bId === billIdNormalized;
                });
                setHasPolymarketData(existsInPolymarket);
                // Price history will be fetched separately via useEffect
                setLegislation({
                  ...fullData,
                  priceHistory: [], // Will be fetched from Polymarket if available
                });
              }).catch(() => {
                setHasPolymarketData(false);
                setLegislation({
                  ...fullData,
                  priceHistory: [],
                });
              });
            }
          }).catch(() => {
            // Already set quickLegislation, so ignore error
          });
          
          setLoading(false);
          return;
        }
        
        console.log('Legislation data received:', legislationData);
        
        // Handle case where legislationData is null (timeout or error)
        if (!legislationData) {
          console.log('Legislation data is null, using graphBill fallback');
          // We already handled this case above with graphBill, but if we reach here, use defaults
          const defaultTitle = graphBill?.title || `${billId} - Legislation`;
          const defaultLegislation = {
            id: billId,
            title: defaultTitle,
            question: `Will ${defaultTitle} pass Congress?`, // Use actual bill title
            summary: graphBill?.title || `${defaultTitle} - General sector legislation.`,
            sponsor: `Sponsor of ${billId}`,
            sponsorBioguideId: null, // Will be fetched from billInfo if available
            status: graphBill?.status || 'Pending',
            cosponsors: graphBill?.cosponsors || 0,
            yesPrice: graphBill?.cosponsors > 40 ? 0.65 : graphBill?.cosponsors > 25 ? 0.45 : 0.30,
            noPrice: graphBill?.cosponsors > 40 ? 0.35 : graphBill?.cosponsors > 25 ? 0.55 : 0.70,
            volume24h: null,
            liquidity: null,
            marketCap: null,
            resolutionDate: new Date(Date.now() + 365 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
            resolutionCriteria: 'This market resolves based on bill passage.',
            billUrl: buildCongressGovUrl(billId),
            committees: graphBill?.committees || [],
            date: graphBill?.date || new Date().toISOString().split('T')[0],
            affectedStocks: [],
            supportingCongressmen: [],
            activitySummary: {
              totalTrades: 0,
              suspiciousTrades: 0,
              totalVolume: '$0',
              averageExcessReturn: 0
            },
            aiSummary: null,
            priceHistory: [], // Will be set after Polymarket check
          };
          
          // Check if bill exists in Polymarket and update state
          getPolymarketBills().then(polymarketBills => {
            const normalizeBillId = (id) => {
              if (!id) return null;
              return id.replace(/\./g, '').replace(/\s/g, '').toUpperCase();
            };
            const billIdNormalized = normalizeBillId(billId);
            const existsInPolymarket = polymarketBills.some(bill => {
              const bId = normalizeBillId(bill.bill_id || bill.bill);
              return bId === billIdNormalized;
            });
            setHasPolymarketData(existsInPolymarket);
            // Price history will be fetched separately via useEffect
          }).catch(() => {
            setHasPolymarketData(false);
          });
          
          setLegislation(defaultLegislation);
          
          // Try to fetch bill info, Polymarket odds, and stocks in background (non-blocking)
          Promise.all([
            getBillInfo(billId).catch(() => null),
            getPolymarketOddsForBill(billId).catch(() => null),
          ]).then(([billInfo, polymarketOdds]) => {
            const actualStatus = billInfo?.status || defaultLegislation.status;
            const isEnacted = actualStatus === 'Enacted' || actualStatus === 'Passed Both Chambers';
            const isFailed = actualStatus === 'Failed' || actualStatus === 'Vetoed';
            
            let yesPrice = defaultLegislation.yesPrice;
            let noPrice = defaultLegislation.noPrice;
            let showOdds = true;
            
            if (polymarketOdds) {
              yesPrice = polymarketOdds.yes_percentage / 100;
              noPrice = polymarketOdds.no_percentage / 100;
            } else if (isEnacted) {
              yesPrice = 1.0;
              noPrice = 0.0;
            } else if (isFailed) {
              yesPrice = 0.0;
              noPrice = 1.0;
            } else {
              // No Polymarket data and status unknown - show N/A
              showOdds = false;
              yesPrice = null;
              noPrice = null;
            }
            
            const updatedTitle = billInfo?.title || prev.title;
            setLegislation(prev => ({
              ...prev,
              title: updatedTitle,
              question: `Will ${updatedTitle} pass Congress?`, // Update question to match title
              summary: billInfo?.latest_action?.text || prev.summary,
              sponsor: billInfo?.sponsors?.[0]?.name || prev.sponsor,
              sponsorBioguideId: billInfo?.sponsors?.[0]?.bioguide_id || prev.sponsorBioguideId || null,
              status: actualStatus,
              cosponsors: billInfo?.cosponsors_count || prev.cosponsors,
              yesPrice: yesPrice,
              noPrice: noPrice,
              showOdds: showOdds,
              volume24h: polymarketOdds?.volume ? parseInt(polymarketOdds.volume) : prev.volume24h,
            }));
          }).catch(err => {
            console.error('Error fetching additional data:', err);
          });
          
          setLegislation({
            ...defaultLegislation,
            showOdds: false, // Will update when we get bill info
            yesPrice: null,
            noPrice: null,
          });
          setLoading(false);
          return;
        }
        
        // Check if bill exists in Polymarket bills first
        const polymarketBills = await getPolymarketBills().catch(() => []);
        const normalizeBillId = (id) => {
          if (!id) return null;
          return id.replace(/\./g, '').replace(/\s/g, '').toUpperCase();
        };
        const billIdNormalized = normalizeBillId(billId);
        const existsInPolymarket = polymarketBills.some(bill => {
          const bId = normalizeBillId(bill.bill_id || bill.bill);
          return bId === billIdNormalized;
        });
        setHasPolymarketData(existsInPolymarket);
        
        // Fetch Polymarket odds and bill info from Congress API in parallel
        const [polymarketOdds, billInfo] = await Promise.all([
          getPolymarketOddsForBill(billId),
          getBillInfo(billId).catch(err => {
            console.warn(`Error fetching bill info for ${billId}:`, err);
            return null;
          })
        ]);
        
        // Determine status from billInfo if available
        const actualStatus = billInfo?.status || graphBill?.status || legislationData?.status || 'Pending';
        const isEnacted = actualStatus === 'Enacted' || actualStatus === 'Passed Both Chambers';
        const isFailed = actualStatus === 'Failed' || actualStatus === 'Vetoed';
        
        // Use Polymarket odds if available, otherwise check bill status
        let yesPrice = legislationData?.yesPrice;
        let noPrice = legislationData?.noPrice;
        let showOdds = true; // Whether to show odds or status
        
        if (polymarketOdds) {
          yesPrice = polymarketOdds.yes_percentage / 100;
          noPrice = polymarketOdds.no_percentage / 100;
          console.log(`Using Polymarket odds: Yes ${yesPrice}, No ${noPrice}`);
        } else if (isEnacted) {
          // Bill already passed - show 100% yes
          yesPrice = 1.0;
          noPrice = 0.0;
          showOdds = true;
        } else if (isFailed) {
          // Bill failed - show 100% no
          yesPrice = 0.0;
          noPrice = 1.0;
          showOdds = true;
        } else if (yesPrice === undefined || noPrice === undefined) {
          // No Polymarket data and status unknown - don't show fake odds, show N/A
          showOdds = false;
          yesPrice = null;
          noPrice = null;
        }
        
        // Don't use mock stocks - will be fetched from /match API
        // const stocksToUse = legislationData?.affectedStocks || []; // MOCK DATA - COMMENTED OUT
        const stocksToUse = []; // Start with empty array, will be populated by /match API
        console.log(`Starting with empty stocks array, will fetch from /match API in background`);
        
        // Ensure all required fields exist
        // Use graphBill data if available, otherwise use legislationData
        const billTitle = billInfo?.title || graphBill?.title || legislationData?.title || `${billId} - Legislation`;
        const completeLegislation = {
          id: billId,
          title: billTitle,
          question: `Will ${billTitle} pass Congress?`, // Use actual bill title in question
          summary: legislationData?.summary || graphBill?.summary || billInfo?.latest_action?.text || `${billTitle} - ${graphBill?.sector || 'General'} sector legislation.`,
          sponsor: billInfo?.sponsors?.[0]?.name || legislationData?.sponsor || `Sponsor of ${billId}`,
          sponsorBioguideId: billInfo?.sponsors?.[0]?.bioguide_id || null, // Store bioguide_id for fetching sponsor image
          status: actualStatus,
          cosponsors: billInfo?.cosponsors_count || graphBill?.cosponsors || legislationData?.cosponsors || 0,
          yesPrice: yesPrice,
          noPrice: noPrice,
          showOdds: showOdds, // Whether to show odds or status/N/A
          // Show N/A for volume/liquidity/marketCap if no Polymarket data
          volume24h: polymarketOdds?.volume ? parseInt(polymarketOdds.volume) : null,
          liquidity: polymarketOdds ? (legislationData?.liquidity || null) : null,
          marketCap: polymarketOdds ? (legislationData?.marketCap || null) : null,
          resolutionDate: legislationData?.resolutionDate || new Date(Date.now() + 365 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
          resolutionCriteria: legislationData?.resolutionCriteria || 'This market resolves based on bill passage.',
          billUrl: billInfo?.url || buildCongressGovUrl(billId),
          committees: legislationData?.committees || graphBill?.committees || [],
          date: graphBill?.date || legislationData?.date || new Date().toISOString().split('T')[0],
          affectedStocks: stocksToUse,
          supportingCongressmen: [], // Will be populated by fetching sponsors/cosponsors
          activitySummary: {
            totalTrades: 0,
            suspiciousTrades: 0,
            totalVolume: '$0',
            averageExcessReturn: 0
          }, // Optional - can be calculated later if needed
          aiSummary: legislationData?.aiSummary || null,
          priceHistory: [], // Will be fetched from Polymarket if available
        };
        
        setLegislation(completeLegislation);
        setLoading(false);
        
        // Fetch sponsors and cosponsors in background
        fetchSupportersForBill(billId);
      } catch (error) {
        console.error('Error fetching legislation:', error);
        // Try to get from graphBills as fallback
        const { graphBills } = await import('../utils/graphData');
        const graphBill = graphBills.find(b => b.id === billId);
        
        // Check if bill exists in Polymarket
        const polymarketBills = await getPolymarketBills().catch(() => []);
        const normalizeBillId = (id) => {
          if (!id) return null;
          return id.replace(/\./g, '').replace(/\s/g, '').toUpperCase();
        };
        const billIdNormalized = normalizeBillId(billId);
        const existsInPolymarket = polymarketBills.some(bill => {
          const bId = normalizeBillId(bill.bill_id || bill.bill);
          return bId === billIdNormalized;
        });
        setHasPolymarketData(existsInPolymarket);
        
        // Try to fetch bill info to get actual status (in background, non-blocking)
        const billInfo = await getBillInfo(billId).catch(() => null);
        const actualStatus = billInfo?.status || graphBill?.status || 'Pending';
        const isEnacted = actualStatus === 'Enacted' || actualStatus === 'Passed Both Chambers';
        const isFailed = actualStatus === 'Failed' || actualStatus === 'Vetoed';
        
        let yesPrice = null;
        let noPrice = null;
        let showOdds = false;
        
        if (isEnacted) {
          yesPrice = 1.0;
          noPrice = 0.0;
          showOdds = true;
        } else if (isFailed) {
          yesPrice = 0.0;
          noPrice = 1.0;
          showOdds = true;
        }
        
        if (graphBill) {
          // Use graphBill data
          const fallbackTitle = billInfo?.title || graphBill.title || `${billId} - Legislation`;
          const fallbackLegislation = {
            id: billId,
            title: fallbackTitle,
            question: `Will ${fallbackTitle} pass Congress?`, // Use actual bill title
            summary: billInfo?.latest_action?.text || `${fallbackTitle} - ${graphBill.sector} sector legislation.`,
            sponsor: billInfo?.sponsors?.[0]?.name || `Sponsor of ${billId}`,
            sponsorBioguideId: billInfo?.sponsors?.[0]?.bioguide_id || null,
            status: actualStatus,
            cosponsors: billInfo?.cosponsors_count || graphBill.cosponsors || 0,
            yesPrice: yesPrice,
            noPrice: noPrice,
            showOdds: showOdds,
            volume24h: null,
            liquidity: null,
            marketCap: null,
            resolutionDate: new Date(Date.now() + 365 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
            resolutionCriteria: 'This market resolves based on bill passage.',
            billUrl: buildCongressGovUrl(billId),
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
            priceHistory: [], // Will be fetched from Polymarket if available
          };
          
          setLegislation(fallbackLegislation);
          
          // Fetch supporters in background
          fetchSupportersForBill(billId);
        } else {
          // Final fallback: use mock data but fetch bill info to get actual status
          const { legislationDetails } = await import('../utils/legislationData');
          const fallbackData = legislationDetails[billId] || legislationDetails['H.R.1234'];
          
          // Check if bill exists in Polymarket
          const polymarketBills = await getPolymarketBills().catch(() => []);
          const normalizeBillId = (id) => {
            if (!id) return null;
            return id.replace(/\./g, '').replace(/\s/g, '').toUpperCase();
          };
          const billIdNormalized = normalizeBillId(billId);
          const existsInPolymarket = polymarketBills.some(bill => {
            const bId = normalizeBillId(bill.bill_id || bill.bill);
            return bId === billIdNormalized;
          });
          setHasPolymarketData(existsInPolymarket);
          
          // Try to fetch bill info to get actual status
          const billInfo = await getBillInfo(billId).catch(() => null);
          const actualStatus = billInfo?.status || fallbackData.status || 'Pending';
          const isEnacted = actualStatus === 'Enacted' || actualStatus === 'Passed Both Chambers';
          const isFailed = actualStatus === 'Failed' || actualStatus === 'Vetoed';
          
          let yesPrice = null;
          let noPrice = null;
          let showOdds = false;
          
          if (isEnacted) {
            yesPrice = 1.0;
            noPrice = 0.0;
            showOdds = true;
          } else if (isFailed) {
            yesPrice = 0.0;
            noPrice = 1.0;
            showOdds = true;
          }
          
          const finalTitle = billInfo?.title || fallbackData.title || `${billId} - Legislation`;
          const finalLegislation = {
            ...fallbackData,
            id: billId,
            title: finalTitle,
            question: `Will ${finalTitle} pass Congress?`, // Use actual bill title
            summary: billInfo?.latest_action?.text || fallbackData.summary || `${finalTitle} - General sector legislation.`,
            sponsor: billInfo?.sponsors?.[0]?.name || fallbackData.sponsor,
            sponsorBioguideId: billInfo?.sponsors?.[0]?.bioguide_id || null,
            status: actualStatus,
            cosponsors: billInfo?.cosponsors_count || fallbackData.cosponsors || 0,
            yesPrice: yesPrice,
            noPrice: noPrice,
            showOdds: showOdds,
            billUrl: billInfo?.url || buildCongressGovUrl(billId),
            priceHistory: [] // Will be fetched from Polymarket if available
          };
          
          setLegislation(finalLegislation);
          
          // Fetch supporters in background
          fetchSupportersForBill(billId);
        }
      } finally {
        setLoading(false);
      }
    };

    if (billId) {
      fetchLegislation();
    }
    
    // Reset pagination when billId changes
    setSupportersPage(1);
  }, [billId]);

  // Fetch stocks from /match API in background after legislation is loaded (useEffect to avoid React warning)
  useEffect(() => {
    if (!billId) return;
    
    // Always fetch from /match API - no mock data
    console.log(`Fetching related stocks for ${billId} from /match API (timeout: 15s)...`);
    setStocksLoading(true);
    
    let cancelled = false;
    
    getBillRelevantStocks(billId, 15000)
      .then(relatedStocks => {
        if (cancelled) return;
        
        if (relatedStocks && relatedStocks.length > 0) {
          console.log(`✓ Fetched ${relatedStocks.length} related stocks for bill ${billId} from /match API`);
          setLegislation(prev => {
            // Only update if we still have legislation and the billId matches
            if (!prev || prev.id !== billId) return prev;
            return {
              ...prev,
              affectedStocks: relatedStocks, // Use API data only
            };
          });
        } else {
          console.log(`No related stocks found for bill ${billId} from /match API`);
          // Set to empty array - will show N/A, but only if billId still matches
          setLegislation(prev => {
            if (!prev || prev.id !== billId) return prev;
            return {
              ...prev,
              affectedStocks: [],
            };
          });
        }
        setStocksLoading(false);
      })
      .catch(error => {
        if (cancelled) return;
        console.warn(`✗ Error fetching stocks from /match API for bill ${billId}:`, error.message || error);
        // On error, set to empty array - will show N/A, but only if billId still matches
        setLegislation(prev => {
          if (!prev || prev.id !== billId) return prev;
          return {
            ...prev,
            affectedStocks: [],
          };
        });
        setStocksLoading(false);
      });
    
    return () => {
      cancelled = true;
      // Don't set loading to false on cleanup to avoid flicker
    };
  }, [billId]); // Only re-fetch if billId changes

  // Fetch sponsor congressman data if we have bioguide_id
  const [sponsorCongressman, setSponsorCongressman] = useState(null);
  
  useEffect(() => {
    const fetchSponsor = async () => {
      if (legislation?.sponsorBioguideId) {
        try {
          const sponsorData = await getCongressman(legislation.sponsorBioguideId);
          if (sponsorData) {
            setSponsorCongressman({
              name: sponsorData.name,
              image: sponsorData.image,
            });
          }
        } catch (error) {
          console.warn(`Error fetching sponsor data for ${legislation.sponsorBioguideId}:`, error);
        }
      } else {
        // Fallback to supportingCongressmen if no bioguide_id
        const fallback = legislation?.supportingCongressmen?.find(c => c.role === 'Sponsor') || 
                         (legislation?.sponsorId && legislation?.supportingCongressmen?.find(c => c.id === legislation.sponsorId)) ||
                         legislation?.supportingCongressmen?.[0];
        if (fallback) {
          setSponsorCongressman(fallback);
        }
      }
    };
    
    if (legislation) {
      fetchSponsor();
    }
  }, [legislation?.sponsorBioguideId, legislation?.id]);

  // Fetch real price history from Polymarket when bill has Polymarket data
  useEffect(() => {
    const fetchRealPriceHistory = async () => {
      if (!legislation?.id || !hasPolymarketData) {
        return;
      }
      
      // Map time range to Polymarket interval
      const intervalMap = {
        '1d': '1d',
        '7d': '1w',
        '30d': 'max', // Use max for 30d to get all available history
        'all': 'max',
      };
      
      const interval = intervalMap[timeRange] || '1d';
      
      console.log(`Fetching real price history for ${legislation.id} with interval ${interval}...`);
      
      // Set loading state
      setPriceHistoryLoading(true);
      
      try {
        const history = await getBillPriceHistory(legislation.id, interval);
        
        if (history && history.length > 0) {
          console.log(`✓ Fetched ${history.length} price history points for ${legislation.id}`);
          
          // Filter based on timeRange if needed (for frontend filtering)
          let filteredHistory = history;
          if (timeRange !== 'all') {
            const today = new Date();
            const ranges = {
              '1d': 1,
              '7d': 7,
              '30d': 30,
            };
            const days = ranges[timeRange] || 30;
            const cutoffDate = new Date(today);
            cutoffDate.setDate(cutoffDate.getDate() - days);
            
            filteredHistory = history.filter(item => {
              return new Date(item.date) >= cutoffDate;
            });
          }
          
          setLegislation(prev => ({
            ...prev,
            priceHistory: filteredHistory,
          }));
        } else {
          console.log(`No price history returned for ${legislation.id}, using fallback`);
          // Fallback to generated data if API returns empty
          setLegislation(prev => ({
            ...prev,
            priceHistory: generatePriceHistory(timeRange === 'all' ? 90 : (timeRange === '1d' ? 1 : timeRange === '7d' ? 7 : 30)),
          }));
        }
      } catch (error) {
        console.warn(`Error fetching price history for ${legislation.id}, using fallback:`, error);
        // Fallback to generated data on error
        setLegislation(prev => ({
          ...prev,
          priceHistory: generatePriceHistory(timeRange === 'all' ? 90 : (timeRange === '1d' ? 1 : timeRange === '7d' ? 7 : 30)),
        }));
      } finally {
        // Clear loading state
        setPriceHistoryLoading(false);
      }
    };
    
    if (legislation && hasPolymarketData) {
      fetchRealPriceHistory();
    }
  }, [legislation?.id, hasPolymarketData, timeRange]);

  // Fetch ML model prediction when billId changes
  useEffect(() => {
    const fetchMLPrediction = async () => {
      if (!billId) {
        return;
      }
      
      setMlPredictionLoading(true);
      try {
        const prediction = await getMLPrediction(billId);
        if (prediction && prediction.probability !== null && prediction.probability !== undefined) {
          setMlPrediction(prediction);
          console.log(`✓ Fetched ML prediction for ${billId}: ${prediction.probability}`);
        } else {
          setMlPrediction(null);
        }
      } catch (error) {
        console.error(`Error fetching ML prediction for ${billId}:`, error);
        setMlPrediction(null);
      } finally {
        setMlPredictionLoading(false);
      }
    };
    
    fetchMLPrediction();
  }, [billId]);

  // Set up SignalR connection to listen for trade/lobbying activity
  const normalizeBillId = (id) => {
    if (!id) return null;
    return id.replace(/\./g, '').replace(/\s/g, '').toUpperCase();
  };

  const handleTradeOrLobbyingActivity = useCallback((notification) => {
    if (!notification || !billId) return;

    // Normalize bill IDs for comparison
    const currentBillIdNormalized = normalizeBillId(billId);
    const notificationBillIdNormalized = normalizeBillId(notification.billId);

    // Check if notification is for this bill
    if (notificationBillIdNormalized === currentBillIdNormalized) {
      console.log('Trade/lobbying activity detected for current bill:', notification);
      setTradeNotification(notification);
      setShowNotification(true);

      // Auto-hide notification after 10 seconds
      setTimeout(() => {
        setShowNotification(false);
      }, 10000);
    }
  }, [billId]);

  // Connect to SignalR hub
  const { isConnected, connectionError } = useSignalR(null, handleTradeOrLobbyingActivity);

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
    if (value === null || value === undefined || value === 0) return 'N/A';
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(value);
  };

  const formatPercent = (value) => {
    if (value === null || value === undefined) return 'N/A';
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
      
      {/* Trade/Lobbying Activity Notification */}
      {showNotification && tradeNotification && (
        <div className="fixed top-20 right-6 z-50 animate-slide-in-right max-w-md">
          <div className="bg-yellow-100 border-2 border-black shadow-lg p-4">
            <div className="flex items-start justify-between">
              <div className="flex-1">
                <div className="flex items-center gap-2 mb-2">
                  <svg className="w-5 h-5 text-yellow-800" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                  <h4 className="font-bold text-yellow-900">New Trade/Lobbying Activity</h4>
                </div>
                <p className="text-sm text-yellow-800 mb-1">
                  Activity detected for bill <span className="font-semibold">{tradeNotification.billId}</span>
                </p>
                {tradeNotification.updatedAt && (
                  <p className="text-xs text-yellow-700">
                    Updated: {new Date(tradeNotification.updatedAt).toLocaleString()}
                  </p>
                )}
              </div>
              <button
                onClick={() => setShowNotification(false)}
                className="ml-4 text-yellow-800 hover:text-yellow-900 transition-colors"
                aria-label="Close notification"
              >
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>
          </div>
        </div>
      )}

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
                <p className="text-sm text-gray-600 mb-4">
                  {legislation.summary && !legislation.summary.includes('General sector legislation') && !legislation.summary.includes('sector legislation')
                    ? legislation.summary 
                    : 'N/A'}
                </p>
                <div className="grid grid-cols-2 gap-0">
                  <div className="p-3 border-r border-black">
                    <span className="text-xs text-gray-500">Sponsor:</span>
                    <div className="text-sm font-medium text-gray-900 mt-1">
                      {legislation.sponsor && !legislation.sponsor.includes('Sponsor of') 
                        ? legislation.sponsor 
                        : 'N/A'}
                    </div>
                  </div>
                  <div className="p-3">
                    <span className="text-xs text-gray-500">Status:</span>
                    <div className="text-sm font-medium text-gray-900 mt-1">
                      {legislation.status && legislation.status !== 'Pending' 
                        ? legislation.status 
                        : 'N/A'}
                    </div>
                  </div>
                  <div className="p-3 border-t border-r border-black">
                    <span className="text-xs text-gray-500">Cosponsors:</span>
                    <div className="text-sm font-medium text-gray-900 mt-1">
                      {legislation.cosponsors && legislation.cosponsors > 0 
                        ? legislation.cosponsors 
                        : 'N/A'}
                    </div>
                  </div>
                  <div className="p-3 border-t border-black">
                    <span className="text-xs text-gray-500">Resolution Date:</span>
                    <div className="text-sm font-medium text-gray-900 mt-1">
                      {legislation.resolutionDate && legislation.resolutionDate !== new Date(Date.now() + 365 * 24 * 60 * 60 * 1000).toISOString().split('T')[0]
                        ? new Date(legislation.resolutionDate).toLocaleDateString()
                        : 'N/A'}
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* Historical Price Chart - Only show if bill has Polymarket data */}
            {hasPolymarketData && (
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
              
              {/* Show loading spinner while fetching price history */}
              {priceHistoryLoading ? (
                <div className="flex items-center justify-center py-20">
                  <div className="flex flex-col items-center gap-4">
                    <LoadingSpinner />
                    <p className="text-sm text-gray-600">Loading price history...</p>
                  </div>
                </div>
              ) : priceHistory.length > 0 ? (
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
              ) : (
                // Show empty state if no price history available and not loading
                <div className="flex items-center justify-center py-20">
                  <p className="text-sm text-gray-500">No price history available</p>
                </div>
              )}
              
              {/* Legend - only show if we have data */}
              {priceHistory.length > 0 && (
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
              )}
            </div>
            )}

            {/* Market Prediction Cards - Information Only - Only show if bill has Polymarket data */}
            {hasPolymarketData && (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-0 border-t border-black">
              {/* YES Outcome */}
              <div className="bg-white p-6 border-r border-black">
                <div className="flex items-center justify-between mb-4">
                  <div className="text-2xl font-bold text-gray-900">YES</div>
                  {legislation.showOdds !== false && legislation.yesPrice !== null ? (
                    <div className="text-3xl font-bold text-gray-900">{formatPercent(legislation.yesPrice)}</div>
                  ) : (
                    <div className="text-3xl font-bold text-gray-500">N/A</div>
                  )}
                </div>
                <div className="text-sm text-gray-600 mb-4">
                  {legislation.showOdds !== false && legislation.yesPrice !== null 
                    ? 'Market prediction: Bill will pass' 
                    : `Status: ${legislation.status || 'Pending'}`}
                </div>
                {legislation.showOdds !== false && legislation.yesPrice !== null ? (
                  <div className="h-2 bg-gray-200 border border-black overflow-hidden">
                    <div 
                      className="h-full bg-gresearch-vivid-green transition-all"
                      style={{ width: `${legislation.yesPrice * 100}%` }}
                    />
                  </div>
                ) : (
                  <div className="h-2 bg-gray-200 border border-black overflow-hidden">
                    <div className="bg-gray-400 h-full w-full" />
                  </div>
                )}
                <div className="mt-4 text-xs text-gray-500">
                  {legislation.showOdds !== false && legislation.yesPrice !== null 
                    ? 'Based on current market sentiment and analysis'
                    : 'No prediction market data available'}
                </div>
              </div>

              {/* NO Outcome */}
              <div className="bg-white p-6">
                <div className="flex items-center justify-between mb-4">
                  <div className="text-2xl font-bold text-gray-900">NO</div>
                  {legislation.showOdds !== false && legislation.noPrice !== null ? (
                    <div className="text-3xl font-bold text-gray-900">{formatPercent(legislation.noPrice)}</div>
                  ) : (
                    <div className="text-3xl font-bold text-gray-500">N/A</div>
                  )}
                </div>
                <div className="text-sm text-gray-600 mb-4">
                  {legislation.showOdds !== false && legislation.noPrice !== null 
                    ? 'Market prediction: Bill will fail' 
                    : `Status: ${legislation.status || 'Pending'}`}
                </div>
                {legislation.showOdds !== false && legislation.noPrice !== null ? (
                  <div className="h-2 bg-gray-200 border border-black overflow-hidden">
                    <div 
                      className="h-full bg-gresearch-vivid-red transition-all"
                      style={{ width: `${legislation.noPrice * 100}%` }}
                    />
                  </div>
                ) : (
                  <div className="h-2 bg-gray-200 border border-black overflow-hidden">
                    <div className="bg-gray-400 h-full w-full" />
                  </div>
                )}
                <div className="mt-4 text-xs text-gray-500">
                  {legislation.showOdds !== false && legislation.noPrice !== null 
                    ? 'Based on current market sentiment and analysis'
                    : 'No prediction market data available'}
                </div>
              </div>
            </div>
            )}

            {/* Congressmen Supporters Section */}
            <div className="bg-white border-t border-black p-6">
              <div className="flex items-center justify-between mb-4 border-b border-black pb-3">
                <div>
                  <h3 className="text-lg font-semibold text-gray-900">Congressmen Supporters</h3>
                  <p className="text-sm text-gray-600 mt-1">
                    {legislation.supportingCongressmen && legislation.supportingCongressmen.length > 0
                      ? `${legislation.supportingCongressmen.length} supporters with trading activity`
                      : 'N/A'}
                  </p>
                </div>
                {legislation.activitySummary && legislation.activitySummary.totalTrades > 0 && (
                  <div className="text-right">
                    <div className="text-xs text-gray-500">Trades</div>
                    <div className="text-xl font-semibold text-gresearch-vivid-red">
                      {legislation.activitySummary.suspiciousTrades || 'N/A'}
                    </div>
                  </div>
                )}
              </div>
              
              {legislation.supportingCongressmen && legislation.supportingCongressmen.length > 0 ? (
              <>
              <div className="space-y-0">
                {legislation.supportingCongressmen
                  .slice((supportersPage - 1) * supportersPerPage, supportersPage * supportersPerPage)
                  .map((congressman, idx) => {
                    const globalIdx = (supportersPage - 1) * supportersPerPage + idx;
                    const displayedSupporters = legislation.supportingCongressmen.slice((supportersPage - 1) * supportersPerPage, supportersPage * supportersPerPage);
                    const isLastInPage = idx === displayedSupporters.length - 1;
                    return (
                  <div key={congressman.id || globalIdx} className={`border-b border-black p-4 ${isLastInPage ? 'border-b-0' : ''}`}>
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
                        <div className="text-xs font-semibold text-gray-700 mb-2">Recent Trading Activity:</div>
                        <div className="space-y-0">
                          {congressman.tradingActivity.map((trade, tradeIdx) => (
                            <div key={tradeIdx} className={`bg-white p-3 ${tradeIdx > 0 ? 'border-t border-black' : ''}`}>
                              <div className="flex items-center justify-between mb-1">
                                <div className="flex items-center gap-2">
                                  <StockLogo ticker={trade.stock} />
                                  <span className="font-semibold text-gray-900">{trade.stock}</span>
                                  <span className={`px-2 py-0.5 text-xs font-medium border border-black ${
                                    trade.action === 'Purchase' 
                                      ? 'bg-gresearch-yellow/20 text-gray-900'
                                      : 'bg-gresearch-vivid-red/20 text-gresearch-vivid-red'
                                  }`}>
                                    {trade.action}
                                  </span>
                                  {trade.status === 'Suspicious' && (
                                    <span className="px-2 py-0.5 text-xs font-medium bg-red-100 text-red-800 border border-black">
                                      {trade.status}
                                    </span>
                                  )}
                                </div>
                                {trade.excessReturn !== 0 && (
                                  <span className={`text-sm font-semibold ${
                                    trade.excessReturn >= 0 ? 'text-gresearch-vivid-green' : 'text-gresearch-vivid-red'
                                  }`}>
                                    {trade.excessReturn >= 0 ? '+' : ''}{trade.excessReturn.toFixed(1)}% return
                                  </span>
                                )}
                              </div>
                              <div className="flex gap-2 text-xs text-gray-600 mt-2">
                                <div>
                                  <span className="text-gray-500">Date:</span> {new Date(trade.date).toLocaleDateString()}
                                </div>
                                <div>
                                  <span className="text-gray-500">Amount:</span> {trade.amount}
                                </div>
                              </div>
                            </div>
                          ))}
                        </div>
                      </div>
                    ) : (
                      <div className="mt-3 pt-3">
                        <div className="text-xs text-gray-500">No trading data available</div>
                      </div>
                    )}
                  </div>
                    );
                  })}
              </div>
              
              {/* Pagination Controls */}
              {legislation.supportingCongressmen.length > supportersPerPage && (
                <div className="flex items-center justify-between border-t border-black p-4 mt-0">
                  <button
                    onClick={() => setSupportersPage(prev => Math.max(1, prev - 1))}
                    disabled={supportersPage === 1}
                    className={`px-4 py-2 border border-black font-semibold transition-colors ${
                      supportersPage === 1
                        ? 'bg-gray-100 text-gray-400 cursor-not-allowed'
                        : 'bg-white text-gray-900 hover:bg-gray-50'
                    }`}
                  >
                    Previous
                  </button>
                  <span className="text-sm text-gray-600">
                    Page {supportersPage} of {Math.ceil(legislation.supportingCongressmen.length / supportersPerPage)}
                    {' '}({legislation.supportingCongressmen.length} total)
                  </span>
                  <button
                    onClick={() => setSupportersPage(prev => Math.min(Math.ceil(legislation.supportingCongressmen.length / supportersPerPage), prev + 1))}
                    disabled={supportersPage >= Math.ceil(legislation.supportingCongressmen.length / supportersPerPage)}
                    className={`px-4 py-2 border border-black font-semibold transition-colors ${
                      supportersPage >= Math.ceil(legislation.supportingCongressmen.length / supportersPerPage)
                        ? 'bg-gray-100 text-gray-400 cursor-not-allowed'
                        : 'bg-white text-gray-900 hover:bg-gray-50'
                    }`}
                  >
                    Next
                  </button>
                </div>
              )}
              </>
              ) : (
                <div className="p-6 text-center text-gray-500">
                  <div className="text-sm text-gray-400 mb-2">No supporters available</div>
                  <p className="text-xs text-gray-400">This bill has no listed sponsors or cosponsors</p>
                </div>
              )}
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
                <div className="p-6 text-center text-gray-500">
                  <div className="text-sm text-gray-400 mb-2">Nothing notable happened</div>
                  <p className="text-xs text-gray-400">No significant trading activity detected</p>
                </div>
              )}
            </div>
          </div>

          {/* Right Column - ML Prediction */}
          <div className="space-y-0 border-l border-black p-0">
            {/* ML Model Prediction */}
            <div className="bg-white border-b border-black p-6">
              <h3 className="text-lg font-semibold text-gray-900 mb-4 border-b border-black pb-3">ML Model Prediction</h3>
              {mlPredictionLoading ? (
                <div className="py-8 flex items-center justify-center">
                  <LoadingSpinner size="md" />
                </div>
              ) : mlPrediction?.probability !== null && mlPrediction?.probability !== undefined ? (
                <div className="space-y-0">
                  <div className="p-4 border-b border-black">
                    <div className="text-xs text-gray-500 mb-2">True Probability</div>
                    <div className="text-4xl font-bold text-gray-900 mb-3">{formatPercent(mlPrediction.probability)}</div>
                    <div className="text-sm text-gray-600 mb-4">
                      ML model prediction that this bill will pass
                    </div>
                    <div className="h-3 bg-gray-200 border border-black overflow-hidden">
                      <div 
                        className="h-full bg-gresearch-yellow transition-all"
                        style={{ width: `${mlPrediction.probability * 100}%` }}
                      />
                    </div>
                  </div>
                  {mlPrediction.confidence && (
                    <div className="p-4 border-b border-black">
                      <div className="text-xs text-gray-500 mb-1">Confidence</div>
                      <div className="text-xl font-semibold text-gray-900">{formatPercent(mlPrediction.confidence)}</div>
                    </div>
                  )}
                  {mlPrediction.modelVersion && (
                    <div className="p-4">
                      <div className="text-xs text-gray-500 mb-1">Model Version</div>
                      <div className="text-sm font-medium text-gray-900">{mlPrediction.modelVersion}</div>
                    </div>
                  )}
                </div>
              ) : (
                <div className="py-8 text-center">
                  <div className="text-lg font-semibold text-gray-400 mb-2">N/A</div>
                  <p className="text-sm text-gray-500">ML prediction not available</p>
                </div>
              )}
            </div>

            {/* Affected Stocks Section */}
            <div className="bg-white border-b border-black p-6">
              <h3 className="text-lg font-semibold text-gray-900 mb-4 border-b border-black pb-3">Affected Stocks</h3>
              <p className="text-sm text-gray-600 mb-4">
                Companies that would be impacted by this legislation
              </p>
              {stocksLoading ? (
                <div className="p-8 flex flex-col items-center justify-center">
                  <LoadingSpinner size="md" />
                  <p className="text-sm text-gray-500 mt-4">Loading affected stocks from API...</p>
                </div>
              ) : legislation.affectedStocks && legislation.affectedStocks.length > 0 ? (
                <div className="space-y-0">
                  {legislation.affectedStocks.map((stock, idx) => (
                    <div 
                      key={idx} 
                      className={`p-4 ${idx === legislation.affectedStocks.length - 1 ? '' : 'border-b border-black'}`}
                      style={{
                        backgroundColor: stock.change >= 0 ? 'rgba(34, 211, 153, 0.1)' : 'rgba(248, 113, 113, 0.1)'
                      }}
                    >
                      <div className="flex items-center justify-between gap-4">
                        <div className="flex items-center gap-3 flex-1 min-w-0">
                          <StockLogo ticker={stock.symbol} />
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
              ) : (
                <div className="p-6 text-center text-gray-500">
                  <div className="text-lg font-semibold text-gray-400 mb-2">N/A</div>
                  <p className="text-sm text-gray-500">No affected stocks found from API</p>
                </div>
              )}
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

