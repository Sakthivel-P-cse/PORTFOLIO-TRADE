export type IndianStock = {
  name: string;
  ticker: string;
  exchange: "NSE" | "BSE";
  bse?: string;
};

export const INDIAN_STOCKS: IndianStock[] = [
  { name: "Reliance Industries Limited", ticker: "RELIANCE", exchange: "NSE", bse: "500325" },
  { name: "Tata Consultancy Services Limited", ticker: "TCS", exchange: "NSE", bse: "532540" },
  { name: "HDFC Bank Limited", ticker: "HDFCBANK", exchange: "NSE", bse: "500180" },
  { name: "ICICI Bank Limited", ticker: "ICICIBANK", exchange: "NSE", bse: "532174" },
  { name: "Infosys Limited", ticker: "INFY", exchange: "NSE", bse: "500209" },
  { name: "Bharti Airtel Limited", ticker: "BHARTIARTL", exchange: "NSE", bse: "532454" },
  { name: "State Bank of India", ticker: "SBIN", exchange: "NSE", bse: "500112" },
  { name: "Larsen & Toubro Limited", ticker: "LT", exchange: "NSE", bse: "500510" },
  { name: "ITC Limited", ticker: "ITC", exchange: "NSE", bse: "500875" },
  { name: "Bajaj Finance Limited", ticker: "BAJFINANCE", exchange: "NSE", bse: "500034" },
  { name: "Maruti Suzuki India Limited", ticker: "MARUTI", exchange: "NSE", bse: "532500" },
  { name: "Tata Motors Limited", ticker: "TATAMOTORS", exchange: "NSE", bse: "500570" },
];

export function stockFromEntry(reason: string | null, tags: string[]) {
  const tagged = tags.find((tag) => INDIAN_STOCKS.some((stock) => stock.ticker === tag));
  return INDIAN_STOCKS.find((stock) => stock.ticker === tagged) ??
    INDIAN_STOCKS.find((stock) => reason?.startsWith(`${stock.ticker} ·`));
}
