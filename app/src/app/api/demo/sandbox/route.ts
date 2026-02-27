import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { headers } from "next/headers";
import { createDemoSandbox } from "@/lib/demo-sandbox";

export const maxDuration = 120;

/**
 * GET /api/demo/sandbox — Create or reconnect to a demo sandbox.
 *
 * Returns the sandbox preview URL and sandboxId.
 * Requires auth (for email collection) but nothing saved to user account.
 */
export async function GET(request: Request) {
  const session = await auth.api.getSession({
    headers: await headers(),
  });

  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const url = new URL(request.url);
  const existingSandboxId = url.searchParams.get("sandboxId") ?? undefined;

  try {
    const { sandboxId, url: sandboxUrl } =
      await createDemoSandbox(existingSandboxId);
    return NextResponse.json({ sandboxId, url: sandboxUrl });
  } catch (error) {
    console.error("Demo sandbox error:", error);
    return NextResponse.json(
      { error: "Failed to start demo environment" },
      { status: 500 }
    );
  }
}
