import React, { useState } from 'react';
import LoadingSpinner from '../shared/LoadingSpinner';

const CorporateDonors = ({ congressmanId, loading }) => {
  // Mock corporate donors data
  const donorsData = [
    {
      name: 'Microsoft Corporation',
      total: 125000,
      donations: [
        { year: 2024, amount: 50000, type: 'PAC' },
        { year: 2023, amount: 30000, type: 'Individual' }
      ],
      sector: 'Technology',
      location: 'Redmond, WA'
    },
    {
      name: 'Goldman Sachs Group',
      total: 98000,
      donations: [
        { year: 2024, amount: 45000, type: 'PAC' },
        { year: 2023, amount: 15000, type: 'Individual' }
      ],
      sector: 'Financials',
      location: 'New York, NY'
    },
    {
      name: 'Apple Inc.',
      total: 87500,
      donations: [
        { year: 2024, amount: 40000, type: 'PAC' },
        { year: 2023, amount: 15000, type: 'Individual' }
      ],
      sector: 'Technology',
      location: 'Cupertino, CA'
    },
    {
      name: 'Amazon.com Inc.',
      total: 72000,
      donations: [
        { year: 2024, amount: 35000, type: 'PAC' },
        { year: 2023, amount: 10000, type: 'Individual' }
      ],
      sector: 'Consumer Discretionary',
      location: 'Seattle, WA'
    },
    {
      name: 'Meta Platforms Inc.',
      total: 65000,
      donations: [
        { year: 2024, amount: 30000, type: 'PAC' },
        { year: 2023, amount: 10000, type: 'Individual' }
      ],
      sector: 'Communication Services',
      location: 'Menlo Park, CA'
    },
    {
      name: 'JPMorgan Chase & Co.',
      total: 58000,
      donations: [
        { year: 2024, amount: 28000, type: 'PAC' },
        { year: 2023, amount: 22000, amount: 8000, type: 'Individual' }
      ],
      sector: 'Financials',
      location: 'New York, NY'
    }
  ];

  const [sortConfig, setSortConfig] = useState({ key: 'total', direction: 'desc' });
  const [expandedDonor, setExpandedDonor] = useState(null);

  const handleSort = (key) => {
    let direction = 'desc';
    if (sortConfig.key === key && sortConfig.direction === 'desc') {
      direction = 'asc';
    }
    setSortConfig({ key, direction });
  };

  const sortedData = [...donorsData].sort((a, b) => {
    if (sortConfig.direction === 'asc') {
      return a[sortConfig.key] - b[sortConfig.key];
    }
    return b[sortConfig.key] - a[sortConfig.key];
  });

  const formatCurrency = (value) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(value);
  };

  const totalDonations = donorsData.reduce((sum, donor) => sum + donor.total, 0);

  if (loading) {
    return (
      <div className="bg-white rounded-lg shadow-sm p-8 flex items-center justify-center">
        <LoadingSpinner />
      </div>
    );
  }

  return (
    <div className="space-y-4 animate-fade-in">
      {/* Summary */}
      <div className="bg-gray-50 rounded-lg p-4">
        <div className="text-xs text-gray-600 mb-1">Total Corporate Donations</div>
        <div className="text-2xl font-semibold text-gray-900">{formatCurrency(totalDonations)}</div>
        <div className="text-xs text-gray-500 mt-1">{donorsData.length} corporate donors</div>
      </div>

      {/* Donors Table */}
      <div className="bg-white rounded-lg shadow-sm overflow-hidden">
        <div className="p-4 border-b border-gray-200">
          <h3 className="text-lg font-semibold text-gray-900">Corporate Donors</h3>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-gray-50 border-b border-gray-200">
              <tr>
                <th className="px-4 py-2 text-left text-xs font-medium text-gray-700">Company</th>
                <th className="px-4 py-2 text-left text-xs font-medium text-gray-700">Sector</th>
                <th 
                  className="px-4 py-2 text-right text-xs font-medium text-gray-700 cursor-pointer hover:bg-gray-100"
                  onClick={() => handleSort('total')}
                >
                  Total {sortConfig.key === 'total' && (sortConfig.direction === 'asc' ? '▲' : '▼')}
                </th>
                <th className="px-4 py-2 text-left text-xs font-medium text-gray-700">Details</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200">
              {sortedData.map((donor, index) => (
                <React.Fragment key={donor.name}>
                  <tr 
                    className="hover:bg-gray-50 transition-colors cursor-pointer animate-slide-in"
                    style={{ animationDelay: `${index * 50}ms` }}
                    onClick={() => setExpandedDonor(expandedDonor === donor.name ? null : donor.name)}
                  >
                    <td className="px-4 py-3 font-semibold text-gray-900">{donor.name}</td>
                    <td className="px-4 py-3 text-gray-600">{donor.sector}</td>
                    <td className="px-4 py-3 text-right font-semibold text-gray-900">{formatCurrency(donor.total)}</td>
                    <td className="px-4 py-3">
                      <button className="c-btn c-btn--yellow text-xs px-3 py-1">
                        {expandedDonor === donor.name ? 'Hide' : 'Show'} Details
                      </button>
                    </td>
                  </tr>
                  {expandedDonor === donor.name && (
                    <tr className="bg-gray-50">
                      <td colSpan={4} className="px-4 py-3">
                        <div className="space-y-2 animate-fade-in">
                          <div className="text-xs text-gray-600">Location: {donor.location}</div>
                          <div className="text-xs font-medium text-gray-900">Donation History:</div>
                          <div className="space-y-1">
                            {donor.donations.map((donation, idx) => (
                              <div key={idx} className="flex justify-between text-xs">
                                <span className="text-gray-600">{donation.year} - {donation.type}</span>
                                <span className="font-semibold text-gray-900">{formatCurrency(donation.amount)}</span>
                              </div>
                            ))}
                          </div>
                        </div>
                      </td>
                    </tr>
                  )}
                </React.Fragment>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};

export default CorporateDonors;

