import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { headers } from "next/headers";
import { db } from "@/lib/db";
import { devices } from "@/lib/db/schema";
import { eq } from "drizzle-orm";

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ code: string }> }
) {
  const { code } = await params;

  const session = await auth.api.getSession({
    headers: await headers(),
  });

  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const [device] = await db
    .select({
      code: devices.code,
      userId: devices.userId,
      name: devices.name,
      registeredAt: devices.registeredAt,
    })
    .from(devices)
    .where(eq(devices.code, code))
    .limit(1);

  if (!device) {
    return NextResponse.json(
      { error: "Device not found", valid: false },
      { status: 404 }
    );
  }

  if (device.userId && device.userId !== session.user.id) {
    return NextResponse.json(
      {
        error: "This device is already registered to another account",
        valid: false,
        claimed: true,
      },
      { status: 409 }
    );
  }

  if (device.userId === session.user.id) {
    return NextResponse.json({
      valid: true,
      claimed: true,
      ownedByMe: true,
      name: device.name,
    });
  }

  return NextResponse.json({ valid: true, claimed: false });
}
