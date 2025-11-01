import axios from 'axios';
import { mockCongressmen, mockCongressman, mockTrades, mockTradesByCongressman, mockVolumeByYear, mockVolumeByYearByCongressman, mockSectorData } from './mockData';

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
        // Use mock data as fallback
        tradeVolume = mockCongressmen[id]?.tradeVolume || 'N/A';
        totalTrades = mockCongressmen[id]?.totalTrades || 0;
        lastTraded = mockCongressmen[id]?.lastTraded || 'N/A';
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
        netWorth: mockCongressmen[id]?.netWorth || 'N/A', // Keep mock data for fields not in API
        tradeVolume: tradeVolume || 0,
        totalTrades: totalTrades,
        lastTraded: lastTraded,
        yearsActive: mockCongressmen[id]?.yearsActive || 'N/A',
        isCurrentMember: true,
      };
    }
    // Fallback to mock data if API returns empty
    const congressman = mockCongressmen[id] || mockCongressman;
    return { ...congressman, id };
  } catch (error) {
    console.error('Error fetching congressman from API, using mock data:', error);
    // Fallback to mock data on error
    const congressman = mockCongressmen[id] || mockCongressman;
    return { ...congressman, id };
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
    // Return empty array if API returns empty (no fallback to mock data)
    // return mockTradesByCongressman[congressmanId] || mockTrades; // COMMENTED OUT - no mock data fallback
    return [];
  } catch (error) {
    console.error('Error fetching trades from API, returning empty array:', error);
    // Return empty array on error (no fallback to mock data)
    // return mockTradesByCongressman[congressmanId] || mockTrades; // COMMENTED OUT - no mock data fallback
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
    // Chart data calculation - we can compute this from trades
    // For now, using mock data as API doesn't provide aggregated chart data
    // In the future, we could fetch trades and aggregate them
    
    // Mock delay to simulate API call
    await new Promise(resolve => setTimeout(resolve, 500));
    return {
      volumeByYear: mockVolumeByYearByCongressman[congressmanId] || mockVolumeByYear,
      sectorData: mockSectorData[congressmanId] || mockSectorData.P000197
    };
  } catch (error) {
    console.error('Error fetching chart data, using mock data:', error);
    // Fallback to mock data
    return {
      volumeByYear: mockVolumeByYearByCongressman[congressmanId] || mockVolumeByYear,
      sectorData: mockSectorData[congressmanId] || mockSectorData.P000197
    };
  }
};

export default apiClient;

