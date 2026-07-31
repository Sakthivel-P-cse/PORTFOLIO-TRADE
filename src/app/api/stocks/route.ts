import { getUser } from "@/lib/auth";
import { ok, unauthorized } from "@/lib/api";
import { INDIAN_STOCKS } from "@/lib/stocks";

export async function GET() {
  const user = await getUser();
  if (!user) return unauthorized();
  return ok(INDIAN_STOCKS);
}
