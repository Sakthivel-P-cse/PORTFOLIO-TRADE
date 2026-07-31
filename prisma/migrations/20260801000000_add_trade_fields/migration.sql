CREATE TYPE "Exchange" AS ENUM ('NSE', 'BSE');
CREATE TYPE "TradeSide" AS ENUM ('LONG', 'SHORT');
CREATE TYPE "TradeStatus" AS ENUM ('OPEN', 'CLOSED');

ALTER TABLE "JournalEntry"
ADD COLUMN "symbol" TEXT NOT NULL DEFAULT 'LEGACY',
ADD COLUMN "company" TEXT NOT NULL DEFAULT 'Legacy journal entry',
ADD COLUMN "exchange" "Exchange" NOT NULL DEFAULT 'NSE',
ADD COLUMN "side" "TradeSide" NOT NULL DEFAULT 'LONG',
ADD COLUMN "entryPrice" DECIMAL(18,2) NOT NULL DEFAULT 0,
ADD COLUMN "exitPrice" DECIMAL(18,2) NOT NULL DEFAULT 0,
ADD COLUMN "quantity" INTEGER NOT NULL DEFAULT 0,
ADD COLUMN "status" "TradeStatus" NOT NULL DEFAULT 'CLOSED';

UPDATE "JournalEntry"
SET
  "symbol" = COALESCE(NULLIF(split_part(COALESCE("reason", ''), ' · ', 1), ''), "tags"[1], 'LEGACY'),
  "company" = COALESCE(NULLIF(split_part(COALESCE("reason", ''), ' · ', 2), ''), 'Legacy journal entry'),
  "exchange" = CASE WHEN 'BSE' = ANY("tags") THEN 'BSE'::"Exchange" ELSE 'NSE'::"Exchange" END,
  "side" = CASE WHEN "tradeType" = 'SHORT' THEN 'SHORT'::"TradeSide" ELSE 'LONG'::"TradeSide" END;

CREATE INDEX "JournalEntry_userId_symbol_idx" ON "JournalEntry"("userId", "symbol");

ALTER TABLE "Settings"
ADD COLUMN "primaryMarket" "Exchange" NOT NULL DEFAULT 'NSE';
