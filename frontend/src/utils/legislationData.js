// Extended legislation data with stocks, congressmen, and trading activity

export const legislationDetails = {
  'H.R.1234': {
    id: 'H.R.1234',
    title: 'AI Transparency and Accountability Act',
    question: 'Will the AI Transparency and Accountability Act pass Congress?',
    summary: 'Requires transparency in AI decision-making processes and establishes accountability frameworks for AI systems used in government and private sectors.',
    sponsor: 'Rep. Nancy Pelosi',
    sponsorId: 'P000197',
    status: 'In Committee',
    date: '2025-09-15',
    committees: ['Science, Space, and Technology', 'Energy and Commerce'],
    cosponsors: 45,
    yesPrice: 0.68,
    noPrice: 0.32,
    volume24h: 245000,
    liquidity: 125000,
    marketCap: 890000,
    resolutionDate: '2025-12-31',
    resolutionCriteria: 'This market resolves to YES if the bill is signed into law before the resolution date.',
    billUrl: 'https://www.congress.gov/bill/118th-congress/house-bill/1234',
    aiSummary: 'This legislation mandates comprehensive transparency requirements for AI systems deployed by government agencies and private entities.',
    // Stocks affected by this bill
    affectedStocks: [
      {
        symbol: 'NVDA',
        name: 'NVIDIA Corporation',
        currentPrice: 482.50,
        change: 2.45,
        changePercent: 0.51,
        relevance: 'Primary manufacturer of AI chips. Bill would require transparency in AI hardware supply chains.',
        marketCap: '1.2T',
        sector: 'Technology'
      },
      {
        symbol: 'AMD',
        name: 'Advanced Micro Devices',
        currentPrice: 145.30,
        change: -1.20,
        changePercent: -0.82,
        relevance: 'Major AI chip supplier. New regulations could impact design and manufacturing processes.',
        marketCap: '240B',
        sector: 'Technology'
      },
      {
        symbol: 'MSFT',
        name: 'Microsoft Corporation',
        currentPrice: 380.25,
        change: 3.10,
        changePercent: 0.82,
        relevance: 'Major AI software and cloud provider. Bill affects Azure AI services and Copilot products.',
        marketCap: '2.8T',
        sector: 'Technology'
      },
      {
        symbol: 'GOOGL',
        name: 'Alphabet Inc.',
        currentPrice: 168.40,
        change: 1.85,
        changePercent: 1.11,
        relevance: 'Google AI services (Gemini, Bard) would need to comply with new transparency requirements.',
        marketCap: '2.1T',
        sector: 'Technology'
      },
      {
        symbol: 'META',
        name: 'Meta Platforms Inc.',
        currentPrice: 485.20,
        change: -2.30,
        changePercent: -0.47,
        relevance: 'AI research and products (Llama models) subject to new accountability frameworks.',
        marketCap: '1.25T',
        sector: 'Technology'
      }
    ],
    // Congressmen supporting the bill
    supportingCongressmen: [
      {
        id: 'P000197',
        name: 'Nancy Pelosi',
        party: 'Democratic',
        role: 'Sponsor',
        chamber: 'House',
        state: 'California',
        image: 'https://www.congress.gov/img/member/p000197_200.jpg',
        tradingActivity: [
          {
            stock: 'NVDA',
            action: 'Purchase',
            date: '2025-08-15',
            amount: '$100,001 - $250,000',
            daysBeforeBill: 31,
            status: 'Suspicious',
            excessReturn: 15.2
          },
          {
            stock: 'MSFT',
            action: 'Purchase',
            date: '2025-09-01',
            amount: '$50,001 - $100,000',
            daysBeforeBill: 14,
            status: 'Suspicious',
            excessReturn: 8.5
          }
        ]
      },
      {
        id: 'D000216',
        name: 'Ro Khanna',
        party: 'Democratic',
        role: 'Cosponsor',
        chamber: 'House',
        state: 'California',
        image: 'https://www.congress.gov/img/member/d000216_200.jpg',
        tradingActivity: [
          {
            stock: 'AMD',
            action: 'Purchase',
            date: '2025-08-20',
            amount: '$15,001 - $50,000',
            daysBeforeBill: 26,
            status: 'Suspicious',
            excessReturn: 12.8
          }
        ]
      },
      {
        id: 'S000148',
        name: 'Chuck Schumer',
        party: 'Democratic',
        role: 'Cosponsor',
        chamber: 'Senate',
        state: 'New York',
        image: 'https://www.congress.gov/img/member/s000148_200.jpg',
        tradingActivity: [
          {
            stock: 'GOOGL',
            action: 'Purchase',
            date: '2025-09-05',
            amount: '$250,001 - $500,000',
            daysBeforeBill: 10,
            status: 'Suspicious',
            excessReturn: 6.3
          }
        ]
      },
      {
        id: 'C001096',
        name: 'Judy Chu',
        party: 'Democratic',
        role: 'Cosponsor',
        chamber: 'House',
        state: 'California',
        image: 'https://www.congress.gov/img/member/c001096_200.jpg',
        tradingActivity: []
      },
      {
        id: 'W000817',
        name: 'Sheldon Whitehouse',
        party: 'Democratic',
        role: 'Cosponsor',
        chamber: 'Senate',
        state: 'Rhode Island',
        image: 'https://www.congress.gov/img/member/w000817_200.jpg',
        tradingActivity: [
          {
            stock: 'NVDA',
            action: 'Purchase',
            date: '2025-08-28',
            amount: '$50,001 - $100,000',
            daysBeforeBill: 18,
            status: 'Suspicious',
            excessReturn: 18.7
          }
        ]
      }
    ],
    activitySummary: {
      totalTrades: 5,
      suspiciousTrades: 5,
      totalVolume: '$465,004 - $1,000,000',
      averageDaysBeforeBill: 19.8,
      averageExcessReturn: 12.3
    }
  },
  'H.R.2456': {
    id: 'H.R.2456',
    title: 'Financial Technology Innovation Act',
    question: 'Will the Financial Technology Innovation Act pass Congress?',
    summary: 'Promotes innovation in financial technology while ensuring consumer protection and regulatory compliance.',
    sponsor: 'Rep. Ro Khanna',
    sponsorId: 'D000216',
    status: 'In Committee',
    date: '2025-08-20',
    committees: ['Financial Services'],
    cosponsors: 32,
    yesPrice: 0.42,
    noPrice: 0.58,
    volume24h: 189000,
    liquidity: 98000,
    marketCap: 645000,
    resolutionDate: '2025-12-31',
    resolutionCriteria: 'This market resolves to YES if the bill is signed into law before the resolution date.',
    billUrl: 'https://www.congress.gov/bill/118th-congress/house-bill/2456',
    aiSummary: 'This act promotes innovation in financial technology by streamlining regulatory processes.',
    affectedStocks: [
      {
        symbol: 'JPM',
        name: 'JPMorgan Chase & Co.',
        currentPrice: 158.90,
        change: 1.25,
        changePercent: 0.79,
        relevance: 'Major fintech innovator. Bill would create regulatory sandbox for testing new products.',
        marketCap: '460B',
        sector: 'Financials'
      },
      {
        symbol: 'BAC',
        name: 'Bank of America Corp',
        currentPrice: 32.45,
        change: -0.15,
        changePercent: -0.46,
        relevance: 'Digital banking leader. New regulations could streamline product launches.',
        marketCap: '260B',
        sector: 'Financials'
      },
      {
        symbol: 'COIN',
        name: 'Coinbase Global Inc.',
        currentPrice: 142.80,
        change: 4.50,
        changePercent: 3.25,
        relevance: 'Cryptocurrency exchange. Bill provides clearer regulatory framework.',
        marketCap: '34B',
        sector: 'Financials'
      }
    ],
    supportingCongressmen: [
      {
        id: 'D000216',
        name: 'Ro Khanna',
        party: 'Democratic',
        role: 'Sponsor',
        chamber: 'House',
        state: 'California',
        image: 'https://www.congress.gov/img/member/d000216_200.jpg',
        tradingActivity: [
          {
            stock: 'COIN',
            action: 'Purchase',
            date: '2025-07-25',
            amount: '$25,001 - $50,000',
            daysBeforeBill: 26,
            status: 'Suspicious',
            excessReturn: 22.4
          }
        ]
      },
      {
        id: 'P000197',
        name: 'Nancy Pelosi',
        party: 'Democratic',
        role: 'Cosponsor',
        chamber: 'House',
        state: 'California',
        image: 'https://www.congress.gov/img/member/p000197_200.jpg',
        tradingActivity: [
          {
            stock: 'JPM',
            action: 'Purchase',
            date: '2025-08-01',
            amount: '$100,001 - $250,000',
            daysBeforeBill: 19,
            status: 'Suspicious',
            excessReturn: 9.8
          }
        ]
      }
    ],
    activitySummary: {
      totalTrades: 2,
      suspiciousTrades: 2,
      totalVolume: '$125,002 - $300,000',
      averageDaysBeforeBill: 22.5,
      averageExcessReturn: 16.1
    }
  }
};

// Default legislation data
export const getLegislationDetails = (billId) => {
  return legislationDetails[billId] || legislationDetails['H.R.1234'];
};

