# Daily Hybrid Portfolio Candlestick Chart

## What and why

Add a TradingView-style daily hybrid candlestick chart to Analytics. The candles represent changes in the user's portfolio caused by manually entered transactions, not external market OHLC data. A single candle may contain multiple colored body segments so users can see how profit, loss, deposits, and withdrawals contributed to that day's movement.

## Requirements

- Render one candle for each calendar day that contains at least one transaction.
- Use the running portfolio value to calculate the candle:
  - `open`: portfolio value immediately before the day's first transaction.
  - `high`: highest running value reached while applying that day's transactions.
  - `low`: lowest running value reached while applying that day's transactions.
  - `close`: portfolio value after the day's final transaction.
- Apply transaction deltas using the existing canonical rules: deposits and profits add value; withdrawals and losses subtract value.
- Sort same-day transactions deterministically by transaction date, creation time, then ID.
- Draw every transaction as a colored segment within its day's single candle:
  - Green (`#22C55E`) for profit movement.
  - Red (`#EF4444`) for loss movement.
  - Yellow/gold (`#F5B82E`) for deposit movement.
  - Purple (`#8B5CF6`) for withdrawal movement.
- Each segment starts at the running value left by the previous transaction and ends at the value after applying its own amount. For example, a ₹500 deposit followed by ₹200 profit draws a ₹500 yellow rise followed by a ₹200 green rise in the same candle.
- Draw a thin neutral wick across the day's full low-to-high range and a visible close tick so reversal days remain readable.
- Use a white chart background, light gray grid lines, dark axis labels, and a right-side INR value axis.
- Keep the timeframe fixed at one day. Do not add misleading intraday, weekly, or monthly candle selectors.
- Support mouse-wheel, drag, trackpad, and touch zoom/pan, plus explicit zoom-in, zoom-out, and fit/reset controls.
- Keep the price axis in automatic mode so it refits to the currently visible candles, with small top and bottom margins.
- Show a crosshair and tooltip containing date, open, high, low, close, profit, loss, deposits, withdrawals, and net daily change.
- Show a clear empty state when there are no transactions.
- Add the chart as a full-width panel on Analytics, below Goal Progress and above the existing equity curve. Existing charts remain unchanged.

## Acceptance criteria

- A day containing only a profit produces a green candle segment whose close is above its open.
- A day containing only a loss produces a red candle segment whose close is below its open.
- A day containing only a deposit produces a yellow candle segment.
- A day containing only a withdrawal produces a purple candle segment.
- Multiple transactions on one date produce exactly one candle with correct open, high, low, and close values.
- A ₹500 deposit followed by ₹200 profit produces one candle with a ₹500 yellow segment and a ₹200 green segment.
- A mixed direction day preserves transaction order. Downward red or purple segments begin at the balance produced by the preceding segment.
- Consecutive candles are continuous: the next candle's open equals the previous candle's close.
- Dates with no transactions do not create artificial flat candles.
- Zooming or panning changes the visible date range and the vertical axis automatically refits the visible candles.
- The chart remains usable on desktop and mobile, resizes with its container, and does not cause a hydration error.
- Transaction create, update, delete, undo, redo, import, and import rollback refresh the candle data through the existing React Query invalidation flow.

## Design

Create a pure `buildDailyCandles(transactions)` calculation alongside the existing portfolio calculations. It will group the already serialized transaction DTOs by their ISO calendar date and maintain one running portfolio balance while walking them in deterministic order.

For each day, initialize open, high, low, and close to the balance carried from the prior day. Apply each signed transaction delta in order, recording a segment from the balance before the transaction to the balance after it and updating the high and low. Accumulate separate daily profit, loss, deposit, and withdrawal totals for tooltip details.

Create a client-only `DailyCandlestickChart` using Lightweight Charts 5.2's custom-series API. The native `CandlestickSeries` permits one body color per data item, so it cannot render multiple independently colored movements inside one candle. A custom canvas renderer will draw the daily wick and its ordered colored segments while retaining the library's time scale, crosshair, zoom/pan behavior, screenshots, and price scale. Its `priceValueBuilder` will return the day's low, high, and close so native visible-range autoscaling remains accurate. Reuse the existing chart-shell patterns for resize handling, zoom controls, reset/fit, PNG export, and empty state behavior where practical.

Same-direction segments naturally stack end-to-end. On reversal days, the later downward segment retraces part of the prior upward range (or vice versa). Draw later segments above earlier ones and give each segment a narrow contrasting border; the tooltip lists every total so overlapping movement remains understandable.

The Analytics page already fetches up to 2,000 transactions for its tables and cash-flow chart. Pass that same query result into the new chart so no additional request or database migration is needed. Transaction mutations already invalidate the `transactions` query, which will rebuild the candle series.

## Interfaces and data

Add an internal/shared type shaped like:

```ts
interface DailyPortfolioCandle {
  time: string;
  open: number;
  high: number;
  low: number;
  close: number;
  segments: Array<{
    transactionId: string;
    type: "PROFIT" | "LOSS" | "DEPOSIT" | "WITHDRAWAL";
    from: number;
    to: number;
    amount: number;
  }>;
  profit: number;
  loss: number;
  deposits: number;
  withdrawals: number;
}
```

No API contract, Prisma schema, migration, or persisted snapshot change is required for this version.

## Failure behavior

- Ignore no valid transaction silently; API validation already prevents invalid dates, non-positive transaction amounts, and unknown transaction types.
- If the input is empty, render the chart shell and empty state without calling chart range APIs on missing data.
- If an export cannot obtain a chart screenshot, leave the UI unchanged rather than throwing.
- Ensure tooltips are derived from structured values and React-rendered or safely escaped; transaction reasons and notes must not be inserted as raw HTML.

## Test approach

- Add focused tests for the pure candle builder using profit-only, loss-only, deposit-only, withdrawal-only, same-direction hybrid, reversal hybrid, same-day ordering, multi-day continuity, and empty-input cases.
- Run TypeScript checking and ESLint.
- Verify in a browser that the four colors, white background, grid, crosshair tooltip, resize behavior, wheel/pinch zoom, reset, PNG export, and visible-range autoscaling work.
- Exercise create, edit, delete, undo/redo, import, and rollback to confirm the chart refreshes without a full page reload.

## Risks

- A daily candle is derived from manually entered portfolio events, so it must not be presented as market-price OHLC data. Label the panel “Daily Portfolio Candles” and explain the calculation in a short subtitle or tooltip.
- Same-day inputs usually carry a date rather than an execution time. `createdAt` provides a deterministic sequence, but editing an older transaction's date may not reflect the user's intended intraday order.
- The Analytics transaction query is capped at 2,000 records. Very large accounts could see a truncated historical candle series. A paginated or dedicated candle endpoint can replace the client derivation later if this becomes a real limit.
- Funding can dominate candle size and compress ordinary P&L movement. Visible-range autoscaling mitigates this, while the distinct funding colors make the cause clear.
- A custom series is more code than the library's native candle series. Keep the data builder and canvas renderer separate, test the builder independently, and use Lightweight Charts' supplied coordinate converters rather than maintaining custom zoom or axis math.
- Opposing same-day movements can retrace and partially overlap earlier segments. Drawing in transaction order with borders plus a complete tooltip preserves the final path, but a very busy day will still require the tooltip for exact detail.

## Out of scope

- Live broker or market-data integration.
- Real intraday OHLC timeframes.
- Weekly or monthly candle aggregation.
- Changing or replacing the existing equity, growth, or P&L charts.
- Persisting candle rows in PostgreSQL.
