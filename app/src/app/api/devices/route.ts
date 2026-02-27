import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { headers } from "next/headers";
import { db } from "@/lib/db";
import { devices } from "@/lib/db/schema";
import { eq } from "drizzle-orm";

// GET: List all devices belonging to the current user
export async function GET() {
  const session = await auth.api.getSession({
    headers: await headers(),
  });

  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const userDevices = await db
    .select({
      code: devices.code,
      name: devices.name,
      registeredAt: devices.registeredAt,
    })
    .from(devices)
    .where(eq(devices.userId, session.user.id));

  return NextResponse.json({ devices: userDevices });
}
