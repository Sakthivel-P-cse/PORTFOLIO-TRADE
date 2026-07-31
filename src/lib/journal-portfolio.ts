import type { TradeSide, TradeStatus, TransactionType } from "@/types";

export function journalPortfolioEffect(trade: {
  entryPrice: number;
  exitPrice: number;
  quantity: number;
  side: TradeSide;
  status: TradeStatus;
}): { amount: number; type: TransactionType } | null {
  if (trade.status !== "CLOSED") return null;
  const movement = trade.exitPrice - trade.entryPrice;
  const pnl = movement * trade.quantity * (trade.side === "LONG" ? 1 : -1);
  if (pnl === 0) return null;
  return { amount: Math.abs(pnl), type: pnl > 0 ? "PROFIT" : "LOSS" };
}
