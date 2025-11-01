import { useState, useEffect } from 'react';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts';

const TradeVolumeChart = ({ data, loading }) => {
  const [isVisible, setIsVisible] = useState(false);

  useEffect(() => {
    if (data && data.length > 0 && !loading) {
      setIsVisible(false);
      setTimeout(() => setIsVisible(true), 100);
    }
  }, [data, loading]);

  if (loading) {
    return (
      <div className="bg-white rounded-lg shadow-sm p-8 flex items-center justify-center animate-pulse">
        <div className="text-gray-400">Loading chart...</div>
      </div>
    );
  }

  if (!data || data.length === 0) {
    return (
      <div className="bg-white rounded-lg shadow-sm p-8 flex items-center justify-center">
        <p className="text-gray-500">No chart data available</p>
      </div>
    );
  }

  // Format numbers for display
  const formatCurrency = (value) => {
    if (value >= 1000000) {
      return `$${(value / 1000000).toFixed(1)}M`;
    }
    return `$${(value / 1000).toFixed(0)}K`;
  };

  const CustomTooltip = ({ active, payload, label }) => {
    if (active && payload && payload.length) {
      const buyValue = payload.find(p => p.dataKey === 'buy')?.value || 0;
      const sellValue = payload.find(p => p.dataKey === 'sell')?.value || 0;
      const totalVolume = buyValue + sellValue;

      return (
        <div className="bg-white p-3 border border-gray-200 rounded-lg shadow-lg animate-fade-in">
          <p className="font-semibold text-gray-900 mb-2">Year: {label}</p>
          <div className="space-y-1 text-sm">
            <div className="flex items-center justify-between gap-4">
              <span className="text-gray-600">Total Volume:</span>
              <span className="font-semibold text-gray-900">{formatCurrency(totalVolume)}</span>
            </div>
            <div className="flex items-center justify-between gap-4">
              <div className="flex items-center gap-2">
                <div className="w-3 h-3 bg-gresearch-yellow rounded"></div>
                <span className="text-gray-600">Buy:</span>
              </div>
              <span className="font-semibold text-gray-900">{formatCurrency(buyValue)}</span>
            </div>
            <div className="flex items-center justify-between gap-4">
              <div className="flex items-center gap-2">
                <div className="w-3 h-3 bg-gresearch-vivid-red rounded"></div>
                <span className="text-gray-600">Sell:</span>
              </div>
              <span className="font-semibold text-gray-900">{formatCurrency(sellValue)}</span>
            </div>
          </div>
        </div>
      );
    }
    return null;
  };

  return (
    <div className={`bg-white rounded-lg shadow-sm p-3 transition-all duration-500 ${isVisible ? 'opacity-100' : 'opacity-0'}`}>
      <div className="mb-2">
        <h3 className="text-sm font-semibold text-gray-900 mb-1">Trade Volume by Year</h3>
        <div className="flex gap-3 text-xs">
          <div className="flex items-center gap-1">
            <div className="w-3 h-3 bg-gresearch-yellow rounded"></div>
            <span>Buy</span>
          </div>
          <div className="flex items-center gap-1">
            <div className="w-3 h-3 bg-gresearch-vivid-red rounded"></div>
            <span>Sell</span>
          </div>
        </div>
      </div>
      <ResponsiveContainer width="100%" height={180}>
        <BarChart data={data} margin={{ top: 20, right: 30, left: 20, bottom: 5 }}>
          <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
          <XAxis dataKey="year" stroke="#6b7280" />
          <YAxis stroke="#6b7280" tickFormatter={(value) => formatCurrency(value)} />
          <Tooltip content={<CustomTooltip />} />
          <Legend />
          <Bar 
            dataKey="buy" 
            fill="#e5fc54" 
            name="Buy"
            radius={[4, 4, 0, 0]}
            animationDuration={800}
          />
          <Bar 
            dataKey="sell" 
            fill="#cf2e2e" 
            name="Sell"
            radius={[4, 4, 0, 0]}
            animationDuration={800}
          />
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
};

export default TradeVolumeChart;

