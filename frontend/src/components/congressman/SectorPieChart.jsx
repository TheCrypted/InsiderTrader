import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip, Legend } from 'recharts';

const SectorPieChart = ({ data }) => {
  if (!data || data.length === 0) {
    return (
      <div className="bg-white p-8 flex items-center justify-center">
        <p className="text-gray-500">No sector data available</p>
      </div>
    );
  }

  // Pastel muted color palette
  const COLORS = [
    '#d1fae5', // pastel mint green
    '#fce7f3', // pastel pink
    '#e0e7ff', // pastel lavender
    '#fef3c7', // pastel yellow
    '#dbeafe', // pastel blue
    '#fde2e4', // pastel rose
    '#e5e7eb', // pastel gray
    '#f3e8ff'  // pastel purple
  ];

  return (
    <div className="bg-white p-6 h-full">
      <h3 className="text-xs font-semibold text-gray-600 mb-2">Top Traded Sectors</h3>
      <div className="flex flex-col gap-2">
        <div className="flex-1">
          <ResponsiveContainer width="100%" height={100}>
            <PieChart>
              <Pie
                data={data}
                cx="50%"
                cy="50%"
                labelLine={false}
                label={false}
                outerRadius={40}
                innerRadius={15}
                fill="#8884d8"
                dataKey="percentage"
              >
                {data.map((entry, index) => (
                  <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                ))}
              </Pie>
              <Tooltip 
                formatter={(value) => [`${value}%`, 'Percentage']}
                contentStyle={{
                  backgroundColor: 'white',
                  border: '1px solid #e5e7eb',
                  borderRadius: '8px',
                  padding: '8px'
                }}
              />
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

