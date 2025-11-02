import { useState, useEffect, useRef } from 'react';

const CryptoMarquee = () => {
  const [cryptoData, setCryptoData] = useState({});
  const [flashStates, setFlashStates] = useState({});
  const wsRef = useRef(null);
  const reconnectTimeoutRef = useRef(null);
  const previousPrices = useRef({});

  // Popular cryptocurrencies to display
  const cryptoPairs = [
    'BTC-USD',
    'ETH-USD',
    'SOL-USD',
    'ADA-USD',
    'DOT-USD',
    'MATIC-USD',
    'AVAX-USD',
    'LINK-USD',
    'UNI-USD',
    'ATOM-USD',
    'ALGO-USD',
    'FIL-USD'
  ];

  const formatPrice = (price) => {
    if (!price) return '—';
    const num = parseFloat(price);
    if (num < 1) {
      return num.toFixed(4);
    } else if (num < 1000) {
      return num.toFixed(2);
    } else {
      return num.toFixed(0);
    }
  };

  const formatChange = (change) => {
    if (!change) return '—';
    const num = parseFloat(change);
    const sign = num >= 0 ? '+' : '';
    return `${sign}${num.toFixed(2)}%`;
  };

  const getChangeColor = (change) => {
    if (!change) return 'text-gray-900';
    const num = parseFloat(change);
    return num >= 0 ? 'text-green-600' : 'text-red-600';
  };

  useEffect(() => {
    const connectWebSocket = () => {
      try {
        const ws = new WebSocket('wss://ws-feed.exchange.coinbase.com');
        
        ws.onopen = () => {
          console.log('Coinbase WebSocket connected');
          
          // Subscribe to ticker channel for all crypto pairs
          const subscribeMessage = {
            type: 'subscribe',
            product_ids: cryptoPairs,
            channels: ['ticker']
          };
          
          ws.send(JSON.stringify(subscribeMessage));
        };

        ws.onmessage = (event) => {
          try {
            const message = JSON.parse(event.data);
            
            // Handle ticker updates
            if (message.type === 'ticker') {
              const currentPrice = parseFloat(message.price);
              const open24h = parseFloat(message.open_24h);
              const change24h = open24h ? ((currentPrice - open24h) / open24h) * 100 : null;
              
              const prevPrice = previousPrices.current[message.product_id];
              
              // Detect price change for flash animation
              if (prevPrice !== undefined && prevPrice !== currentPrice) {
                const isUp = currentPrice > prevPrice;
                setFlashStates(prev => ({
                  ...prev,
                  [message.product_id]: isUp ? 'up' : 'down'
                }));
                
                // Clear flash after animation
                setTimeout(() => {
                  setFlashStates(prev => {
                    const newState = { ...prev };
                    delete newState[message.product_id];
                    return newState;
                  });
                }, 500);
              }
              
              previousPrices.current[message.product_id] = currentPrice;
              
              setCryptoData(prev => ({
                ...prev,
                [message.product_id]: {
                  price: message.price,
                  change: change24h,
                  volume: message.volume_24h,
                  lastUpdate: Date.now()
                }
              }));
            }
            
            // Handle subscription confirmation
            if (message.type === 'subscriptions') {
              console.log('Subscribed to channels:', message.channels);
            }
          } catch (error) {
            console.error('Error parsing WebSocket message:', error);
          }
        };

        ws.onerror = (error) => {
          console.error('WebSocket error:', error);
        };

        ws.onclose = () => {
          console.log('WebSocket disconnected, reconnecting in 3 seconds...');
          
          // Reconnect after 3 seconds
          reconnectTimeoutRef.current = setTimeout(() => {
            connectWebSocket();
          }, 3000);
        };

        wsRef.current = ws;
      } catch (error) {
        console.error('Error connecting WebSocket:', error);
        
        // Retry connection after 3 seconds
        reconnectTimeoutRef.current = setTimeout(() => {
          connectWebSocket();
        }, 3000);
      }
    };

    connectWebSocket();

    // Cleanup on unmount
    return () => {
      if (reconnectTimeoutRef.current) {
        clearTimeout(reconnectTimeoutRef.current);
      }
      if (wsRef.current) {
        wsRef.current.close();
      }
    };
  }, []);

  // Get crypto symbol from pair (e.g., "BTC-USD" -> "BTC")
  const getSymbol = (pair) => pair.split('-')[0];

  const getFlashClass = (pair) => {
    const flashState = flashStates[pair];
    if (flashState === 'up') return 'crypto-flash-up';
    if (flashState === 'down') return 'crypto-flash-down';
    return '';
  };

  const CryptoItem = ({ pair, data, symbol }) => {
    const change = data?.change ?? null;
    const isPositive = change !== null && change >= 0;
    
    return (
      <div 
        className={`flex items-center gap-3 px-4 py-1 ${getFlashClass(pair)}`}
        style={{ borderRight: '1px solid rgba(255, 255, 255, 0.3)' }}
      >
        <span className="font-bold text-white">{symbol}</span>
        <span className="text-white">${formatPrice(data?.price)}</span>
        {change !== null && (
          <span className={`font-medium ${isPositive ? 'text-green-400' : 'text-red-400'}`}>
            {formatChange(change)}
          </span>
        )}
      </div>
    );
  };

  return (
    <div className="border-b border-black bg-black overflow-hidden">
      <div className="py-2">
        <div className="flex items-center animate-scroll whitespace-nowrap">
          {/* First set */}
          <div className="flex items-center">
            {cryptoPairs.map((pair) => {
              const data = cryptoData[pair];
              const symbol = getSymbol(pair);
              return <CryptoItem key={pair} pair={pair} data={data} symbol={symbol} />;
            })}
          </div>
          
          {/* Duplicate set for seamless scroll */}
          <div className="flex items-center" aria-hidden="true">
            {cryptoPairs.map((pair) => {
              const data = cryptoData[pair];
              const symbol = getSymbol(pair);
              return <CryptoItem key={`${pair}-dup`} pair={pair} data={data} symbol={symbol} />;
            })}
          </div>
        </div>
      </div>
    </div>
  );
};

export default CryptoMarquee;

