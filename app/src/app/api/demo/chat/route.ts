import { streamText, tool, stepCountIs, convertToModelMessages } from "ai";
import { gateway } from "@ai-sdk/gateway";
import { z } from "zod";
import { auth } from "@/lib/auth";
import { headers } from "next/headers";
import { SYSTEM_PROMPT } from "@/lib/system-prompt";
import { createDemoSandbox } from "@/lib/demo-sandbox";

export const maxDuration = 120;

async function streamToString(
  stream: NodeJS.ReadableStream
): Promise<string> {
  const chunks: Buffer[] = [];
  for await (const chunk of stream) {
    chunks.push(Buffer.isBuffer(chunk) ? chunk : Buffer.from(chunk));
  }
  return Buffer.concat(chunks).toString("utf-8");
}

/**
 * POST /api/demo/chat — Demo endpoint (marketing).
 *
 * - Requires auth (for email collection) but nothing saved to user account
 * - Uses mock entities from the static system prompt (no dynamic prompt)
 * - Tools HAVE execute (run against ephemeral sandbox)
 * - No credit deduction
 */
export async function POST(request: Request) {
  // ---- Auth (for email collection, nothing saved to account) ----
  const session = await auth.api.getSession({
    headers: await headers(),
  });

  if (!session) {
    return new Response(JSON.stringify({ error: "Unauthorized" }), {
      status: 401,
      headers: { "Content-Type": "application/json" },
    });
  }

  // ---- Parse request ----
  const { messages, sandboxId: existingSandboxId } = await request.json();

  const modelMessages = await convertToModelMessages(messages);

  // ---- Get or create ephemeral sandbox ----
  let sandbox;
  let sandboxId: string;
  try {
    const result = await createDemoSandbox(existingSandboxId);
    sandbox = result.sandbox;
    sandboxId = result.sandboxId;
  } catch {
    return new Response(JSON.stringify({ error: "Failed to start demo" }), {
      status: 500,
      headers: { "Content-Type": "application/json" },
    });
  }

  // ---- Tool schemas with server-side execute ----
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

  const result = streamText({
    model: gateway("anthropic/claude-sonnet-4"),
    system: SYSTEM_PROMPT,
    messages: modelMessages,
    stopWhen: stepCountIs(10),
    tools: {
      readFile: tool({
        ...toolSchemas.readFile,
        execute: async ({ path }) => {
          try {
            const stream = await sandbox.readFile({ path });
            if (!stream) {
              return { success: false, error: `File not found: ${path}` };
            }
            const content = await streamToString(stream);
            return { success: true, content };
          } catch (error) {
            return {
              success: false,
              error: `Failed to read ${path}: ${error}`,
            };
          }
        },
      }),
      writeFile: tool({
        ...toolSchemas.writeFile,
        execute: async ({ path, content }) => {
          try {
            await sandbox.writeFiles([
              { path, content: Buffer.from(content) },
            ]);
            return { success: true, message: `Written to ${path}` };
          } catch (error) {
            return {
              success: false,
              error: `Failed to write ${path}: ${error}`,
            };
          }
        },
      }),
      listFiles: tool({
        ...toolSchemas.listFiles,
        execute: async ({ path }) => {
          try {
            const cmdResult = await sandbox.runCommand("find", [
              path,
              "-type",
              "f",
              "-name",
              "*.tsx",
              "-o",
              "-name",
              "*.ts",
            ]);
            const stdout = await cmdResult.stdout();
            const files = stdout
              .split("\n")
              .filter((f: string) => f.trim());
            return { success: true, files };
          } catch (error) {
            return {
              success: false,
              error: `Failed to list ${path}: ${error}`,
            };
          }
        },
      }),
      installPackage: tool({
        ...toolSchemas.installPackage,
        execute: async ({ packageName }) => {
          try {
            const cmdResult = await sandbox.runCommand("npm", [
              "install",
              packageName,
              "--loglevel",
              "error",
            ]);
            const exitCode = cmdResult.exitCode;
            if (exitCode !== 0) {
              const stderr = await cmdResult.stderr();
              return {
                success: false,
                error: `npm install exited with code ${exitCode}: ${stderr}`,
              };
            }
            return {
              success: true,
              message: `Installed ${packageName}`,
            };
          } catch (error) {
            return {
              success: false,
              error: `Failed to install ${packageName}: ${error}`,
            };
          }
        },
      }),
      getDevServerErrors: tool({
        ...toolSchemas.getDevServerErrors,
        execute: async () => {
          // In the sandbox, Vite runs detached — check if there are recent build errors
          // by looking at stderr from a quick vite build check
          try {
            const cmdResult = await sandbox.runCommand("cat", [
              "/tmp/vite-errors.log",
            ]);
            const stdout = await cmdResult.stdout();
            const errors = stdout
              .split("\n")
              .filter((l: string) => l.trim());
            return { success: true, errors, count: errors.length };
          } catch {
            return { success: true, errors: [], count: 0 };
          }
        },
      }),
    },
  });

  // Include sandboxId in a custom header so the client can pass it back
  const response = result.toUIMessageStreamResponse();
  response.headers.set("x-sandbox-id", sandboxId);
  return response;
}
