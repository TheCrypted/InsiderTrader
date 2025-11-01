import { useState } from 'react';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Area, AreaChart } from 'recharts';
import LoadingSpinner from '../shared/LoadingSpinner';

const NetWorth = ({ congressman, loading }) => {
  // Mock net worth history data
  const netWorthHistory = [
    { year: 2015, value: 45000000 },
    { year: 2016, value: 52000000 },
    { year: 2017, value: 68000000 },
    { year: 2018, value: 85000000 },
    { year: 2019, value: 98000000 },
    { year: 2020, value: 142000000 },
    { year: 2021, value: 185000000 },
    { year: 2022, value: 225000000 },
    { year: 2023, value: 258000000 },
    { year: 2024, value: 275000000 },
    { year: 2025, value: 282000000 }
  ];

  const [selectedYear, setSelectedYear] = useState(2025);

  const formatCurrency = (value) => {
    if (value >= 1000000) {
      return `$${(value / 1000000).toFixed(2)}M`;
    }
    return `$${(value / 1000).toFixed(0)}K`;
  };

  const selectedData = netWorthHistory.find(d => d.year === selectedYear);
  const previousYear = netWorthHistory.find(d => d.year === selectedYear - 1);
  const yearlyChange = previousYear ? selectedData.value - previousYear.value : 0;
  const yearlyChangePercent = previousYear ? ((yearlyChange / previousYear.value) * 100) : 0;

  if (loading) {
    return (
      <div className="bg-white p-8 flex items-center justify-center">
        <LoadingSpinner />
      </div>
    );
  }

  return (
    <div className="space-y-0">
      {/* Net Worth Summary */}
      <div className="grid grid-cols-3 border-b border-black">
        <div className="bg-white p-6 border-r border-black">
          <div className="text-xs text-gray-600 mb-1">Current Net Worth</div>
          <div className="text-xl font-semibold text-gray-900">{congressman?.netWorth || formatCurrency(selectedData.value)}</div>
        </div>
        <div className="bg-white p-6 border-r border-black">
          <div className="text-xs text-gray-600 mb-1">Year Change</div>
          <div className={`text-xl font-semibold ${yearlyChange >= 0 ? 'text-gresearch-vivid-green' : 'text-gresearch-vivid-red'}`}>
            {yearlyChange >= 0 ? '+' : ''}{formatCurrency(yearlyChange)} ({yearlyChangePercent >= 0 ? '+' : ''}{yearlyChangePercent.toFixed(1)}%)
          </div>
        </div>
        <div className="bg-white p-6">
          <div className="text-xs text-gray-600 mb-1">Total Growth</div>
          <div className="text-xl font-semibold text-gresearch-vivid-green">
            {formatCurrency(selectedData.value - netWorthHistory[0].value)} ({((selectedData.value / netWorthHistory[0].value - 1) * 100).toFixed(1)}%)
          </div>
        </div>
      </div>

      {/* Net Worth Chart */}
      <div className="bg-white p-6 border-b border-black">
        <h3 className="text-sm font-semibold text-gray-900 mb-3">Net Worth Over Time</h3>
        <ResponsiveContainer width="100%" height={300}>
          <AreaChart data={netWorthHistory} margin={{ top: 10, right: 30, left: 0, bottom: 0 }}>
            <defs>
              <linearGradient id="colorNetWorth" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor="#e5fc54" stopOpacity={0.3}/>
                <stop offset="95%" stopColor="#e5fc54" stopOpacity={0}/>
              </linearGradient>
            </defs>
            <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
            <XAxis dataKey="year" stroke="#6b7280" />
            <YAxis stroke="#6b7280" tickFormatter={(value) => formatCurrency(value)} />
            <Tooltip
              formatter={(value) => [formatCurrency(value), 'Net Worth']}
              contentStyle={{
                backgroundColor: 'white',
                border: '1px solid #e5e7eb',
                borderRadius: '8px',
                boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1)'
              }}
            />
            <Area
              type="monotone"
              dataKey="value"
              stroke="#e5fc54"
              fillOpacity={1}
              fill="url(#colorNetWorth)"
              strokeWidth={2}
              animationDuration={800}
            />
          </AreaChart>
        </ResponsiveContainer>
      </div>

      {/* Year Selector */}
      <div className="bg-white p-6">
        <h3 className="text-sm font-semibold text-gray-900 mb-3">Select Year</h3>
        <div className="flex flex-wrap gap-2">
          {netWorthHistory.map((data) => (
            <button
              key={data.year}
              onClick={() => setSelectedYear(data.year)}
              className={`px-4 py-2 rounded-full text-xs font-medium transition-all ${
                selectedYear === data.year
                  ? 'c-btn c-btn--yellow'
                  : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
              }`}
            >
              {data.year}
            </button>
          ))}
        </div>
      </div>
    </div>
  );
};

export default NetWorth;

