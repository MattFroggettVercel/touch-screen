import { streamText, tool, stepCountIs, convertToModelMessages } from "ai";
import { gateway } from "@ai-sdk/gateway";
import { z } from "zod";
import { auth } from "@/lib/auth";
import { headers } from "next/headers";
import { db } from "@/lib/db";
import { creditBalances } from "@/lib/db/schema";
import { eq, sql } from "drizzle-orm";
import { SYSTEM_PROMPT } from "@/lib/system-prompt";

export const maxDuration = 60;

const DEV_BYPASS = process.env.NODE_ENV !== "production";

/**
 * POST /api/chat — Real product endpoint.
 *
 * - Requires auth (Better Auth session)
 * - Deducts 1 credit per prompt from credit_balances table
 * - HA entities are discovered by the LLM via readFile("src/lib/ha-catalog.json")
 *   on the device filesystem — not sent in the request body
 * - Tools have NO execute — tool calls stream to client (React Native app)
 * - The companion app's onToolCall executes them against the Pi's REST API
 */
export async function POST(request: Request) {
  if (!DEV_BYPASS) {
    // ---- Auth ----
    const session = await auth.api.getSession({
      headers: await headers(),
    });

    if (!session) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401,
        headers: { "Content-Type": "application/json" },
      });
    }

    // ---- Credit check & deduction ----
    const [balance] = await db
      .select({ balance: creditBalances.balance })
      .from(creditBalances)
      .where(eq(creditBalances.userId, session.user.id))
      .limit(1);

    if (!balance || (balance.balance ?? 0) < 1) {
      return new Response(
        JSON.stringify({
          error: "Insufficient credits",
          credits: balance?.balance ?? 0,
        }),
        {
          status: 402,
          headers: { "Content-Type": "application/json" },
        }
      );
    }

    // Deduct 1 credit
    await db
      .update(creditBalances)
      .set({
        balance: sql`${creditBalances.balance} - 1`,
        updatedAt: new Date(),
      })
      .where(eq(creditBalances.userId, session.user.id));
  }

  // ---- Parse request ----
  const { messages } = await request.json();

  const modelMessages = await convertToModelMessages(messages);

  // ---- Tool schemas (no execute — streamed to client) ----
  const toolSchemas = {
    readFile: {
      description:
        "Read the contents of a file from the project filesystem. Use this to check the current state of files before making changes.",
      inputSchema: z.object({
        path: z
          .string()
          .describe(
            "The file path relative to the project root (e.g. 'src/Dashboard.tsx')"
          ),
      }),
    },
    writeFile: {
      description:
        "Write content to a file in the project filesystem. Vite HMR will automatically pick up changes. Use this to modify Dashboard.tsx or create new component files.",
      inputSchema: z.object({
        path: z
          .string()
          .describe(
            "The file path relative to the project root (e.g. 'src/Dashboard.tsx')"
          ),
        content: z.string().describe("The full file content to write"),
      }),
    },
    listFiles: {
      description:
        "List files and directories in the project. Use this to understand the project structure.",
      inputSchema: z.object({
        path: z
          .string()
          .default("src")
          .describe(
            "The directory path to list (e.g. 'src', 'src/components')"
          ),
      }),
    },
    installPackage: {
      description:
        "Install an npm package in the dashboard project. Use this when you write code that imports a package not yet installed (e.g. a charting library, animation library, or icon set). The package will be added to package.json and available immediately.",
      inputSchema: z.object({
        packageName: z
          .string()
          .describe(
            "The npm package name, optionally with a version (e.g. 'framer-motion', 'react-icons@5.0.0')"
          ),
      }),
    },
    getDevServerErrors: {
      description:
        "Get recent error and warning output from the Vite dev server. Use this to diagnose compilation errors, missing imports, or HMR issues after writing files. Returns an array of recent stderr lines.",
      inputSchema: z.object({}),
    },
  };

  // ---- Stream to client (no execute) ----
  const result = streamText({
    model: gateway("anthropic/claude-sonnet-4"),
    system: SYSTEM_PROMPT,
    messages: modelMessages,
    stopWhen: stepCountIs(10),
    tools: {
      readFile: tool(toolSchemas.readFile),
      writeFile: tool(toolSchemas.writeFile),
      listFiles: tool(toolSchemas.listFiles),
      installPackage: tool(toolSchemas.installPackage),
      getDevServerErrors: tool(toolSchemas.getDevServerErrors),
    },
  });

  return result.toUIMessageStreamResponse();
}
