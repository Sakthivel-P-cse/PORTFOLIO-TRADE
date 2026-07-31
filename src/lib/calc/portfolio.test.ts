import assert from "node:assert/strict";
import test from "node:test";
import {
  buildDailyPnlPoints,
  buildDailyPortfolioCandles,
  bucketDate,
} from "./portfolio";
import type { TransactionDTO, TransactionType } from "../../types";

function transaction(
  id: string,
  date: string,
  type: TransactionType,
  amount: number,
  createdAt = `${date}T00:00:00.000Z`,
): TransactionDTO {
  return {
    id,
    date: `${date}T00:00:00.000Z`,
    amount,
    type,
    reason: null,
    notes: null,
    createdAt,
    updatedAt: createdAt,
  };
}

test("builds one colored movement segment per same-day action", () => {
  const candles = buildDailyPortfolioCandles([
    transaction("deposit", "2026-07-31", "DEPOSIT", 500, "2026-07-31T01:00:00.000Z"),
    transaction("profit", "2026-07-31", "PROFIT", 200, "2026-07-31T02:00:00.000Z"),
  ]);

  assert.deepEqual(candles, [
    {
      time: "2026-07-31",
      open: 0,
      high: 700,
      low: 0,
      close: 700,
      segments: [
        { transactionId: "deposit", type: "DEPOSIT", from: 0, to: 500, amount: 500 },
        { transactionId: "profit", type: "PROFIT", from: 500, to: 700, amount: 200 },
      ],
      profit: 200,
      loss: 0,
      deposits: 500,
      withdrawals: 0,
    },
  ]);
});

test("preserves reversals, daily OHLC, and continuity", () => {
  const candles = buildDailyPortfolioCandles([
    transaction("deposit", "2026-07-31", "DEPOSIT", 1_000, "2026-07-31T01:00:00.000Z"),
    transaction("loss", "2026-07-31", "LOSS", 300, "2026-07-31T03:00:00.000Z"),
    transaction("profit", "2026-08-01", "PROFIT", 100),
  ]);

  assert.equal(candles[0].open, 0);
  assert.equal(candles[0].high, 1_000);
  assert.equal(candles[0].low, 0);
  assert.equal(candles[0].close, 700);
  assert.deepEqual(candles[0].segments.map((segment) => segment.type), [
    "DEPOSIT",
    "LOSS",
  ]);
  assert.equal(candles[1].open, candles[0].close);
  assert.equal(candles[1].close, 800);
});

test("orders same-day actions by creation time and then id", () => {
  const candles = buildDailyPortfolioCandles([
    transaction("b", "2026-07-31", "PROFIT", 200, "2026-07-31T02:00:00.000Z"),
    transaction("c", "2026-07-31", "LOSS", 50, "2026-07-31T02:00:00.000Z"),
    transaction("a", "2026-07-31", "DEPOSIT", 500, "2026-07-31T01:00:00.000Z"),
  ]);

  assert.deepEqual(
    candles[0].segments.map((segment) => segment.transactionId),
    ["a", "b", "c"],
  );
});

test("uses stable UTC boundaries for snapshot buckets", () => {
  const input = new Date("2026-07-31T00:00:00.000Z");
  assert.equal(bucketDate(input, "DAY").toISOString(), "2026-07-31T00:00:00.000Z");
  assert.equal(bucketDate(input, "WEEK").toISOString(), "2026-07-26T00:00:00.000Z");
  assert.equal(bucketDate(input, "MONTH").toISOString(), "2026-07-01T00:00:00.000Z");
});

test("aggregates every same-day profit and loss without discarding entries", () => {
  const points = buildDailyPnlPoints([
    transaction("profit-1", "2026-07-31", "PROFIT", 200),
    transaction("profit-2", "2026-07-31", "PROFIT", 100),
    transaction("loss", "2026-07-31", "LOSS", 50),
    transaction("deposit", "2026-07-31", "DEPOSIT", 500),
  ]);

  assert.deepEqual(points, [{ day: "2026-07-31", value: 250 }]);
});

test("returns no candles for empty input", () => {
  assert.deepEqual(buildDailyPortfolioCandles([]), []);
});
