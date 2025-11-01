// Mock data for development - Based on actual Quiver Quantitative data

export const mockCongressmen = {
  P000197: {
    id: "P000197",
    name: "Nancy Pelosi",
    party: "Democratic",
    chamber: "House",
    state: "California",
    image: "https://www.congress.gov/img/member/p000197_200.jpg",
    netWorth: "$282.00M",
    tradeVolume: "$164.39M",
    totalTrades: 183,
    lastTraded: "Oct 22, 2025",
    age: 84,
    yearsActive: "1987 - Present",
    isCurrentMember: true
  },
  G000596: {
    id: "G000596",
    name: "Marjorie Taylor Greene",
    party: "Republican",
    chamber: "House",
    state: "Georgia",
    image: "https://www.congress.gov/img/member/g000596_200.jpg",
    netWorth: "$45.2M",
    tradeVolume: "$28.5M",
    totalTrades: 106,
    lastTraded: "Sep 15, 2025",
    age: 50,
    yearsActive: "2021 - Present",
    isCurrentMember: true
  },
  V000137: {
    id: "V000137",
    name: "J.D. Vance",
    party: "Republican",
    chamber: "Senate",
    state: "Ohio",
    image: "https://www.congress.gov/img/member/v000137_200.jpg",
    netWorth: "$12.8M",
    tradeVolume: "$35.2M",
    totalTrades: 108,
    lastTraded: "Aug 30, 2025",
    age: 40,
    yearsActive: "2023 - Present",
    isCurrentMember: true
  },
  D000216: {
    id: "D000216",
    name: "Ro Khanna",
    party: "Democratic",
    chamber: "House",
    state: "California",
    image: "https://www.congress.gov/img/member/d000216_200.jpg",
    netWorth: "$8.5M",
    tradeVolume: "$92.4M",
    totalTrades: 145,
    lastTraded: "Oct 10, 2025",
    age: 48,
    yearsActive: "2017 - Present",
    isCurrentMember: true
  }
};

// Default to Nancy Pelosi for backward compatibility
export const mockCongressman = mockCongressmen.P000197;

export const mockTradesByCongressman = {
  P000197: [
    {
      id: 1,
      stock: "AAPL",
      company: "APPLE INC. - COMMON STOCK",
      assetType: "Stock",
      transaction: "Sale",
      filed: "2025-10-24",
      traded: "2025-10-22",
      description: "CONTRIBUTION OF 382 SHARES HEL...",
      excessReturn: 2.48,
      amount: "$100,001 - $250,000"
    },
  {
    id: 2,
    stock: "AVGO",
    company: "BROADCOM INC. - COMMON STOCK",
    assetType: "Stock",
    transaction: "Purchase",
    filed: "2025-07-09",
    traded: "2025-06-20",
    description: "EXERCISED 200 CALL OPTIONS PUR...",
    excessReturn: 33.38,
    amount: "$1,000,001 - $5,000,000"
  },
  {
    id: 3,
    stock: "-",
    company: "MATTHEWS INTERNATIONAL MUTUAL FUND",
    assetType: "Other",
    transaction: "Sale",
    filed: "2025-07-09",
    traded: "2025-06-20",
    description: "SALE OF 2,822 UNITS....",
    excessReturn: null,
    amount: "$15,001 - $50,000"
  },
  {
    id: 4,
    stock: "AMZN",
    company: "AMAZON.COM, INC. - COMMON STOCK",
    assetType: "Options",
    transaction: "Purchase",
    filed: "2025-01-17",
    traded: "2025-01-14",
    description: "PURCHASED 50 CALL OPTIONS WITH...",
    excessReturn: -5.00,
    amount: "$250,001 - $500,000"
  },
  {
    id: 5,
    stock: "GOOGL",
    company: "ALPHABET INC. - CLASS A COMMON STOCK",
    assetType: "Options",
    transaction: "Purchase",
    filed: "2025-01-17",
    traded: "2025-01-14",
    description: "PURCHASED 50 CALL OPTIONS WITH...",
    excessReturn: 31.11,
    amount: "$250,001 - $500,000"
  },
  {
    id: 6,
    stock: "NVDA",
    company: "NVIDIA CORPORATION - COMMON STOCK",
    assetType: "Options",
    transaction: "Purchase",
    filed: "2025-01-17",
    traded: "2025-01-14",
    description: "PURCHASED 50 CALL OPTIONS WITH...",
    excessReturn: 36.53,
    amount: "$250,001 - $500,000"
  },
  {
    id: 7,
    stock: "TEM",
    company: "TEMPUS AI, INC. - CLASS A COMMON STOCK",
    assetType: "Options",
    transaction: "Purchase",
    filed: "2025-01-17",
    traded: "2025-01-14",
    description: "PURCHASED 50 CALL OPTIONS WITH...",
    excessReturn: 165.13,
    amount: "$50,001 - $100,000"
  },
  {
    id: 8,
    stock: "VST",
    company: "VISTRA CORP. COMMON STOCK",
    assetType: "Options",
    transaction: "Purchase",
    filed: "2025-01-17",
    traded: "2025-01-14",
    description: "PURCHASED 50 CALL OPTIONS WITH...",
    excessReturn: -6.71,
    amount: "$500,001 - $1,000,000"
  },
  {
    id: 9,
    stock: "AAPL",
    company: "APPLE INC. - COMMON STOCK",
    assetType: "Stock",
    transaction: "Sale",
    filed: "2025-01-17",
    traded: "2024-12-31",
    description: "SOLD 31,600 SHARES....",
    excessReturn: -8.41,
    amount: "$5,000,001 - $25,000,000"
  },
  {
    id: 10,
    stock: "NVDA",
    company: "NVIDIA CORPORATION - COMMON STOCK",
    assetType: "Stock",
    transaction: "Sale",
    filed: "2025-01-17",
    traded: "2024-12-31",
    description: "SOLD 10,000 SHARES....",
    excessReturn: 34.41,
    amount: "$1,000,001 - $5,000,000"
  },
  {
    id: 11,
    stock: "NVDA",
    company: "NVIDIA CORPORATION - COMMON STOCK",
    assetType: "Stock",
    transaction: "Purchase",
    filed: "2025-01-17",
    traded: "2024-12-20",
    description: "EXERCISED 500 CALL OPTIONS PUR...",
    excessReturn: 35.28,
    amount: "$500,001 - $1,000,000"
  },
  {
    id: 12,
    stock: "PANW",
    company: "PALO ALTO NETWORKS, INC.",
    assetType: "Stock",
    transaction: "Purchase",
    filed: "2025-01-17",
    traded: "2024-12-20",
    description: "EXERCISED 140 CALL OPTIONS PUR...",
    excessReturn: 2.87,
    amount: "$1,000,001 - $5,000,000"
    }
  ],
  G000596: [
    {
      id: 1,
      stock: "XOM",
      company: "EXXON MOBIL CORPORATION - COMMON STOCK",
      assetType: "Stock",
      transaction: "Purchase",
      filed: "2025-09-20",
      traded: "2025-09-15",
      description: "PURCHASED 1,200 SHARES...",
      excessReturn: 8.32,
      amount: "$100,001 - $250,000"
    },
    {
      id: 2,
      stock: "CVX",
      company: "CHEVRON CORPORATION - COMMON STOCK",
      assetType: "Stock",
      transaction: "Purchase",
      filed: "2025-08-15",
      traded: "2025-08-10",
      description: "PURCHASED 800 SHARES...",
      excessReturn: 5.14,
      amount: "$50,001 - $100,000"
    },
    {
      id: 3,
      stock: "JPM",
      company: "JPMORGAN CHASE & CO. - COMMON STOCK",
      assetType: "Stock",
      transaction: "Sale",
      filed: "2025-07-22",
      traded: "2025-07-18",
      description: "SOLD 500 SHARES...",
      excessReturn: -2.18,
      amount: "$50,001 - $100,000"
    },
    {
      id: 4,
      stock: "CAT",
      company: "CATERPILLAR INC. - COMMON STOCK",
      assetType: "Stock",
      transaction: "Purchase",
      filed: "2025-06-30",
      traded: "2025-06-25",
      description: "PURCHASED 300 SHARES...",
      excessReturn: 12.45,
      amount: "$250,001 - $500,000"
    },
    {
      id: 5,
      stock: "BA",
      company: "THE BOEING COMPANY - COMMON STOCK",
      assetType: "Stock",
      transaction: "Purchase",
      filed: "2025-05-18",
      traded: "2025-05-12",
      description: "PURCHASED 400 SHARES...",
      excessReturn: -5.67,
      amount: "$100,001 - $250,000"
    }
  ],
  V000137: [
    {
      id: 1,
      stock: "MSFT",
      company: "MICROSOFT CORPORATION - COMMON STOCK",
      assetType: "Stock",
      transaction: "Purchase",
      filed: "2025-09-05",
      traded: "2025-08-30",
      description: "PURCHASED 200 SHARES...",
      excessReturn: 6.89,
      amount: "$50,001 - $100,000"
    },
    {
      id: 2,
      stock: "JNJ",
      company: "JOHNSON & JOHNSON - COMMON STOCK",
      assetType: "Stock",
      transaction: "Purchase",
      filed: "2025-08-20",
      traded: "2025-08-15",
      description: "PURCHASED 300 SHARES...",
      excessReturn: 3.21,
      amount: "$50,001 - $100,000"
    },
    {
      id: 3,
      stock: "GS",
      company: "THE GOLDMAN SACHS GROUP, INC. - COMMON STOCK",
      assetType: "Stock",
      transaction: "Sale",
      filed: "2025-07-28",
      traded: "2025-07-22",
      description: "SOLD 100 SHARES...",
      excessReturn: 15.43,
      amount: "$50,001 - $100,000"
    },
    {
      id: 4,
      stock: "TSLA",
      company: "TESLA, INC. - COMMON STOCK",
      assetType: "Stock",
      transaction: "Purchase",
      filed: "2025-06-15",
      traded: "2025-06-10",
      description: "PURCHASED 500 SHARES...",
      excessReturn: -8.92,
      amount: "$100,001 - $250,000"
    },
    {
      id: 5,
      stock: "HON",
      company: "HONEYWELL INTERNATIONAL INC. - COMMON STOCK",
      assetType: "Stock",
      transaction: "Purchase",
      filed: "2025-05-10",
      traded: "2025-05-05",
      description: "PURCHASED 250 SHARES...",
      excessReturn: 4.56,
      amount: "$50,001 - $100,000"
    }
  ],
  D000216: [
    {
      id: 1,
      stock: "GOOGL",
      company: "ALPHABET INC. - CLASS A COMMON STOCK",
      assetType: "Stock",
      transaction: "Purchase",
      filed: "2025-10-15",
      traded: "2025-10-10",
      description: "PURCHASED 150 SHARES...",
      excessReturn: 31.11,
      amount: "$15,001 - $50,000"
    },
    {
      id: 2,
      stock: "META",
      company: "META PLATFORMS, INC. - CLASS A COMMON STOCK",
      assetType: "Stock",
      transaction: "Purchase",
      filed: "2025-09-28",
      traded: "2025-09-22",
      description: "PURCHASED 200 SHARES...",
      excessReturn: 22.34,
      amount: "$50,001 - $100,000"
    },
    {
      id: 3,
      stock: "AMD",
      company: "ADVANCED MICRO DEVICES, INC. - COMMON STOCK",
      assetType: "Stock",
      transaction: "Purchase",
      filed: "2025-08-30",
      traded: "2025-08-25",
      description: "PURCHASED 400 SHARES...",
      excessReturn: 45.67,
      amount: "$50,001 - $100,000"
    },
    {
      id: 4,
      stock: "AMZN",
      company: "AMAZON.COM, INC. - COMMON STOCK",
      assetType: "Stock",
      transaction: "Sale",
      filed: "2025-07-20",
      traded: "2025-07-15",
      description: "SOLD 100 SHARES...",
      excessReturn: 18.92,
      amount: "$15,001 - $50,000"
    },
    {
      id: 5,
      stock: "NFLX",
      company: "NETFLIX, INC. - COMMON STOCK",
      assetType: "Stock",
      transaction: "Purchase",
      filed: "2025-06-25",
      traded: "2025-06-20",
      description: "PURCHASED 250 SHARES...",
      excessReturn: 12.45,
      amount: "$50,001 - $100,000"
    }
  ]
};

// Default to Nancy Pelosi trades for backward compatibility
export const mockTrades = mockTradesByCongressman.P000197;

export const mockVolumeByYear = [
  { year: 2014, buy: 8000000, sell: 5000000 },
  { year: 2015, buy: 12000000, sell: 8000000 },
  { year: 2016, buy: 15000000, sell: 10000000 },
  { year: 2017, buy: 18000000, sell: 12000000 },
  { year: 2018, buy: 20000000, sell: 15000000 },
  { year: 2019, buy: 22000000, sell: 16000000 },
  { year: 2020, buy: 25000000, sell: 18000000 },
  { year: 2021, buy: 32000000, sell: 21000000 },
  { year: 2022, buy: 41000000, sell: 29000000 },
  { year: 2023, buy: 38000000, sell: 22000000 },
  { year: 2024, buy: 28000000, sell: 15000000 },
  { year: 2025, buy: 12000000, sell: 8000000 }
];

export const mockSectorData = {
  P000197: [ // Nancy Pelosi
    { sector: "Information Technology", count: 70, percentage: 38.3, value: 63000000 },
    { sector: "Financials", count: 28, percentage: 15.3, value: 25000000 },
    { sector: "Communication Services", count: 26, percentage: 14.2, value: 23000000 },
    { sector: "Consumer Discretionary", count: 13, percentage: 7.1, value: 11500000 },
    { sector: "Industrials", count: 3, percentage: 1.6, value: 2800000 },
    { sector: "Other", count: 43, percentage: 23.5, value: 38200000 }
  ],
  G000596: [ // Marjorie Taylor Greene
    { sector: "Energy", count: 45, percentage: 42.5, value: 18000000 },
    { sector: "Financials", count: 22, percentage: 20.8, value: 8800000 },
    { sector: "Industrials", count: 18, percentage: 17.0, value: 7200000 },
    { sector: "Information Technology", count: 12, percentage: 11.3, value: 4800000 },
    { sector: "Consumer Discretionary", count: 9, percentage: 8.5, value: 3600000 }
  ],
  V000137: [ // J.D. Vance
    { sector: "Technology", count: 38, percentage: 35.2, value: 15200000 },
    { sector: "Financials", count: 28, percentage: 25.9, value: 11200000 },
    { sector: "Healthcare", count: 22, percentage: 20.4, value: 8800000 },
    { sector: "Industrials", count: 12, percentage: 11.1, value: 4800000 },
    { sector: "Energy", count: 8, percentage: 7.4, value: 3200000 }
  ],
  D000216: [ // Ro Khanna
    { sector: "Information Technology", count: 52, percentage: 48.1, value: 20800000 },
    { sector: "Communication Services", count: 28, percentage: 25.9, value: 11200000 },
    { sector: "Consumer Discretionary", count: 15, percentage: 13.9, value: 6000000 },
    { sector: "Financials", count: 8, percentage: 7.4, value: 3200000 },
    { sector: "Healthcare", count: 5, percentage: 4.6, value: 2000000 }
  ]
};

export const mockVolumeByYearByCongressman = {
  P000197: [
    { year: 2014, buy: 8000000, sell: 5000000 },
    { year: 2015, buy: 12000000, sell: 8000000 },
    { year: 2016, buy: 15000000, sell: 10000000 },
    { year: 2017, buy: 18000000, sell: 12000000 },
    { year: 2018, buy: 20000000, sell: 15000000 },
    { year: 2019, buy: 22000000, sell: 16000000 },
    { year: 2020, buy: 25000000, sell: 18000000 },
    { year: 2021, buy: 32000000, sell: 21000000 },
    { year: 2022, buy: 41000000, sell: 29000000 },
    { year: 2023, buy: 38000000, sell: 22000000 },
    { year: 2024, buy: 28000000, sell: 15000000 },
    { year: 2025, buy: 12000000, sell: 8000000 }
  ],
  G000596: [
    { year: 2021, buy: 3500000, sell: 2000000 },
    { year: 2022, buy: 5200000, sell: 3100000 },
    { year: 2023, buy: 6800000, sell: 4200000 },
    { year: 2024, buy: 8500000, sell: 5500000 },
    { year: 2025, buy: 3200000, sell: 1800000 }
  ],
  V000137: [
    { year: 2023, buy: 12000000, sell: 7000000 },
    { year: 2024, buy: 18000000, sell: 10000000 },
    { year: 2025, buy: 9500000, sell: 5500000 }
  ],
  D000216: [
    { year: 2017, buy: 6000000, sell: 3500000 },
    { year: 2018, buy: 8500000, sell: 5000000 },
    { year: 2019, buy: 11000000, sell: 6800000 },
    { year: 2020, buy: 14000000, sell: 8500000 },
    { year: 2021, buy: 18000000, sell: 11000000 },
    { year: 2022, buy: 22000000, sell: 13000000 },
    { year: 2023, buy: 25000000, sell: 15000000 },
    { year: 2024, buy: 19000000, sell: 11000000 },
    { year: 2025, buy: 8500000, sell: 4800000 }
  ]
};

