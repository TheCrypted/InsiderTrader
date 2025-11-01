import { useState, useMemo, useEffect, useRef, useCallback } from 'react';
import { Link } from 'react-router-dom';
import Header from '../components/Header';
import { graphCongressmen, graphBills } from '../utils/graphData';
import { legislationDetails } from '../utils/legislationData';
import { getAllRepresentativesBasic, loadTradesForBatch, getRecentBills } from '../utils/api';

const ITEMS_PER_PAGE = 30; // Number of congressmen to load at a time

const BrowsePage = () => {
  const [activeTab, setActiveTab] = useState('congressmen'); // 'congressmen' or 'legislation'
  const [showFilterPanel, setShowFilterPanel] = useState(false);
  const [congressmanFilter, setCongressmanFilter] = useState('all'); // 'all', 'active', 'inactive', 'party', 'chamber'
  const [legislationFilter, setLegislationFilter] = useState('all'); // 'all', 'passed', 'failed', 'pending', 'sector'
  const [sortBy, setSortBy] = useState('name'); // For congressmen: 'name', 'trades', 'networth'. For bills: 'title', 'odds', 'date'
  const [allCongressmenBasic, setAllCongressmenBasic] = useState([]); // All basic data
  const [loadedCongressmen, setLoadedCongressmen] = useState([]); // Congressmen with trades loaded
  const [displayedCount, setDisplayedCount] = useState(ITEMS_PER_PAGE); // How many to show
  const [loadingCongressmen, setLoadingCongressmen] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [recentBills, setRecentBills] = useState([]); // Bills from API
  const [loadingLegislation, setLoadingLegislation] = useState(true);
  const observerTarget = useRef(null);

  // Fetch basic representative info (fast)
  useEffect(() => {
    const fetchCongressmenBasic = async () => {
      try {
        setLoadingCongressmen(true);
        const reps = await getAllRepresentativesBasic();
        setAllCongressmenBasic(reps);
        // Initially load trades for first batch
        const firstBatch = reps.slice(0, ITEMS_PER_PAGE);
        const firstBatchWithTrades = await loadTradesForBatch(firstBatch);
        setLoadedCongressmen(firstBatchWithTrades);
        setDisplayedCount(ITEMS_PER_PAGE);
      } catch (error) {
        console.error('Error fetching congressmen:', error);
      } finally {
        setLoadingCongressmen(false);
      }
    };
    fetchCongressmenBasic();
  }, []);

  // Fetch recent bills from API
  useEffect(() => {
    const fetchRecentBills = async () => {
      try {
        setLoadingLegislation(true);
        console.log('Fetching recent bills for BrowsePage...');
        const bills = await getRecentBills();
        console.log('Received bills in BrowsePage:', bills);
        
        if (bills && bills.length > 0) {
          setRecentBills(bills);
          console.log(`Set ${bills.length} bills from API`);
        } else {
          console.log('No bills received, will use graphBills fallback');
          setRecentBills([]);
        }
      } catch (error) {
        console.error('Error fetching recent bills:', error);
        // Fallback to empty array, will use graphBills below
        setRecentBills([]);
      } finally {
        setLoadingLegislation(false);
      }
    };

    if (activeTab === 'legislation') {
      fetchRecentBills();
    } else {
      // Reset when switching away from legislation tab
      setRecentBills([]);
      setLoadingLegislation(false);
    }
  }, [activeTab]);

  // Load more congressmen when scrolling
  const loadMoreCongressmen = useCallback(async () => {
    if (loadingMore || displayedCount >= allCongressmenBasic.length) return;
    
    setLoadingMore(true);
    try {
      const nextBatch = allCongressmenBasic.slice(displayedCount, displayedCount + ITEMS_PER_PAGE);
      const batchWithTrades = await loadTradesForBatch(nextBatch);
      
      setLoadedCongressmen(prev => [...prev, ...batchWithTrades]);
      setDisplayedCount(prev => prev + ITEMS_PER_PAGE);
    } catch (error) {
      console.error('Error loading more congressmen:', error);
    } finally {
      setLoadingMore(false);
    }
  }, [allCongressmenBasic, displayedCount, loadingMore]);

  // Intersection Observer for infinite scroll
  useEffect(() => {
    // Only set up observer if we have basic data loaded and more items to load
    if (allCongressmenBasic.length === 0 || displayedCount >= allCongressmenBasic.length || activeTab !== 'congressmen') {
      return;
    }

    let observer = null;
    let timeoutId = null;

    // Use a timeout to ensure the DOM has updated with the ref
    timeoutId = setTimeout(() => {
      const currentTarget = observerTarget.current;
      if (!currentTarget) {
        console.warn('Observer target not found in DOM');
        return;
      }

      observer = new IntersectionObserver(
        (entries) => {
          const entry = entries[0];
          if (entry && entry.isIntersecting) {
            // Check current state before loading
            setLoadingMore(currentLoading => {
              if (currentLoading) {
                return currentLoading; // Already loading, skip
              }
              
              // Use functional update to get latest displayedCount
              setDisplayedCount(currentDisplayed => {
                const total = allCongressmenBasic.length;
                if (currentDisplayed >= total) {
                  return currentDisplayed; // Already loaded all
                }
                
                console.log('Observer triggered: Loading more congressmen...', { 
                  displayedCount: currentDisplayed, 
                  total: total
                });
                
                // Load more asynchronously
                const nextBatch = allCongressmenBasic.slice(currentDisplayed, currentDisplayed + ITEMS_PER_PAGE);
                setLoadingMore(true);
                
                loadTradesForBatch(nextBatch)
                  .then(batchWithTrades => {
                    setLoadedCongressmen(prev => [...prev, ...batchWithTrades]);
                    setDisplayedCount(prev => prev + ITEMS_PER_PAGE);
                    setLoadingMore(false);
                  })
                  .catch(error => {
                    console.error('Error loading more congressmen:', error);
                    setLoadingMore(false);
                  });
                
                return currentDisplayed; // Return unchanged for now, will be updated by promise
              });
              
              return true; // Set loading to true
            });
          }
        },
        { 
          threshold: 0.1,
          rootMargin: '200px' // Start loading 200px before reaching the target for smoother UX
        }
      );

      observer.observe(currentTarget);
      console.log('Observer attached to target', { 
        displayedCount, 
        total: allCongressmenBasic.length,
        hasTarget: !!currentTarget 
      });
    }, 100); // Small delay to ensure DOM is ready

    return () => {
      if (timeoutId) {
        clearTimeout(timeoutId);
      }
      if (observer) {
        observer.disconnect();
      }
    };
  }, [activeTab, displayedCount, allCongressmenBasic.length]);

  // Prepare congressmen data - use loaded congressmen with trades, merge with remaining basic data
  const allCongressmen = useMemo(() => {
    // Start with loaded congressmen (with trades)
    const congressmenMap = new Map(loadedCongressmen.map(c => [c.id, c]));
    
    // Add remaining basic congressmen (without trades yet)
    const displayedBasic = allCongressmenBasic.slice(0, displayedCount);
    displayedBasic.forEach(congressman => {
      if (!congressmenMap.has(congressman.id)) {
        congressmenMap.set(congressman.id, congressman);
      }
    });
    
    const congressmenList = Array.from(congressmenMap.values());
    
    return congressmenList.map(congressman => ({
      ...congressman,
      // Add mock data fields for display (netWorth) if not present
      netWorth: congressman.netWorth || (graphCongressmen.find(g => g.id === congressman.id)?.netWorth || 0),
      isCurrentMember: congressman.isCurrentMember !== false, // Default to true if not specified
      // Add inactive congressmen (mock some as inactive)
      ...(congressman.id === 'M000303' || congressman.id === 'L000174' ? { isCurrentMember: false } : {})
    }));
  }, [loadedCongressmen, allCongressmenBasic, displayedCount]);

  // Prepare legislation data with odds - prefer recentBills from API, fallback to graphBills
  const allLegislation = useMemo(() => {
    console.log('Preparing legislation data. recentBills:', recentBills.length, 'graphBills:', graphBills.length);
    
    // Use recent bills from API first, then fallback to graphBills
    const billsToUse = recentBills.length > 0 ? recentBills : graphBills;
    console.log(`Using ${billsToUse.length} bills (${recentBills.length > 0 ? 'from API' : 'from graphBills'})`);
    
    return billsToUse.map((bill) => {
      // If from API, bill has bill_id, title, latest_action, url
      // If from graphBills, bill has id, title, sector, date, etc.
      const originalBillId = bill.bill_id || bill.id;
      let billId = originalBillId;
      
      // Normalize bill ID format: "HR.5345" -> "H.R.5345" for consistency with routes
      // Keep original format for matching with graphBills
      if (billId && billId.startsWith('HR.')) {
        billId = billId.replace(/^HR\./, 'H.R.');
      }
      
      console.log('Processing bill:', { original: originalBillId, normalized: billId, fromAPI: !!bill.bill_id });
      
      // Try to find matching graphBill for additional data
      // Check both normalized and original format
      const graphBill = graphBills.find(b => b.id === billId || b.id === originalBillId);
      const baseDetails = legislationDetails[billId] || legislationDetails[originalBillId];
      
      // Determine sector - from graphBill or infer from title
      let sector = graphBill?.sector || 'General';
      if (!graphBill) {
        // Infer sector from title
        const titleLower = (bill.title || '').toLowerCase();
        if (titleLower.includes('tech') || titleLower.includes('digital') || titleLower.includes('cyber') || titleLower.includes('ai')) {
          sector = 'Technology';
        } else if (titleLower.includes('health') || titleLower.includes('medicare') || titleLower.includes('healthcare')) {
          sector = 'Healthcare';
        } else if (titleLower.includes('infrastructure') || titleLower.includes('transport')) {
          sector = 'Infrastructure';
        } else if (titleLower.includes('education') || titleLower.includes('student')) {
          sector = 'Education';
        } else if (titleLower.includes('energy') || titleLower.includes('carbon') || titleLower.includes('climate')) {
          sector = 'Energy';
        } else if (titleLower.includes('housing') || titleLower.includes('affordability')) {
          sector = 'Housing';
        } else if (titleLower.includes('business') || titleLower.includes('small business')) {
          sector = 'Business';
        }
      }
      
      // Get cosponsors from graphBill or estimate
      const cosponsors = graphBill?.cosponsors || (baseDetails?.cosponsors) || 0;
      
      // Get date from API latest_action or graphBill
      const date = bill.latest_action?.date || graphBill?.date || new Date().toISOString().split('T')[0];
      
      // Get status from graphBill or infer
      let status = graphBill?.status || 'In Committee';
      if (bill.latest_action?.text) {
        const actionText = bill.latest_action.text.toLowerCase();
        if (actionText.includes('passed') || actionText.includes('enacted')) {
          status = 'Passed House';
        } else if (actionText.includes('failed') || actionText.includes('rejected')) {
          status = 'Failed';
        }
      }
      
      // Calculate odds based on cosponsors
      const passingOdds = baseDetails?.yesPrice || (cosponsors > 40 ? 0.65 : cosponsors > 25 ? 0.45 : 0.30);
      const failingOdds = baseDetails?.noPrice || (cosponsors > 40 ? 0.35 : cosponsors > 25 ? 0.55 : 0.70);
      
      return {
        id: billId,
        title: bill.title || graphBill?.title || `${billId} - Legislation`,
        summary: baseDetails?.summary || graphBill?.summary || `${bill.title || billId} - ${sector} sector legislation.`,
        sponsor: baseDetails?.sponsor || graphBill?.sponsorId || `Sponsor of ${billId}`,
        yesPrice: passingOdds,
        noPrice: failingOdds,
        passingOdds: passingOdds,
        failingOdds: failingOdds,
        isPassed: status === 'Passed House' || status === 'Passed Senate' || status === 'Enacted',
        isFailed: status === 'Failed',
        sector: sector,
        date: date,
        cosponsors: cosponsors,
        status: status,
        committees: graphBill?.committees || baseDetails?.committees || [],
        billUrl: bill.url || baseDetails?.billUrl || `https://www.congress.gov/bill/117th-congress/${billId.includes('H') ? 'house-bill' : 'senate-bill'}/${billId.replace(/[^0-9]/g, '')}`,
      };
    });
  }, [recentBills]);

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
          
          {/* Header with Title and Segmented Control */}
          <div className="flex items-center justify-between">
            {/* Left Section - Title and Description */}
            <div>
              <h1 className="text-4xl font-bold mb-2">Browse All</h1>
              <p className="text-gray-600">View and filter all congressmen and legislation</p>
            </div>
            
            {/* Right Section - Segmented Control */}
            <div className="flex border border-black">
              <button
                onClick={() => setShowFilterPanel(!showFilterPanel)}
                className={`px-6 py-3 font-medium border-r border-black transition-colors ${
                  showFilterPanel
                    ? 'bg-black text-white'
                    : 'bg-white text-black hover:bg-gray-50'
                }`}
              >
                filter
              </button>
              <button
                onClick={() => setActiveTab('congressmen')}
                className={`px-6 py-3 font-medium border-r border-black transition-colors ${
                  activeTab === 'congressmen'
                    ? 'bg-black text-white'
                    : 'bg-white text-black hover:bg-gray-50'
                }`}
              >
                congressmen
              </button>
              <button
                onClick={() => setActiveTab('legislation')}
                className={`px-6 py-3 font-medium transition-colors ${
                  activeTab === 'legislation'
                    ? 'bg-black text-white'
                    : 'bg-white text-black hover:bg-gray-50'
                }`}
              >
                legislation
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Filter Panel */}
      {showFilterPanel && (
        <div className="container mx-auto px-6 mb-6">
          <div className="flex border border-black bg-white">
            {/* Filter Section - Left (wider ~65%) */}
            <div className="flex items-center border-r border-black" style={{ width: '65%' }}>
              <div className="flex-1 border-r border-black p-4 flex items-center justify-center">
                <span className="text-sm font-medium text-gray-900">Filter</span>
              </div>
              <div className="flex-1 p-4">
                {activeTab === 'congressmen' ? (
                  <select
                    value={congressmanFilter}
                    onChange={(e) => setCongressmanFilter(e.target.value)}
                    className="w-full px-3 py-2 bg-white focus:outline-none focus:ring-0 text-sm border-0"
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
                    className="w-full px-3 py-2 bg-white focus:outline-none focus:ring-0 text-sm border-0"
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
            </div>

            {/* Sort By Section - Right (narrower ~35%) */}
            <div className="flex items-center" style={{ width: '35%' }}>
              <div className="flex-1 border-r border-black p-4 flex items-center justify-center">
                <span className="text-sm font-medium text-gray-900">Sort By</span>
              </div>
              <div className="flex-1 p-4">
                <select
                  value={sortBy}
                  onChange={(e) => setSortBy(e.target.value)}
                  className="w-full px-3 py-2 bg-white focus:outline-none focus:ring-0 text-sm border-0"
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
            </div>
          </div>
        </div>
      )}

      <div className="container mx-auto px-6">

        {/* Congressmen List */}
        {activeTab === 'congressmen' && (
          <>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-0 border-t border-l border-r border-black -mx-6">
              {filteredCongressmen.map((congressman, index) => {
                // Mock legislation sponsored count (based on ID hash for consistency)
                const legislationCount = (congressman.id.charCodeAt(0) + congressman.id.charCodeAt(congressman.id.length - 1)) % 50 + 10;
                const isLastInRow = (index + 1) % 3 === 0;
                
                return (
                  <Link
                    key={congressman.id}
                    to={`/congressman/${congressman.id}/trading`}
                    className={`flex bg-white border-b border-r border-black hover:bg-gray-50 transition-colors relative group ${
                      isLastInRow ? 'border-r-0' : ''
                    }`}
                  >
                    {/* Blue square on top-right corner on hover */}
                    <div className="absolute top-[-1px] right-[-1px] w-4 h-4 bg-blue-600 opacity-0 group-hover:opacity-100 transition-opacity z-10 border border-black"></div>
                    
                    {/* Left Section - Profile Image (1/3 width) */}
                    <div className="w-1/3 border-r border-black bg-gray-100 flex items-center justify-center overflow-hidden relative" style={{ minHeight: '200px' }}>
                      {congressman.image ? (
                        <img
                          src={congressman.image}
                          alt={congressman.name}
                          className="w-full h-full object-cover"
                          loading="lazy"
                          referrerPolicy="no-referrer"
                          onError={(e) => {
                            e.target.style.display = 'none';
                            e.target.nextElementSibling.style.display = 'flex';
                          }}
                        />
                      ) : null}
                      <div 
                        className={`items-center justify-center w-full h-full bg-gray-200 ${congressman.image ? 'hidden' : 'flex'}`}
                        style={{ display: congressman.image ? 'none' : 'flex' }}
                      >
                        <span className="text-gray-500 font-bold text-xl">
                          {congressman.name.split(' ').map(n => n[0]).join('')}
                        </span>
                      </div>
                    </div>
                    
                    {/* Right Section - Details (2/3 width) */}
                    <div className="w-2/3 flex flex-col">
                      {/* Top Row - Name (1/3 height) */}
                      <div className="flex-1 border-b border-black p-4 flex items-center">
                        <h3 className="text-lg font-semibold text-gray-900">{congressman.name}</h3>
                      </div>
                      
                      {/* Middle Row - Region & Volume Trade (1/3 height) */}
                      <div className="flex-1 flex border-b border-black">
                        {/* Left Sub-column - Region */}
                        <div className="w-1/2 border-r border-black p-4 flex items-center">
                          <div>
                            <div className="text-xs text-gray-600 mb-1">Region</div>
                            <div className="text-sm font-medium text-gray-900">{congressman.state}</div>
                          </div>
                        </div>
                        {/* Right Sub-column - Volume Trade */}
                        <div className="w-1/2 p-4 flex items-center">
                          <div>
                            <div className="text-xs text-gray-600 mb-1">Volume Trade</div>
                            <div className="text-sm font-medium text-gray-900">{formatCurrency(congressman.tradeVolume || 0)}</div>
                          </div>
                        </div>
                      </div>
                      
                      {/* Bottom Row - Party & Legislation sponsored (1/3 height) */}
                      <div className="flex-1 flex">
                        {/* Left Sub-column - Party Affiliation */}
                        <div className={`w-1/2 border-r border-black p-4 flex items-center ${
                          congressman.party === 'Democratic' ? 'bg-blue-50' : congressman.party === 'Republican' ? 'bg-red-50' : 'bg-gray-50'
                        }`}>
                          <div>
                            <div className="text-xs text-gray-600 mb-1">Party</div>
                            <div className="text-sm font-medium text-gray-900">{congressman.party}</div>
                          </div>
                        </div>
                        {/* Right Sub-column - No. of Legislation sponsored */}
                        <div className="w-1/2 p-4 flex items-center justify-center">
                          <div className="text-center">
                            <div className="text-xs text-gray-600 mb-1">No. of Legislation</div>
                            <div className="text-sm font-medium text-gray-900">sponsored</div>
                            <div className="text-lg font-bold text-gray-900 mt-1">{legislationCount}</div>
                          </div>
                        </div>
                      </div>
                    </div>
                  </Link>
                );
              })}
            </div>
            
            {/* Loading indicator and observer target for infinite scroll - outside grid */}
            {loadingCongressmen && (
              <div className="border-t border-l border-r border-b border-black -mx-6 mt-0 p-8 text-center">
                <div className="text-gray-500">Loading congressmen...</div>
              </div>
            )}
            
            {/* Observer target - triggers load more when scrolled into view */}
            {activeTab === 'congressmen' && !loadingCongressmen && displayedCount < allCongressmenBasic.length && (
              <div 
                ref={observerTarget}
                className="border-t border-l border-r border-b border-black -mx-6 mt-0 p-8 text-center"
                style={{ minHeight: '150px', width: '100%' }}
              >
                {loadingMore ? (
                  <div className="text-gray-500">Loading more congressmen...</div>
                ) : (
                  <div className="text-gray-400 text-sm">Scroll to load more ({displayedCount} / {allCongressmenBasic.length} loaded)</div>
                )}
              </div>
            )}
            
            {/* End of list indicator */}
            {!loadingCongressmen && displayedCount >= allCongressmenBasic.length && allCongressmenBasic.length > 0 && (
              <div className="border-t border-l border-r border-b border-black -mx-6 mt-0 p-8 text-center">
                <div className="text-gray-400 text-sm">All {allCongressmenBasic.length} congressmen loaded</div>
              </div>
            )}
          </>
        )}

        {/* Legislation List */}
        {activeTab === 'legislation' && (
          <>
            {loadingLegislation ? (
              <div className="border-t border-l border-r border-black -mx-6 p-12 text-center">
                <div className="text-gray-400">Loading recent bills...</div>
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-0 border-t border-l border-r border-black -mx-6">
                {filteredLegislation.length === 0 ? (
                  <div className="col-span-2 border-b border-black p-12 text-center">
                    <div className="text-gray-400">No legislation found</div>
                  </div>
                ) : (
                  filteredLegislation.map((bill, index) => {
              const isLastInRow = (index + 1) % 2 === 0;
              
              return (
              <Link
                key={bill.id}
                to={`/legislation/${bill.id}/bet`}
                className={`flex bg-white border-b border-r border-black hover:bg-gray-50 transition-colors relative group ${
                  isLastInRow ? 'border-r-0' : ''
                }`}
              >
                {/* Blue square on top-right corner on hover */}
                <div className="absolute top-[-1px] right-[-1px] w-4 h-4 bg-blue-600 opacity-0 group-hover:opacity-100 transition-opacity z-10 border border-black"></div>
                
                {/* Left Section - White Background (75-80% width) */}
                <div className="flex-1 border-r border-black p-6" style={{ width: '75%' }}>
                  {/* Top Area - Bill ID and Name */}
                  <div className="mb-4">
                    <div className="text-xs text-gray-600 mb-1">Bill id</div>
                    <div className="border-b border-black mb-2"></div>
                    <div className="text-sm font-medium text-gray-700 mb-1">
                      {bill.id.startsWith('H.R.') ? bill.id.replace(/^H\.R\./, 'HR.') : bill.id}
                    </div>
                    <h3 className="text-2xl font-bold text-gray-900">{bill.title}</h3>
                  </div>
                  
                  {/* Bottom Area - Three blocks in a row */}
                  <div className="flex gap-0">
                    {/* Sector Block - White */}
                    <div className="flex-1 p-4 bg-white border-r border-black">
                      <div className="text-xs text-gray-600 mb-1">Sector</div>
                      <div className="text-sm font-medium text-gray-900">{bill.sector}</div>
                    </div>
                    
                    {/* Date Block - White */}
                    <div className="flex-1 p-4 bg-white border-r border-black">
                      <div className="text-xs text-gray-600 mb-1">date</div>
                      <div className="text-sm font-medium text-gray-900">{new Date(bill.date).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}</div>
                    </div>
                    
                    {/* Cosponsors Block - White */}
                    <div className="flex-1 p-4 bg-white">
                      <div className="text-xs text-gray-600 mb-1">No.</div>
                      <div className="text-xs text-gray-600 mb-1">cosponsors</div>
                      <div className="text-sm font-medium text-gray-900">{bill.cosponsors}</div>
                    </div>
                  </div>
                </div>
                
                {/* Right Section - Green or Red Background (20-25% width) */}
                <div 
                  className={`flex items-center justify-center p-6 ${bill.passingOdds >= 0.5 ? 'bg-green-50' : 'bg-red-50'}`} 
                  style={{ width: '25%' }}
                >
                  <div className="text-center">
                    <div 
                      className={`font-bold ${bill.passingOdds >= 0.5 ? 'text-green-700' : 'text-red-700'}`}
                      style={{ fontSize: '3.5rem' }}
                    >
                      {(bill.passingOdds * 100).toFixed(1)}%
                    </div>
                  </div>
                </div>
              </Link>
              );
                  })
                )}
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
};

export default BrowsePage;

