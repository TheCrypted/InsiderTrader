import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts';

const TradeVolumeChart = ({ data }) => {
  if (!data || data.length === 0) {
    return (
      <div className="bg-white rounded-lg shadow-sm p-8 flex items-center justify-center">
        <p className="text-gray-500">No chart data available</p>
      </div>
    );
  }

  return (
    <div className="bg-white rounded-lg shadow-sm p-3">
      <div className="mb-2">
        <h3 className="text-sm font-semibold text-gray-900 mb-1">Trade Volume by Year</h3>
        <div className="flex gap-3 text-xs">
          <div className="flex items-center gap-1">
            <div className="w-3 h-3 bg-gresearch-vivid-green rounded"></div>
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
          <YAxis stroke="#6b7280" />
          <Tooltip
            contentStyle={{
              backgroundColor: 'white',
              border: '1px solid #e5e7eb',
              borderRadius: '8px',
              boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1)'
            }}
          />
          <Legend />
          <Bar dataKey="buy" fill="#00d084" name="Buy" />
          <Bar dataKey="sell" fill="#cf2e2e" name="Sell" />
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
};

export default TradeVolumeChart;

