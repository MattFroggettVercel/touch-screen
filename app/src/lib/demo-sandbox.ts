import { Sandbox } from "@vercel/sandbox";
import ms from "ms";
import { templateFiles } from "./templates";

/**
 * In-memory cache of live demo sandbox instances.
 * Keyed by sandboxId. Ephemeral — survives HMR but not server restarts.
 * No DB persistence. Auto-expires via Vercel Sandbox timeout.
 */
const globalForSandboxes = globalThis as unknown as {
  __demoSandboxes?: Map<string, { sandbox: Sandbox; url: string }>;
};

const cache = (globalForSandboxes.__demoSandboxes ??= new Map<
  string,
  { sandbox: Sandbox; url: string }
>());

/**
 * Health-check a sandbox by running a trivial command.
 */
async function isAlive(sandbox: Sandbox): Promise<boolean> {
  try {
    const check = await sandbox.runCommand("echo", ["ok"]);
    return check.exitCode === 0;
  } catch {
    return false;
  }
}

/**
 * Create or retrieve an ephemeral demo sandbox.
 *
 * - If an existingSandboxId is provided, tries to reconnect to it
 * - Otherwise creates a new one
 * - 15-minute timeout, auto-cleanup
 * - No DB persistence, no user account association
 * - Session-scoped: the client stores the sandboxId and passes it back
 */
export async function createDemoSandbox(
  existingSandboxId?: string
): Promise<{ sandbox: Sandbox; sandboxId: string; url: string }> {
  // Try to reconnect to existing sandbox
  if (existingSandboxId) {
    // Check in-memory cache first
    const cached = cache.get(existingSandboxId);
    if (cached && (await isAlive(cached.sandbox))) {
      return {
        sandbox: cached.sandbox,
        sandboxId: existingSandboxId,
        url: cached.url,
      };
    }

    // Try reconnecting via Vercel API
    try {
      const sandbox = await Sandbox.get({ sandboxId: existingSandboxId });
      if (await isAlive(sandbox)) {
        const url = sandbox.domain(5173);
        cache.set(existingSandboxId, { sandbox, url });
        return { sandbox, sandboxId: existingSandboxId, url };
      }
    } catch {
      // Sandbox expired or dead — create a new one
      cache.delete(existingSandboxId);
    }
  }

  // Create a brand new ephemeral sandbox
  console.log("Creating new demo sandbox...");
  const sandbox = await Sandbox.create({
    timeout: ms("15m"),
    ports: [5173],
    runtime: "node22",
  });

  // Write template files (uses static mock data for demo preview)
  const filesToWrite = templateFiles.map((f) => ({
    path: f.path,
    content: Buffer.from(f.content),
  }));

  await sandbox.writeFiles(filesToWrite);

  // Install dependencies
  const install = await sandbox.runCommand("npm", [
    "install",
    "--loglevel",
    "error",
  ]);
  if (install.exitCode !== 0) {
    throw new Error("Failed to install dependencies in demo sandbox");
  }

  // Start Vite dev server
  await sandbox.runCommand({
    cmd: "npm",
    args: ["run", "dev"],
    detached: true,
  });

  // Wait for Vite to be ready
  await new Promise((resolve) => setTimeout(resolve, 3000));

  // Verify the sandbox is alive
  if (!(await isAlive(sandbox))) {
    throw new Error("Demo sandbox failed health check");
  }

  const url = sandbox.domain(5173);
  const sandboxId = sandbox.sandboxId;
  console.log(`Demo sandbox created: ${sandboxId} -> ${url}`);

  // Cache in memory
  cache.set(sandboxId, { sandbox, url });

  return { sandbox, sandboxId, url };
}

/**
 * Get the preview URL for a demo sandbox.
 * Returns null if the sandbox is not in the cache.
 */
export function getDemoSandboxUrl(sandboxId: string): string | null {
  return cache.get(sandboxId)?.url ?? null;
}
