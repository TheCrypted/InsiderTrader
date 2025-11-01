import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip, Legend } from 'recharts';

const SectorPieChart = ({ data }) => {
  if (!data || data.length === 0) {
    return (
      <div className="bg-white rounded-lg shadow-sm p-8 flex items-center justify-center">
        <p className="text-gray-500">No sector data available</p>
      </div>
    );
  }

  // G-research inspired color palette
  const COLORS = [
    '#00d084', // green
    '#0693e3', // cyan blue
    '#9b51e0', // purple
    '#ff6900', // orange
    '#fcb900', // amber
    '#cf2e2e', // red
    '#8ed1fc', // pale cyan
    '#e5fc54'  // yellow
  ];

  return (
    <div className="bg-white rounded-lg shadow-sm p-3 h-full">
      <h3 className="text-xs font-semibold text-gray-600 mb-2">Top Traded Sectors</h3>
      <div className="flex flex-col gap-3">
        <div className="flex-1">
          <ResponsiveContainer width="100%" height={140}>
            <PieChart>
              <Pie
                data={data}
                cx="50%"
                cy="50%"
                labelLine={false}
                label={({ sector, percentage }) => `${sector}: ${percentage}%`}
                outerRadius={80}
                fill="#8884d8"
                dataKey="count"
              >
                {data.map((entry, index) => (
                  <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                ))}
              </Pie>
              <Tooltip />
              <Legend />
            </PieChart>
          </ResponsiveContainer>
        </div>
        <div className="flex-1">
          <ul className="space-y-1.5">
            {data.map((sector, index) => (
              <li key={sector.sector} className="flex items-center justify-between">
                <div className="flex items-center gap-1.5">
                  <div
                    className="w-2.5 h-2.5 rounded-full"
                    style={{ backgroundColor: COLORS[index % COLORS.length] }}
                  ></div>
                  <span className="text-xs text-gray-700 truncate">{sector.sector}</span>
                </div>
                <div className="text-right">
                  <div className="text-xs font-semibold text-gray-900">{sector.percentage}%</div>
                  <div className="text-xs text-gray-500">{sector.count}</div>
                </div>
              </li>
            ))}
          </ul>
        </div>
      </div>
    </div>
  );
};

export default SectorPieChart;

