import axios from 'axios';

// Use proxy in development, or direct API URL in production
const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || (import.meta.env.DEV ? '/api' : 'http://localhost:8080');

const apiClient = axios.create({
  baseURL: API_BASE_URL,
  headers: {
    'Content-Type': 'application/json',
  },
});

// Helper function to calculate age from date of birth
const calculateAge = (dateOfBirth) => {
  if (!dateOfBirth) return null;
  const birthDate = new Date(dateOfBirth);
  const today = new Date();
  let age = today.getFullYear() - birthDate.getFullYear();
  const monthDiff = today.getMonth() - birthDate.getMonth();
  if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < birthDate.getDate())) {
    age--;
  }
  return age;
};

// Helper function to parse trade amount range and get midpoint (moved to top for reuse)
const parseTradeAmount = (amountStr) => {
  if (!amountStr || typeof amountStr !== 'string') return 0;
  
  // Handle ranges like "$100,001 - $250,000" or "$1,000,001 - $5,000,000"
  const rangeMatch = amountStr.match(/\$?([\d,]+)\s*-\s*\$?([\d,]+)/);
  if (rangeMatch) {
    const min = parseInt(rangeMatch[1].replace(/,/g, ''), 10);
    const max = parseInt(rangeMatch[2].replace(/,/g, ''), 10);
    return Math.floor((min + max) / 2); // Return midpoint
  }
  
  // Handle single values like "$1,000,000"
  const singleMatch = amountStr.match(/\$?([\d,]+)/);
  if (singleMatch) {
    return parseInt(singleMatch[1].replace(/,/g, ''), 10);
  }
  
  return 0;
};

// Fetch congressman data from API with fallback to mock data
export const getCongressman = async (id) => {
  try {
    const response = await apiClient.get(`/politician-info/${id}`);
    if (response.data && response.data.length > 0) {
      const apiData = response.data[0]; // API returns an array
      
      // Fetch trades to calculate tradeVolume and totalTrades
      let tradeVolume = 0;
      let totalTrades = 0;
      let lastTraded = 'N/A';
      
      try {
        const tradesResponse = await apiClient.get(`/trades-by/${id}`);
        const trades = tradesResponse.data || [];
        totalTrades = trades.length;
        
        // Calculate tradeVolume from trade amounts
        tradeVolume = trades.reduce((sum, trade) => {
          return sum + parseTradeAmount(trade.tradeAmount);
        }, 0);
        
        // Get most recent trade date
        if (trades.length > 0) {
          const sortedTrades = trades.sort((a, b) => {
            const dateA = new Date(a.tradedAt || a.disclosureDate);
            const dateB = new Date(b.tradedAt || b.disclosureDate);
            return dateB - dateA; // Most recent first
          });
          lastTraded = sortedTrades[0].tradedAt || sortedTrades[0].disclosureDate || 'N/A';
        }
      } catch (tradesError) {
        console.error(`Error fetching trades for congressman ${id}:`, tradesError);
        // Use default values if trades fetch fails
        tradeVolume = 'N/A';
        totalTrades = 0;
        lastTraded = 'N/A';
      }
      
      // Map API response to frontend format
      return {
        id: apiData.bioGuideId,
        name: apiData.fullName,
        party: apiData.politicalParty === 'Democrat' ? 'Democratic' : apiData.politicalParty,
        chamber: apiData.position?.includes('Senator') ? 'Senate' : 'House',
        state: apiData.territory,
        image: apiData.imageUrl,
        age: calculateAge(apiData.dateOfBirth),
        netWorth: 'N/A', // Not available from API
        tradeVolume: tradeVolume || 0,
        totalTrades: totalTrades,
        lastTraded: lastTraded,
        yearsActive: 'N/A', // Not available from API
        isCurrentMember: true,
      };
    }
    // Return null if congressman not found
    return null;
  } catch (error) {
    console.error('Error fetching congressman from API:', error);
    return null;
  }
};

export const getTrades = async (congressmanId) => {
  try {
    const response = await apiClient.get(`/trades-by/${congressmanId}`);
    if (response.data && response.data.length > 0) {
      // Map API response to frontend format
      return response.data.map((trade, index) => ({
        id: trade.tradeId || index + 1,
        stock: trade.ticker || '-',
        company: trade.ticker ? `${trade.ticker} - COMMON STOCK` : 'Unknown',
        assetType: 'Stock',
        transaction: trade.tradeType === 'Sale' ? 'Sale' : 'Purchase',
        filed: trade.disclosureDate || trade.tradedAt,
        traded: trade.tradedAt,
        description: `${trade.tradeType} of ${trade.ticker || 'stock'}`,
        excessReturn: 0, // API doesn't provide excessReturn, set to 0
        amount: trade.tradeAmount || 'N/A',
      }));
    }
    // Return empty array if API returns empty
    return [];
  } catch (error) {
    console.error('Error fetching trades from API, returning empty array:', error);
    // Return empty array on error
    return [];
  }
};

// Get all representatives basic info (fast, no trade data)
export const getAllRepresentativesBasic = async () => {
  try {
    const response = await apiClient.get('/all-representatives');
    if (response.data && response.data.length > 0) {
      return response.data.map((rep) => ({
        id: rep.bioGuideId,
        name: rep.fullName,
        party: rep.politicalParty === 'Democrat' ? 'Democratic' : rep.politicalParty,
        chamber: rep.position?.includes('Senator') ? 'Senate' : 'House',
        state: rep.territory,
        image: rep.imageUrl,
        dateOfBirth: rep.dateOfBirth,
        position: rep.position,
        isCurrentMember: true,
        tradeVolume: 0, // Will be loaded lazily
        totalTrades: 0, // Will be loaded lazily
        tradesLoaded: false, // Flag to track if trades have been loaded
      }));
    }
    return [];
  } catch (error) {
    console.error('Error fetching all representatives from API:', error);
    return [];
  }
};

// Load trade statistics for a batch of representatives
export const loadTradesForBatch = async (representatives) => {
  const batchSize = 10; // Process 10 at a time to avoid overwhelming the API
  const results = [];
  
  for (let i = 0; i < representatives.length; i += batchSize) {
    const batch = representatives.slice(i, i + batchSize);
    const batchResults = await Promise.allSettled(
      batch.map(async (rep) => {
        try {
          // Fetch trades for this representative with a timeout
          const tradesResponse = await Promise.race([
            apiClient.get(`/trades-by/${rep.id}`),
            new Promise((_, reject) => 
              setTimeout(() => reject(new Error('Timeout')), 5000)
            )
          ]);
          const trades = tradesResponse.data || [];
          
          // Calculate tradeVolume from trade amounts
          const tradeVolume = trades.reduce((sum, trade) => {
            return sum + parseTradeAmount(trade.tradeAmount);
          }, 0);
          
          return {
            ...rep,
            tradeVolume: tradeVolume || 0,
            totalTrades: trades.length,
            tradesLoaded: true,
          };
        } catch (error) {
          // If trades fetch fails, return rep with 0 stats
          console.warn(`Error fetching trades for ${rep.id}:`, error.message || error);
          return {
            ...rep,
            tradeVolume: 0,
            totalTrades: 0,
            tradesLoaded: true,
          };
        }
      })
    );
    
    // Extract successful results
    batchResults.forEach(result => {
      if (result.status === 'fulfilled') {
        results.push(result.value);
      }
    });
  }
  
  return results;
};

// Get all representatives from API with calculated trade statistics
// Note: This fetches trades for each representative, which may be slow for large datasets
// Use getAllRepresentativesBasic + loadTradesForBatch for better performance
export const getAllRepresentatives = async () => {
  try {
    const response = await apiClient.get('/all-representatives');
    if (response.data && response.data.length > 0) {
      // Fetch trades for each representative to calculate tradeVolume and totalTrades
      // Using Promise.allSettled to ensure individual failures don't stop the entire operation
      const representativesWithTrades = await Promise.allSettled(
        response.data.map(async (rep) => {
          try {
            // Fetch trades for this representative with a timeout to prevent hanging
            const tradesResponse = await Promise.race([
              apiClient.get(`/trades-by/${rep.bioGuideId}`),
              new Promise((_, reject) => 
                setTimeout(() => reject(new Error('Timeout')), 5000)
              )
            ]);
            const trades = tradesResponse.data || [];
            
            // Calculate tradeVolume from trade amounts
            const tradeVolume = trades.reduce((sum, trade) => {
              return sum + parseTradeAmount(trade.tradeAmount);
            }, 0);
            
            return {
              id: rep.bioGuideId,
              name: rep.fullName,
              party: rep.politicalParty === 'Democrat' ? 'Democratic' : rep.politicalParty,
              chamber: rep.position?.includes('Senator') ? 'Senate' : 'House',
              state: rep.territory,
              image: rep.imageUrl,
              dateOfBirth: rep.dateOfBirth,
              position: rep.position,
              isCurrentMember: true,
              tradeVolume: tradeVolume || 0,
              totalTrades: trades.length,
            };
          } catch (error) {
            // If trades fetch fails, return basic info without trade stats
            // This ensures we still show the representative even if trade data is unavailable
            console.warn(`Error fetching trades for ${rep.bioGuideId}:`, error.message || error);
            return {
              id: rep.bioGuideId,
              name: rep.fullName,
              party: rep.politicalParty === 'Democrat' ? 'Democratic' : rep.politicalParty,
              chamber: rep.position?.includes('Senator') ? 'Senate' : 'House',
              state: rep.territory,
              image: rep.imageUrl,
              dateOfBirth: rep.dateOfBirth,
              position: rep.position,
              isCurrentMember: true,
              tradeVolume: 0,
              totalTrades: 0,
            };
          }
        })
      );
      
      // Extract values from Promise.allSettled results
      // Since errors are handled within the map function, all results should be fulfilled
      // Filter out any unexpected failures
      return representativesWithTrades
        .map(result => result.status === 'fulfilled' ? result.value : null)
        .filter(rep => rep !== null);
    }
    return [];
  } catch (error) {
    console.error('Error fetching all representatives from API:', error);
    return [];
  }
};

export const getChartData = async (congressmanId) => {
  try {
    // Fetch trades to calculate volume by year with buy/sell breakdown
    const tradesResponse = await apiClient.get(`/trades-by/${congressmanId}`);
    const trades = tradesResponse.data || [];
    
    if (trades.length === 0) {
      return {
        volumeByYear: [],
        sectorData: []
      };
    }
    
    // Process trades to get volume by year with buy/sell breakdown
    const volumeByYearMap = {};
    
    trades.forEach((trade) => {
      if (!trade.tradedAt || trade.tradedAt.length < 4) return;
      
      const year = trade.tradedAt.substring(0, 4);
      const amount = parseTradeAmount(trade.tradeAmount || '0');
      const isPurchase = trade.tradeType === 'Purchase' || trade.tradeType === 'Buy';
      
      if (!volumeByYearMap[year]) {
        volumeByYearMap[year] = { year: parseInt(year), buy: 0, sell: 0 };
      }
      
      if (isPurchase) {
        volumeByYearMap[year].buy += amount;
      } else {
        volumeByYearMap[year].sell += amount;
      }
    });
    
    // Convert to array and sort by year
    const volumeByYear = Object.values(volumeByYearMap).sort((a, b) => a.year - b.year);
    
    // Calculate sector data from trades (simplified - can be enhanced later)
    // For now, return empty array since trades don't have sector information
    const sectorData = [];
    
    return {
      volumeByYear,
      sectorData
    };
  } catch (error) {
    console.error('Error fetching chart data:', error);
    return {
      volumeByYear: [],
      sectorData: []
    };
  }
};

// ============================================
// Model API Client (Port 8000)
// ============================================
// Use proxy in development to avoid CORS issues
const MODEL_API_BASE_URL = import.meta.env.VITE_MODEL_API_BASE_URL || (import.meta.env.DEV ? '/model-api' : 'http://localhost:8000');

const modelApiClient = axios.create({
  baseURL: MODEL_API_BASE_URL,
  headers: {
    'Content-Type': 'application/json',
  },
  timeout: 20000, // 20 second timeout (stocks can take 10-15 seconds)
});

// Fetch recent bills from model API
export const getRecentBills = async () => {
  try {
    console.log('Fetching recent bills from API...');
    const response = await modelApiClient.get('/recent_bills');
    console.log('Recent bills API response:', response.data);
    
    if (response.data && response.data.results && response.data.results.length > 0) {
      const bills = response.data.results.map((bill) => ({
        bill_id: bill.bill_id, // e.g., "HR.5345" or "SJRES.88"
        title: bill.title || 'Untitled Bill',
        latest_action: bill.latest_action || {},
        url: bill.url,
      }));
      console.log(`Fetched ${bills.length} bills from API`);
      return bills;
    }
    console.log('No bills in API response');
    return [];
  } catch (error) {
    console.error('Error fetching recent bills from model API:', error);
    console.error('Error details:', error.response?.data || error.message);
    return [];
  }
};

// Parse bill_id to extract bill_type and bill_number
// Example: "H.R.1234" -> {bill_type: "HR", bill_number: 1234}
// Example: "H.2461" -> {bill_type: "HR", bill_number: 2461}
// Example: "HR.1234" -> {bill_type: "HR", bill_number: 1234}
// Example: "S.567" -> {bill_type: "S", bill_number: 567}
const parseBillId = (billId) => {
  if (!billId) return null;
  
  // Match patterns like: HR.1234, H.R.1234, H.1234, S.567, etc.
  // Also handle full types like HJRES, SJRES, etc.
  const patterns = [
    /^(HR|H\.R|H\.R\.|H)(?:\.)?(\d+)$/i,  // HR.1234, H.R.1234, H.1234, or H.R.1234
    /^(S)(?:\.)?(\d+)$/i,                  // S.567
    /^(HJRES|SJRES|HCONRES|SCONRES|HRES|SRES)(?:\.)?(\d+)$/i,  // Full types
  ];
  
  for (const pattern of patterns) {
    const match = billId.match(pattern);
    if (match) {
      // Normalize: H, H.R, H.R., or HR -> HR (for House bills), S -> S
      let billType = match[1].toUpperCase();
      // Handle various H formats
      if (billType === 'H' || billType === 'H.R' || billType === 'H.R.') {
        billType = 'HR'; // Normalize to HR for consistency
      }
      
      // Convert to lowercase for API (API expects: hr, s, hjres, sjres, hconres, sconres, hres, sres)
      const billTypeLower = billType.toLowerCase();
      
      return {
        bill_type: billTypeLower, // API expects lowercase
        bill_number: parseInt(match[2], 10),
      };
    }
  }
  
  console.warn(`Could not parse bill_id: ${billId}`);
  return null;
};

// Fetch Polymarket odds for bills
export const getPolymarketBills = async () => {
  try {
    const response = await modelApiClient.get('/polymarket_bills');
    if (response.data && response.data.results) {
      return response.data.results;
    }
    return [];
  } catch (error) {
    console.error('Error fetching Polymarket bills:', error);
    return [];
  }
};

// Fetch Polymarket odds for a specific bill
export const getPolymarketOddsForBill = async (billId) => {
  try {
    const allBills = await getPolymarketBills();
    if (!billId || !allBills || allBills.length === 0) return null;
    
    // Try multiple normalization strategies for matching
    const normalizeBillId = (id) => {
      if (!id) return null;
      // Remove all dots and spaces, uppercase
      return id.replace(/\./g, '').replace(/\s/g, '').toUpperCase();
    };
    
    const normalizeStandard = (id) => {
      if (!id) return null;
      return id
        .replace(/H\.R\./gi, 'HR.')
        .replace(/H\.R/gi, 'HR.')
        .replace(/H\s*R\s*/gi, 'HR.')
        .replace(/S\./gi, 'S.')
        .replace(/\s+/g, '')
        .toUpperCase();
    };
    
    const removeLeadingZeros = (id) => {
      if (!id) return null;
      return id.replace(/(\.|^)(0+)(\d+)/, '$1$3');
    };
    
    const billIdNormalized = normalizeBillId(billId);
    const billIdStandardized = normalizeStandard(billId);
    const billIdNoLeadingZeros = removeLeadingZeros(billId);
    const billIdNoLeadingZerosNorm = normalizeBillId(billIdNoLeadingZeros);
    
    // Try to find matching bill with multiple strategies
    const bill = allBills.find(b => {
      if (!b.bill_id) return false;
      
      // Try exact match
      if (b.bill_id === billId) return true;
      
      // Try normalized match
      const bNormalized = normalizeBillId(b.bill_id);
      if (bNormalized === billIdNormalized) return true;
      
      // Try standardized match
      const bStandardized = normalizeStandard(b.bill_id);
      if (bStandardized === billIdStandardized) return true;
      
      // Try without leading zeros
      const bNoLeadingZeros = removeLeadingZeros(b.bill_id);
      if (bNoLeadingZeros === billIdNoLeadingZeros) return true;
      
      const bNoLeadingZerosNorm = normalizeBillId(bNoLeadingZeros);
      if (bNoLeadingZerosNorm === billIdNoLeadingZerosNorm) return true;
      
      return false;
    });
    
    if (bill) {
      console.log(`Found Polymarket odds for ${billId}: Yes ${bill.yes_percentage}%, No ${bill.no_percentage}%`);
    } else {
      console.log(`No Polymarket odds found for ${billId}. Available bills:`, allBills.map(b => b.bill_id));
    }
    
    return bill || null;
  } catch (error) {
    console.error(`Error fetching Polymarket odds for bill ${billId}:`, error);
    return null;
  }
};

// Fetch relevant stocks for a bill from model API (with timeout)
// Note: This can take 10-15 seconds, so should be called in background after page loads
export const getBillRelevantStocks = async (billId, timeout = 15000) => {
  try {
    const parsed = parseBillId(billId);
    if (!parsed) {
      console.warn(`Could not parse bill_id: ${billId}`);
      return [];
    }

    console.log(`Fetching stocks for bill ${billId} -> bill_type: ${parsed.bill_type}, bill_number: ${parsed.bill_number}`);
    
    // Create a custom axios request with increased timeout for this specific call
    // The axios client has a 20s timeout, but we can override per-request
    const response = await modelApiClient.get('/match', {
      params: {
        bill_type: parsed.bill_type, // Already lowercase from parseBillId
        bill_number: parsed.bill_number,
      },
      timeout: timeout, // Use the provided timeout (default 15000ms)
    });

    if (response.data && response.data.results && response.data.results.length > 0) {
      // Map API response to frontend format (top 5 stocks)
      return response.data.results.slice(0, 5).map((stock, index) => ({
        symbol: stock.ticker || `STOCK${index + 1}`,
        name: stock.name || 'Unknown Company',
        sector: stock.sector || 'Unknown',
        relevance: `Hybrid score: ${(stock.hybrid_score || 0).toFixed(3)}. This stock is relevant to the bill based on similarity analysis.`,
        // Mock price data (not provided by API)
        currentPrice: 100 + Math.random() * 200,
        change: (Math.random() - 0.5) * 10,
        changePercent: (Math.random() - 0.5) * 5,
        marketCap: 'N/A',
      }));
    }
    return [];
  } catch (error) {
    // Log the actual error message from API for debugging
    const errorMessage = error.response?.data?.detail || error.message;
    console.error(`Error fetching relevant stocks for bill ${billId} from model API:`, errorMessage);
    console.error('Full error:', error);
    return [];
  }
};

// Fetch bill information from Congress API (status, sponsors, etc.)
export const getBillInfo = async (billId) => {
  try {
    const parsed = parseBillId(billId);
    if (!parsed) {
      console.warn(`Could not parse bill_id for bill_info: ${billId}`);
      return null;
    }

    console.log(`Fetching bill info for ${billId} -> bill_type: ${parsed.bill_type}, bill_number: ${parsed.bill_number}`);
    
    const response = await modelApiClient.get('/bill_info', {
      params: {
        bill_type: parsed.bill_type, // Already lowercase
        bill_number: parsed.bill_number,
      },
      timeout: 10000, // 10 second timeout for bill info
    });

    if (response.data) {
      return {
        bill_id: response.data.bill_id,
        title: response.data.title,
        introduced_date: response.data.introduced_date,
        policy_area: response.data.policy_area,
        sponsors: response.data.sponsors || [],
        cosponsors_count: response.data.cosponsors_count || 0,
        latest_action: response.data.latest_action || {},
        // Determine status from latest_action text
        status: determineBillStatus(response.data.latest_action?.text || ''),
      };
    }
    return null;
  } catch (error) {
    console.error(`Error fetching bill info for ${billId}:`, error.message || error);
    return null;
  }
};

// Helper function to determine bill status from latest action text
const determineBillStatus = (actionText) => {
  if (!actionText) return 'Pending';
  
  const text = actionText.toLowerCase();
  
  // Check for passed/enacted status
  if (text.includes('became public law') || text.includes('signed by president') || text.includes('enacted')) {
    return 'Enacted';
  }
  if (text.includes('passed senate') && text.includes('passed house')) {
    return 'Passed Both Chambers';
  }
  if (text.includes('passed senate')) {
    return 'Passed Senate';
  }
  if (text.includes('passed house')) {
    return 'Passed House';
  }
  if (text.includes('vetoed') || text.includes('veto')) {
    return 'Vetoed';
  }
  if (text.includes('failed') || text.includes('rejected')) {
    return 'Failed';
  }
  if (text.includes('referred to') || text.includes('committee')) {
    return 'In Committee';
  }
  
  return 'Pending';
};

export default apiClient;

