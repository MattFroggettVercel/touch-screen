import { streamText, tool, stepCountIs, convertToModelMessages } from "ai";
import { gateway } from "@ai-sdk/gateway";
import { z } from "zod";
import { auth } from "@/lib/auth";
import { headers } from "next/headers";
import { db } from "@/lib/db";
import { creditBalances, generationLogs } from "@/lib/db/schema";
import { eq, sql } from "drizzle-orm";
import { SYSTEM_PROMPT } from "@/lib/system-prompt";
import { createHash } from "crypto";

export const maxDuration = 60;

const DEV_BYPASS = process.env.NODE_ENV !== "production";

const systemPromptHash = createHash("sha256")
  .update(SYSTEM_PROMPT)
  .digest("hex")
  .slice(0, 16);

function extractLogSummary(messages: any[]) {
  const userMessages = messages.filter((m: any) => m.role === "user");
  const lastUser = userMessages[userMessages.length - 1];
  const userPrompt =
    typeof lastUser?.content === "string"
      ? lastUser.content
      : Array.isArray(lastUser?.content)
        ? lastUser.content
            .filter((p: any) => p.type === "text")
            .map((p: any) => p.text)
            .join(" ")
        : lastUser?.parts
            ?.filter((p: any) => p.type === "text")
            .map((p: any) => p.text)
            .join(" ") ?? "";

  const toolCalls: { tool: string; args: Record<string, string> }[] = [];
  const filesChanged: string[] = [];
  let hadErrors = false;
  let aiResponseExcerpt = "";

  for (const msg of messages) {
    if (msg.role !== "assistant") continue;

    const parts = msg.parts ?? [];
    for (const part of parts) {
      if (part.type === "text" && part.text && !aiResponseExcerpt) {
        aiResponseExcerpt = part.text.slice(0, 500);
      }
      const isToolPart =
        (typeof part.type === "string" && part.type.startsWith("tool-")) ||
        part.type === "dynamic-tool";
      if (!isToolPart) continue;

      const toolName =
        part.type === "dynamic-tool"
          ? part.toolName
          : part.type.replace(/^tool-/, "");
      const input = part.input ?? part.args ?? {};
      const argsSummary: Record<string, string> = {};
      for (const [k, v] of Object.entries(input)) {
        if (k === "content") {
          argsSummary[k] = `<${String(v).length} chars>`;
        } else {
          argsSummary[k] = String(v);
        }
      }
      toolCalls.push({ tool: toolName, args: argsSummary });

      if (toolName === "writeFile" && input.path) {
        filesChanged.push(String(input.path));
      }
      if (toolName === "getDevServerErrors") {
        hadErrors = true;
      }
    }
  }

  return {
    userPrompt: userPrompt.slice(0, 2000),
    toolCalls: JSON.stringify(toolCalls),
    filesChanged: JSON.stringify([...new Set(filesChanged)]),
    aiResponseExcerpt,
    hadErrors,
  };
}

export async function POST(request: Request) {
  if (!DEV_BYPASS) {
    const session = await auth.api.getSession({
      headers: await headers(),
    });

    if (!session) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401,
        headers: { "Content-Type": "application/json" },
      });
    }

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

    await db
      .update(creditBalances)
      .set({
        balance: sql`${creditBalances.balance} - 1`,
        updatedAt: new Date(),
      })
      .where(eq(creditBalances.userId, session.user.id));
  }

  const { messages, conversationId, deviceCode } = await request.json();

  // Fire-and-forget generation log
  if (conversationId) {
    const turnNumber = messages.filter((m: any) => m.role === "user").length;
    const summary = extractLogSummary(messages);
    db.insert(generationLogs)
      .values({
        conversationId,
        deviceCode: deviceCode ?? null,
        turnNumber,
        userPrompt: summary.userPrompt,
        toolCalls: summary.toolCalls,
        filesChanged: summary.filesChanged,
        aiResponseExcerpt: summary.aiResponseExcerpt,
        hadErrors: summary.hadErrors,
        systemPromptHash,
        model: "anthropic/claude-sonnet-4",
      })
      .catch((err) => console.error("Generation log insert failed:", err));
  }

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
