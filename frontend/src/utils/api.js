import axios from 'axios';
import { getTickerSectors } from './tickerToSector';

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
    // Fetch volume by year from the dedicated endpoint
    const [volumeByYearResponse, tradesResponse] = await Promise.allSettled([
      apiClient.get(`/trading-volume-by-year/${congressmanId}`),
      apiClient.get(`/trades-by/${congressmanId}`)
    ]);
    
    const volumeByYearData = volumeByYearResponse.status === 'fulfilled' 
      ? (volumeByYearResponse.value.data || [])
      : [];
    const trades = tradesResponse.status === 'fulfilled'
      ? (tradesResponse.value.data || [])
      : [];
    
    if (volumeByYearData.length === 0 && trades.length === 0) {
      return {
        volumeByYear: [],
        sectorData: []
      };
    }
    
    // Process trades to get actual buy/sell breakdown by year
    const buySellByYear = {};
    trades.forEach((trade) => {
      if (!trade.tradedAt || trade.tradedAt.length < 4) return;
      
      const year = parseInt(trade.tradedAt.substring(0, 4));
      if (isNaN(year)) return;
      
      const amount = parseTradeAmount(trade.tradeAmount || '0');
      const isPurchase = trade.tradeType === 'Purchase' || trade.tradeType === 'Buy';
      
      if (!buySellByYear[year]) {
        buySellByYear[year] = { buy: 0, sell: 0 };
      }
      
      if (isPurchase) {
        buySellByYear[year].buy += amount;
      } else {
        buySellByYear[year].sell += amount;
      }
    });
    
    // Create a map of years from the endpoint data
    // API format: [{ year: "string", totalUSDApprox: "string" }]
    const yearMap = {};
    if (volumeByYearData && volumeByYearData.length > 0) {
      volumeByYearData.forEach(item => {
        // year is a string, convert to number
        const yearStr = item.year;
        const year = typeof yearStr === 'string' ? parseInt(yearStr) : yearStr;
        
        // totalUSDApprox is a string, convert to number
        const totalVolume = typeof item.totalUSDApprox === 'string' 
          ? parseFloat(item.totalUSDApprox) 
          : (typeof item.totalUSDApprox === 'number' ? item.totalUSDApprox : 0);
        
        if (!isNaN(year) && year > 0 && !isNaN(totalVolume)) {
          // Check if we have actual buy/sell data from trades for this year
          const actualBuySell = buySellByYear[year];
          const hasActualData = actualBuySell && (actualBuySell.buy > 0 || actualBuySell.sell > 0);
          
          let buy, sell;
          if (hasActualData) {
            // Use actual buy/sell data from trades
            buy = actualBuySell.buy;
            sell = actualBuySell.sell;
          } else {
            // Create arbitrary buy/sell distribution with more buy (65% buy, 35% sell)
            buy = Math.round(totalVolume * 0.65);
            sell = Math.round(totalVolume * 0.35);
          }
          
          yearMap[year] = {
            year: year,
            totalVolume: totalVolume,
            buy: buy,
            sell: sell
          };
        }
      });
      
      console.log(`[getChartData] Fetched ${volumeByYearData.length} years from /trading-volume-by-year/${congressmanId}:`, volumeByYearData);
    } else {
      console.log(`[getChartData] No data from /trading-volume-by-year/${congressmanId} endpoint`);
    }
    
    // Combine data: prioritize endpoint data, fallback to trades-only data
    const combinedData = [];
    
    if (Object.keys(yearMap).length > 0) {
      // Use endpoint data (with actual buy/sell if available, otherwise arbitrary split)
      Object.keys(yearMap).forEach(yearStr => {
        const year = parseInt(yearStr);
        combinedData.push({
          year: year,
          buy: yearMap[year].buy,
          sell: yearMap[year].sell
        });
      });
    } else if (Object.keys(buySellByYear).length > 0) {
      // Fallback: use trades data if no endpoint data
      Object.keys(buySellByYear).forEach(yearStr => {
        const year = parseInt(yearStr);
        const buySell = buySellByYear[year];
        combinedData.push({
          year: year,
          buy: buySell.buy,
          sell: buySell.sell
        });
      });
    }
    
    // Sort by year
    const volumeByYear = combinedData.sort((a, b) => a.year - b.year);
    
    // Calculate sector data from trades
    const sectorData = await calculateSectorDataFromTrades(trades);
    
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

// Calculate sector data from trades for pie chart
const calculateSectorDataFromTrades = async (trades) => {
  try {
    if (!trades || trades.length === 0) {
      return [];
    }
    
    // Filter trades from this year only
    const currentYear = new Date().getFullYear();
    const currentYearTrades = trades.filter(trade => {
      if (!trade.tradedAt || trade.tradedAt.length < 4) return false;
      const year = parseInt(trade.tradedAt.substring(0, 4));
      return !isNaN(year) && year === currentYear;
    });
    
    if (currentYearTrades.length === 0) {
      return [];
    }
    
    // Get unique ticker symbols from trades
    const tickers = [...new Set(
      currentYearTrades
        .map(trade => trade.ticker || trade.stock)
        .filter(ticker => ticker && ticker !== '-' && ticker !== 'N/A')
    )];
    
    if (tickers.length === 0) {
      return [];
    }
    
    // Fetch sectors for all unique tickers
    const sectorMap = await getTickerSectors(tickers);
    
    // Calculate total volume by sector
    const sectorVolumeMap = {};
    
    currentYearTrades.forEach(trade => {
      const ticker = (trade.ticker || trade.stock || '').trim().toUpperCase();
      if (!ticker || ticker === '-' || ticker === 'N/A') return;
      
      const sector = sectorMap[ticker] || 'Unknown';
      const amount = parseTradeAmount(trade.tradeAmount || '0');
      
      if (!sectorVolumeMap[sector]) {
        sectorVolumeMap[sector] = 0;
      }
      sectorVolumeMap[sector] += amount;
    });
    
    // Convert to array and calculate percentages
    const totalVolume = Object.values(sectorVolumeMap).reduce((sum, vol) => sum + vol, 0);
    
    if (totalVolume === 0) {
      return [];
    }
    
    const sectorDataArray = Object.entries(sectorVolumeMap)
      .map(([sector, volume]) => ({
        sector,
        volume,
        percentage: Math.round((volume / totalVolume) * 100)
      }))
      .filter(item => item.percentage > 0) // Only include sectors with > 0%
      .sort((a, b) => b.percentage - a.percentage); // Sort by percentage descending
    
    return sectorDataArray;
  } catch (error) {
    console.error('Error calculating sector data from trades:', error);
    return [];
  }
};

// ============================================
// Alpaca Market Data API Client
// ============================================
// API keys are stored in environment variables for security
const ALPACA_API_KEY = import.meta.env.VITE_ALPACA_API_KEY;
const ALPACA_SECRET = import.meta.env.VITE_ALPACA_SECRET;
// Use proxy in development to avoid CORS issues, direct URL in production
const ALPACA_DATA_BASE_URL = import.meta.env.DEV 
  ? '/alpaca-api'  // Use vite proxy in development
  : 'https://data.alpaca.markets/v2';  // Direct URL in production

// Create axios instance for Alpaca API
const alpacaDataClient = axios.create({
  baseURL: ALPACA_DATA_BASE_URL,
  headers: {
    // Always set headers - they'll be used by proxy or direct connection
    'APCA-API-KEY-ID': ALPACA_API_KEY,
    'APCA-API-SECRET-KEY': ALPACA_SECRET,
  },
  timeout: 15000,
});

// Fetch stock bars from Alpaca API
export const getStockBars = async (symbols, timeframe = '1Day', days = 5) => {
  try {
    // Calculate start date (days ago from yesterday to ensure we have market data)
    const today = new Date();
    const yesterday = new Date(today);
    yesterday.setDate(yesterday.getDate() - 1);
    
    // Start date should be at least days back, but ensure it's a valid date
    const startDate = new Date(yesterday);
    startDate.setDate(startDate.getDate() - days);
    
    // Format dates as YYYY-MM-DD (ISO format)
    const formatDate = (date) => {
      const year = date.getFullYear();
      const month = String(date.getMonth() + 1).padStart(2, '0');
      const day = String(date.getDate()).padStart(2, '0');
      return `${year}-${month}-${day}`;
    };

    // Build params - end date should be yesterday (not today, as markets may be closed)
    // For daily bars, Alpaca suggests not including end date to get up to current day
    const params = {
      symbols: Array.isArray(symbols) ? symbols.join(',') : symbols,
      timeframe: '1Day', // Use explicit format
      start: formatDate(startDate),
      // Don't include end date - let API default to latest available
      limit: 1000,
      adjustment: 'raw',
      feed: 'sip',
    };
    
    // Only include end if we specifically want yesterday (for historical data)
    // Otherwise, let the API handle it
    // params.end = formatDate(yesterday);

    console.log('Fetching stock bars with params:', params);
    
    // Use direct connection to avoid proxy issues (proxy often fails with 400 Bad Request)
    // The proxy configuration might not forward headers correctly for Alpaca API
    const directClient = axios.create({
      baseURL: 'https://data.alpaca.markets/v2',
      headers: {
        'APCA-API-KEY-ID': ALPACA_API_KEY,
        'APCA-API-SECRET-KEY': ALPACA_SECRET,
      },
      timeout: 15000,
    });
    
    try {
      const response = await directClient.get('/stocks/bars', { params });
      console.log('Direct connection succeeded:', response.data);
      return response.data;
    } catch (directError) {
      // If direct connection fails, try proxy as fallback
      console.warn('Direct connection failed, trying proxy...', directError.message);
      try {
        const response = await alpacaDataClient.get('/stocks/bars', { params });
        console.log('Proxy request succeeded:', response.data);
        return response.data;
      } catch (proxyError) {
        console.error('Both direct and proxy connections failed:', {
          direct: {
            status: directError.response?.status,
            message: directError.message,
          },
          proxy: {
            status: proxyError.response?.status,
            message: proxyError.message,
          },
        });
        throw directError; // Throw the original error
      }
    }
  } catch (error) {
    console.error('Error fetching stock bars from Alpaca:', error);
    if (error.response) {
      console.error('Response status:', error.response.status);
      console.error('Response headers:', error.response.headers);
      console.error('Response data:', error.response.data);
    } else {
      console.error('Error message:', error.message);
    }
    return null;
  }
};

// Get stock price for a specific date (historical)
export const getStockPriceForDate = async (symbol, date) => {
  try {
    // Format date as YYYY-MM-DD
    const formatDate = (dateObj) => {
      const year = dateObj.getFullYear();
      const month = String(dateObj.getMonth() + 1).padStart(2, '0');
      const day = String(dateObj.getDate()).padStart(2, '0');
      return `${year}-${month}-${day}`;
    };

    const targetDate = new Date(date);
    const startDate = new Date(targetDate);
    startDate.setDate(startDate.getDate() - 5); // Get 5 days before to ensure we have data
    const endDate = new Date(targetDate);
    endDate.setDate(endDate.getDate() + 1); // Get day after to include the target date

    const params = {
      symbols: symbol,
      timeframe: '1Day',
      start: formatDate(startDate),
      end: formatDate(endDate),
      limit: 10,
      adjustment: 'raw',
      feed: 'sip',
    };

    try {
      const response = await alpacaDataClient.get('/stocks/bars', { params });
      if (response.data && response.data.bars && response.data.bars[symbol]) {
        const bars = response.data.bars[symbol];
        if (bars && bars.length > 0) {
          // Find the bar closest to the target date
          const targetDateStr = formatDate(targetDate);
          const bar = bars.find(b => {
            const barDate = new Date(b.t).toISOString().split('T')[0];
            return barDate === targetDateStr || barDate <= targetDateStr;
          });
          
          // If exact date not found, use the closest date before or after
          if (!bar && bars.length > 0) {
            const sortedBars = [...bars].sort((a, b) => {
              const dateA = new Date(a.t);
              const dateB = new Date(b.t);
              return Math.abs(dateA - targetDate) - Math.abs(dateB - targetDate);
            });
            return sortedBars[0].c; // Return close price
          }
          
          return bar ? bar.c : null;
        }
      }
    } catch (proxyError) {
      // If proxy fails, try direct connection
      if (import.meta.env.DEV && (proxyError.response?.status === 401 || proxyError.response?.status === 400)) {
        const directClient = axios.create({
          baseURL: 'https://data.alpaca.markets/v2',
          headers: {
            'APCA-API-KEY-ID': ALPACA_API_KEY,
            'APCA-API-SECRET-KEY': ALPACA_SECRET,
          },
          timeout: 15000,
        });
        
        const response = await directClient.get('/stocks/bars', { params });
        if (response.data && response.data.bars && response.data.bars[symbol]) {
          const bars = response.data.bars[symbol];
          if (bars && bars.length > 0) {
            const targetDateStr = formatDate(targetDate);
            const bar = bars.find(b => {
              const barDate = new Date(b.t).toISOString().split('T')[0];
              return barDate === targetDateStr || barDate <= targetDateStr;
            });
            if (!bar && bars.length > 0) {
              const sortedBars = [...bars].sort((a, b) => {
                const dateA = new Date(a.t);
                const dateB = new Date(b.t);
                return Math.abs(dateA - targetDate) - Math.abs(dateB - targetDate);
              });
              return sortedBars[0].c;
            }
            return bar ? bar.c : null;
          }
        }
      }
    }
    return null;
  } catch (error) {
    console.error(`Error fetching stock price for ${symbol} on ${date}:`, error);
    return null;
  }
};

// Get current stock prices for multiple symbols
export const getCurrentStockPrices = async (symbols) => {
  try {
    if (!symbols || symbols.length === 0) return {};
    
    const response = await getStockBars(symbols, '1Day', 2);
    
    if (!response || !response.bars) {
      return {};
    }

    const priceMap = {};
    
    Object.keys(response.bars).forEach(symbol => {
      const bars = response.bars[symbol];
      if (!bars || bars.length === 0) return;
      
      const sortedBars = [...bars].sort((a, b) => new Date(b.t) - new Date(a.t));
      const latestBar = sortedBars[0];
      
      if (latestBar) {
        priceMap[symbol] = latestBar.c; // close price
      }
    });
    
    return priceMap;
  } catch (error) {
    console.error('Error getting current stock prices:', error);
    return {};
  }
};

// Get stock price data for dashboard
export const getStockData = async (symbols) => {
  try {
    // Request 5 days of data to ensure we have yesterday's data for comparison
    const response = await getStockBars(symbols, '1Day', 5);
    
    if (!response || !response.bars) {
      return {};
    }

    const stockDataMap = {};
    
    // Process each symbol's bars
    Object.keys(response.bars).forEach(symbol => {
      const bars = response.bars[symbol];
      if (!bars || bars.length === 0) return;
      
      // Sort bars by timestamp (most recent first)
      const sortedBars = [...bars].sort((a, b) => new Date(b.t) - new Date(a.t));
      
      // Get the most recent bar (today or latest available)
      const latestBar = sortedBars[0];
      
      if (latestBar) {
        const currentPrice = latestBar.c; // close price
        
        // Calculate price change:
        // - If we have 2+ bars, compare today's close with yesterday's close
        // - If only 1 bar, compare today's close with today's open for intraday movement
        let previousPrice;
        let change;
        let changePercent;
        
        if (sortedBars.length >= 2) {
          // Compare with previous day's close
          previousPrice = sortedBars[1].c;
          change = currentPrice - previousPrice;
          changePercent = previousPrice !== 0 ? (change / previousPrice) * 100 : 0;
        } else {
          // Only one bar available - compare close with open for intraday
          previousPrice = latestBar.o; // open price
          change = currentPrice - previousPrice;
          changePercent = previousPrice !== 0 ? (change / previousPrice) * 100 : 0;
        }
        
        // Format volume
        const formatVolume = (volume) => {
          if (volume >= 1000000) {
            return `${(volume / 1000000).toFixed(1)}M`;
          } else if (volume >= 1000) {
            return `${(volume / 1000).toFixed(0)}K`;
          }
          return volume.toString();
        };
        
        stockDataMap[symbol] = {
          symbol: symbol,
          price: `$${currentPrice.toFixed(2)}`,
          change: `${changePercent >= 0 ? '+' : ''}${changePercent.toFixed(2)}%`,
          isPositive: changePercent >= 0,
          volume: formatVolume(latestBar.v || 0),
          rawPrice: currentPrice,
          rawChange: changePercent,
        };
      }
    });
    
    return stockDataMap;
  } catch (error) {
    console.error('Error getting stock data:', error);
    return {};
  }
};

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

// Fetch bills sponsored by a specific congressman
export const getMemberBills = async (bioguideId, limit = 5) => {
  try {
    const response = await modelApiClient.get('/member_bills', {
      params: {
        bioguide_id: bioguideId,
        limit: limit,
      },
      timeout: 60000, // 60 second timeout (member bills can take time)
    });
    
    if (response.data && response.data.bills) {
      return response.data.bills.map((bill) => ({
        id: bill.bill_id,
        title: bill.title || 'Untitled Bill',
        status: bill.status || 'Introduced',
        date: bill.introduced_date || bill.latest_action?.date || null,
        chamber: bill.bill_id?.startsWith('H') || bill.bill_id?.startsWith('HR') ? 'House' : 'Senate',
        summary: bill.summary || '',
        committees: bill.committees || [],
        cosponsors: bill.cosponsors_count || 0,
        sector: null, // Not available from API
      }));
    }
    return [];
  } catch (error) {
    console.error('Error fetching member bills:', error);
    return [];
  }
};

// Fetch recent bills from model API
export const getRecentBills = async (limit = null, offset = 0) => {
  try {
    console.log(`Fetching recent bills from API... limit=${limit}, offset=${offset}`);
    const params = {};
    if (limit !== null) {
      params.limit = limit;
    }
    if (offset > 0) {
      params.offset = offset;
    }
    
    const response = await modelApiClient.get('/recent_bills', { params });
    console.log('Recent bills API response:', response.data);
    
    if (response.data && response.data.results && response.data.results.length > 0) {
      const bills = response.data.results.map((bill) => ({
        bill_id: bill.bill_id, // e.g., "HR.5345" or "SJRES.88"
        title: bill.title || 'Untitled Bill',
        latest_action: bill.latest_action || {},
        url: bill.url,
        status: bill.status || null, // Include status if available from API
        // These fields are not available in the /recent_bills API response:
        introduced_date: bill.introduced_date || null,
        policy_area: bill.policy_area || null,
        sponsors: bill.sponsors || [],
        cosponsors_count: bill.cosponsors_count || 0,
      }));
      console.log(`Fetched ${bills.length} bills from API (total count: ${response.data.count || 'unknown'})`);
      return {
        bills,
        totalCount: response.data.count || bills.length,
        hasMore: limit ? bills.length === limit : false,
      };
    }
    console.log('No bills in API response');
    return { bills: [], totalCount: 0, hasMore: false };
  } catch (error) {
    console.error('Error fetching recent bills from model API:', error);
    console.error('Error details:', error.response?.data || error.message);
    return { bills: [], totalCount: 0, hasMore: false };
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

// Fetch Polymarket bills with betting info from /bills endpoint
// Returns full bill data including the 'info' field from the API
export const getPolymarketBills = async () => {
  try {
    const response = await modelApiClient.get('/bills');
    if (response.data && Array.isArray(response.data)) {
      // Return full response including 'info' field, plus mapped odds format
      return response.data.map(bill => ({
        bill_id: bill.bill_id || bill.bill, // Use bill_id if available, fallback to bill field
        bill: bill.bill, // Keep original bill field
        yes_percent: bill.yes_percent, // Keep original format
        yes_percentage: bill.yes_percent || 50, // Mapped format
        no_percentage: bill.yes_percent !== undefined ? (100 - bill.yes_percent) : 50, // Calculate no_percentage
        volume: null, // Not provided by /bills endpoint
        source: 'polymarket',
        info: bill.info || null, // Include full info field (title, sponsors, cosponsors_count, etc.)
        clob_token_ids: bill.clob_token_ids || [], // CLOB token IDs for price history
        condition_id: bill.condition_id || null, // Polymarket condition ID
        market_id: bill.market_id || null, // Polymarket market ID
      }));
    }
    return [];
  } catch (error) {
    console.error('Error fetching Polymarket bills:', error);
    return [];
  }
};

// Fetch historical price data for a bill from Polymarket
export const getBillPriceHistory = async (billId, interval = '1d') => {
  try {
    // Normalize bill ID (handle various formats)
    const normalizeBillId = (id) => {
      if (!id) return null;
      return id.replace(/\./g, '').replace(/\s/g, '').toUpperCase();
    };
    
    const normalizedBillId = normalizeBillId(billId);
    
    // Call the price history endpoint
    const response = await modelApiClient.get(`/bills/${normalizedBillId}/price-history`, {
      params: {
        interval: interval,
      },
      timeout: 10000, // 10 second timeout
    });
    
    if (response.data && response.data.history) {
      // Convert to format expected by the chart component
      return response.data.history.map(entry => ({
        date: entry.date,
        timestamp: entry.timestamp * 1000, // Convert to milliseconds
        yesPrice: entry.yesPrice,
        noPrice: entry.noPrice,
        displayDate: entry.displayDate,
        volume: null, // Volume not provided by Polymarket price history
      }));
    }
    
    return [];
  } catch (error) {
    console.error(`Error fetching price history for bill ${billId}:`, error);
    return null; // Return null to indicate error (frontend can fallback to mock data)
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
    // Check both bill_id and bill fields (from /bills endpoint)
    const bill = allBills.find(b => {
      const bId = b.bill_id || b.bill; // Try bill_id first, fallback to bill field
      if (!bId) return false;
      
      // Try exact match
      if (bId === billId) return true;
      
      // Try normalized match
      const bNormalized = normalizeBillId(bId);
      if (bNormalized === billIdNormalized) return true;
      
      // Try standardized match
      const bStandardized = normalizeStandard(bId);
      if (bStandardized === billIdStandardized) return true;
      
      // Try without leading zeros
      const bNoLeadingZeros = removeLeadingZeros(bId);
      if (bNoLeadingZeros === billIdNoLeadingZeros) return true;
      
      const bNoLeadingZerosNorm = normalizeBillId(bNoLeadingZeros);
      if (bNoLeadingZerosNorm === billIdNoLeadingZerosNorm) return true;
      
      return false;
    });
    
    if (bill) {
      console.log(`Found Polymarket odds for ${billId}: Yes ${bill.yes_percentage}%, No ${bill.no_percentage}%`);
    } else {
      console.log(`No Polymarket odds found for ${billId}. Available bills:`, allBills.map(b => b.bill_id || b.bill));
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
        // Use status directly from API if available, otherwise determine from action text
        status: response.data.status || determineBillStatus(response.data.latest_action?.text || ''),
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

// Fetch graph data from /graph endpoint
// No parameters - let API return all available data with its defaults
export const getGraphData = async () => {
  try {
    // Call /graph with no params - API will use its defaults and return all available data
    console.log(`Fetching graph data from /graph (no params - getting all available data)`);
    const response = await modelApiClient.get('/graph', {
      timeout: 60000, // 60 second timeout for large graph data
    });

    if (response.data && response.data.nodes && response.data.edges) {
      console.log(`✓ Fetched graph data from API: ${response.data.nodes.length} nodes, ${response.data.edges.length} edges`);
      return {
        nodes: response.data.nodes,
        edges: response.data.edges,
      };
    }
    console.warn('API response missing nodes or edges:', response.data);
    return { nodes: [], edges: [] };
  } catch (error) {
    console.error('Error fetching graph data:', error.message || error);
    if (error.response) {
      console.error('Response status:', error.response.status);
      console.error('Response data:', error.response.data);
    }
    return { nodes: [], edges: [] };
  }
};

// Fetch ML model prediction for a bill
export const getMLPrediction = async (billId) => {
  try {
    const parsed = parseBillId(billId);
    if (!parsed) {
      console.warn(`Could not parse bill_id for ML prediction: ${billId}`);
      return null;
    }

    console.log(`Fetching ML prediction for ${billId} -> bill_type: ${parsed.bill_type}, bill_number: ${parsed.bill_number}`);
    
    const response = await modelApiClient.get('/predict', {
      params: {
        bill_type: parsed.bill_type,
        bill_number: parsed.bill_number,
      },
      timeout: 15000, // 15 second timeout for ML prediction
    });

    if (response.data && response.data.probability !== undefined) {
      return {
        probability: response.data.probability, // Should be between 0 and 1
        confidence: response.data.confidence || null,
        modelVersion: response.data.model_version || null,
      };
    }
    return null;
  } catch (error) {
    console.error(`Error fetching ML prediction for ${billId}:`, error.message || error);
    // Return a mock prediction if API is not available
    // In production, this would fall back gracefully
    return {
      probability: null, // No prediction available
      confidence: null,
      modelVersion: null,
    };
  }
};

// NY Times Top Stories API Client
// ============================================
const NYTIMES_API_KEY = import.meta.env.VITE_NYTIMES_API_KEY;
const NYTIMES_API_BASE_URL = 'https://api.nytimes.com/svc/topstories/v2';

// Fetch top stories from NY Times API
export const getNYTimesTopStories = async (section = 'home') => {
  try {
    const response = await axios.get(`${NYTIMES_API_BASE_URL}/${section}.json`, {
      params: {
        'api-key': NYTIMES_API_KEY,
      },
      timeout: 10000, // 10 second timeout
    });

    if (response.data && response.data.results && Array.isArray(response.data.results)) {
      // Transform NY Times articles to our format
      return response.data.results.map((article, index) => {
        // Get the image from multimedia array (prefer the largest one)
        let imageUrl = null;
        if (article.multimedia && article.multimedia.length > 0) {
          // Find the largest image (typically the last one in the array)
          const images = article.multimedia.filter(m => m.type === 'image');
          if (images.length > 0) {
            // Try to find a standard thumbnail, or use the largest
            const standardImage = images.find(img => img.subtype === 'thumbnail') || 
                                 images.find(img => img.subtype === 'largeHorizontal375') ||
                                 images.find(img => img.subtype === 'largeHorizontalJumbo') ||
                                 images[images.length - 1];
            imageUrl = standardImage?.url ? `https://static01.nyt.com/${standardImage.url}` : null;
          }
        }

        // Format published date to relative time
        const formatTimeAgo = (dateString) => {
          if (!dateString) return 'Recently';
          const date = new Date(dateString);
          const now = new Date();
          const diffMs = now - date;
          const diffMins = Math.floor(diffMs / 60000);
          const diffHours = Math.floor(diffMs / 3600000);
          const diffDays = Math.floor(diffMs / 86400000);

          if (diffMins < 60) return `${diffMins} minutes ago`;
          if (diffHours < 24) return `${diffHours} hours ago`;
          if (diffDays < 7) return `${diffDays} days ago`;
          return date.toLocaleDateString();
        };

        // Extract tags from facets (des_facet, org_facet, per_facet, geo_facet)
        const tags = [];
        if (article.des_facet && article.des_facet.length > 0) {
          article.des_facet.slice(0, 3).forEach(facet => {
            tags.push({ type: 'tag', label: facet });
          });
        }
        if (article.org_facet && article.org_facet.length > 0) {
          article.org_facet.slice(0, 2).forEach(facet => {
            tags.push({ type: 'tag', label: facet });
          });
        }
        if (article.per_facet && article.per_facet.length > 0) {
          article.per_facet.slice(0, 2).forEach(facet => {
            tags.push({ type: 'tag', label: facet });
          });
        }

        return {
          id: article.uri || `nyt-${index}`,
          title: article.title || 'Untitled',
          timestamp: formatTimeAgo(article.published_date),
          category: article.section || 'News',
          tags: tags,
          imageUrl: imageUrl,
          url: article.url,
          abstract: article.abstract,
          byline: article.byline,
        };
      });
    }

    return [];
  } catch (error) {
    console.error('Error fetching NY Times top stories:', error);
    if (error.response) {
      console.error('Response status:', error.response.status);
      console.error('Response data:', error.response.data);
    }
    return [];
  }
};

export default apiClient;

