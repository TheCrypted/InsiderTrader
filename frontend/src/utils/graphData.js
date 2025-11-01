// Graph data for visualization - bills, congressmen, and their relationships

// Congressmen data with metrics
export const graphCongressmen = [
  {
    id: 'P000197',
    name: 'Nancy Pelosi',
    type: 'congressman',
    party: 'Democratic',
    chamber: 'House',
    state: 'California',
    netWorth: 282000000,
    tradeVolume: 164390000,
    totalTrades: 183,
    image: 'https://www.congress.gov/img/member/p000197_200.jpg',
    // Size based on trade volume
    size: 50
  },
  {
    id: 'G000596',
    name: 'Marjorie Taylor Greene',
    type: 'congressman',
    party: 'Republican',
    chamber: 'House',
    state: 'Georgia',
    netWorth: 45200000,
    tradeVolume: 28500000,
    totalTrades: 106,
    image: 'https://www.congress.gov/img/member/g000596_200.jpg',
    size: 30
  },
  {
    id: 'V000137',
    name: 'J.D. Vance',
    type: 'congressman',
    party: 'Republican',
    chamber: 'Senate',
    state: 'Ohio',
    netWorth: 12800000,
    tradeVolume: 35200000,
    totalTrades: 108,
    image: 'https://www.congress.gov/img/member/v000137_200.jpg',
    size: 35
  },
  {
    id: 'D000216',
    name: 'Ro Khanna',
    type: 'congressman',
    party: 'Democratic',
    chamber: 'House',
    state: 'California',
    netWorth: 8500000,
    tradeVolume: 92400000,
    totalTrades: 145,
    image: 'https://www.congress.gov/img/member/d000216_200.jpg',
    size: 42
  },
  {
    id: 'H001089',
    name: 'Josh Hawley',
    type: 'congressman',
    party: 'Republican',
    chamber: 'Senate',
    state: 'Missouri',
    netWorth: 3200000,
    tradeVolume: 18500000,
    totalTrades: 87,
    image: 'https://www.congress.gov/img/member/h001089_200.jpg',
    size: 28
  },
  {
    id: 'S001184',
    name: 'Rick Scott',
    type: 'congressman',
    party: 'Republican',
    chamber: 'Senate',
    state: 'Florida',
    netWorth: 185000000,
    tradeVolume: 45000000,
    totalTrades: 92,
    image: 'https://www.congress.gov/img/member/s001184_200.jpg',
    size: 38
  }
];

// Bills data with metrics
export const graphBills = [
  {
    id: 'H.R.1234',
    type: 'bill',
    title: 'AI Transparency and Accountability Act',
    sponsorId: 'P000197',
    cosponsors: 45,
    status: 'In Committee',
    sector: 'Technology',
    date: '2025-09-15',
    // Size based on cosponsors
    size: 35,
    corporateSupport: 1250000, // Total donations from relevant corporations
    committees: ['Science, Space, and Technology', 'Energy and Commerce']
  },
  {
    id: 'H.R.2456',
    type: 'bill',
    title: 'Financial Technology Innovation Act',
    sponsorId: 'D000216',
    cosponsors: 32,
    status: 'In Committee',
    sector: 'Financials',
    date: '2025-08-20',
    size: 28,
    corporateSupport: 980000,
    committees: ['Financial Services']
  },
  {
    id: 'H.R.1890',
    type: 'bill',
    title: 'Cybersecurity Enhancement Act',
    sponsorId: 'P000197',
    cosponsors: 67,
    status: 'Passed House',
    sector: 'Technology',
    date: '2025-07-10',
    size: 42,
    corporateSupport: 2100000,
    committees: ['Homeland Security']
  },
  {
    id: 'H.R.987',
    type: 'bill',
    title: 'Climate Technology Investment Act',
    sponsorId: 'D000216',
    cosponsors: 28,
    status: 'Introduced',
    sector: 'Energy',
    date: '2025-06-05',
    size: 26,
    corporateSupport: 750000,
    committees: ['Ways and Means', 'Energy and Commerce']
  },
  {
    id: 'H.R.3456',
    type: 'bill',
    title: 'Data Privacy Protection Act',
    sponsorId: 'P000197',
    cosponsors: 52,
    status: 'In Committee',
    sector: 'Technology',
    date: '2025-05-18',
    size: 32,
    corporateSupport: 1680000,
    committees: ['Energy and Commerce', 'Judiciary']
  },
  {
    id: 'S.782',
    type: 'bill',
    title: 'Energy Independence Act',
    sponsorId: 'V000137',
    cosponsors: 18,
    status: 'Introduced',
    sector: 'Energy',
    date: '2025-09-25',
    size: 22,
    corporateSupport: 520000,
    committees: ['Energy and Natural Resources']
  },
  {
    id: 'S.923',
    type: 'bill',
    title: 'Healthcare Reform Act',
    sponsorId: 'H001089',
    cosponsors: 24,
    status: 'In Committee',
    sector: 'Healthcare',
    date: '2025-08-15',
    size: 25,
    corporateSupport: 680000,
    committees: ['Health, Education, Labor, and Pensions']
  },
  {
    id: 'H.R.4123',
    type: 'bill',
    title: 'Small Business Innovation Act',
    sponsorId: 'G000596',
    cosponsors: 15,
    status: 'Introduced',
    sector: 'Business',
    date: '2025-07-22',
    size: 20,
    corporateSupport: 320000,
    committees: ['Small Business']
  },
  {
    id: 'S.1567',
    type: 'bill',
    title: 'Financial Regulations Modernization',
    sponsorId: 'S001184',
    cosponsors: 31,
    status: 'In Committee',
    sector: 'Financials',
    date: '2025-06-30',
    size: 27,
    corporateSupport: 1450000,
    committees: ['Banking, Housing, and Urban Affairs']
  },
  {
    id: 'H.R.2890',
    type: 'bill',
    title: 'National Defense Technology Act',
    sponsorId: 'G000596',
    cosponsors: 41,
    status: 'In Committee',
    sector: 'Defense',
    date: '2025-08-08',
    size: 30,
    corporateSupport: 890000,
    committees: ['Armed Services']
  }
];

// Relationships/Connections between nodes
// These represent cosponsorships, support, trading connections, etc.
export const graphLinks = [
  // Nancy Pelosi connections
  { source: 'P000197', target: 'H.R.1234', type: 'sponsor', strength: 1.0 },
  { source: 'P000197', target: 'H.R.1890', type: 'sponsor', strength: 1.0 },
  { source: 'P000197', target: 'H.R.3456', type: 'sponsor', strength: 1.0 },
  { source: 'D000216', target: 'H.R.1234', type: 'cosponsor', strength: 0.7 },
  { source: 'V000137', target: 'H.R.1890', type: 'cosponsor', strength: 0.6 },
  
  // Ro Khanna connections
  { source: 'D000216', target: 'H.R.2456', type: 'sponsor', strength: 1.0 },
  { source: 'D000216', target: 'H.R.987', type: 'sponsor', strength: 1.0 },
  { source: 'P000197', target: 'H.R.2456', type: 'cosponsor', strength: 0.7 },
  { source: 'S001184', target: 'H.R.2456', type: 'cosponsor', strength: 0.5 },
  
  // J.D. Vance connections
  { source: 'V000137', target: 'S.782', type: 'sponsor', strength: 1.0 },
  { source: 'G000596', target: 'S.782', type: 'cosponsor', strength: 0.8 },
  { source: 'H001089', target: 'S.782', type: 'cosponsor', strength: 0.6 },
  
  // Josh Hawley connections
  { source: 'H001089', target: 'S.923', type: 'sponsor', strength: 1.0 },
  { source: 'V000137', target: 'S.923', type: 'cosponsor', strength: 0.7 },
  
  // Marjorie Taylor Greene connections
  { source: 'G000596', target: 'H.R.4123', type: 'sponsor', strength: 1.0 },
  { source: 'G000596', target: 'H.R.2890', type: 'sponsor', strength: 1.0 },
  { source: 'V000137', target: 'H.R.2890', type: 'cosponsor', strength: 0.7 },
  { source: 'H001089', target: 'H.R.2890', type: 'cosponsor', strength: 0.6 },
  
  // Rick Scott connections
  { source: 'S001184', target: 'S.1567', type: 'sponsor', strength: 1.0 },
  { source: 'H001089', target: 'S.1567', type: 'cosponsor', strength: 0.7 },
  { source: 'G000596', target: 'S.1567', type: 'cosponsor', strength: 0.5 },
  
  // Cross-party connections (rare but exist)
  { source: 'D000216', target: 'H.R.1890', type: 'cosponsor', strength: 0.4 },
  { source: 'P000197', target: 'H.R.987', type: 'cosponsor', strength: 0.5 },
  
  // Additional cosponsor connections for bills with many cosponsors
  { source: 'S001184', target: 'H.R.1234', type: 'cosponsor', strength: 0.3 },
  { source: 'V000137', target: 'H.R.3456', type: 'cosponsor', strength: 0.4 },
  { source: 'H001089', target: 'H.R.1890', type: 'cosponsor', strength: 0.3 }
];

// Combine all nodes
export const graphNodes = [
  ...graphCongressmen,
  ...graphBills
];

// Color mapping for different types
export const nodeColors = {
  congressman: {
    Democratic: '#0693e3', // Blue
    Republican: '#cf2e2e'  // Red
  },
  bill: '#e5fc54' // Yellow (G-research primary)
};

// Sector colors for bills
export const sectorColors = {
  Technology: '#0693e3',
  Financials: '#00d084',
  Energy: '#fcb900',
  Healthcare: '#9b51e0',
  Business: '#8ed1fc',
  Defense: '#7bdcb5'
};

