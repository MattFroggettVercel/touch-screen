/**
 * File and package validation for AI-authored dashboard code.
 *
 * Enforces path sandboxing, protected file immutability, dangerous code
 * pattern blocking, and package installation allowlisting. This is the
 * server-side security boundary — prompt injection cannot bypass it.
 */

import { resolve, normalize } from "path";

// ---------------------------------------------------------------------------
// Protected files — writes are always rejected
// ---------------------------------------------------------------------------

const PROTECTED_FILES = [
  "src/App.tsx",
  "src/main.tsx",
  "src/lib/ha-provider.tsx",
  "src/lib/ha-types.ts",
  "src/lib/ha-connection.ts",
  "src/lib/ha-catalog.json",
  "src/lib/mock-data.ts",
  "tailwind.config.ts",
  "vite.config.ts",
  "tsconfig.json",
  "tsconfig.app.json",
  "tsconfig.node.json",
  "postcss.config.js",
  "package.json",
  "package-lock.json",
  "index.html",
];

const PROTECTED_DIRS = ["src/lib/"];

// ---------------------------------------------------------------------------
// Writable path prefixes — everything else is rejected
// ---------------------------------------------------------------------------

const WRITABLE_PATHS = [
  { exact: "src/Dashboard.tsx" },
  { prefix: "src/components/" },
];

// ---------------------------------------------------------------------------
// Blocked code patterns — categorised for error messages
// ---------------------------------------------------------------------------

const BLOCKED_PATTERNS = [
  { pattern: /\beval\s*\(/, category: "dynamic code execution" },
  { pattern: /\bnew\s+Function\s*\(/, category: "dynamic code execution" },
  { pattern: /\bFunction\s*\(/, category: "dynamic code execution" },

  { pattern: /\bfetch\s*\(/, category: "network access" },
  { pattern: /\bXMLHttpRequest\b/, category: "network access" },
  { pattern: /navigator\.sendBeacon/, category: "network access" },
  { pattern: /new\s+WebSocket/, category: "network access" },

  { pattern: /\bimport\s*\(/, category: "dynamic imports" },
  { pattern: /\brequire\s*\(/, category: "dynamic imports" },

  { pattern: /document\.cookie/, category: "browser storage access" },
  { pattern: /\blocalStorage\b/, category: "browser storage access" },
  { pattern: /\bsessionStorage\b/, category: "browser storage access" },

  { pattern: /window\.location/, category: "navigation" },
  { pattern: /window\.open\s*\(/, category: "navigation" },

  { pattern: /dangerouslySetInnerHTML/, category: "raw HTML injection" },
  { pattern: /<script/i, category: "HTML injection" },
  { pattern: /<iframe/i, category: "HTML injection" },
  { pattern: /<embed\b/i, category: "HTML injection" },
  { pattern: /<object\b/i, category: "HTML injection" },
  { pattern: /<meta\s+http-equiv/i, category: "HTML injection" },

  { pattern: /document\.write\s*\(/, category: "direct DOM manipulation" },
  { pattern: /document\.execCommand/, category: "direct DOM manipulation" },

  { pattern: /globalThis\s*\[/, category: "indirect global access" },
  { pattern: /window\s*\[/, category: "indirect global access" },
  { pattern: /\bReflect\s*\./, category: "indirect global access" },
];

// ---------------------------------------------------------------------------
// Package allowlist
// ---------------------------------------------------------------------------

const ALLOWED_PACKAGES = [
  "lucide-react",
  "framer-motion",
  "clsx",
  "tailwind-merge",
  "react-icons",
];

// ---------------------------------------------------------------------------
// validateWrite
// ---------------------------------------------------------------------------

/**
 * Validate a file write before it reaches the filesystem.
 *
 * @param {string} filePath  — path relative to dashboardDir
 * @param {string} content   — file content to write
 * @param {string} dashboardDir — absolute path to the dashboard project root
 * @returns {{ valid: true } | { valid: false, status: number, error: string }}
 */
export function validateWrite(filePath, content, dashboardDir) {
  // 1. Path sandboxing — resolved path must stay inside dashboardDir
  const resolvedDashboard = resolve(dashboardDir) + "/";
  const resolvedFile = resolve(dashboardDir, filePath);

  if (!resolvedFile.startsWith(resolvedDashboard)) {
    return {
      valid: false,
      status: 403,
      error: "Path outside project directory",
    };
  }

  // Normalise to forward-slash relative path for matching
  const normalised = normalize(filePath).replace(/\\/g, "/");

  // 2. Protected directory check
  for (const dir of PROTECTED_DIRS) {
    if (normalised.startsWith(dir)) {
      return {
        valid: false,
        status: 403,
        error: `Cannot write to protected directory: ${dir}`,
      };
    }
  }

  // 3. Protected file check
  if (PROTECTED_FILES.includes(normalised)) {
    return {
      valid: false,
      status: 403,
      error: `Cannot write to protected file: ${normalised}`,
    };
  }

  // 4. Writable path allowlist
  const isWritable = WRITABLE_PATHS.some((rule) => {
    if (rule.exact) return normalised === rule.exact;
    if (rule.prefix) return normalised.startsWith(rule.prefix);
    return false;
  });

  if (!isWritable) {
    return {
      valid: false,
      status: 403,
      error: `Path is not writable: ${normalised}`,
    };
  }

  // 5. Content blocklist scan
  for (const { pattern, category } of BLOCKED_PATTERNS) {
    if (pattern.test(content)) {
      return {
        valid: false,
        status: 422,
        error: `File rejected: ${category} is not permitted in dashboard components`,
      };
    }
  }

  return { valid: true };
}

// ---------------------------------------------------------------------------
// validateRead
// ---------------------------------------------------------------------------

/**
 * Validate a file read path stays inside dashboardDir.
 *
 * @param {string} filePath     — path relative to dashboardDir
 * @param {string} dashboardDir — absolute path to the dashboard project root
 * @returns {{ valid: true } | { valid: false, status: number, error: string }}
 */
export function validateRead(filePath, dashboardDir) {
  const resolvedDashboard = resolve(dashboardDir) + "/";
  const resolvedFile = resolve(dashboardDir, filePath);

  if (!resolvedFile.startsWith(resolvedDashboard)) {
    return {
      valid: false,
      status: 403,
      error: "Path outside project directory",
    };
  }

  return { valid: true };
}

// ---------------------------------------------------------------------------
// validatePackage
// ---------------------------------------------------------------------------

/**
 * Validate a package name against the installation allowlist.
 *
 * @param {string} packageName — e.g. "framer-motion" or "react-icons@5.0.0"
 * @returns {{ valid: true } | { valid: false, status: number, error: string }}
 */
export function validatePackage(packageName) {
  const nameWithoutVersion = packageName.replace(/@[\w.^~><=|-]+$/, "");

  if (!ALLOWED_PACKAGES.includes(nameWithoutVersion)) {
    return {
      valid: false,
      status: 403,
      error: `Package not in allowlist. Allowed packages: ${ALLOWED_PACKAGES.join(", ")}`,
    };
  }

  return { valid: true };
}
