/**
 * IPO desk — educational calendar-style data.
 * GMP is NOT treated as official. Prefer NSE/SEBI links.
 */

export type IpoStatus = 'open' | 'upcoming' | 'closed' | 'listed'

export type IpoItem = {
  id: string
  name: string
  symbolHint: string
  status: IpoStatus
  type: 'Mainboard' | 'SME'
  priceBand: string
  lotSize: number | null
  openDate: string
  closeDate: string
  listingDate: string
  issueSize: string
  exchange: string
  gmpNote: string
  strengths: string[]
  risks: string[]
  nseLink?: string
  sebiLink?: string
}

/** Curated template rows — replace dates when you refresh from NSE; labeled as desk notes */
export const IPO_DESK: IpoItem[] = [
  {
    id: 'sample-main-1',
    name: 'Example Mainboard IPO A',
    symbolHint: '—',
    status: 'upcoming',
    type: 'Mainboard',
    priceBand: '₹XX – ₹YY',
    lotSize: 50,
    openDate: 'Update from NSE',
    closeDate: 'Update from NSE',
    listingDate: 'TBA',
    issueSize: 'Update from RHP',
    exchange: 'NSE / BSE',
    gmpNote: 'Any GMP on social/apps is unofficial rumour — not used as a target.',
    strengths: ['Read RHP business overview', 'Check promoter & peer multiples yourself'],
    risks: ['New issue volatility', 'Grey market premium is not a guarantee'],
    nseLink: 'https://www.nseindia.com/market-data/all-upcoming-issues-ipo',
    sebiLink: 'https://www.sebi.gov.in/',
  },
  {
    id: 'sample-sme-1',
    name: 'Example SME IPO B',
    symbolHint: '—',
    status: 'open',
    type: 'SME',
    priceBand: '₹XX – ₹YY',
    lotSize: 100,
    openDate: 'Update from exchange',
    closeDate: 'Update from exchange',
    listingDate: 'TBA',
    issueSize: 'SME size — check prospectus',
    exchange: 'NSE SME / BSE SME',
    gmpNote: 'SME listings can gap hard both ways. GMP chatter is unreliable.',
    strengths: ['Smaller float can move fast', 'Verify financials in RHP'],
    risks: ['Liquidity risk after listing', 'Higher information asymmetry'],
    nseLink: 'https://www.nseindia.com/market-data/all-upcoming-issues-ipo',
  },
  {
    id: 'sample-closed-1',
    name: 'Example Recently Closed IPO C',
    symbolHint: '—',
    status: 'closed',
    type: 'Mainboard',
    priceBand: '₹XX – ₹YY',
    lotSize: 40,
    openDate: 'Past',
    closeDate: 'Past',
    listingDate: 'Check exchange',
    issueSize: 'See RHP',
    exchange: 'NSE / BSE',
    gmpNote: 'Post-close: wait for allotment / listing data from registrar & exchange.',
    strengths: ['Allotment process is exchange/registrar driven'],
    risks: ['Listing day can diverge from any pre-list chatter'],
    nseLink: 'https://www.nseindia.com/market-data/all-upcoming-issues-ipo',
  },
]

export function statusStyle(s: IpoStatus) {
  if (s === 'open') return 'bg-[rgba(45,143,111,0.15)] text-[#1a5c47] border-[rgba(45,143,111,0.35)]'
  if (s === 'upcoming') return 'bg-[rgba(26,95,158,0.12)] text-[#1a5f9e] border-[rgba(26,95,158,0.3)]'
  if (s === 'listed') return 'bg-[rgba(201,162,39,0.15)] text-[#6b5344] border-[rgba(201,162,39,0.4)]'
  return 'bg-[rgba(15,40,80,0.06)] text-[#5a6b82] border-[rgba(15,40,80,0.12)]'
}
