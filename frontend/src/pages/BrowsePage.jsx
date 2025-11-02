import { useState, useMemo, useEffect, useRef, useCallback } from 'react';
import { Link } from 'react-router-dom';
import Header from '../components/Header';
import { graphCongressmen, graphBills } from '../utils/graphData';
import { legislationDetails } from '../utils/legislationData';
import { getAllRepresentativesBasic, loadTradesForBatch, getRecentBills, getPolymarketBills } from '../utils/api';

const ITEMS_PER_PAGE = 30; // Number of congressmen to load at a time
const BILLS_PER_PAGE = 20; // Number of bills to display at a time
const BILLS_FETCH_SIZE = 30; // Number of bills to fetch from API at a time

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
  const [recentBills, setRecentBills] = useState([]); // Bills from API (all loaded)
  const [displayedBillsCount, setDisplayedBillsCount] = useState(BILLS_PER_PAGE); // How many bills to show
  const [totalBillsCount, setTotalBillsCount] = useState(0); // Total bills available from API
  const [loadingMoreBills, setLoadingMoreBills] = useState(false);
  const [polymarketOdds, setPolymarketOdds] = useState({}); // Map of bill_id -> odds
  const [loadingLegislation, setLoadingLegislation] = useState(true);
  const observerTarget = useRef(null);
  const legislationObserverTarget = useRef(null);

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

  // Fetch bills: First /bills (Polymarket bills with betting info), then /recent_bills (additional bills with lazy loading)
  useEffect(() => {
    const fetchBills = async () => {
      try {
        setLoadingLegislation(true);
        console.log('Fetching bills for BrowsePage...');
        
        // Step 1: Fetch Polymarket bills with betting info from /bills endpoint
        console.log('Step 1: Fetching Polymarket bills from /bills endpoint...');
        const polymarketBillsResponse = await getPolymarketBills();
        
        // Extract full bill data from Polymarket bills (they have 'info' field)
        const polymarketBills = polymarketBillsResponse.map(bill => ({
          bill_id: bill.bill_id || bill.bill,
          title: bill.info?.title || bill.bill_id || bill.bill,
          latest_action: bill.info?.latest_action || {},
          status: bill.info?.status || null, // Include status from info field
          introduced_date: bill.info?.introduced_date,
          policy_area: bill.info?.policy_area,
          sponsors: bill.info?.sponsors || [],
          cosponsors_count: bill.info?.cosponsors_count || 0,
          url: bill.info?.url,
          hasPolymarketOdds: true, // Mark that these have Polymarket odds
        }));
        
        console.log(`Fetched ${polymarketBills.length} Polymarket bills`);
        
        // Create a map of bill_id -> odds for quick lookup
        // Handle various bill ID formats for matching
        const oddsMap = {};
        polymarketBillsResponse.forEach(bill => {
          const billId = bill.bill_id || bill.bill; // Use bill_id if available, fallback to bill field
          if (!billId) return;
          
          // Store with original format
          // yes_percent from API is already a percentage (e.g., 52.0 = 52%)
          const yesPercent = bill.yes_percent !== undefined ? bill.yes_percent : 50;
          oddsMap[billId] = {
            ...bill,
            yes_percentage: yesPercent, // Already a percentage (52.0 = 52%)
            no_percentage: 100 - yesPercent, // Calculate NO percentage
          };
          
          // Normalize and store multiple formats for matching
          // Remove all dots and spaces, uppercase
          const normalizedNoDots = billId.replace(/\./g, '').replace(/\s/g, '').toUpperCase();
          oddsMap[normalizedNoDots] = oddsMap[billId];
          
          // Store with standardized dot format (HR.1234, S.567)
          const standardized = billId
            .replace(/H\.R\./gi, 'HR.')
            .replace(/H\.R/gi, 'HR.')
            .replace(/H\s*R\s*/gi, 'HR.')
            .replace(/S\./gi, 'S.')
            .replace(/\s+/g, '')
            .toUpperCase();
          if (standardized !== billId) {
            oddsMap[standardized] = oddsMap[billId];
          }
          
          // Also store without leading zeros in number part (HR.05345 -> HR.5345)
          const noLeadingZeros = billId.replace(/(\.|^)(0+)(\d+)/, '$1$3');
          if (noLeadingZeros !== billId) {
            oddsMap[noLeadingZeros] = oddsMap[billId];
            const normalizedNoLeadingZeros = noLeadingZeros.replace(/\./g, '').replace(/\s/g, '').toUpperCase();
            oddsMap[normalizedNoLeadingZeros] = oddsMap[billId];
          }
        });
        console.log('Polymarket odds map created:', Object.keys(oddsMap).length, 'entries');
        setPolymarketOdds(oddsMap);
        
        // Step 2: Fetch additional bills from /recent_bills endpoint
        console.log('Step 2: Fetching bills from /recent_bills endpoint...');
        const recentBillsResponse = await getRecentBills(20, 0); // Fetch 20 bills initially
        
        // Normalize bill IDs for comparison
        const normalizeBillId = (id) => {
          if (!id) return null;
          return id.replace(/\./g, '').replace(/\s/g, '').toUpperCase();
        };
        
        // Create a set of Polymarket bill IDs (normalized) to avoid duplicates
        const polymarketBillIds = new Set(
          polymarketBills.map(b => normalizeBillId(b.bill_id))
        );
        
        // Filter out bills that are already in Polymarket bills
        const additionalBills = recentBillsResponse.bills
          .filter(bill => {
            const billId = normalizeBillId(bill.bill_id || bill.id);
            return billId && !polymarketBillIds.has(billId);
          })
          .map(bill => ({
            bill_id: bill.bill_id || bill.id,
            title: bill.title,
            latest_action: bill.latest_action || {},
            status: bill.status || null, // Include status if available
            introduced_date: bill.introduced_date,
            policy_area: bill.policy_area,
            sponsors: bill.sponsors || [],
            cosponsors_count: bill.cosponsors_count || 0,
            url: bill.url,
            hasPolymarketOdds: false, // Mark that these don't have Polymarket odds
          }));
        
        console.log(`Fetched ${additionalBills.length} additional bills from /recent_bills (first batch, excluding duplicates)`);
        
        // Set total count (Polymarket bills + API total count, minus duplicates)
        setTotalBillsCount(polymarketBills.length + recentBillsResponse.totalCount);
        
        // Combine: Polymarket bills first (with betting info), then additional bills
        const allBills = [...polymarketBills, ...additionalBills];
        
        console.log(`Total bills loaded: ${allBills.length} (${polymarketBills.length} with Polymarket odds, ${additionalBills.length} additional)`);
        
        if (allBills.length > 0) {
          setRecentBills(allBills);
          // Display first batch (Polymarket bills + first batch of recent bills, up to BILLS_PER_PAGE)
          const initialDisplayCount = Math.min(BILLS_PER_PAGE, allBills.length);
          setDisplayedBillsCount(initialDisplayCount);
          console.log(`Set ${allBills.length} bills, displaying first ${initialDisplayCount}`);
        } else {
          console.log('No bills received, will use graphBills fallback');
          setRecentBills([]);
          setDisplayedBillsCount(0);
        }
      } catch (error) {
        console.error('Error fetching bills:', error);
        // Fallback to empty array, will use graphBills below
        setRecentBills([]);
        setPolymarketOdds({});
        setDisplayedBillsCount(0);
        setTotalBillsCount(0);
      } finally {
        setLoadingLegislation(false);
      }
    };

    if (activeTab === 'legislation') {
      fetchBills();
    } else {
      // Reset when switching away from legislation tab
      setRecentBills([]);
      setPolymarketOdds({});
      setDisplayedBillsCount(BILLS_PER_PAGE);
      setTotalBillsCount(0);
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

  // Load more bills when scrolling
  const loadMoreBills = useCallback(async () => {
    if (loadingMoreBills) {
      console.log('Already loading more bills, skipping...');
      return;
    }
    
    console.log('loadMoreBills called', {
      displayedBillsCount,
      recentBillsLength: recentBills.length,
      totalBillsCount,
      loadingMoreBills,
    });
    
    // If we have more bills loaded than displayed, just show more
    if (displayedBillsCount < recentBills.length) {
      const nextDisplayCount = Math.min(displayedBillsCount + BILLS_PER_PAGE, recentBills.length);
      console.log(`Showing more loaded bills: ${displayedBillsCount} -> ${nextDisplayCount}`);
      setDisplayedBillsCount(nextDisplayCount);
      return;
    }
    
    // Check if we need to fetch more bills from API
    const polymarketBillsCount = recentBills.filter(b => b.hasPolymarketOdds).length;
    const additionalBillsCount = recentBills.filter(b => !b.hasPolymarketOdds).length;
    const currentOffset = additionalBillsCount;
    const totalAvailableFromAPI = totalBillsCount > 0 ? totalBillsCount - polymarketBillsCount : 0;
    
    console.log('Checking if we need to fetch more bills', {
      currentOffset,
      totalAvailableFromAPI,
      additionalBillsCount,
      polymarketBillsCount,
    });
    
      // If we've displayed all loaded bills and there might be more available from API
      if (displayedBillsCount >= recentBills.length && (totalAvailableFromAPI === 0 || currentOffset < totalAvailableFromAPI)) {
        setLoadingMoreBills(true);
        try {
          // Fetch more bills (20 at a time for better performance)
          console.log(`Fetching more bills from API: offset=${currentOffset}, limit=20, totalAvailable=${totalAvailableFromAPI}`);
          const response = await getRecentBills(20, currentOffset);
        
        console.log(`API response: ${response.bills.length} bills, totalCount=${response.totalCount}`);
        
        // Normalize bill IDs for comparison
        const normalizeBillId = (id) => {
          if (!id) return null;
          return id.replace(/\./g, '').replace(/\s/g, '').toUpperCase();
        };
        
        // Get existing bill IDs (normalized) to avoid duplicates
        const existingBillIds = new Set(
          recentBills.map(b => normalizeBillId(b.bill_id))
        );
        
        // Filter out bills that are already loaded
        const newBills = response.bills
          .filter(bill => {
            const billId = normalizeBillId(bill.bill_id || bill.id);
            return billId && !existingBillIds.has(billId);
          })
          .map(bill => ({
            bill_id: bill.bill_id || bill.id,
            title: bill.title,
            latest_action: bill.latest_action || {},
            status: bill.status || null, // Include status if available
            introduced_date: bill.introduced_date,
            policy_area: bill.policy_area,
            sponsors: bill.sponsors || [],
            cosponsors_count: bill.cosponsors_count || 0,
            url: bill.url,
            hasPolymarketOdds: false,
          }));
        
        console.log(`Filtered to ${newBills.length} new bills (after removing ${response.bills.length - newBills.length} duplicates)`);
        
        if (newBills.length > 0) {
          // Add new bills to the list
          setRecentBills(prev => {
            const updated = [...prev, ...newBills];
            console.log(`Updated recentBills: ${prev.length} -> ${updated.length}`);
            return updated;
          });
          
          // Display the new bills immediately
          setDisplayedBillsCount(prev => {
            const updated = prev + Math.min(newBills.length, BILLS_PER_PAGE);
            console.log(`Updated displayedBillsCount: ${prev} -> ${updated}`);
            return updated;
          });
          
          // Update total count if we got new info from API
          // If totalCount is 0 or small, it might be an estimate - use it if it's larger than current
          if (response.totalCount > 0) {
            // If the API returned fewer bills than requested, we might have reached the end
            if (response.bills.length < 20 && response.totalCount <= currentOffset + response.bills.length) {
              // We've reached the end - update total to actual count
              setTotalBillsCount(currentOffset + response.bills.length + polymarketBillsCount);
            } else if (response.totalCount > totalBillsCount - polymarketBillsCount) {
              // API has a better estimate of total count
              setTotalBillsCount(response.totalCount + polymarketBillsCount);
            }
          } else if (response.bills.length < 20) {
            // If we got fewer bills than requested and no totalCount, we've likely reached the end
            setTotalBillsCount(currentOffset + response.bills.length + polymarketBillsCount);
          }
        } else {
          // No more bills to load - might have reached the end
          console.log('No new bills loaded from API (may have reached the end)');
          if (response.totalCount > 0 && currentOffset >= response.totalCount) {
            console.log('Reached the end of available bills');
          }
        }
      } catch (error) {
        console.error('Error loading more bills:', error);
      } finally {
        setLoadingMoreBills(false);
      }
    } else {
      console.log('No more bills to load', {
        displayedBillsCount,
        recentBillsLength: recentBills.length,
        currentOffset,
        totalAvailableFromAPI,
      });
    }
  }, [recentBills, displayedBillsCount, totalBillsCount, loadingMoreBills]);

  // Intersection Observer for legislation infinite scroll
  useEffect(() => {
    // Only set up observer if:
    // 1. We're on the legislation tab
    // 2. Initial loading is complete
    // 3. We haven't displayed all loaded bills OR we haven't reached the total available count
    const hasMoreToShow = displayedBillsCount < recentBills.length || 
                          (totalBillsCount > 0 && recentBills.length < totalBillsCount) ||
                          (totalBillsCount === 0 && recentBills.length > 0); // If we don't know total, assume more might be available
    
    console.log('Setting up legislation observer', {
      activeTab,
      loadingLegislation,
      hasMoreToShow,
      displayedBillsCount,
      recentBillsLength: recentBills.length,
      totalBillsCount,
    });
    
    if (activeTab !== 'legislation' || loadingLegislation || !hasMoreToShow) {
      console.log('Skipping observer setup', { 
        activeTab, 
        loadingLegislation, 
        hasMoreToShow,
      });
      return;
    }

    let observer = null;
    let timeoutId = null;

    timeoutId = setTimeout(() => {
      const currentTarget = legislationObserverTarget.current;
      if (!currentTarget) {
        console.warn('Legislation observer target not found in DOM');
        return;
      }

      observer = new IntersectionObserver(
        (entries) => {
          const entry = entries[0];
          if (entry && entry.isIntersecting && !loadingMoreBills) {
            console.log('⚠️ Observer triggered: Loading more bills...', {
              displayedBillsCount,
              totalLoaded: recentBills.length,
              totalAvailable: totalBillsCount,
              isIntersecting: entry.isIntersecting,
            });
            loadMoreBills();
          }
        },
        {
          threshold: 0.1,
          rootMargin: '200px',
        }
      );

      observer.observe(currentTarget);
      console.log('✓ Legislation observer attached to target', {
        displayedBillsCount,
        totalLoaded: recentBills.length,
        totalAvailable: totalBillsCount,
        hasTarget: !!currentTarget,
      });
    }, 100);

    return () => {
      if (timeoutId) {
        clearTimeout(timeoutId);
      }
      if (observer) {
        observer.disconnect();
        console.log('Legislation observer disconnected');
      }
    };
  }, [activeTab, displayedBillsCount, recentBills.length, totalBillsCount, loadingLegislation, loadingMoreBills, loadMoreBills]);

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
      
      console.log('Processing bill:', { original: originalBillId, normalized: billId, fromAPI: !!bill.bill_id, hasPolymarketOdds: bill.hasPolymarketOdds });
      
      // Try to find matching graphBill for additional data
      // Check both normalized and original format
      const graphBill = graphBills.find(b => b.id === billId || b.id === originalBillId);
      const baseDetails = legislationDetails[billId] || legislationDetails[originalBillId];
      
      // Determine sector - prioritize API data (policy_area), then graphBill, then infer
      let sector = 'General';
      
      // First try: policy_area from API
      if (bill.policy_area) {
        const policyArea = bill.policy_area.toLowerCase();
        if (policyArea.includes('technology') || policyArea.includes('science') || policyArea.includes('computing')) {
          sector = 'Technology';
        } else if (policyArea.includes('health') || policyArea.includes('medical')) {
          sector = 'Healthcare';
        } else if (policyArea.includes('energy') || policyArea.includes('environment') || policyArea.includes('climate')) {
          sector = 'Energy';
        } else if (policyArea.includes('finance') || policyArea.includes('banking') || policyArea.includes('financial')) {
          sector = 'Financials';
        } else if (policyArea.includes('defense') || policyArea.includes('military')) {
          sector = 'Defense';
        } else if (policyArea.includes('business') || policyArea.includes('commerce')) {
          sector = 'Business';
        } else if (policyArea.includes('education')) {
          sector = 'Education';
        } else if (policyArea.includes('housing')) {
          sector = 'Housing';
        }
      }
      
      // Second try: graphBill sector
      if (sector === 'General' && graphBill?.sector) {
        sector = graphBill.sector;
      }
      
      // Third try: infer from title
      if (sector === 'General') {
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
        } else if (titleLower.includes('finance') || titleLower.includes('banking')) {
          sector = 'Financials';
        }
      }
      
      // Get cosponsors - prioritize API data
      const cosponsors = bill.info?.cosponsors_count ?? 
                        bill.cosponsors_count ?? 
                        graphBill?.cosponsors ?? 
                        (baseDetails?.cosponsors) ?? 
                        0;
      
      // Get date - prioritize latest_action.date (most reliable for /recent_bills), then introduced_date, then graphBill
      // Ensure date is in valid format
      let dateRaw = bill.latest_action?.date || 
                    bill.introduced_date || 
                    graphBill?.date;
      
      // Validate and format date
      let date = null;
      if (dateRaw) {
        try {
          const dateObj = new Date(dateRaw);
          if (!isNaN(dateObj.getTime())) {
            date = dateObj.toISOString().split('T')[0]; // Format as YYYY-MM-DD
          }
        } catch (e) {
          console.warn(`Invalid date for bill ${billId}: ${dateRaw}`);
        }
      }
      
      // Fallback to today's date if no valid date found
      if (!date) {
        date = new Date().toISOString().split('T')[0];
      }
      
      // Get Polymarket odds if available
      // Try multiple formats for matching
      const normalizedNoDots = originalBillId.replace(/\./g, '').replace(/\s/g, '').toUpperCase();
      const standardized = originalBillId
        .replace(/H\.R\./gi, 'HR.')
        .replace(/H\.R/gi, 'HR.')
        .replace(/H\s*R\s*/gi, 'HR.')
        .replace(/S\./gi, 'S.')
        .replace(/\s+/g, '')
        .toUpperCase();
      const noLeadingZeros = originalBillId.replace(/(\.|^)(0+)(\d+)/, '$1$3');
      const normalizedNoLeadingZeros = noLeadingZeros.replace(/\./g, '').replace(/\s/g, '').toUpperCase();
      
      const polymarketData = polymarketOdds[originalBillId] || 
                             polymarketOdds[normalizedNoDots] || 
                             polymarketOdds[standardized] ||
                             polymarketOdds[noLeadingZeros] ||
                             polymarketOdds[normalizedNoLeadingZeros] ||
                             null;
      const yesOdds = polymarketData ? polymarketData.yes_percentage : null;
      const noOdds = polymarketData ? polymarketData.no_percentage : null;
      
      if (polymarketData) {
        console.log(`Found Polymarket odds for ${originalBillId}: Yes ${yesOdds}%, No ${noOdds}%`);
      }
      
      // Get status - prioritize API status from bill.info (for Polymarket bills)
      // Then check bill.status (for recent_bills API), then graphBill, then infer from latest_action, then default
      let status = bill.info?.status || 
                   bill.status ||
                   graphBill?.status || 
                   null;
      
      // If no status from API, try to determine from latest_action text
      if (!status && bill.latest_action?.text) {
        const actionText = bill.latest_action.text.toLowerCase();
        if (actionText.includes('passed') && actionText.includes('senate') && actionText.includes('house')) {
          status = 'Passed Both Chambers';
        } else if (actionText.includes('became public law') || actionText.includes('signed by president') || actionText.includes('enacted')) {
          status = 'Became Law';
        } else if (actionText.includes('sent to president') || actionText.includes('presented to president')) {
          status = 'To President';
        } else if (actionText.includes('passed senate') || actionText.includes('senate passed')) {
          status = 'Passed Senate';
        } else if (actionText.includes('passed house') || actionText.includes('house passed')) {
          status = 'Passed House';
        } else if (actionText.includes('placed on') && (actionText.includes('calendar') || actionText.includes('union calendar'))) {
          status = 'On Calendar';
        } else if (actionText.includes('motion to proceed') && actionText.includes('senate')) {
          status = 'Passed House'; // In Senate after passing House
        } else if (actionText.includes('received in the senate')) {
          status = 'Passed House';
        } else if (actionText.includes('in senate') && (actionText.includes('consideration') || actionText.includes('motion'))) {
          status = 'In Senate';
        } else if (actionText.includes('ordered to be reported') || (actionText.includes('reported') && actionText.includes('committee'))) {
          status = 'Reported from Committee';
        } else if (actionText.includes('vetoed') || actionText.includes('veto')) {
          status = 'Vetoed';
        } else if (actionText.includes('failed') || actionText.includes('rejected')) {
          status = 'Failed';
        } else if (actionText.includes('introduced')) {
          status = 'Introduced';
        } else if (actionText.includes('referred to') || actionText.includes('committee')) {
          status = 'In Committee';
        }
      }
      
      // Final fallback
      if (!status) {
        status = 'Pending';
      }
      
      // Determine if bill is bettable (has Polymarket odds)
      const isBettable = bill.hasPolymarketOdds || false;
      
      // Use Polymarket odds if available, otherwise calculate based on cosponsors
      // For non-bettable bills, passingOdds/failingOdds are not meaningful
      // yesOdds/noOdds from Polymarket are already percentages (e.g., 52.0 = 52%), convert to decimal for display
      const passingOdds = yesOdds !== null ? yesOdds / 100 : (baseDetails?.yesPrice || (cosponsors > 40 ? 0.65 : cosponsors > 25 ? 0.45 : 0.30));
      const failingOdds = noOdds !== null ? noOdds / 100 : (baseDetails?.noPrice || (cosponsors > 40 ? 0.35 : cosponsors > 25 ? 0.55 : 0.70));
      
      // Determine if bill is passed or failed based on status
      const isPassed = status === 'Passed House' || 
                       status === 'Passed Senate' || 
                       status === 'Passed Both Chambers' ||
                       status === 'Became Law' ||
                       status === 'To President';
      const isFailed = status === 'Failed' || status === 'Vetoed';
      
      return {
        id: billId,
        title: bill.title || graphBill?.title || `${billId} - Legislation`,
        summary: baseDetails?.summary || graphBill?.summary || `${bill.title || billId} - ${sector} sector legislation.`,
        sponsor: baseDetails?.sponsor || graphBill?.sponsorId || `Sponsor of ${billId}`,
        yesPrice: passingOdds,
        noPrice: failingOdds,
        passingOdds: passingOdds,
        failingOdds: failingOdds,
        polymarketYesOdds: yesOdds,
        polymarketNoOdds: noOdds,
        polymarketVolume: polymarketData?.volume || null,
        isBettable: isBettable,
        isPassed: isPassed,
        isFailed: isFailed,
        sector: sector,
        date: bill.latest_action?.date || date || bill.introduced_date, // Prioritize latest_action.date
        latest_action: bill.latest_action, // Store for direct access
        introduced_date: bill.introduced_date, // Store for fallback
        cosponsors: cosponsors,
        status: status,
        committees: graphBill?.committees || baseDetails?.committees || [],
        billUrl: bill.url || baseDetails?.billUrl || `https://www.congress.gov/bill/117th-congress/${billId.includes('H') ? 'house-bill' : 'senate-bill'}/${billId.replace(/[^0-9]/g, '')}`,
      };
    });
  }, [recentBills, polymarketOdds]);

  // Slice legislation to only show displayed bills (for lazy loading)
  const displayedLegislation = useMemo(() => {
    // If using recentBills (from API), only show up to displayedBillsCount
    if (recentBills.length > 0) {
      return allLegislation.slice(0, displayedBillsCount);
    }
    // Otherwise show all (from graphBills fallback)
    return allLegislation;
  }, [allLegislation, recentBills.length, displayedBillsCount]);

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

  // Helper function to get status color
  const getStatusColor = (status) => {
    if (!status) return { bg: 'bg-gray-50', text: 'text-gray-700' };
    
    const statusLower = status.toLowerCase();
    
    // Passed statuses - green
    if (statusLower.includes('passed') || statusLower.includes('became law') || statusLower.includes('to president')) {
      return { bg: 'bg-green-50', text: 'text-green-700' };
    }
    
    // Failed statuses - red
    if (statusLower.includes('failed') || statusLower.includes('vetoed')) {
      return { bg: 'bg-red-50', text: 'text-red-700' };
    }
    
    // On Calendar - yellow/orange
    if (statusLower.includes('calendar')) {
      return { bg: 'bg-yellow-50', text: 'text-yellow-700' };
    }
    
    // In Committee - blue
    if (statusLower.includes('committee') || statusLower.includes('reported')) {
      return { bg: 'bg-blue-50', text: 'text-blue-700' };
    }
    
    // In Senate - purple
    if (statusLower.includes('senate') && !statusLower.includes('passed')) {
      return { bg: 'bg-purple-50', text: 'text-purple-700' };
    }
    
    // Introduced - cyan
    if (statusLower.includes('introduced')) {
      return { bg: 'bg-cyan-50', text: 'text-cyan-700' };
    }
    
    // Default - gray for pending and other statuses
    return { bg: 'bg-gray-50', text: 'text-gray-700' };
  };

  // Filter and sort legislation
  const filteredLegislation = useMemo(() => {
    let filtered = [...displayedLegislation];

    if (legislationFilter === 'passed') {
      filtered = filtered.filter(b => b.isPassed);
    } else if (legislationFilter === 'failed') {
      filtered = filtered.filter(b => b.isFailed);
    } else if (legislationFilter === 'pending') {
      filtered = filtered.filter(b => !b.isPassed && !b.isFailed);
    } else if (legislationFilter === 'on_calendar') {
      filtered = filtered.filter(b => b.status && b.status.toLowerCase().includes('calendar'));
    } else if (legislationFilter === 'in_committee') {
      filtered = filtered.filter(b => b.status && (b.status.toLowerCase().includes('committee') || b.status.toLowerCase().includes('reported')));
    } else if (legislationFilter === 'passed_senate') {
      filtered = filtered.filter(b => b.status && b.status.toLowerCase().includes('passed senate'));
    } else if (legislationFilter === 'passed_house') {
      filtered = filtered.filter(b => b.status && b.status.toLowerCase().includes('passed house'));
    } else if (legislationFilter === 'Technology') {
      filtered = filtered.filter(b => b.sector === 'Technology');
    } else if (legislationFilter === 'Financials') {
      filtered = filtered.filter(b => b.sector === 'Financials');
    } else if (legislationFilter === 'Energy') {
      filtered = filtered.filter(b => b.sector === 'Energy');
    } else if (legislationFilter === 'Healthcare') {
      filtered = filtered.filter(b => b.sector === 'Healthcare');
    }

    // Sort: Bettable bills first, then non-bettable bills
    // Each section is sorted independently based on sortBy
    filtered.sort((a, b) => {
      // First, separate bettable and non-bettable bills
      if (a.isBettable && !b.isBettable) return -1; // a (bettable) comes first
      if (!a.isBettable && b.isBettable) return 1;  // b (bettable) comes first
      
      // Both are bettable or both are non-bettable - sort within their section
      const isBettable = a.isBettable;
      
      if (sortBy === 'odds') {
        // Only sort bettable bills by odds; non-bettable bills remain in original order
        if (isBettable) {
          // Sort bettable bills by passing odds (descending - highest odds first)
          const oddsA = a.passingOdds || 0;
          const oddsB = b.passingOdds || 0;
          return oddsB - oddsA;
        } else {
          // Non-bettable bills: keep original order
          return 0;
        }
      } else if (sortBy === 'title') {
        // Sort both sections alphabetically by title
        const titleA = (a.title || '').toLowerCase();
        const titleB = (b.title || '').toLowerCase();
        return titleA.localeCompare(titleB);
      } else if (sortBy === 'date') {
        // Sort both sections by date (most recent first)
        const dateA = new Date(a.date || 0);
        const dateB = new Date(b.date || 0);
        return dateB - dateA; // Descending order (newest first)
      } else {
        // Default: sort by date (most recent first) for both sections
        const dateA = new Date(a.date || 0);
        const dateB = new Date(b.date || 0);
        return dateB - dateA;
      }
    });

    return filtered;
  }, [displayedLegislation, legislationFilter, sortBy]);

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
                    <optgroup label="Status">
                      <option value="passed">Passed</option>
                      <option value="failed">Failed</option>
                      <option value="pending">Pending</option>
                      <option value="on_calendar">On Calendar</option>
                      <option value="in_committee">In Committee</option>
                      <option value="passed_senate">Passed Senate</option>
                      <option value="passed_house">Passed House</option>
                    </optgroup>
                    <optgroup label="Sector">
                      <option value="Technology">Technology</option>
                      <option value="Financials">Financials</option>
                      <option value="Energy">Energy</option>
                      <option value="Healthcare">Healthcare</option>
                    </optgroup>
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
              (() => {
                // Split bills into bettable and non-bettable groups
                const bettableBills = filteredLegislation.filter(b => b.isBettable);
                const nonBettableBills = filteredLegislation.filter(b => !b.isBettable);
                
                // Helper function to render a bill card
                const renderBillCard = (bill, index, totalInGroup) => {
                  const isLastInRow = (index + 1) % 2 === 0;
                  // For odd-numbered groups, the last item should not have a right border
                  const isLastItem = index === totalInGroup - 1;
                  const isOddGroup = totalInGroup % 2 === 1;
                  
                  return (
                    <Link
                      key={bill.id}
                      to={`/legislation/${bill.id}/bet`}
                      className={`flex bg-white border-b border-r border-black hover:bg-gray-50 transition-colors relative group ${
                        isLastInRow || (isLastItem && isOddGroup) ? 'border-r-0' : ''
                      }`}
                    >
                      {/* Blue square on top-right corner on hover */}
                      <div className="absolute top-[-1px] right-[-1px] w-4 h-4 bg-blue-600 opacity-0 group-hover:opacity-100 transition-opacity z-10 border border-black"></div>
                      
                      {/* Left Section - White Background (75-80% width) */}
                      <div className="flex-1 border-r border-black p-6 flex flex-col" style={{ width: '75%' }}>
                        {/* Top Area - Bill ID and Name - Fixed height container */}
                        <div className="mb-4 flex-shrink-0" style={{ minHeight: '7.5rem' }}>
                          <div className="text-xs text-gray-600 mb-1">Bill id</div>
                          <div className="border-b border-black mb-2"></div>
                          <div className="text-sm font-medium text-gray-700 mb-1">
                            {bill.id.startsWith('H.R.') ? bill.id.replace(/^H\.R\./, 'HR.') : bill.id}
                          </div>
                          <h3 className="text-2xl font-bold text-gray-900 line-clamp-2" style={{
                            display: '-webkit-box',
                            WebkitLineClamp: 2,
                            WebkitBoxOrient: 'vertical',
                            overflow: 'hidden',
                            textOverflow: 'ellipsis',
                            lineHeight: '1.3',
                            minHeight: '3.9rem', // Fixed minimum height to match maxHeight
                            maxHeight: '3.9rem' // Approximately 2 lines at text-2xl
                          }}>{bill.title}</h3>
                        </div>
                        
                        {/* Bottom Area - Three blocks in a row - Fixed position at bottom */}
                        <div className="flex gap-0 mt-auto">
                          {/* Sector Block - White */}
                          <div className="flex-1 p-4 bg-white border-r border-black">
                            <div className="text-xs text-gray-600 mb-1">Sector</div>
                            <div className="text-sm font-medium text-gray-900">{bill.sector}</div>
                          </div>
                          
                          {/* Date Block - White */}
                          <div className="flex-1 p-4 bg-white border-r border-black">
                            <div className="text-xs text-gray-600 mb-1">date</div>
                            <div className="text-sm font-medium text-gray-900">
                              {(() => {
                                // Try to get date from bill.date, or from latest_action.date if available
                                const dateValue = bill.date || bill.latest_action?.date || bill.introduced_date;
                                
                                if (!dateValue) {
                                  return 'N/A';
                                }
                                
                                try {
                                  // Handle both ISO strings and YYYY-MM-DD format
                                  const dateObj = new Date(dateValue);
                                  if (!isNaN(dateObj.getTime())) {
                                    return dateObj.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
                                  }
                                } catch (e) {
                                  console.warn(`Error formatting date for bill ${bill.id}:`, dateValue, e);
                                }
                                
                                return 'N/A';
                              })()}
                            </div>
                          </div>
                          
                          {/* Cosponsors Block - White */}
                          <div className="flex-1 p-4 bg-white">
                            <div className="text-xs text-gray-600 mb-1">No.</div>
                            <div className="text-xs text-gray-600 mb-1">cosponsors</div>
                            <div className="text-sm font-medium text-gray-900">{bill.cosponsors}</div>
                          </div>
                        </div>
                      </div>
                      
                      {/* Right Section - Status-colored Background (20-25% width) */}
                      {bill.isBettable ? (
                        <div 
                          className={`flex items-center justify-center p-6 ${
                            bill.passingOdds >= 0.5 ? 'bg-green-50' : 'bg-red-50'
                          }`} 
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
                      ) : (
                        <div 
                          className={`flex items-center justify-center p-6 ${getStatusColor(bill.status).bg}`}
                          style={{ width: '25%' }}
                        >
                          <div className="text-center">
                            <div 
                              className={`font-bold ${getStatusColor(bill.status).text}`}
                              style={{ 
                                fontSize: bill.status && bill.status.length > 15 ? '1.2rem' : bill.status && bill.status.length > 10 ? '1.5rem' : '1.8rem', 
                                lineHeight: '1.2' 
                              }}
                            >
                              {bill.isPassed ? 'PASSED' : bill.isFailed ? 'FAILED' : (bill.status || 'PENDING').toUpperCase()}
                            </div>
                          </div>
                        </div>
                      )}
                    </Link>
                  );
                };
                
                return (
                  <>
                    {/* Bettable bills grid */}
                    {bettableBills.length > 0 && (
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-0 border-t border-l border-r border-black -mx-6">
                        {bettableBills.map((bill, index) => renderBillCard(bill, index, bettableBills.length))}
                      </div>
                    )}
                    
                    {/* Non-bettable bills grid */}
                    {nonBettableBills.length > 0 && (
                      <>
                        {/* Top border and spacing for non-bettable bills section */}
                        {bettableBills.length > 0 && (
                          <>
                            <div className="w-full border-t-2 border-black -mx-6 mt-8 mb-8"></div>
                          </>
                        )}
                        <div className={`grid grid-cols-1 md:grid-cols-2 gap-0 border-l border-r border-black -mx-6 ${bettableBills.length > 0 ? 'border-t-0' : 'border-t'}`}>
                          {nonBettableBills.map((bill, index) => renderBillCard(bill, index, nonBettableBills.length))}
                        
                        {/* Observer target for infinite scroll */}
                        {(displayedBillsCount < recentBills.length || 
                          (totalBillsCount > 0 && recentBills.length < totalBillsCount) ||
                          (totalBillsCount === 0 && recentBills.length > 0 && !loadingMoreBills)) && (
                          <div 
                            ref={legislationObserverTarget} 
                            className="col-span-2 border-b border-black p-6 text-center"
                            style={{ minHeight: '100px' }} // Ensure it's visible for the observer
                          >
                            {loadingMoreBills ? (
                              <div className="text-gray-600">Loading more bills...</div>
                            ) : (
                              <div className="text-gray-400 text-sm">
                                {displayedBillsCount < recentBills.length 
                                  ? `Showing ${displayedBillsCount} of ${recentBills.length} loaded bills. Scroll for more...`
                                  : 'Scroll for more bills...'}
                              </div>
                            )}
                          </div>
                        )}
                        </div>
                      </>
                    )}
                    
                    {/* Observer target for infinite scroll - if only bettable bills exist */}
                    {bettableBills.length > 0 && nonBettableBills.length === 0 && (
                      (displayedBillsCount < recentBills.length || 
                        (totalBillsCount > 0 && recentBills.length < totalBillsCount) ||
                        (totalBillsCount === 0 && recentBills.length > 0 && !loadingMoreBills)) && (
                        <div 
                          ref={legislationObserverTarget} 
                          className="w-full border-t border-b border-l border-r border-black p-6 text-center -mx-6"
                          style={{ minHeight: '100px' }}
                        >
                          {loadingMoreBills ? (
                            <div className="text-gray-600">Loading more bills...</div>
                          ) : (
                            <div className="text-gray-400 text-sm">
                              {displayedBillsCount < recentBills.length 
                                ? `Showing ${displayedBillsCount} of ${recentBills.length} loaded bills. Scroll for more...`
                                : 'Scroll for more bills...'}
                            </div>
                          )}
                        </div>
                      )
                    )}
                  </>
                );
              })()
            )}
          </>
        )}
      </div>
    </div>
  );
};

export default BrowsePage;

