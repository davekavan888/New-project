export type Stock = {
  id: string
  symbol: string
  name: string
  exchange: string
  sector: string
  price: number
  change: number
  changePercent: number
  volume: number
  marketCap: number
  pe: number
}

export type Index = {
  symbol: string
  name: string
  price: number
  changePercent: number
}

const BASE: Omit<Stock, 'price' | 'change' | 'changePercent' | 'volume' | 'pe'>[] = [
  { id: '1', symbol: 'RELIANCE', name: 'Reliance Industries', exchange: 'NSE', sector: 'Energy', marketCap: 18e12 },
  { id: '2', symbol: 'TCS', name: 'Tata Consultancy Services', exchange: 'NSE', sector: 'Technology', marketCap: 14e12 },
  { id: '3', symbol: 'HDFCBANK', name: 'HDFC Bank', exchange: 'NSE', sector: 'Financials', marketCap: 12e12 },
  { id: '4', symbol: 'INFY', name: 'Infosys', exchange: 'NSE', sector: 'Technology', marketCap: 7.5e12 },
  { id: '5', symbol: 'ICICIBANK', name: 'ICICI Bank', exchange: 'NSE', sector: 'Financials', marketCap: 8.5e12 },
  { id: '6', symbol: 'SBIN', name: 'State Bank of India', exchange: 'NSE', sector: 'Financials', marketCap: 6.5e12 },
  { id: '7', symbol: 'BHARTIARTL', name: 'Bharti Airtel', exchange: 'NSE', sector: 'Telecom', marketCap: 9e12 },
  { id: '8', symbol: 'ITC', name: 'ITC Limited', exchange: 'NSE', sector: 'Consumer', marketCap: 5.5e12 },
  { id: '9', symbol: 'LT', name: 'Larsen & Toubro', exchange: 'NSE', sector: 'Industrials', marketCap: 4.8e12 },
  { id: '10', symbol: 'SUNPHARMA', name: 'Sun Pharmaceutical', exchange: 'NSE', sector: 'Healthcare', marketCap: 4.2e12 },
]

function jitter(base: number, pct = 0.02) {
  return base * (1 + (Math.random() - 0.48) * pct)
}

function makeStock(b: (typeof BASE)[0]): Stock {
  const priceMap: Record<string, number> = {
    RELIANCE: 2850, TCS: 4120, HDFCBANK: 1680, INFY: 1850, ICICIBANK: 1240,
    SBIN: 820, BHARTIARTL: 1560, ITC: 465, LT: 3420, SUNPHARMA: 1780,
  }
  const base = priceMap[b.symbol] || 1000
  const price = Number(jitter(base).toFixed(2))
  const changePercent = Number(((Math.random() - 0.45) * 2.5).toFixed(2))
  const change = Number(((price * changePercent) / 100).toFixed(2))
  return {
    ...b,
    price,
    change,
    changePercent,
    volume: Math.floor(Math.random() * 12_000_000) + 400_000,
    pe: Number((18 + Math.random() * 25).toFixed(1)),
  }
}

export const marketService = {
  getIndices(): Index[] {
    return [
      { symbol: 'NIFTY', name: 'Nifty 50', price: Number(jitter(24150, 0.005).toFixed(2)), changePercent: Number(((Math.random() - 0.4) * 0.8).toFixed(2)) },
      { symbol: 'SENSEX', name: 'Sensex', price: Number(jitter(79520, 0.005).toFixed(2)), changePercent: Number(((Math.random() - 0.4) * 0.8).toFixed(2)) },
      { symbol: 'BANKNIFTY', name: 'Bank Nifty', price: Number(jitter(51240, 0.006).toFixed(2)), changePercent: Number(((Math.random() - 0.45) * 1).toFixed(2)) },
      { symbol: 'INDIAVIX', name: 'India VIX', price: Number(jitter(13.8, 0.02).toFixed(2)), changePercent: Number(((Math.random() - 0.5) * 3).toFixed(2)) },
    ]
  },
  getStocks(): Stock[] {
    return BASE.map(makeStock)
  },
  getStock(symbol: string): Stock | undefined {
    return this.getStocks().find((s) => s.symbol.toUpperCase() === symbol.toUpperCase())
  },
  getNews() {
    return [
      { id: '1', title: 'RBI holds rates; maintains neutral stance', sentiment: 'neutral', source: 'Reuters' },
      { id: '2', title: 'Reliance expands green energy roadmap', sentiment: 'positive', source: 'Economic Times' },
      { id: '3', title: 'IT majors report strong deal pipeline', sentiment: 'positive', source: 'Mint' },
      { id: '4', title: 'FII flows turn net positive this week', sentiment: 'positive', source: 'Bloomberg' },
      { id: '5', title: 'Banking NPAs continue to improve', sentiment: 'positive', source: 'CNBC-TV18' },
      { id: '6', title: 'Crude eases on demand concerns', sentiment: 'neutral', source: 'Reuters' },
    ]
  },
}
