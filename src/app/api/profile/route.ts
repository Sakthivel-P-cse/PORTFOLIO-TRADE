import { z } from "zod";
import { getUser } from "@/lib/auth";
import { prisma } from "@/lib/db/prisma";
import { createClient } from "@/lib/supabase/server";
import { err, handleError, ok, unauthorized } from "@/lib/api";

const profileSchema = z.object({ name: z.string().trim().min(1).max(100) });

export async function GET() {
  try {
    const user = await getUser();
    if (!user) return unauthorized();
    return ok({ id: user.id, email: user.email, name: user.name, avatarUrl: user.avatarUrl });
  } catch (error) {
    return handleError(error);
  }
}

export async function PATCH(request: Request) {
  try {
    const user = await getUser();
    if (!user) return unauthorized();
    const input = profileSchema.parse(await request.json());
    const supabase = await createClient();
    const { error } = await supabase.auth.updateUser({ data: { full_name: input.name } });
    if (error) return err(error.message, 400);
    const updated = await prisma.user.update({ where: { id: user.id }, data: { name: input.name } });
    return ok({ id: updated.id, email: updated.email, name: updated.name, avatarUrl: updated.avatarUrl });
  } catch (error) {
    if (error instanceof SyntaxError) return err("Invalid JSON body", 400);
    return handleError(error);
  }
}
