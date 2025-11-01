import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, ReferenceArea } from 'recharts';
import LoadingSpinner from '../shared/LoadingSpinner';

const NetWorth = ({ congressman, loading }) => {
  // Mock net worth history data with some decreases
  const netWorthHistory = [
    { year: 2015, value: 45000000 },
    { year: 2016, value: 52000000 },
    { year: 2017, value: 68000000 },
    { year: 2018, value: 85000000 },
    { year: 2019, value: 98000000 },
    { year: 2020, value: 142000000 },
    { year: 2021, value: 185000000 },
    { year: 2022, value: 165000000 }, // Decreased
    { year: 2023, value: 198000000 },
    { year: 2024, value: 275000000 },
    { year: 2025, value: 282000000 }
  ];

  // Process data to create segments with color info
  const createSegments = () => {
    const segments = [];
    for (let i = 0; i < netWorthHistory.length - 1; i++) {
      const current = netWorthHistory[i];
      const next = netWorthHistory[i + 1];
      const increased = next.value >= current.value;
      
      segments.push({
        start: current,
        end: next,
        color: increased ? '#86efac' : '#fca5a5', // softer green for increase, softer red for decrease
        increased,
        dataKey: `segment-${i}` // unique data key for each segment
      });
    }
    return segments;
  };

  const segments = createSegments();
  
  // Add segment values to data for rendering
  const dataWithSegments = netWorthHistory.map((point, pointIndex) => {
    const dataPoint = { ...point };
    segments.forEach((segment, segIndex) => {
      // Check if this point is the start or end of this segment
      const isSegmentStart = pointIndex === segIndex;
      const isSegmentEnd = pointIndex === segIndex + 1;
      
      if (isSegmentStart || isSegmentEnd) {
        dataPoint[segment.dataKey] = point.value;
      } else {
        dataPoint[segment.dataKey] = null;
      }
    });
    
    // Add dot data keys
    netWorthHistory.forEach((p, idx) => {
      const dotDataKey = `dot-${idx}`;
      dataPoint[dotDataKey] = pointIndex === idx ? point.value : null;
    });
    
    return dataPoint;
  });

  const formatCurrency = (value) => {
    if (value >= 1000000) {
      return `$${(value / 1000000).toFixed(2)}M`;
    }
    return `$${(value / 1000).toFixed(0)}K`;
  };

  const latestData = netWorthHistory[netWorthHistory.length - 1];
  const previousYear = netWorthHistory[netWorthHistory.length - 2];
  const yearlyChange = previousYear ? latestData.value - previousYear.value : 0;
  const yearlyChangePercent = previousYear ? ((yearlyChange / previousYear.value) * 100) : 0;
  const totalGrowth = latestData.value - netWorthHistory[0].value;
  const totalGrowthPercent = ((latestData.value / netWorthHistory[0].value - 1) * 100);

  if (loading) {
    return (
      <div className="bg-white p-8">
        <LoadingSpinner size="lg" />
      </div>
    );
  }

  return (
    <div className="bg-white overflow-hidden h-full flex flex-col">
      {/* Header */}
      <div className="p-4 border-b border-black flex-shrink-0">
        <h3 className="text-lg font-semibold text-gray-900">Net Worth</h3>
        <p className="text-xs text-gray-600">Net worth over time</p>
      </div>

      {/* Stats Summary */}
      <div className="grid grid-cols-3 border-b border-black flex-shrink-0">
        <div className="p-4 border-r border-black">
          <div className="text-xs text-gray-600 mb-1">Current Net Worth</div>
          <div className="text-lg font-semibold text-gray-900">{congressman?.netWorth || formatCurrency(latestData.value)}</div>
        </div>
        <div className={`p-4 border-r border-black ${yearlyChange >= 0 ? 'bg-green-50' : 'bg-red-50'}`}>
          <div className="text-xs text-gray-600 mb-1">Year Change</div>
          <div className="text-lg font-semibold text-gray-900">
            {yearlyChange >= 0 ? '+' : ''}{formatCurrency(yearlyChange)} ({yearlyChangePercent >= 0 ? '+' : ''}{yearlyChangePercent.toFixed(1)}%)
          </div>
        </div>
        <div className={`p-4 ${totalGrowth >= 0 ? 'bg-green-50' : 'bg-red-50'}`}>
          <div className="text-xs text-gray-600 mb-1">Total Growth</div>
          <div className="text-lg font-semibold text-gray-900">
            {formatCurrency(totalGrowth)} ({totalGrowthPercent >= 0 ? '+' : ''}{totalGrowthPercent.toFixed(1)}%)
          </div>
        </div>
      </div>

      {/* Chart - takes rest of page height */}
      <div className="flex-1 flex items-center justify-center p-6 min-h-0" style={{ flexBasis: 0, minHeight: '400px', height: '100%' }}>
        <ResponsiveContainer width="100%" height="100%">
          <LineChart data={dataWithSegments} margin={{ top: 10, right: 30, left: 20, bottom: 20 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
            <XAxis dataKey="year" stroke="#6b7280" />
            <YAxis stroke="#6b7280" tickFormatter={(value) => formatCurrency(value)} />
            <Tooltip
              formatter={(value) => [formatCurrency(value), 'Net Worth']}
              contentStyle={{
                backgroundColor: 'white',
                border: '1px solid black',
                borderRadius: '0',
                padding: '8px'
              }}
            />
            {/* Add background rectangles for each time step based on profitability */}
            {netWorthHistory.map((point, index) => {
              if (index === netWorthHistory.length - 1) return null;
              const currentYear = point.year;
              const nextYear = netWorthHistory[index + 1]?.year;
              const increased = nextYear ? netWorthHistory[index + 1].value >= point.value : true;
              return (
                <ReferenceArea
                  key={`area-${index}`}
                  x1={currentYear}
                  x2={nextYear || currentYear}
                  fill={increased ? '#dcfce7' : '#fef2f2'}
                  fillOpacity={0.3}
                />
              );
            })}
            {/* Render segments with different colors based on increase/decrease */}
            {segments.map((segment, index) => (
              <Line
                key={`segment-${index}`}
                type="monotone"
                dataKey={segment.dataKey}
                stroke={segment.color}
                strokeWidth={2}
                dot={false}
                connectNulls={false}
                isAnimationActive={false}
              />
            ))}
            {/* Render all dots with appropriate colors */}
            {netWorthHistory.map((point, index) => {
              const prevPoint = index > 0 ? netWorthHistory[index - 1] : null;
              const increased = prevPoint ? point.value >= prevPoint.value : true;
              const color = increased ? '#86efac' : '#fca5a5';
              const dotDataKey = `dot-${index}`;
              return (
                <Line
                  key={`dot-${index}`}
                  type="monotone"
                  dataKey={dotDataKey}
                  stroke="none"
                  dot={{ fill: color, r: 4 }}
                  connectNulls={false}
                  isAnimationActive={false}
                />
              );
            })}
          </LineChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
};

export default NetWorth;

