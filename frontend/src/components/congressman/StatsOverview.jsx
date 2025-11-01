const StatsOverview = ({ tradeVolume, totalTrades }) => {
  return (
    <div className="bg-white p-6 space-y-4">
      <div className="flex flex-col">
        <strong className="text-lg font-semibold text-gray-900">{tradeVolume}</strong>
        <span className="text-xs text-gray-600 mt-0.5">Trade Volume</span>
      </div>
      <div className="flex flex-col">
        <strong className="text-lg font-semibold text-gray-900">{totalTrades}</strong>
        <span className="text-xs text-gray-600 mt-0.5">Total Trades</span>
      </div>
    </div>
  );
};

export default StatsOverview;

