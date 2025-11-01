import { useState, useMemo } from 'react';
import LoadingSpinner from '../shared/LoadingSpinner';

const TradesTable = ({ trades, loading }) => {
  const [sortField, setSortField] = useState('traded');
  const [sortDirection, setSortDirection] = useState('desc');
  const [searchTerm, setSearchTerm] = useState('');
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
    let filtered = trades;

    // Apply search filter
    if (searchTerm) {
      filtered = filtered.filter(
        (trade) =>
          trade.stock.toLowerCase().includes(searchTerm.toLowerCase()) ||
          trade.description.toLowerCase().includes(searchTerm.toLowerCase())
      );
    }

    // Apply sorting
    filtered = [...filtered].sort((a, b) => {
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

    return filtered;
  }, [trades, searchTerm, sortField, sortDirection]);

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

  const SortIcon = ({ field }) => {
    if (sortField !== field) {
      return (
        <div className="flex flex-col opacity-30">
          <svg className="w-3 h-3" fill="currentColor" viewBox="0 0 20 20">
            <path d="M5 12a1 1 0 102 0V6.414l1.293 1.293a1 1 0 001.414-1.414l-3-3a1 1 0 00-1.414 0l-3 3a1 1 0 001.414 1.414L5 6.414V12z" />
          </svg>
          <svg className="w-3 h-3 -mt-1" fill="currentColor" viewBox="0 0 20 20">
            <path d="M5 8a1 1 0 102 0v5.586l1.293-1.293a1 1 0 011.414 1.414l-3 3a1 1 0 01-1.414 0l-3-3a1 1 0 011.414-1.414L5 13.586V8z" />
          </svg>
        </div>
      );
    }
    return sortDirection === 'asc' ? (
      <svg className="w-4 h-4 text-gresearch-yellow" fill="currentColor" viewBox="0 0 20 20">
        <path d="M5 12a1 1 0 102 0V6.414l1.293 1.293a1 1 0 001.414-1.414l-3-3a1 1 0 00-1.414 0l-3 3a1 1 0 001.414 1.414L5 6.414V12z" />
      </svg>
    ) : (
      <svg className="w-4 h-4 text-gresearch-yellow" fill="currentColor" viewBox="0 0 20 20">
        <path d="M5 8a1 1 0 102 0v5.586l1.293-1.293a1 1 0 011.414 1.414l-3 3a1 1 0 01-1.414 0l-3-3a1 1 0 011.414-1.414L5 13.586V8z" />
      </svg>
    );
  };

  if (loading) {
    return (
      <div className="bg-white rounded-lg shadow-sm p-8">
        <LoadingSpinner size="lg" />
      </div>
    );
  }

  return (
    <div className="bg-white rounded-lg shadow-sm overflow-hidden">
      <div className="p-4 border-b border-gray-200">
        <div className="flex items-center gap-2 mb-1">
          <svg className="w-4 h-4 text-gray-600" fill="currentColor" viewBox="0 0 20 20">
            <path d="M4 4a2 2 0 012-2h4.586A2 2 0 0112 2.586L15.414 6A2 2 0 0116 7.414V16a2 2 0 01-2 2H6a2 2 0 01-2-2V4z" />
          </svg>
          <h3 className="text-lg font-semibold text-gray-900">Trades</h3>
        </div>
        <p className="text-xs text-gray-600">Click on a trade or stock for more details</p>
      </div>

      <div className="overflow-x-auto max-h-96 overflow-y-auto">
        <table className="w-full text-sm">
          <thead className="bg-gray-50 border-b border-gray-200 sticky top-0">
            <tr>
              <th className="px-4 py-2 text-left">
                <div className="flex items-center gap-2">
                  <div className="relative">
                    <input
                      type="text"
                      placeholder="Search ticker"
                      value={searchTerm}
                      onChange={(e) => {
                        setSearchTerm(e.target.value);
                        setCurrentPage(1);
                      }}
                      className="text-sm border border-gray-300 rounded px-3 py-1 w-32 focus:outline-none focus:ring-2 focus:ring-gresearch-yellow"
                    />
                  </div>
                  <button
                    onClick={() => handleSort('stock')}
                    className="flex items-center gap-1 text-xs font-medium text-gray-700 hover:text-gray-900"
                  >
                    Stock
                    <SortIcon field="stock" />
                  </button>
                </div>
              </th>
              <th className="px-4 py-2 text-left">
                <button
                  onClick={() => handleSort('transaction')}
                  className="flex items-center gap-1 text-xs font-medium text-gray-700 hover:text-gray-900"
                >
                  Transaction
                  <SortIcon field="transaction" />
                </button>
              </th>
              <th className="px-4 py-2 text-left">
                <button
                  onClick={() => handleSort('filed')}
                  className="flex items-center gap-1 text-xs font-medium text-gray-700 hover:text-gray-900"
                >
                  Filed
                  <SortIcon field="filed" />
                </button>
              </th>
              <th className="px-4 py-2 text-left">
                <button
                  onClick={() => handleSort('traded')}
                  className="flex items-center gap-1 text-xs font-medium text-gray-700 hover:text-gray-900"
                >
                  Traded
                  <SortIcon field="traded" />
                </button>
              </th>
              <th className="px-4 py-2 text-left text-xs font-medium text-gray-700">Description</th>
              <th className="px-4 py-2 text-left">
                <button
                  onClick={() => handleSort('excessReturn')}
                  className="flex items-center gap-1 text-xs font-medium text-gray-700 hover:text-gray-900"
                >
                  Excess Return
                  <SortIcon field="excessReturn" />
                </button>
              </th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-200">
            {paginatedTrades.length === 0 ? (
              <tr>
                <td colSpan={6} className="px-4 py-4 text-center text-gray-500 text-xs">
                  No trades found
                </td>
              </tr>
            ) : (
              paginatedTrades.map((trade) => (
                <tr
                  key={trade.id}
                  className="hover:bg-gray-50 transition-colors cursor-pointer border-b border-gray-100"
                  onClick={() => console.log('Trade clicked:', trade)}
                >
                  <td className="px-4 py-2">
                    <div className="font-semibold text-gray-900">{trade.stock}</div>
                    {trade.company && (
                      <div className="text-xs text-gray-500 mt-0.5">{trade.company}</div>
                    )}
                  </td>
                  <td className="px-4 py-2">
                    <div>
                      <span
                        className={`px-2 py-0.5 rounded text-xs font-medium ${
                          trade.transaction === 'Purchase'
                            ? 'bg-green-100 text-green-800'
                            : trade.transaction === 'Sale'
                            ? 'bg-red-100 text-red-800'
                            : 'bg-gray-100 text-gray-800'
                        }`}
                      >
                        {trade.transaction}
                      </span>
                    </div>
                    {trade.amount && (
                      <div className="text-xs text-gray-500 mt-1">{trade.amount}</div>
                    )}
                  </td>
                  <td className="px-4 py-2 text-xs text-gray-600">{formatDate(trade.filed)}</td>
                  <td className="px-4 py-2 text-xs text-gray-600">{formatDate(trade.traded)}</td>
                  <td className="px-4 py-2 text-xs text-gray-600 max-w-xs truncate">{trade.description}</td>
                  <td className="px-4 py-2">
                    {trade.excessReturn !== null ? (
                      <span
                        className={`font-semibold text-sm ${
                          trade.excessReturn >= 0 ? 'text-green-600' : 'text-red-600'
                        }`}
                      >
                        {trade.excessReturn >= 0 ? '+' : ''}
                        {trade.excessReturn.toFixed(2)}%
                      </span>
                    ) : (
                      <span className="text-xs text-gray-400">-</span>
                    )}
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {totalPages > 1 && (
        <div className="px-4 py-2 border-t border-gray-200 flex items-center justify-between bg-gray-50">
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

