import type { JournalEntryDTO } from "@/types";
import type { JournalEntryInput } from "@/lib/validations/journal";

export type TradeDraft = {
  symbol: string;
  company: string;
  exchange: "NSE" | "BSE";
  side: "LONG" | "SHORT";
  entryPrice: number;
  exitPrice: number;
  quantity: number;
  date: string;
  status: "OPEN" | "CLOSED";
  notes: string;
  screenshotUrl: string;
};

export function tradePnl(trade: Pick<TradeDraft, "entryPrice" | "exitPrice" | "quantity" | "side">) {
  const movement = trade.exitPrice - trade.entryPrice;
  return movement * trade.quantity * (trade.side === "LONG" ? 1 : -1);
}

export function toJournalInput(trade: TradeDraft): JournalEntryInput {
  const pnl = tradePnl(trade);
  return {
    date: new Date(`${trade.date}T12:00:00.000Z`),
    amount: Math.abs(pnl),
    tradeType: trade.side,
    outcome: pnl > 0 ? "PROFIT" : pnl < 0 ? "LOSS" : "BREAKEVEN",
    reason: `${trade.symbol} · ${trade.company} · ${trade.exchange}`,
    notes: trade.notes,
    mistakeMade: "",
    lessonLearned: "",
    screenshotUrl: trade.screenshotUrl,
    tags: [trade.symbol, trade.exchange],
    symbol: trade.symbol,
    company: trade.company,
    exchange: trade.exchange,
    side: trade.side,
    entryPrice: trade.entryPrice,
    exitPrice: trade.exitPrice,
    quantity: trade.quantity,
    status: trade.status,
  };
}

export function fromJournalEntry(entry: JournalEntryDTO): TradeDraft {
  return {
    symbol: entry.symbol,
    company: entry.company,
    exchange: entry.exchange,
    side: entry.side,
    entryPrice: entry.entryPrice,
    exitPrice: entry.exitPrice,
    quantity: entry.quantity,
    date: entry.date.slice(0, 10),
    status: entry.status,
    notes: entry.notes ?? "",
    screenshotUrl: entry.screenshotUrl ?? "",
  };
}
