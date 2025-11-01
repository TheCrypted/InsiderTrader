import { useState, useMemo } from 'react';
import LoadingSpinner from '../shared/LoadingSpinner';
import { useStockLogo } from '../../hooks/useImage';

const TradesTable = ({ trades, loading }) => {
  const [sortField, setSortField] = useState('traded');
  const [sortDirection, setSortDirection] = useState('desc');
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 8;

  const handleSort = (field) => {
    if (sortField === field) {
      setSortDirection(sortDirection === 'asc' ? 'desc' : 'asc');
    } else {
      setSortField(field);
      setSortDirection('asc');
    }
  };

  const filteredAndSortedTrades = useMemo(() => {
    // Apply sorting
    const sorted = [...trades].sort((a, b) => {
      let aValue = a[sortField];
      let bValue = b[sortField];

      // Handle date fields
      if (sortField === 'filed' || sortField === 'traded') {
        aValue = new Date(aValue);
        bValue = new Date(bValue);
      }

      // Handle numeric fields
      if (sortField === 'excessReturn') {
        aValue = parseFloat(aValue);
        bValue = parseFloat(bValue);
      }

      if (aValue < bValue) return sortDirection === 'asc' ? -1 : 1;
      if (aValue > bValue) return sortDirection === 'asc' ? 1 : -1;
      return 0;
    });

    return sorted;
  }, [trades, sortField, sortDirection]);

  const paginatedTrades = useMemo(() => {
    const startIndex = (currentPage - 1) * itemsPerPage;
    return filteredAndSortedTrades.slice(startIndex, startIndex + itemsPerPage);
  }, [filteredAndSortedTrades, currentPage]);

  const totalPages = Math.ceil(filteredAndSortedTrades.length / itemsPerPage);

  const formatDate = (dateString) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric'
    });
  };

  // Trade row component with logo and background tint
  const TradeRow = ({ trade }) => {
    const { logoUrl, loading: logoLoading } = useStockLogo(trade.stock);
    const isPositive = trade.excessReturn !== null && trade.excessReturn >= 0;
    const bgColor = trade.excessReturn !== null 
      ? (isPositive ? 'bg-green-50' : 'bg-red-50')
      : 'bg-white';

    return (
      <tr
        className={`${bgColor} hover:opacity-90 transition-opacity cursor-pointer border-b border-black`}
        onClick={() => console.log('Trade clicked:', trade)}
      >
        <td className="px-4 py-2">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded flex items-center justify-center font-bold text-gray-700 bg-white border border-gray-200 overflow-hidden flex-shrink-0">
              {!logoLoading && logoUrl ? (
                <img 
                  src={logoUrl} 
                  alt={trade.stock} 
                  className="w-full h-full object-contain p-1" 
                  onError={(e) => {
                    e.target.style.display = 'none'
                    e.target.nextElementSibling.style.display = 'block'
                  }} 
                />
              ) : null}
              <span className={!logoLoading && logoUrl ? 'hidden' : ''}>{trade.stock}</span>
            </div>
            <div>
              <div className="font-semibold text-gray-900">{trade.stock}</div>
              {trade.company && (
                <div className="text-xs text-gray-500 mt-0.5">{trade.company}</div>
              )}
            </div>
          </div>
        </td>
        <td className="px-4 py-2">
          <div className="text-sm text-gray-900">{trade.transaction}</div>
          {trade.amount && (
            <div className="text-xs text-gray-500 mt-1">{trade.amount}</div>
          )}
        </td>
        <td className="px-4 py-2 text-xs text-gray-600">{formatDate(trade.filed)}</td>
        <td className="px-4 py-2 text-xs text-gray-600">{formatDate(trade.traded)}</td>
        <td className="px-4 py-2 text-xs text-gray-600 max-w-xs truncate">{trade.description}</td>
        <td className="px-4 py-2">
          {trade.excessReturn !== null ? (
            <span className="font-semibold text-sm text-gray-900">
              {trade.excessReturn >= 0 ? '+' : ''}
              {trade.excessReturn.toFixed(2)}%
            </span>
          ) : (
            <span className="text-xs text-gray-400">-</span>
          )}
        </td>
      </tr>
    );
  };

  if (loading) {
    return (
      <div className="bg-white p-8">
        <LoadingSpinner size="lg" />
      </div>
    );
  }

  return (
    <div className="bg-white overflow-hidden h-full flex flex-col">
      <div className="p-4 border-b border-black flex-shrink-0">
        <h3 className="text-lg font-semibold text-gray-900">Trades</h3>
        <p className="text-xs text-gray-600">Click on a trade or stock for more details</p>
      </div>

      <div className="flex-1 overflow-x-auto overflow-y-auto hide-scrollbar min-h-0">
        <table className="w-full text-sm">
          <thead className="bg-white border-b border-black sticky top-0">
            <tr>
              <th className="px-4 py-2 text-left text-xs font-medium text-gray-700">
                <button
                  onClick={() => handleSort('stock')}
                  className="hover:text-gray-900"
                >
                  Stock
                </button>
              </th>
              <th className="px-4 py-2 text-left text-xs font-medium text-gray-700">
                <button
                  onClick={() => handleSort('transaction')}
                  className="hover:text-gray-900"
                >
                  Transaction
                </button>
              </th>
              <th className="px-4 py-2 text-left text-xs font-medium text-gray-700">
                <button
                  onClick={() => handleSort('filed')}
                  className="hover:text-gray-900"
                >
                  Filed
                </button>
              </th>
              <th className="px-4 py-2 text-left text-xs font-medium text-gray-700">
                <button
                  onClick={() => handleSort('traded')}
                  className="hover:text-gray-900"
                >
                  Traded
                </button>
              </th>
              <th className="px-4 py-2 text-left text-xs font-medium text-gray-700">Description</th>
              <th className="px-4 py-2 text-left text-xs font-medium text-gray-700">
                <button
                  onClick={() => handleSort('excessReturn')}
                  className="hover:text-gray-900"
                >
                  Excess Return
                </button>
              </th>
            </tr>
          </thead>
          <tbody>
            {paginatedTrades.length === 0 ? (
              <tr>
                <td colSpan={6} className="px-4 py-4 text-center text-gray-500 text-xs">
                  No trades found
                </td>
              </tr>
            ) : (
              paginatedTrades.map((trade) => (
                <TradeRow key={trade.id} trade={trade} />
              ))
            )}
          </tbody>
        </table>
      </div>

      {totalPages > 1 && (
        <div className="px-4 py-2 border-t border-black flex items-center justify-between bg-white flex-shrink-0">
          <div className="text-xs text-gray-600">
            Showing {(currentPage - 1) * itemsPerPage + 1} to{' '}
            {Math.min(currentPage * itemsPerPage, filteredAndSortedTrades.length)} of{' '}
            {filteredAndSortedTrades.length}
          </div>
          <div className="flex gap-1">
            <button
              onClick={() => setCurrentPage((prev) => Math.max(prev - 1, 1))}
              disabled={currentPage === 1}
              className="px-3 py-1 text-xs border border-gray-300 rounded hover:bg-white disabled:opacity-50 disabled:cursor-not-allowed"
            >
              Prev
            </button>
            <button
              onClick={() => setCurrentPage((prev) => Math.min(prev + 1, totalPages))}
              disabled={currentPage === totalPages}
              className="px-3 py-1 text-xs border border-gray-300 rounded hover:bg-white disabled:opacity-50 disabled:cursor-not-allowed"
            >
              Next
            </button>
          </div>
        </div>
      )}
    </div>
  );
};

export default TradesTable;

