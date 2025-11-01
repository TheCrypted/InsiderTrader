import { useState } from 'react';
import LoadingSpinner from '../shared/LoadingSpinner';

const LiveStockPortfolio = ({ congressmanId, loading }) => {
  // Mock live portfolio data
  const portfolioData = [
    {
      ticker: 'NVDA',
      company: 'NVIDIA Corporation',
      shares: 5000,
      avgPrice: 142.50,
      currentPrice: 202.49,
      value: 1012450,
      change: 42.05,
      changePercent: 26.18,
      sector: 'Technology'
    },
    {
      ticker: 'AAPL',
      company: 'Apple Inc.',
      shares: 382,
      avgPrice: 175.30,
      currentPrice: 187.65,
      value: 71682,
      change: 12.35,
      changePercent: 7.05,
      sector: 'Technology'
    },
    {
      ticker: 'AVGO',
      company: 'Broadcom Inc.',
      shares: 2000,
      avgPrice: 320.00,
      currentPrice: 369.63,
      value: 739260,
      change: 49.63,
      changePercent: 15.51,
      sector: 'Technology'
    },
    {
      ticker: 'GOOGL',
      company: 'Alphabet Inc.',
      shares: 1500,
      avgPrice: 145.80,
      currentPrice: 178.92,
      value: 268380,
      change: 33.12,
      changePercent: 22.72,
      sector: 'Communication Services'
    },
    {
      ticker: 'META',
      company: 'Meta Platforms Inc.',
      shares: 800,
      avgPrice: 285.50,
      currentPrice: 512.34,
      value: 409872,
      change: 226.84,
      changePercent: 79.48,
      sector: 'Communication Services'
    }
  ];

  const [sortConfig, setSortConfig] = useState({ key: 'value', direction: 'desc' });

  const handleSort = (key) => {
    let direction = 'desc';
    if (sortConfig.key === key && sortConfig.direction === 'desc') {
      direction = 'asc';
    }
    setSortConfig({ key, direction });
  };

  const sortedData = [...portfolioData].sort((a, b) => {
    if (sortConfig.direction === 'asc') {
      return a[sortConfig.key] - b[sortConfig.key];
    }
    return b[sortConfig.key] - a[sortConfig.key];
  });

  const totalValue = portfolioData.reduce((sum, stock) => sum + stock.value, 0);
  const totalGain = portfolioData.reduce((sum, stock) => sum + (stock.currentPrice - stock.avgPrice) * stock.shares, 0);
  const totalGainPercent = ((totalGain / (totalValue - totalGain)) * 100).toFixed(2);

  const formatCurrency = (value) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(value);
  };

  if (loading) {
    return (
      <div className="bg-white p-8 flex items-center justify-center">
        <LoadingSpinner />
      </div>
    );
  }

  return (
    <div className="space-y-0">
      {/* Portfolio Summary */}
      <div className="grid grid-cols-3 border-b border-black">
        <div className="bg-white p-6 border-r border-black">
          <div className="text-xs text-gray-600 mb-1">Total Portfolio Value</div>
          <div className="text-xl font-semibold text-gray-900">{formatCurrency(totalValue)}</div>
        </div>
        <div className="bg-white p-6 border-r border-black">
          <div className="text-xs text-gray-600 mb-1">Total Gain/Loss</div>
          <div className={`text-xl font-semibold ${totalGain >= 0 ? 'text-gresearch-vivid-green' : 'text-gresearch-vivid-red'}`}>
            {formatCurrency(totalGain)} ({totalGainPercent}%)
          </div>
        </div>
        <div className="bg-white p-6">
          <div className="text-xs text-gray-600 mb-1">Holdings</div>
          <div className="text-xl font-semibold text-gray-900">{portfolioData.length}</div>
        </div>
      </div>

      {/* Holdings Table */}
      <div className="bg-white overflow-hidden">
        <div className="p-4 border-b border-black">
          <h3 className="text-lg font-semibold text-gray-900">Current Holdings</h3>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-gray-50 border-b border-gray-200 sticky top-0">
              <tr>
                <th 
                  className="px-4 py-2 text-left text-xs font-medium text-gray-700 cursor-pointer hover:bg-gray-100"
                  onClick={() => handleSort('ticker')}
                >
                  Stock {sortConfig.key === 'ticker' && (sortConfig.direction === 'asc' ? '▲' : '▼')}
                </th>
                <th className="px-4 py-2 text-left text-xs font-medium text-gray-700">Company</th>
                <th className="px-4 py-2 text-right text-xs font-medium text-gray-700">Shares</th>
                <th 
                  className="px-4 py-2 text-right text-xs font-medium text-gray-700 cursor-pointer hover:bg-gray-100"
                  onClick={() => handleSort('value')}
                >
                  Value {sortConfig.key === 'value' && (sortConfig.direction === 'asc' ? '▲' : '▼')}
                </th>
                <th className="px-4 py-2 text-right text-xs font-medium text-gray-700">Avg Price</th>
                <th className="px-4 py-2 text-right text-xs font-medium text-gray-700">Current</th>
                <th 
                  className="px-4 py-2 text-right text-xs font-medium text-gray-700 cursor-pointer hover:bg-gray-100"
                  onClick={() => handleSort('changePercent')}
                >
                  Gain/Loss {sortConfig.key === 'changePercent' && (sortConfig.direction === 'asc' ? '▲' : '▼')}
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200">
              {sortedData.map((stock, index) => (
                <tr key={stock.ticker} className="hover:bg-gray-50 transition-colors animate-slide-in" style={{ animationDelay: `${index * 50}ms` }}>
                  <td className="px-4 py-3 font-semibold text-gray-900">{stock.ticker}</td>
                  <td className="px-4 py-3 text-gray-600">{stock.company}</td>
                  <td className="px-4 py-3 text-right text-gray-900">{stock.shares.toLocaleString()}</td>
                  <td className="px-4 py-3 text-right font-semibold text-gray-900">{formatCurrency(stock.value)}</td>
                  <td className="px-4 py-3 text-right text-gray-600">${stock.avgPrice.toFixed(2)}</td>
                  <td className="px-4 py-3 text-right font-medium text-gray-900">${stock.currentPrice.toFixed(2)}</td>
                  <td className="px-4 py-3 text-right">
                    <span className={`font-semibold ${stock.changePercent >= 0 ? 'text-gresearch-vivid-green' : 'text-gresearch-vivid-red'}`}>
                      {stock.changePercent >= 0 ? '+' : ''}{stock.changePercent.toFixed(2)}%
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};

export default LiveStockPortfolio;

