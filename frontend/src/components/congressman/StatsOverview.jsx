const StatsOverview = ({ tradeVolume, totalTrades }) => {
  return (
    <div className="space-y-2">
      <div className="flex flex-col p-3 bg-gray-50 rounded-lg">
        <strong className="text-lg font-semibold text-gray-900">{tradeVolume}</strong>
        <span className="text-xs text-gray-600 mt-0.5">Trade Volume</span>
      </div>
      <div className="flex flex-col p-3 bg-gray-50 rounded-lg">
        <strong className="text-lg font-semibold text-gray-900">{totalTrades}</strong>
        <span className="text-xs text-gray-600 mt-0.5">Total Trades</span>
      </div>
    </div>
  );
};

export default StatsOverview;

