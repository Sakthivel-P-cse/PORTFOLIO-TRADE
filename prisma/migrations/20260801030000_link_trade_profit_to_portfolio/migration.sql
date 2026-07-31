ALTER TABLE "Transaction"
ADD COLUMN "journalEntryId" TEXT;

CREATE UNIQUE INDEX "Transaction_journalEntryId_key"
ON "Transaction"("journalEntryId");

ALTER TABLE "Transaction"
ADD CONSTRAINT "Transaction_journalEntryId_fkey"
FOREIGN KEY ("journalEntryId") REFERENCES "JournalEntry"("id")
ON DELETE CASCADE ON UPDATE CASCADE;

INSERT INTO "Transaction" ("id", "userId", "journalEntryId", "date", "amount", "type", "reason", "notes", "createdAt", "updatedAt")
SELECT
  'journal-' || "id",
  "userId",
  "id",
  "date",
  ABS(("exitPrice" - "entryPrice") * "quantity"),
  CASE
    WHEN (("exitPrice" - "entryPrice") * "quantity" * CASE WHEN "side" = 'LONG' THEN 1 ELSE -1 END) > 0 THEN 'PROFIT'::"TransactionType"
    ELSE 'LOSS'::"TransactionType"
  END,
  "reason",
  "notes",
  "createdAt",
  "updatedAt"
FROM "JournalEntry"
WHERE "status" = 'CLOSED'
  AND ("exitPrice" - "entryPrice") * "quantity" <> 0;
