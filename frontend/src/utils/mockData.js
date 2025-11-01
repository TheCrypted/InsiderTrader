// Mock data for development - Based on actual Quiver Quantitative data

export const mockCongressman = {
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
};

export const mockTrades = [
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
];

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

export const mockSectorData = [
  { sector: "Information Technology", count: 70, percentage: 38.3, value: 63000000 },
  { sector: "Financials", count: 28, percentage: 15.3, value: 25000000 },
  { sector: "Communication Services", count: 26, percentage: 14.2, value: 23000000 },
  { sector: "Consumer Discretionary", count: 13, percentage: 7.1, value: 11500000 },
  { sector: "Industrials", count: 3, percentage: 1.6, value: 2800000 },
  { sector: "Other", count: 43, percentage: 23.5, value: 38200000 }
];

