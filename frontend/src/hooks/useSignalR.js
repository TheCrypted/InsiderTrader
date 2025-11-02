import { useEffect, useRef, useState } from 'react';
import * as signalR from '@microsoft/signalr';

/**
 * Hook to connect to SignalR hub and listen for trade/lobbying activity notifications
 * @param {string} hubUrl - The SignalR hub URL (defaults to /api/hubs/trades for dev)
 * @param {function} onTradeOrLobbyingActivity - Callback function when activity is detected
 * @returns {object} - Connection state and methods
 */
export const useSignalR = (hubUrl = null, onTradeOrLobbyingActivity = null) => {
  const connectionRef = useRef(null);
  const [isConnected, setIsConnected] = useState(false);
  const [connectionError, setConnectionError] = useState(null);

  useEffect(() => {
    // Determine hub URL
    const apiBaseUrl = import.meta.env.VITE_API_BASE_URL || (import.meta.env.DEV ? '/api' : 'http://localhost:8080');
    const hubPath = hubUrl || `${apiBaseUrl}/hubs/trades`;

    // Create SignalR connection
    const connection = new signalR.HubConnectionBuilder()
      .withUrl(hubPath)
      .withAutomaticReconnect({
        nextRetryDelayInMilliseconds: (retryContext) => {
          // Exponential backoff: 0s, 2s, 10s, 30s
          if (retryContext.elapsedMilliseconds < 10000) {
            return 2000; // 2 seconds
          } else if (retryContext.elapsedMilliseconds < 30000) {
            return 10000; // 10 seconds
          } else {
            return 30000; // 30 seconds
          }
        }
      })
      .configureLogging(signalR.LogLevel.Information)
      .build();

    connectionRef.current = connection;

    // Set up event handlers
    connection.on('TradeOrLobbyingActivity', (notification) => {
      console.log('TradeOrLobbyingActivity received:', notification);
      if (onTradeOrLobbyingActivity) {
        onTradeOrLobbyingActivity(notification);
      }
    });

    connection.onreconnecting((error) => {
      console.log('SignalR reconnecting...', error);
      setIsConnected(false);
      setConnectionError(error?.message || 'Connection lost');
    });

    connection.onreconnected((connectionId) => {
      console.log('SignalR reconnected:', connectionId);
      setIsConnected(true);
      setConnectionError(null);
    });

    connection.onclose((error) => {
      console.log('SignalR connection closed:', error);
      setIsConnected(false);
      setConnectionError(error?.message || 'Connection closed');
    });

    // Start connection
    connection.start()
      .then(() => {
        console.log('SignalR connected successfully');
        setIsConnected(true);
        setConnectionError(null);
      })
      .catch((error) => {
        console.error('Error starting SignalR connection:', error);
        setConnectionError(error.message);
        setIsConnected(false);
      });

    // Cleanup on unmount
    return () => {
      if (connectionRef.current) {
        connectionRef.current.stop()
          .then(() => console.log('SignalR connection stopped'))
          .catch((error) => console.error('Error stopping SignalR connection:', error));
      }
    };
  }, [hubUrl, onTradeOrLobbyingActivity]);

  return {
    connection: connectionRef.current,
    isConnected,
    connectionError,
  };
};

