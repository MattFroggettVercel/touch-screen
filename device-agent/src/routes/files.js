/**
 * File routes
 *
 * GET  /api/files          - List all project source files
 * GET  /api/files/:path    - Read a single file
 * PUT  /api/files/:path    - Write a file (Vite HMR picks it up)
 */

import { readFileSync, writeFileSync, mkdirSync, existsSync } from "fs";
import { join, dirname, relative } from "path";
import { glob } from "glob";

export function registerFileRoutes(app, ctx) {
  const { dashboardDir } = ctx;

  // List all project source files
  app.get("/api/files", async () => {
    const patterns = [
      "src/**/*.tsx",
      "src/**/*.ts",
      "src/**/*.css",
      "src/**/*.json",
      "package.json",
      "index.html",
      "vite.config.ts",
      "tailwind.config.ts",
      "tsconfig.json",
      "postcss.config.js",
    ];

    const files = await glob(patterns, {
      cwd: dashboardDir,
      nodir: true,
    });

    return { files: files.sort() };
  });

  // Read a single file
  app.get("/api/files/*", async (request, reply) => {
    const filePath = request.params["*"];

    if (!filePath || filePath.includes("..")) {
      return reply.status(400).send({ error: "Invalid path" });
    }

    const fullPath = join(dashboardDir, filePath);

    if (!existsSync(fullPath)) {
      return reply.status(404).send({ error: `File not found: ${filePath}` });
    }

    try {
      const content = readFileSync(fullPath, "utf-8");
      return { path: filePath, content };
    } catch (err) {
      return reply
        .status(500)
        .send({ error: `Failed to read ${filePath}: ${err.message}` });
    }
  });

  // Write a file
  app.put("/api/files/*", async (request, reply) => {
    const filePath = request.params["*"];

    if (!filePath || filePath.includes("..")) {
      return reply.status(400).send({ error: "Invalid path" });
    }

    const { content } = request.body || {};

    if (content === undefined || content === null) {
      return reply.status(400).send({ error: "Missing content in body" });
    }

    const fullPath = join(dashboardDir, filePath);

    try {
      mkdirSync(dirname(fullPath), { recursive: true });
      writeFileSync(fullPath, content, "utf-8");
      return { success: true, path: filePath };
    } catch (err) {
      return reply
        .status(500)
        .send({ error: `Failed to write ${filePath}: ${err.message}` });
    }
  });
}
