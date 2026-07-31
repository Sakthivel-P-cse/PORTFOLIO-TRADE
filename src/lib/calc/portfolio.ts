// Canonical portfolio calculations. Mirrors the `portfolio-calculations` skill.
// All inputs are plain numbers (already converted from Decimal at the API boundary).

import type {
  DailyPortfolioCandle,
  PortfolioMetrics,
  SnapshotGranularity,
  TransactionDTO,
  TransactionType,
} from "@/types";

export interface PointInTime {
  date: string; // ISO
  equity: number; // cumulative portfolio value at this point
}

export interface DailyPnlPoint {
  day: string;
  value: number;
}

interface Totals {
  deposits: number;
  withdrawals: number;
  profit: number;
  loss: number;
}

function sumByType(txns: TransactionDTO[]): Totals {
  const t: Totals = { deposits: 0, withdrawals: 0, profit: 0, loss: 0 };
  for (const tx of txns) {
    switch (tx.type) {
      case "DEPOSIT":
        t.deposits += tx.amount;
        break;
      case "WITHDRAWAL":
        t.withdrawals += tx.amount;
        break;
      case "PROFIT":
        t.profit += tx.amount;
        break;
      case "LOSS":
        t.loss += tx.amount;
        break;
    }
  }
  return t;
}

/** Signed delta a transaction applies to portfolio value. */
export function signedDelta(type: TransactionType, amount: number): number {
  switch (type) {
    case "DEPOSIT":
    case "PROFIT":
      return amount;
    case "WITHDRAWAL":
    case "LOSS":
      return -amount;
  }
}

function compareTransactions(a: TransactionDTO, b: TransactionDTO): number {
  const byTransactionTime =
    new Date(a.date).getTime() - new Date(b.date).getTime();
  if (byTransactionTime !== 0) return byTransactionTime;

  const byCreationTime =
    new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime();
  if (byCreationTime !== 0) return byCreationTime;

  return a.id.localeCompare(b.id);
}

/** Current Portfolio Value = Deposits + Profits − Losses − Withdrawals. */
export function currentValue(t: Totals): number {
  return t.deposits + t.profit - t.loss - t.withdrawals;
}

/** Net P&L = Profits − Losses. */
export function netPnl(t: Totals): number {
  return t.profit - t.loss;
}

/** Return % = (Net P&L / Total Deposits) × 100. 0 when no deposits. */
export function returnPct(t: Totals): number {
  if (t.deposits <= 0) return 0;
  return (netPnl(t) / t.deposits) * 100;
}

/** Build the ordered cumulative-equity curve from transactions. */
export function buildEquityCurve(txns: TransactionDTO[]): PointInTime[] {
  const sorted = [...txns].sort(compareTransactions);
  let running = 0;
  return sorted.map((tx) => {
    running += signedDelta(tx.type, tx.amount);
    return { date: tx.date, equity: running };
  });
}

/**
 * Build one hybrid OHLC candle per UTC calendar date. Every same-day
 * transaction becomes an ordered colored segment in the chart renderer.
 */
export function buildDailyPortfolioCandles(
  txns: TransactionDTO[],
): DailyPortfolioCandle[] {
  const sorted = [...txns].sort(compareTransactions);
  const candles: DailyPortfolioCandle[] = [];
  let runningValue = 0;
  let current: DailyPortfolioCandle | null = null;

  for (const tx of sorted) {
    const day = tx.date.slice(0, 10);
    if (!current || current.time !== day) {
      current = {
        time: day,
        open: runningValue,
        high: runningValue,
        low: runningValue,
        close: runningValue,
        segments: [],
        profit: 0,
        loss: 0,
        deposits: 0,
        withdrawals: 0,
      };
      candles.push(current);
    }

    const from = runningValue;
    runningValue += signedDelta(tx.type, tx.amount);
    const to = runningValue;

    current.segments.push({
      transactionId: tx.id,
      type: tx.type,
      from,
      to,
      amount: tx.amount,
    });
    current.high = Math.max(current.high, from, to);
    current.low = Math.min(current.low, from, to);
    current.close = to;

    if (tx.type === "PROFIT") current.profit += tx.amount;
    else if (tx.type === "LOSS") current.loss += tx.amount;
    else if (tx.type === "DEPOSIT") current.deposits += tx.amount;
    else current.withdrawals += tx.amount;
  }

  return candles;
}

/** Aggregate every same-day profit/loss into one net daily value. */
export function buildDailyPnlPoints(txns: TransactionDTO[]): DailyPnlPoint[] {
  const totals = new Map<string, number>();
  for (const tx of txns) {
    if (tx.type !== "PROFIT" && tx.type !== "LOSS") continue;
    const day = tx.date.slice(0, 10);
    const value = tx.type === "PROFIT" ? tx.amount : -tx.amount;
    totals.set(day, (totals.get(day) ?? 0) + value);
  }

  return [...totals]
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([day, value]) => ({ day, value }));
}

/** Maximum drawdown % from an ordered equity curve. */
export function maxDrawdownPct(curve: PointInTime[]): number {
  let peak = -Infinity;
  let maxDd = 0;
  for (const p of curve) {
    if (p.equity > peak) peak = p.equity;
    if (peak > 0) {
      const dd = ((peak - p.equity) / peak) * 100;
      if (dd > maxDd) maxDd = dd;
    }
  }
  return maxDd;
}

function pnlWithin(txns: TransactionDTO[], since: Date): number {
  let pnl = 0;
  for (const tx of txns) {
    if (new Date(tx.date) >= since) {
      if (tx.type === "PROFIT") pnl += tx.amount;
      else if (tx.type === "LOSS") pnl -= tx.amount;
    }
  }
  return pnl;
}

/**
 * Compute the full metrics payload. `now` is injected for testability
 * (avoids Date.now in pure logic).
 */
export function computeMetrics(
  txns: TransactionDTO[],
  now: Date = new Date(),
): PortfolioMetrics {
  const t = sumByType(txns);
  const curve = buildEquityCurve(txns);

  const profits = txns.filter((x) => x.type === "PROFIT");
  const losses = txns.filter((x) => x.type === "LOSS");

  const equities = curve.map((p) => p.equity);
  const peakEquity = equities.length ? Math.max(...equities) : 0;
  const lowestEquity = equities.length ? Math.min(...equities) : 0;

  const avgProfit = profits.length ? t.profit / profits.length : 0;
  const avgLoss = losses.length ? t.loss / losses.length : 0;

  const wins = profits.length;
  const decided = profits.length + losses.length;
  const winRate = decided > 0 ? (wins / decided) * 100 : 0;

  const profitFactor = t.loss > 0 ? t.profit / t.loss : null;
  const maxDd = maxDrawdownPct(curve);
  const net = netPnl(t);
  const recoveryFactor = maxDd > 0 ? net / ((maxDd / 100) * (peakEquity || 1)) : null;
  const riskRewardRatio = avgLoss > 0 ? avgProfit / avgLoss : null;

  const startOfDay = new Date(now);
  startOfDay.setHours(0, 0, 0, 0);
  const startOfWeek = new Date(startOfDay);
  startOfWeek.setDate(startOfWeek.getDate() - startOfWeek.getDay());
  const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);

  return {
    currentValue: currentValue(t),
    netValue: currentValue(t),
    totalDeposits: t.deposits,
    totalWithdrawals: t.withdrawals,
    totalProfit: t.profit,
    totalLoss: t.loss,
    netPnl: net,
    returnPct: returnPct(t),
    dailyPnl: pnlWithin(txns, startOfDay),
    weeklyPnl: pnlWithin(txns, startOfWeek),
    monthlyPnl: pnlWithin(txns, startOfMonth),
    peakEquity,
    lowestEquity,
    maxDrawdownPct: maxDd,
    averageProfit: avgProfit,
    averageLoss: avgLoss,
    winRate,
    profitFactor,
    recoveryFactor,
    riskRewardRatio,
  };
}

// ── Snapshot bucketing ────────────────────────────────

/** Truncate a date to the start of its bucket for a given granularity. */
export function bucketDate(date: Date, granularity: SnapshotGranularity): Date {
  const d = new Date(date);
  d.setUTCHours(0, 0, 0, 0);
  if (granularity === "WEEK") {
    d.setUTCDate(d.getUTCDate() - d.getUTCDay());
  } else if (granularity === "MONTH") {
    d.setUTCDate(1);
  }
  return d;
}

export interface SnapshotRow {
  date: Date;
  granularity: SnapshotGranularity;
  portfolioValue: number;
  equity: number;
  returnPct: number;
  netDeposits: number;
  netPnl: number;
}

/**
 * Derive snapshot rows for one granularity from the full transaction set.
 * Each bucket carries the cumulative portfolio value at the end of that bucket.
 */
export function deriveSnapshots(
  txns: TransactionDTO[],
  granularity: SnapshotGranularity,
): SnapshotRow[] {
  const sorted = [...txns].sort(compareTransactions);

  let cumDeposits = 0;
  let cumWithdrawals = 0;
  let cumProfit = 0;
  let cumLoss = 0;

  const byBucket = new Map<number, SnapshotRow>();

  for (const tx of sorted) {
    if (tx.type === "DEPOSIT") cumDeposits += tx.amount;
    else if (tx.type === "WITHDRAWAL") cumWithdrawals += tx.amount;
    else if (tx.type === "PROFIT") cumProfit += tx.amount;
    else if (tx.type === "LOSS") cumLoss += tx.amount;

    const bucket = bucketDate(new Date(tx.date), granularity);
    const value = cumDeposits + cumProfit - cumLoss - cumWithdrawals;
    const net = cumProfit - cumLoss;
    const ret = cumDeposits > 0 ? (net / cumDeposits) * 100 : 0;

    byBucket.set(bucket.getTime(), {
      date: bucket,
      granularity,
      portfolioValue: value,
      equity: value,
      returnPct: ret,
      netDeposits: cumDeposits - cumWithdrawals,
      netPnl: net,
    });
  }

  return [...byBucket.values()].sort((a, b) => a.date.getTime() - b.date.getTime());
}
