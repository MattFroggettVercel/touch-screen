import { db } from "@/lib/db";
import { generationLogs, generationRatings } from "@/lib/db/schema";
import { eq, gte, lte, and } from "drizzle-orm";

/**
 * GET /api/generations/export
 *
 * Exports rated generations as JSONL for fine-tuning.
 *
 * Query params:
 *   minScore — minimum rating to include (default: 4, i.e. positive only)
 *   maxScore — maximum rating to include (default: 5)
 *   all      — if "true", export all rated regardless of score
 */
export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const includeAll = searchParams.get("all") === "true";
  const minScore = Number(searchParams.get("minScore") ?? 4);
  const maxScore = Number(searchParams.get("maxScore") ?? 5);

  const scoreFilter = includeAll
    ? undefined
    : and(
        gte(generationRatings.score, minScore),
        lte(generationRatings.score, maxScore)
      );

  const rows = await db
    .select({
      logId: generationLogs.id,
      conversationId: generationLogs.conversationId,
      deviceCode: generationLogs.deviceCode,
      turnNumber: generationLogs.turnNumber,
      userPrompt: generationLogs.userPrompt,
      toolCalls: generationLogs.toolCalls,
      filesChanged: generationLogs.filesChanged,
      aiResponseExcerpt: generationLogs.aiResponseExcerpt,
      hadErrors: generationLogs.hadErrors,
      systemPromptHash: generationLogs.systemPromptHash,
      model: generationLogs.model,
      createdAt: generationLogs.createdAt,
      score: generationRatings.score,
      notes: generationRatings.notes,
      tags: generationRatings.tags,
      fullMessages: generationRatings.fullMessages,
    })
    .from(generationRatings)
    .innerJoin(
      generationLogs,
      eq(generationRatings.generationLogId, generationLogs.id)
    )
    .where(scoreFilter);

  const lines = rows.map((row) => {
    let messages = null;
    if (row.fullMessages) {
      try {
        messages = JSON.parse(row.fullMessages);
      } catch {
        /* skip malformed */
      }
    }

    return JSON.stringify({
      id: row.logId,
      conversation_id: row.conversationId,
      device_code: row.deviceCode,
      turn_number: row.turnNumber,
      user_prompt: row.userPrompt,
      tool_calls: row.toolCalls ? JSON.parse(row.toolCalls) : [],
      files_changed: row.filesChanged ? JSON.parse(row.filesChanged) : [],
      ai_response_excerpt: row.aiResponseExcerpt,
      had_errors: row.hadErrors,
      system_prompt_hash: row.systemPromptHash,
      model: row.model,
      created_at: row.createdAt,
      rating: row.score,
      notes: row.notes,
      tags: row.tags ? JSON.parse(row.tags) : [],
      messages,
    });
  });

  return new Response(lines.join("\n") + "\n", {
    headers: {
      "Content-Type": "application/jsonl",
      "Content-Disposition": `attachment; filename="generations-export.jsonl"`,
    },
  });
}
