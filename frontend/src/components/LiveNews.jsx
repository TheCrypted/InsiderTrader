import { Link } from 'react-router-dom';

const NEWS_ARTICLES = [
  {
    id: 1,
    title: 'Nancy Pelosi Discloses $2.5M NVIDIA Purchase Ahead of AI Regulation Bill',
    timestamp: '2 hours ago',
    category: 'Trading Activity',
    tags: [
      { type: 'congressman', label: 'Nancy Pelosi', id: 'P000197' },
      { type: 'stock', label: 'NVDA', id: 'NVDA' }
    ],
    impact: 'High'
  },
  {
    id: 2,
    title: 'Senate Committee Advances Cybersecurity Bill - Tech Stocks Rally',
    timestamp: '5 hours ago',
    category: 'Legislation',
    tags: [
      { type: 'bill', label: 'H.R.1890', id: 'H.R.1890' },
      { type: 'stock', label: 'MSFT', id: 'MSFT' },
      { type: 'stock', label: 'PANW', id: 'PANW' }
    ],
    impact: 'Medium'
  },
  {
    id: 3,
    title: 'Marjorie Taylor Greene Reports 15 Trades in Defense Sector This Quarter',
    timestamp: '8 hours ago',
    category: 'Trading Activity',
    tags: [
      { type: 'congressman', label: 'Marjorie Taylor Greene', id: 'G000596' },
      { type: 'sector', label: 'Defense', id: 'Defense' }
    ],
    impact: 'Medium'
  },
  {
    id: 4,
    title: 'Financial Technology Innovation Act Gains 12 New Cosponsors',
    timestamp: '12 hours ago',
    category: 'Legislation',
    tags: [
      { type: 'bill', label: 'H.R.2456', id: 'H.R.2456' },
      { type: 'stock', label: 'JPM', id: 'JPM' },
      { type: 'stock', label: 'BAC', id: 'BAC' }
    ],
    impact: 'High'
  },
  {
    id: 5,
    title: 'Ro Khanna Purchases $500K in AMD Stock Before Tech Committee Hearing',
    timestamp: '1 day ago',
    category: 'Trading Activity',
    tags: [
      { type: 'congressman', label: 'Ro Khanna', id: 'D000216' },
      { type: 'stock', label: 'AMD', id: 'AMD' }
    ],
    impact: 'High'
  },
  {
    id: 6,
    title: 'AI Transparency Act Scheduled for House Vote Next Week',
    timestamp: '1 day ago',
    category: 'Legislation',
    tags: [
      { type: 'bill', label: 'H.R.1234', id: 'H.R.1234' },
      { type: 'stock', label: 'NVDA', id: 'NVDA' },
      { type: 'stock', label: 'MSFT', id: 'MSFT' },
      { type: 'stock', label: 'GOOGL', id: 'GOOGL' }
    ],
    impact: 'Critical'
  }
];

export default function LiveNews() {
  // Hash function to generate consistent colors from strings
  const hashString = (str) => {
    let hash = 0;
    for (let i = 0; i < str.length; i++) {
      const char = str.charCodeAt(i);
      hash = ((hash << 5) - hash) + char;
      hash = hash & hash; // Convert to 32bit integer
    }
    return Math.abs(hash);
  };

  // Generate a faint color from a string hash
  const getFaintColor = (str) => {
    if (!str) return 'rgba(0, 0, 0, 0)'; // Transparent for empty tags
    
    const hash = hashString(str);
    // Generate HSL color with low saturation and high lightness for faint appearance
    const hue = hash % 360;
    const saturation = 15 + (hash % 10); // 15-25% saturation
    const lightness = 92 + (hash % 6); // 92-97% lightness
    
    return `hsl(${hue}, ${saturation}%, ${lightness}%)`;
  };

  const getTagLink = (tag) => {
    if (tag.type === 'congressman') {
      return `/congressman/${tag.id}/trading`;
    } else if (tag.type === 'bill') {
      return `/legislation/${tag.id}/bet`;
    }
    return null;
  };

  return (
    <div>
      <h2 className="text-2xl font-bold mb-6 px-6 pt-6">Live News</h2>
      <div className="space-y-0 border-t border-black">
        {NEWS_ARTICLES.map((article, index) => {
          // Use all tags, dynamically sized
          const displayTags = article.tags.length > 0 ? article.tags : [];
          
          return (
            <div 
              key={article.id}
              className={`border-b border-black ${
                index === 0 ? 'border-t-0' : ''
              }`}
            >
              {/* Top Section - Title and Image */}
              <div className="flex" style={{ minHeight: '120px' }}>
                {/* Left Column - Text Area */}
                <div className="flex-1 p-4 flex flex-col justify-center">
                  <h3 className="font-semibold text-gray-900 mb-1">
                    {article.title}
                  </h3>
                  <p className="text-xs text-gray-600">- {article.category}</p>
                </div>
                
                {/* Right Column - Image */}
                <div className="w-32 flex items-center justify-center border-l border-black bg-gray-100 overflow-hidden">
                  <img
                    src={`https://picsum.photos/seed/${article.id}/128/128`}
                    alt=""
                    className="w-full h-full object-cover"
                    onError={(e) => {
                      e.target.style.display = 'none';
                      e.target.nextElementSibling.style.display = 'flex';
                    }}
                  />
                  <div className="hidden items-center justify-center w-full h-full">
                    <span className="text-xs text-gray-400">image</span>
                  </div>
                </div>
              </div>
              
              {/* Bottom Section - Dynamically Sized Segments */}
              <div className="flex border-b-0">
                {displayTags.length > 0 ? (
                  displayTags.map((tag, tagIndex) => {
                    const TagComponent = tag.label && getTagLink(tag) ? Link : 'div';
                    const tagProps = tag.label && getTagLink(tag) ? { to: getTagLink(tag) } : {};
                    const faintColor = getFaintColor(tag.label);
                    
                    return (
                      <TagComponent
                        key={tagIndex}
                        {...tagProps}
                        className={`flex-1 p-3 text-xs text-center ${
                          tag.label ? 'hover:opacity-80 transition-opacity' : ''
                        }`}
                        style={{ 
                          backgroundColor: faintColor,
                          flex: displayTags.length > 0 ? `1 1 ${100 / displayTags.length}%` : '1'
                        }}
                      >
                        {tag.label}
                      </TagComponent>
                    );
                  })
                ) : (
                  <div className="flex-1 p-3 text-xs text-center"></div>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
