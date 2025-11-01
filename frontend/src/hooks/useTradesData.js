import { useState, useEffect } from 'react';
import { getTrades, getChartData } from '../utils/api';

export const useTradesData = (congressmanId) => {
  const [trades, setTrades] = useState([]);
  const [chartData, setChartData] = useState({ volumeByYear: [], sectorData: [] });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    const fetchData = async () => {
      try {
        setLoading(true);
        setError(null);
        const [tradesData, chartDataResponse] = await Promise.all([
          getTrades(congressmanId),
          getChartData(congressmanId)
        ]);
        setTrades(tradesData);
        setChartData(chartDataResponse);
      } catch (err) {
        setError(err.message || 'Failed to fetch trades data');
      } finally {
        setLoading(false);
      }
    };

    if (congressmanId) {
      fetchData();
    }
  }, [congressmanId]);

  return { trades, chartData, loading, error };
};

