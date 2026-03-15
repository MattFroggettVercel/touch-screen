#!/usr/bin/env node

/**
 * Synthesise generation feedback into learned rules.
 *
 * Fetches rated generations from the export API, sends them to Claude
 * for pattern analysis, and writes the distilled rules to learned-rules.ts.
 *
 * Usage:
 *   node scripts/synthesise-feedback.mjs
 *
 * Environment:
 *   AI_GATEWAY_API_KEY — required (or set in app/.env.local)
 *   API_URL            — base URL for the generations API (default: http://localhost:3000)
 *   MIN_RATINGS        — minimum number of rated generations required (default: 5)
 *
 * The dev server must be running (npm run dev or vercel dev in app/).
 */

import { readFileSync, writeFileSync } from "fs";
import { resolve, dirname } from "path";
import { fileURLToPath } from "url";
import { generateText } from "ai";
import { gateway } from "@ai-sdk/gateway";

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = resolve(__dirname, "..");

// Load env from app/.env.local
try {
  const envFile = readFileSync(resolve(ROOT, "app", ".env.local"), "utf-8");
  for (const line of envFile.split("\n")) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith("#")) continue;
    const eqIdx = trimmed.indexOf("=");
    if (eqIdx === -1) continue;
    const key = trimmed.slice(0, eqIdx).trim();
    const val = trimmed.slice(eqIdx + 1).trim().replace(/^["']|["']$/g, "");
    if (!process.env[key]) process.env[key] = val;
  }
} catch {
  // .env.local not found, rely on existing env vars
}

const API_URL = process.env.API_URL || "http://localhost:3000";
const MIN_RATINGS = Number(process.env.MIN_RATINGS || 5);

if (!process.env.AI_GATEWAY_API_KEY) {
  console.error(
    "Error: AI_GATEWAY_API_KEY not found. Set it in your environment or in app/.env.local."
  );
  process.exit(1);
}

async function fetchExport() {
  console.log(`Fetching rated generations from ${API_URL}/api/generations/export?all=true ...`);
  const res = await fetch(`${API_URL}/api/generations/export?all=true`);
  if (!res.ok) {
    throw new Error(`Export API returned ${res.status}: ${await res.text()}`);
  }
  const text = await res.text();
  return text
    .trim()
    .split("\n")
    .filter(Boolean)
    .map((line) => JSON.parse(line));
}

async function callClaude(prompt) {
  const { text } = await generateText({
    model: gateway("anthropic/claude-sonnet-4"),
    prompt,
  });
  return text;
}

function buildSummary(gen) {
  const parts = [`Prompt: "${gen.user_prompt}"`];
  if (gen.tool_calls?.length) {
    parts.push(
      `Tools: ${gen.tool_calls.map((t) => t.tool).join(", ")}`
    );
  }
  if (gen.files_changed?.length) {
    parts.push(`Files changed: ${gen.files_changed.join(", ")}`);
  }
  if (gen.had_errors) parts.push("Had compilation errors");
  if (gen.ai_response_excerpt) {
    parts.push(`AI said: "${gen.ai_response_excerpt.slice(0, 200)}"`);
  }
  parts.push(`Rating: ${gen.rating}/5`);
  if (gen.notes) parts.push(`Developer notes: "${gen.notes}"`);
  return parts.join("\n  ");
}

async function main() {
  const generations = await fetchExport();
  console.log(`Found ${generations.length} rated generation(s).`);

  if (generations.length < MIN_RATINGS) {
    console.log(
      `Need at least ${MIN_RATINGS} ratings to synthesise. Keep rating generations and try again.`
    );
    process.exit(0);
  }

  const positive = generations.filter((g) => g.rating >= 4);
  const negative = generations.filter((g) => g.rating <= 2);
  const neutral = generations.filter((g) => g.rating === 3);

  console.log(
    `Breakdown: ${positive.length} positive, ${negative.length} negative, ${neutral.length} neutral`
  );

  const prompt = `You are analysing rated AI dashboard generations for a home automation touch screen product.

The AI generates React + Tailwind CSS dashboards for a 720x720px touch display that interfaces with Home Assistant. It uses components like LightCard, ClimateCard, WeatherCard, etc. and reads an entity catalog to discover available HA entities.

Below are summaries of rated generations. The developer rated them 1-5 (1 = bad, 5 = excellent).

## Highly-rated generations (4-5):
${positive.length > 0 ? positive.map((g, i) => `${i + 1}. ${buildSummary(g)}`).join("\n\n") : "(none yet)"}

## Poorly-rated generations (1-2):
${negative.length > 0 ? negative.map((g, i) => `${i + 1}. ${buildSummary(g)}`).join("\n\n") : "(none yet)"}

## Neutral generations (3):
${neutral.length > 0 ? neutral.map((g, i) => `${i + 1}. ${buildSummary(g)}`).join("\n\n") : "(none yet)"}

---

Based on these examples, extract **concise, actionable rules** that would help future generations be better. Focus on:
- Layout patterns that work well vs poorly on a 720x720 touch display
- Common mistakes to avoid
- Component usage patterns (when to use which card, how to group them)
- Entity discovery patterns (when to read the catalog, how to handle missing entities)
- Styling preferences (spacing, typography, colour usage)
- Workflow habits (reading files first, checking errors after writing)

Output ONLY the rules as a bulleted list. Each rule should be a single concise sentence. Aim for 10-20 rules. Do not include preamble, explanation, or anything else — just the rules.`;

  console.log("Sending to Claude for analysis...");
  const rules = await callClaude(prompt);

  console.log("\n--- Extracted Rules ---");
  console.log(rules);
  console.log("--- End Rules ---\n");

  const outputPath = resolve(ROOT, "app", "src", "lib", "learned-rules.ts");
  const fileContent = `/**
 * Distilled rules extracted from rated generation feedback.
 *
 * This file is updated by \`scripts/synthesise-feedback.mjs\` which analyses
 * rated generations and extracts patterns using Claude. Do not edit manually
 * unless you want to seed initial rules.
 *
 * Keep this section concise — it's appended to every system prompt (~300-800 tokens).
 *
 * Last updated: ${new Date().toISOString()}
 * Based on ${generations.length} rated generations (${positive.length} positive, ${negative.length} negative)
 */
export const LEARNED_RULES = \`
${rules.trim()}
\`;
`;

  writeFileSync(outputPath, fileContent);
  console.log(`Written to ${outputPath}`);
  console.log("Done! The updated rules will take effect on the next deployment or dev server restart.");
}

main().catch((err) => {
  console.error("Error:", err.message);
  process.exit(1);
});
