import { getUser } from "@/lib/auth";
import { prisma } from "@/lib/db/prisma";
import { ok, unauthorized, handleError } from "@/lib/api";
import { createClient } from "@/lib/supabase/server";

export async function DELETE() {
  try {
    const user = await getUser();
    if (!user) return unauthorized();

    const supabase = await createClient();

    // Run both deletes in a Prisma transaction to ensure atomicity
    await prisma.$transaction(async (tx) => {
      // 1. Delete from public.User (triggers ON DELETE CASCADE for relational tables)
      await tx.user.delete({
        where: { id: user.id },
      });

      // 2. Delete from Supabase auth.users using raw SQL
      await tx.$executeRawUnsafe(
        `DELETE FROM auth.users WHERE id = $1::uuid`,
        user.id
      );
    });

    // Sign out to clear the session cookies on the server
    await supabase.auth.signOut();

    return ok({ success: true });
  } catch (e) {
    return handleError(e);
  }
}
