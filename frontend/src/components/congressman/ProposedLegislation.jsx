import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import LoadingSpinner from '../shared/LoadingSpinner';

const ProposedLegislation = ({ congressmanId, loading }) => {
  // Mock proposed legislation data
  const legislationData = [
    {
      id: 'H.R.1234',
      title: 'AI Transparency and Accountability Act',
      status: 'Introduced',
      date: '2025-09-15',
      chamber: 'House',
      summary: 'Requires transparency in AI decision-making processes and establishes accountability frameworks for AI systems used in government and private sectors.',
      committees: ['Science, Space, and Technology', 'Energy and Commerce'],
      cosponsors: 45,
      sector: 'Technology'
    },
    {
      id: 'H.R.2456',
      title: 'Financial Technology Innovation Act',
      status: 'In Committee',
      date: '2025-08-20',
      chamber: 'House',
      summary: 'Promotes innovation in financial technology while ensuring consumer protection and regulatory compliance.',
      committees: ['Financial Services'],
      cosponsors: 32,
      sector: 'Financials'
    },
    {
      id: 'H.R.1890',
      title: 'Cybersecurity Enhancement Act',
      status: 'Passed House',
      date: '2025-07-10',
      chamber: 'House',
      summary: 'Strengthens cybersecurity measures for critical infrastructure and provides funding for cybersecurity research and development.',
      committees: ['Homeland Security'],
      cosponsors: 67,
      sector: 'Technology'
    },
    {
      id: 'H.R.987',
      title: 'Climate Technology Investment Act',
      status: 'Introduced',
      date: '2025-06-05',
      chamber: 'House',
      summary: 'Provides tax incentives and federal funding for climate technology development and deployment.',
      committees: ['Ways and Means', 'Energy and Commerce'],
      cosponsors: 28,
      sector: 'Energy'
    },
    {
      id: 'H.R.3456',
      title: 'Data Privacy Protection Act',
      status: 'In Committee',
      date: '2025-05-18',
      chamber: 'House',
      summary: 'Establishes comprehensive data privacy protections for consumers and businesses, including requirements for data breach notifications.',
      committees: ['Energy and Commerce', 'Judiciary'],
      cosponsors: 52,
      sector: 'Technology'
    }
  ];

  const [filter, setFilter] = useState('all');
  const [sortConfig, setSortConfig] = useState({ key: 'date', direction: 'desc' });

  const handleSort = (key) => {
    let direction = 'desc';
    if (sortConfig.key === key && sortConfig.direction === 'desc') {
      direction = 'asc';
    }
    setSortConfig({ key, direction });
  };

  const statusColors = {
    'Introduced': 'bg-blue-100 text-blue-800',
    'In Committee': 'bg-yellow-100 text-yellow-800',
    'Passed House': 'bg-green-100 text-green-800',
    'Passed Senate': 'bg-purple-100 text-purple-800',
    'Enacted': 'bg-gresearch-vivid-green text-white'
  };

  const filteredData = filter === 'all' 
    ? legislationData 
    : legislationData.filter(bill => bill.status === filter);

  const sortedData = [...filteredData].sort((a, b) => {
    let aValue = a[sortConfig.key];
    let bValue = b[sortConfig.key];

    if (sortConfig.key === 'date') {
      aValue = new Date(aValue);
      bValue = new Date(bValue);
    } else if (typeof aValue === 'number') {
      // Already numeric
    } else {
      aValue = aValue.toLowerCase();
      bValue = bValue.toLowerCase();
    }

    if (sortConfig.direction === 'asc') {
      return aValue > bValue ? 1 : -1;
    }
    return aValue < bValue ? 1 : -1;
  });

  const formatDate = (dateString) => {
    const date = new Date(dateString);
    return date.toLocaleDateString('en-US', { year: 'numeric', month: 'short', day: 'numeric' });
  };

  if (loading) {
    return (
      <div className="bg-white p-8 flex items-center justify-center">
        <LoadingSpinner />
      </div>
    );
  }

  return (
    <div className="space-y-0">
      {/* Summary */}
      <div className="grid grid-cols-3 border-b border-black">
        <div className="bg-white p-6 border-r border-black">
          <div className="text-xs text-gray-600 mb-1">Total Bills</div>
          <div className="text-xl font-semibold text-gray-900">{legislationData.length}</div>
        </div>
        <div className="bg-white p-6 border-r border-black">
          <div className="text-xs text-gray-600 mb-1">In Committee</div>
          <div className="text-xl font-semibold text-gray-900">
            {legislationData.filter(b => b.status === 'In Committee').length}
          </div>
        </div>
        <div className="bg-white p-6">
          <div className="text-xs text-gray-600 mb-1">Total Cosponsors</div>
          <div className="text-xl font-semibold text-gray-900">
            {legislationData.reduce((sum, b) => sum + b.cosponsors, 0)}
          </div>
        </div>
      </div>

      {/* Filters */}
      <div className="bg-white p-6 border-b border-black">
        <div className="flex flex-wrap gap-2">
          <button
            onClick={() => setFilter('all')}
            className={`px-4 py-2 rounded-full text-xs font-medium transition-all ${
              filter === 'all'
                ? 'c-btn c-btn--yellow'
                : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
            }`}
          >
            All
          </button>
          {Object.keys(statusColors).map((status) => (
            <button
              key={status}
              onClick={() => setFilter(status)}
              className={`px-4 py-2 rounded-full text-xs font-medium transition-all ${
                filter === status
                  ? 'c-btn c-btn--yellow'
                  : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
              }`}
            >
              {status}
            </button>
          ))}
        </div>
      </div>

      {/* Legislation Table */}
      <div className="bg-white overflow-hidden">
        <div className="p-4 border-b border-black">
          <h3 className="text-lg font-semibold text-gray-900">Proposed Legislation</h3>
        </div>
        <div className="overflow-x-auto max-h-96 overflow-y-auto">
          <table className="w-full text-sm">
            <thead className="bg-gray-50 border-b border-gray-200 sticky top-0">
              <tr>
                <th 
                  className="px-4 py-2 text-left text-xs font-medium text-gray-700 cursor-pointer hover:bg-gray-100"
                  onClick={() => handleSort('id')}
                >
                  Bill ID {sortConfig.key === 'id' && (sortConfig.direction === 'asc' ? '▲' : '▼')}
                </th>
                <th 
                  className="px-4 py-2 text-left text-xs font-medium text-gray-700 cursor-pointer hover:bg-gray-100"
                  onClick={() => handleSort('title')}
                >
                  Title {sortConfig.key === 'title' && (sortConfig.direction === 'asc' ? '▲' : '▼')}
                </th>
                <th 
                  className="px-4 py-2 text-left text-xs font-medium text-gray-700 cursor-pointer hover:bg-gray-100"
                  onClick={() => handleSort('status')}
                >
                  Status {sortConfig.key === 'status' && (sortConfig.direction === 'asc' ? '▲' : '▼')}
                </th>
                <th 
                  className="px-4 py-2 text-left text-xs font-medium text-gray-700 cursor-pointer hover:bg-gray-100"
                  onClick={() => handleSort('date')}
                >
                  Date {sortConfig.key === 'date' && (sortConfig.direction === 'asc' ? '▲' : '▼')}
                </th>
                <th 
                  className="px-4 py-2 text-right text-xs font-medium text-gray-700 cursor-pointer hover:bg-gray-100"
                  onClick={() => handleSort('cosponsors')}
                >
                  Cosponsors {sortConfig.key === 'cosponsors' && (sortConfig.direction === 'asc' ? '▲' : '▼')}
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200">
              {sortedData.map((bill, index) => (
                <tr 
                  key={bill.id} 
                  className="hover:bg-gray-50 transition-colors animate-slide-in"
                  style={{ animationDelay: `${index * 50}ms` }}
                >
                  <td className="px-4 py-3 font-semibold text-gray-900">{bill.id}</td>
                  <td className="px-4 py-3">
                    <div className="font-medium text-gray-900">{bill.title}</div>
                    <div className="text-xs text-gray-500 mt-1 line-clamp-2">{bill.summary}</div>
                    <div className="text-xs text-gray-400 mt-1">
                      Committees: {bill.committees.join(', ')}
                    </div>
                    <Link
                      to={`/legislation/${bill.id}/bet`}
                      className="inline-block mt-2 text-xs c-btn c-btn--yellow px-3 py-1"
                    >
                      Predict Outcome →
                    </Link>
                  </td>
                  <td className="px-4 py-3">
                    <span className={`px-2 py-1 rounded-full text-xs font-medium ${statusColors[bill.status] || 'bg-gray-100 text-gray-800'}`}>
                      {bill.status}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-gray-600">{formatDate(bill.date)}</td>
                  <td className="px-4 py-3 text-right font-semibold text-gray-900">{bill.cosponsors}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};

export default ProposedLegislation;

