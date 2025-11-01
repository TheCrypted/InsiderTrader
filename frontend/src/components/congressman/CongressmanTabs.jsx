const CongressmanTabs = ({ activeTab, onTabChange }) => {
  const tabs = [
    { id: 'trades', label: 'Trades' },
    { id: 'portfolio', label: 'Live Stock Portfolio' },
    { id: 'networth', label: 'Net Worth' },
    { id: 'donors', label: 'Corporate Donors' },
    { id: 'legislation', label: 'Proposed Legislation' }
  ];

  return (
    <div>
      <ul className="flex flex-wrap gap-2 md:gap-4">
        {tabs.map((tab) => (
          <li key={tab.id}>
            <button
              onClick={() => onTabChange(tab.id)}
              className={`pb-2 px-2 text-xs md:text-sm font-medium border-b-2 transition-colors ${
                activeTab === tab.id
                  ? 'border-black text-black'
                  : 'border-transparent text-gray-500 hover:text-black hover:border-gray-400'
              }`}
            >
              {tab.label}
            </button>
          </li>
        ))}
      </ul>
    </div>
  );
};

export default CongressmanTabs;

