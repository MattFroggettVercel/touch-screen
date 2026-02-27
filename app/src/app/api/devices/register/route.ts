import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { headers } from "next/headers";
import { db } from "@/lib/db";
import { devices } from "@/lib/db/schema";
import { eq, and, isNull } from "drizzle-orm";

export async function POST(request: Request) {
  const session = await auth.api.getSession({
    headers: await headers(),
  });

  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { code, name } = await request.json();

  if (!code || typeof code !== "string" || code.length !== 10) {
    return NextResponse.json({ error: "Invalid device code" }, { status: 400 });
  }

  if (!name || typeof name !== "string" || name.trim().length === 0) {
    return NextResponse.json(
      { error: "Device name is required" },
      { status: 400 }
    );
  }

  // Check the device exists and is unclaimed
  const [device] = await db
    .select({ code: devices.code, userId: devices.userId })
    .from(devices)
    .where(eq(devices.code, code))
    .limit(1);

  if (!device) {
    return NextResponse.json({ error: "Device not found" }, { status: 404 });
  }

  if (device.userId) {
    return NextResponse.json(
      { error: "This device is already registered" },
      { status: 409 }
    );
  }

  // Claim the device (only if still unclaimed)
  const result = await db
    .update(devices)
    .set({
      userId: session.user.id,
      name: name.trim(),
      registeredAt: new Date(),
    })
    .where(and(eq(devices.code, code), isNull(devices.userId)));

  if (!result) {
    return NextResponse.json(
      { error: "Failed to register device" },
      { status: 500 }
    );
  }

  return NextResponse.json({
    success: true,
    code,
    name: name.trim(),
  });
}
