import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { headers } from "next/headers";
import { db } from "@/lib/db";
import { creditBalances } from "@/lib/db/schema";
import { eq } from "drizzle-orm";

const DEV_BYPASS = process.env.NODE_ENV !== "production";

// GET: Get the current user's credit balance
export async function GET() {
  // Dev bypass: return fake balance so editing can be tested without auth
  if (DEV_BYPASS) {
    return NextResponse.json({ balance: 999 });
  }

  const session = await auth.api.getSession({
    headers: await headers(),
  });

  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const [balance] = await db
    .select({ balance: creditBalances.balance })
    .from(creditBalances)
    .where(eq(creditBalances.userId, session.user.id))
    .limit(1);

  return NextResponse.json({ balance: balance?.balance ?? 0 });
}
