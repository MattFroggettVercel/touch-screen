import { db } from "@/lib/db";
import { generationLogs, generationRatings } from "@/lib/db/schema";
import { desc, eq } from "drizzle-orm";

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const limit = Math.min(Number(searchParams.get("limit") ?? 50), 200);
  const offset = Number(searchParams.get("offset") ?? 0);
  const device = searchParams.get("device");

  const conditions = device ? eq(generationLogs.deviceCode, device) : undefined;

  const logs = await db
    .select({
      id: generationLogs.id,
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
      ratingId: generationRatings.id,
      ratingScore: generationRatings.score,
      ratingNotes: generationRatings.notes,
      ratingTags: generationRatings.tags,
    })
    .from(generationLogs)
    .leftJoin(
      generationRatings,
      eq(generationLogs.id, generationRatings.generationLogId)
    )
    .where(conditions)
    .orderBy(desc(generationLogs.createdAt))
    .limit(limit)
    .offset(offset);

  return Response.json({ logs, limit, offset });
}
