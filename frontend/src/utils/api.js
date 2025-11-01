import axios from 'axios';
import { mockCongressman, mockTrades, mockVolumeByYear, mockSectorData } from './mockData';

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || 'http://localhost:5073';

const apiClient = axios.create({
  baseURL: API_BASE_URL,
  headers: {
    'Content-Type': 'application/json',
  },
});

// For now, return mock data. Structure ready for real API integration
export const getCongressman = async (id) => {
  try {
    // TODO: Replace with actual API call
    // const response = await apiClient.get(`/congressman/${id}`);
    // return response.data;
    
    // Mock delay to simulate API call
    await new Promise(resolve => setTimeout(resolve, 500));
    return { ...mockCongressman, id };
  } catch (error) {
    console.error('Error fetching congressman:', error);
    throw error;
  }
};

export const getTrades = async (congressmanId) => {
  try {
    // TODO: Replace with actual API call
    // const response = await apiClient.get(`/congressman/${congressmanId}/trades`);
    // return response.data;
    
    // Mock delay to simulate API call
    await new Promise(resolve => setTimeout(resolve, 500));
    return mockTrades;
  } catch (error) {
    console.error('Error fetching trades:', error);
    throw error;
  }
};

export const getChartData = async (congressmanId) => {
  try {
    // TODO: Replace with actual API call
    // const response = await apiClient.get(`/congressman/${congressmanId}/chart-data`);
    // return response.data;
    
    // Mock delay to simulate API call
    await new Promise(resolve => setTimeout(resolve, 500));
    return {
      volumeByYear: mockVolumeByYear,
      sectorData: mockSectorData
    };
  } catch (error) {
    console.error('Error fetching chart data:', error);
    throw error;
  }
};

export default apiClient;

