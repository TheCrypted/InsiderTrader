import NewsItem from './NewsItem'

const NEWS_ITEMS = [
  { icon: "$", text: "Insider Purchase: Chief Financial Officer of $EBC Buys 10,000 Shares" },
  { icon: "📄", text: "Congress Trade: Representative Marjorie Taylor Greene Just Disclosed New Stock Trades" },
  { icon: "$", text: "Insider Purchase: Chief Executive Officer of $ASIC Buys 5,200 Shares" },
]

export default function TrendingNewsFeed() {
  return (
    <div className="border-t border-gray-800 mt-12">
      <div className="container mx-auto px-6 py-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-4 flex-1 overflow-x-auto">
            <div className="flex items-center gap-2 flex-shrink-0">
              <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse"></div>
              <span className="font-semibold">Trending</span>
            </div>
            
            <div className="flex items-center gap-6 ml-6">
              {NEWS_ITEMS.map((item, index) => (
                <NewsItem key={index} {...item} />
              ))}
            </div>
          </div>
          
          <button className="flex items-center gap-2 text-green-500 hover:text-green-400 transition ml-4 flex-shrink-0">
            <div className="w-2 h-2 bg-green-500 rounded-full"></div>
            All News
          </button>
        </div>
      </div>
    </div>
  )
}

