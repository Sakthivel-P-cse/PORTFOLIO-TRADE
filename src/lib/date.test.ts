import assert from "node:assert/strict";
import test from "node:test";
import { toDateInputValue } from "./date";

test("preserves the stored calendar date", () => {
  assert.equal(toDateInputValue("2026-07-31T00:00:00.000Z"), "2026-07-31");
});

test("formats a new date from local calendar components", () => {
  const local = new Date(2026, 6, 31, 0, 15);
  assert.equal(toDateInputValue(undefined, local), "2026-07-31");
});
