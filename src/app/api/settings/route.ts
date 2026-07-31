import { getUser } from "@/lib/auth";
import { prisma } from "@/lib/db/prisma";
import { settingsSchema } from "@/lib/validations/settings";
import { ok, err, unauthorized, handleError } from "@/lib/api";

export async function GET() {
  try {
    const user = await getUser();
    if (!user) return unauthorized();

    const settings = await prisma.settings.upsert({
      where: { userId: user.id },
      update: {},
      create: { userId: user.id },
    });
    return ok(settings);
  } catch (e) {
    return handleError(e);
  }
}

export async function PATCH(request: Request) {
  try {
    const user = await getUser();
    if (!user) return unauthorized();

    const input = settingsSchema.partial().parse(await request.json());
    const current = await prisma.settings.findUnique({ where: { userId: user.id } });
    const goalMinPct = input.goalMinPct ?? current?.goalMinPct ?? 0;
    const goalTargetPct = input.goalTargetPct ?? current?.goalTargetPct ?? 100;
    if (goalTargetPct <= goalMinPct) {
      return err("Goal target must be greater than the goal minimum", 422);
    }
    const settings = await prisma.settings.upsert({
      where: { userId: user.id },
      update: input,
      create: { userId: user.id, ...input },
    });
    return ok(settings);
  } catch (e) {
    if (e instanceof SyntaxError) return err("Invalid JSON body", 400);
    return handleError(e);
  }
}
