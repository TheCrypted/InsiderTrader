import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { getNYTimesTopStories } from '../utils/api';
import LoadingSpinner from './shared/LoadingSpinner';

export default function LiveNews() {
  const [articles, setArticles] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    const fetchArticles = async () => {
      try {
        setLoading(true);
        setError(null);
        // Fetch top stories from 'home' section (can also use 'us', 'world', 'politics', etc.)
        const data = await getNYTimesTopStories('home');
        // Limit to top 6 articles for the dashboard
        setArticles(data.slice(0, 6));
      } catch (err) {
        console.error('Error fetching news articles:', err);
        setError('Failed to load news articles');
      } finally {
        setLoading(false);
      }
    };

    fetchArticles();
  }, []);
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

  if (loading) {
    return (
      <div>
        <h2 className="text-2xl font-bold mb-6 px-6 pt-6">Live News</h2>
        <div className="flex items-center justify-center p-8 border-t border-black">
          <LoadingSpinner />
        </div>
      </div>
    );
  }

  if (error || articles.length === 0) {
    return (
      <div>
        <h2 className="text-2xl font-bold mb-6 px-6 pt-6">Live News</h2>
        <div className="p-8 text-center text-gray-500 border-t border-black">
          {error || 'No news articles available'}
        </div>
      </div>
    );
  }

  return (
    <div>
      <h2 className="text-2xl font-bold mb-6 px-6 pt-6">Live News</h2>
      <div className="space-y-0 border-t border-black">
        {articles.map((article, index) => {
          // Use all tags, dynamically sized
          const displayTags = article.tags.length > 0 ? article.tags : [];
          
          return (
            <div 
              key={article.id}
              className={`border-b border-black ${
                index === 0 ? 'border-t-0' : ''
              }`}
            >
              {/* Top Section - Title */}
              <div className="p-4 flex justify-between items-start">
                <div className="flex-1 pr-4">
                  {article.url ? (
                    <a 
                      href={article.url} 
                      target="_blank" 
                      rel="noopener noreferrer"
                      className="font-semibold text-gray-900 mb-1 hover:underline transition-all block"
                    >
                      {article.title}
                    </a>
                  ) : (
                    <h3 className="font-semibold text-gray-900 mb-1">
                      {article.title}
                    </h3>
                  )}
                </div>
                <div className="flex-shrink-0 text-right">
                  <p className="text-xs text-gray-600">- New York Times</p>
                  {article.timestamp && (
                    <p className="text-xs text-gray-500 mt-1">{article.timestamp}</p>
                  )}
                </div>
              </div>
              
              {/* Bottom Section - Keywords (strictly one line) */}
              <div className="flex border-b-0 overflow-hidden whitespace-nowrap pt-2">
                {displayTags.length > 0 ? (
                  displayTags.map((tag, tagIndex) => {
                    const TagComponent = tag.label && getTagLink(tag) ? Link : 'div';
                    const tagProps = tag.label && getTagLink(tag) ? { to: getTagLink(tag) } : {};
                    const faintColor = getFaintColor(tag.label);
                    
                    return (
                      <TagComponent
                        key={tagIndex}
                        {...tagProps}
                        className={`flex-shrink-0 p-3 text-xs text-center ${
                          tag.label ? 'hover:opacity-80 transition-opacity' : ''
                        }`}
                        style={{ 
                          backgroundColor: faintColor,
                          minWidth: `${100 / displayTags.length}%`
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
