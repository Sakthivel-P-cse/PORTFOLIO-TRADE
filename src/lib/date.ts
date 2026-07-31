/** Preserve stored date-only values and use the browser's local day for new input. */
export function toDateInputValue(iso?: string, now: Date = new Date()): string {
  if (iso) return iso.slice(0, 10);

  const year = now.getFullYear();
  const month = String(now.getMonth() + 1).padStart(2, "0");
  const day = String(now.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}
