import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip } from 'recharts';

const SectorPieChart = ({ data }) => {
  if (!data || data.length === 0) {
    return (
      <div className="bg-white p-8 flex items-center justify-center">
        <p className="text-gray-500">No sector data available</p>
      </div>
    );
  }

  // Color palette with red as first color
  const COLORS = [
    '#b91c1c', // dark red
    '#047857', // dark emerald green
    '#7c3aed', // dark purple
    '#1e40af', // dark blue
    '#b45309', // dark amber
    '#0369a1', // dark sky blue
    '#374151', // dark gray
    '#6b21a8'  // dark violet
  ];

  return (
    <div className="bg-white h-full flex flex-col">
      <h3 className="text-xs font-semibold text-gray-600 mb-2 p-4 pb-2 border-b border-black">Top Traded Sectors</h3>
      <div className="flex-1 flex flex-col overflow-hidden min-h-0">
        {/* Chart visual - donut chart at top */}
        <div className="flex-1 flex items-center justify-center px-6 py-8 min-h-0" style={{ flexBasis: 0 }}>
          <ResponsiveContainer width="100%" height="100%">
            <PieChart>
              <Pie
                data={data}
                cx="50%"
                cy="50%"
                labelLine={false}
                label={false}
                outerRadius="65%"
                innerRadius="45%"
                fill="#8884d8"
                dataKey="percentage"
                stroke="#fff"
                strokeWidth={2}
              >
                {data.map((entry, index) => (
                  <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                ))}
              </Pie>
              <Tooltip 
                formatter={(value) => [`${value}%`, 'Percentage']}
                contentStyle={{
                  backgroundColor: 'white',
                  border: '1px solid black',
                  borderRadius: '0',
                  padding: '8px'
                }}
              />
            </PieChart>
          </ResponsiveContainer>
        </div>
        
        {/* Legend - vertical list with color block on the left at bottom - small scrollable section */}
        <div 
          className="border-t border-black overflow-y-auto hide-scrollbar flex-shrink-0"
          style={{ maxHeight: '280px' }}
        >
          <ul className="flex flex-col">
            {data.map((sector, index) => (
              <li 
                key={sector.sector} 
                className="border-b border-black flex items-center px-4"
                style={{ minHeight: '50px' }}
              >
                <div className="flex items-center gap-3 w-full">
                  <div
                    className="w-4 h-4 flex-shrink-0"
                    style={{ backgroundColor: COLORS[index % COLORS.length] }}
                  ></div>
                  <div className="flex-1">
                    <div className="text-xs text-gray-900">{sector.sector}</div>
                    <div className="text-xs font-semibold text-gray-900 mt-0.5">{sector.percentage}%</div>
                  </div>
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

