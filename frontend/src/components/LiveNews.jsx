import { useState } from 'react';
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
  const [hoveredArticle, setHoveredArticle] = useState(null);
  const [hoveredTag, setHoveredTag] = useState(null);

  const getImpactColor = (impact) => {
    switch (impact) {
      case 'Critical':
        return 'bg-red-100 text-red-800 border-red-200';
      case 'High':
        return 'bg-orange-100 text-orange-800 border-orange-200';
      case 'Medium':
        return 'bg-yellow-100 text-yellow-800 border-yellow-200';
      default:
        return 'bg-gray-100 text-gray-800 border-gray-200';
    }
  };

  const getTagColor = (type) => {
    switch (type) {
      case 'congressman':
        return 'bg-blue-100 text-blue-700';
      case 'bill':
        return 'bg-purple-100 text-purple-700';
      case 'stock':
        return 'bg-green-100 text-green-700';
      case 'sector':
        return 'bg-gray-100 text-gray-700';
      default:
        return 'bg-gray-100 text-gray-700';
    }
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
      <div className="space-y-0 border-t border-black border-l border-r">
        {NEWS_ARTICLES.map((article, index) => (
          <div 
            key={article.id}
            className={`border-b border-black p-6 hover:bg-gray-50 transition-colors relative ${
              index === 0 ? 'border-t-0' : ''
            }`}
            onMouseEnter={() => setHoveredArticle(article.id)}
            onMouseLeave={() => setHoveredArticle(null)}
          >
            {/* Blue box in upper right corner on hover - for the article itself */}
            <div className={`absolute top-[-1px] right-[-1px] w-4 h-4 bg-blue-600 z-10 border border-black transition-opacity duration-200 ${
              hoveredArticle === article.id ? 'opacity-100' : 'opacity-0'
            }`}></div>
            <div className="flex items-start justify-between gap-4 mb-4">
              <div className="flex-1">
                <h3 className="font-semibold text-gray-900 mb-2 hover:text-blue-600 transition-colors">
                  {article.title}
                </h3>
                <div className="flex items-center gap-3 text-xs text-gray-500">
                  <span>{article.timestamp}</span>
                  <span>•</span>
                  <span className={`px-2 py-0.5 border ${getImpactColor(article.impact)}`}>
                    {article.impact}
                  </span>
                  <span>•</span>
                  <span className="text-gray-600">{article.category}</span>
                </div>
              </div>
            </div>
            
            {/* Tags - Full width row at bottom */}
            <div className="flex gap-0 mt-4 pt-4 border-t border-gray-200">
              {article.tags.map((tag, tagIndex) => {
                const TagComponent = getTagLink(tag) ? Link : 'div';
                const tagProps = getTagLink(tag) ? { to: getTagLink(tag) } : {};
                const isLast = tagIndex === article.tags.length - 1;
                
                return (
                  <TagComponent
                    key={tagIndex}
                    {...tagProps}
                    className={`relative group flex-1 border-b border-r border-black px-3 py-2 text-xs font-medium text-center ${getTagColor(tag.type)} hover:opacity-90 transition-opacity ${
                      isLast ? 'border-r-0' : ''
                    }`}
                    onMouseEnter={() => setHoveredTag(`${article.id}-${tagIndex}`)}
                    onMouseLeave={() => setHoveredTag(null)}
                  >
                    {/* Blue box in upper right corner on hover with fade-in */}
                    <div className={`absolute top-[-1px] right-[-1px] w-4 h-4 bg-blue-600 z-10 border border-black transition-opacity duration-200 ${
                      hoveredTag === `${article.id}-${tagIndex}` ? 'opacity-100' : 'opacity-0'
                    }`}></div>
                    {tag.label}
                  </TagComponent>
                );
              })}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
