// Audit + undo/redo engine. Source of truth is the AuditLog table, so undo/redo
// survives reloads and works across devices.
import type {
  AuditAction,
  EntityType,
  Prisma,
} from "@prisma/client";
import { prisma } from "@/lib/db/prisma";
import { rebuildSnapshots } from "@/lib/db/snapshots";
import { journalPortfolioEffect } from "@/lib/journal-portfolio";

type Tx = Prisma.TransactionClient;

interface RecordArgs {
  userId: string;
  action: AuditAction;
  entityType: EntityType;
  entityId: string;
  oldData?: Prisma.InputJsonValue | null;
  newData?: Prisma.InputJsonValue | null;
}

/** Write an audit log row. Call inside the same transaction as the mutation. */
export async function recordAudit(tx: Tx, args: RecordArgs) {
  return tx.auditLog.create({
    data: {
      userId: args.userId,
      action: args.action,
      entityType: args.entityType,
      entityId: args.entityId,
      oldData: args.oldData ?? undefined,
      newData: args.newData ?? undefined,
    },
  });
}

// Cast JSON back to a Prisma create/update payload. Stored snapshots are
// already serialized (Decimal→string, Date→ISO); Prisma accepts these.
type JsonRecord = Record<string, unknown>;

function toTransactionData(json: JsonRecord, userId: string) {
  return {
    id: json.id as string,
    userId,
    date: new Date(json.date as string),
    amount: json.amount as string,
    type: json.type as Prisma.TransactionCreateInput["type"],
    reason: (json.reason as string) ?? null,
    notes: (json.notes as string) ?? null,
  };
}

function toJournalData(json: JsonRecord, userId: string): Prisma.JournalEntryUncheckedCreateInput {
  return {
    id: json.id as string,
    userId,
    date: new Date(json.date as string),
    amount: json.amount as number,
    tradeType: json.tradeType as Prisma.JournalEntryUncheckedCreateInput["tradeType"],
    outcome: json.outcome as Prisma.JournalEntryUncheckedCreateInput["outcome"],
    reason: (json.reason as string) ?? null,
    notes: (json.notes as string) ?? null,
    mistakeMade: (json.mistakeMade as string) ?? null,
    lessonLearned: (json.lessonLearned as string) ?? null,
    screenshotUrl: (json.screenshotUrl as string) ?? null,
    tags: json.tags as string[],
    symbol: json.symbol as string,
    company: json.company as string,
    exchange: json.exchange as Prisma.JournalEntryUncheckedCreateInput["exchange"],
    side: json.side as Prisma.JournalEntryUncheckedCreateInput["side"],
    entryPrice: json.entryPrice as number,
    exitPrice: json.exitPrice as number,
    quantity: json.quantity as number,
    status: json.status as Prisma.JournalEntryUncheckedCreateInput["status"],
    createdAt: new Date(json.createdAt as string),
    updatedAt: new Date(json.updatedAt as string),
  };
}

function toJournalUpdateData(data: Prisma.JournalEntryUncheckedCreateInput): Prisma.JournalEntryUncheckedUpdateInput {
  return {
    date: data.date,
    amount: data.amount,
    tradeType: data.tradeType,
    outcome: data.outcome,
    reason: data.reason,
    notes: data.notes,
    mistakeMade: data.mistakeMade,
    lessonLearned: data.lessonLearned,
    screenshotUrl: data.screenshotUrl,
    tags: data.tags,
    symbol: data.symbol,
    company: data.company,
    exchange: data.exchange,
    side: data.side,
    entryPrice: data.entryPrice,
    exitPrice: data.exitPrice,
    quantity: data.quantity,
    status: data.status,
    updatedAt: data.updatedAt,
  };
}

async function syncJournalPortfolioTransaction(
  tx: Tx,
  userId: string,
  journal: {
    id: string;
    date: Date;
    entryPrice: Prisma.Decimal;
    exitPrice: Prisma.Decimal;
    quantity: number;
    side: "LONG" | "SHORT";
    status: "OPEN" | "CLOSED";
    reason: string | null;
    notes: string | null;
  },
) {
  const effect = journalPortfolioEffect({
    entryPrice: journal.entryPrice.toNumber(),
    exitPrice: journal.exitPrice.toNumber(),
    quantity: journal.quantity,
    side: journal.side,
    status: journal.status,
  });
  if (!effect) {
    await tx.transaction.deleteMany({ where: { journalEntryId: journal.id } });
    return;
  }
  await tx.transaction.upsert({
    where: { journalEntryId: journal.id },
    create: {
      userId,
      journalEntryId: journal.id,
      date: journal.date,
      amount: effect.amount,
      type: effect.type,
      reason: journal.reason,
      notes: journal.notes,
    },
    update: {
      date: journal.date,
      amount: effect.amount,
      type: effect.type,
      reason: journal.reason,
      notes: journal.notes,
    },
  });
}

/**
 * Undo the most recent un-undone action for a user.
 * Returns the affected entityType, or null if nothing to undo.
 */
export async function undoLast(userId: string): Promise<EntityType | null> {
  return prisma.$transaction(async (tx) => {
    const last = await tx.auditLog.findFirst({
      where: { userId, undoneAt: null, action: { in: ["CREATE", "UPDATE", "DELETE"] } },
      orderBy: { createdAt: "desc" },
    });
    if (!last) return null;

    await applyInverse(tx, last);

    await tx.auditLog.update({
      where: { id: last.id },
      data: { undoneAt: new Date() },
    });

    if (last.entityType === "TRANSACTION" || last.entityType === "JOURNAL_ENTRY") await rebuildSnapshots(tx, userId);
    return last.entityType;
  });
}

/** Redo the most recently undone action. */
export async function redoLast(userId: string): Promise<EntityType | null> {
  return prisma.$transaction(async (tx) => {
    const last = await tx.auditLog.findFirst({
      where: { userId, undoneAt: { not: null }, action: { in: ["CREATE", "UPDATE", "DELETE"] } },
      orderBy: { undoneAt: "desc" },
    });
    if (!last) return null;

    await applyForward(tx, last);

    await tx.auditLog.update({
      where: { id: last.id },
      data: { undoneAt: null },
    });

    if (last.entityType === "TRANSACTION" || last.entityType === "JOURNAL_ENTRY") await rebuildSnapshots(tx, userId);
    return last.entityType;
  });
}

// Reverse the effect of an action (used by undo).
async function applyInverse(
  tx: Tx,
  log: { userId: string; action: AuditAction; entityType: EntityType; entityId: string; oldData: unknown; newData: unknown },
) {
  if (log.entityType === "TRANSACTION" && log.action === "CREATE") {
    // Inverse of create = delete.
    await tx.transaction.deleteMany({ where: { id: log.entityId } });
  } else if (log.entityType === "TRANSACTION" && log.action === "DELETE") {
    // Inverse of delete = recreate from oldData.
    if (log.oldData) {
      await tx.transaction.create({ data: toTransactionData(log.oldData as JsonRecord, log.userId) });
    }
  } else if (log.entityType === "TRANSACTION" && log.action === "UPDATE") {
    // Inverse of update = restore oldData.
    if (log.oldData) {
      const d = toTransactionData(log.oldData as JsonRecord, log.userId);
      await tx.transaction.update({
        where: { id: log.entityId },
        data: { date: d.date, amount: d.amount, type: d.type, reason: d.reason, notes: d.notes },
      });
    }
  } else if (log.entityType === "JOURNAL_ENTRY" && log.action === "CREATE") {
    await tx.journalEntry.deleteMany({ where: { id: log.entityId } });
  } else if (log.entityType === "JOURNAL_ENTRY" && log.action === "DELETE" && log.oldData) {
    const row = await tx.journalEntry.create({ data: toJournalData(log.oldData as JsonRecord, log.userId) });
    await syncJournalPortfolioTransaction(tx, log.userId, row);
  } else if (log.entityType === "JOURNAL_ENTRY" && log.action === "UPDATE" && log.oldData) {
    const data = toJournalData(log.oldData as JsonRecord, log.userId);
    const row = await tx.journalEntry.update({ where: { id: log.entityId }, data: toJournalUpdateData(data) });
    await syncJournalPortfolioTransaction(tx, log.userId, row);
  }
}

// Re-apply the effect of an action (used by redo).
async function applyForward(
  tx: Tx,
  log: { userId: string; action: AuditAction; entityType: EntityType; entityId: string; oldData: unknown; newData: unknown },
) {
  if (log.entityType === "TRANSACTION" && log.action === "CREATE") {
    if (log.newData) {
      await tx.transaction.create({ data: toTransactionData(log.newData as JsonRecord, log.userId) });
    }
  } else if (log.entityType === "TRANSACTION" && log.action === "DELETE") {
    await tx.transaction.deleteMany({ where: { id: log.entityId } });
  } else if (log.entityType === "TRANSACTION" && log.action === "UPDATE") {
    if (log.newData) {
      const d = toTransactionData(log.newData as JsonRecord, log.userId);
      await tx.transaction.update({
        where: { id: log.entityId },
        data: { date: d.date, amount: d.amount, type: d.type, reason: d.reason, notes: d.notes },
      });
    }
  } else if (log.entityType === "JOURNAL_ENTRY" && log.action === "CREATE" && log.newData) {
    const row = await tx.journalEntry.create({ data: toJournalData(log.newData as JsonRecord, log.userId) });
    await syncJournalPortfolioTransaction(tx, log.userId, row);
  } else if (log.entityType === "JOURNAL_ENTRY" && log.action === "DELETE") {
    await tx.journalEntry.deleteMany({ where: { id: log.entityId } });
  } else if (log.entityType === "JOURNAL_ENTRY" && log.action === "UPDATE" && log.newData) {
    const data = toJournalData(log.newData as JsonRecord, log.userId);
    const row = await tx.journalEntry.update({ where: { id: log.entityId }, data: toJournalUpdateData(data) });
    await syncJournalPortfolioTransaction(tx, log.userId, row);
  }
}

/** Whether undo/redo are currently available for a user (drives button state). */
export async function undoRedoState(userId: string) {
  const [canUndo, canRedo] = await Promise.all([
    prisma.auditLog.count({
      where: { userId, undoneAt: null, action: { in: ["CREATE", "UPDATE", "DELETE"] } },
    }),
    prisma.auditLog.count({
      where: { userId, undoneAt: { not: null }, action: { in: ["CREATE", "UPDATE", "DELETE"] } },
    }),
  ]);
  return { canUndo: canUndo > 0, canRedo: canRedo > 0 };
}
