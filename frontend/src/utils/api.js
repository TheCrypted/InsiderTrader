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

// Fetch congressman data from API with fallback to mock data
export const getCongressman = async (id) => {
  try {
    const response = await apiClient.get(`/politician-info/${id}`);
    if (response.data && response.data.length > 0) {
      const apiData = response.data[0]; // API returns an array
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
        tradeVolume: mockCongressmen[id]?.tradeVolume || 'N/A',
        totalTrades: mockCongressmen[id]?.totalTrades || 0,
        lastTraded: mockCongressmen[id]?.lastTraded || 'N/A',
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
        excessReturn: mockTradesByCongressman[congressmanId]?.[index]?.excessReturn || 0, // Keep mock for fields not in API
        amount: trade.tradeAmount || 'N/A',
      }));
    }
    // Fallback to mock data if API returns empty
    return mockTradesByCongressman[congressmanId] || mockTrades;
  } catch (error) {
    console.error('Error fetching trades from API, using mock data:', error);
    // Fallback to mock data on error
    return mockTradesByCongressman[congressmanId] || mockTrades;
  }
};

// Get all representatives from API
export const getAllRepresentatives = async () => {
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
        isCurrentMember: true, // Assuming all returned are current
      }));
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

