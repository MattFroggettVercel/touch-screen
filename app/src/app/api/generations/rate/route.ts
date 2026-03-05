import { db } from "@/lib/db";
import { generationLogs, generationRatings } from "@/lib/db/schema";
import { eq, and } from "drizzle-orm";

export async function POST(request: Request) {
  const { conversationId, turnNumber, score, fullMessages, notes, tags } =
    await request.json();

  if (!conversationId || score == null) {
    return new Response(
      JSON.stringify({ error: "conversationId and score are required" }),
      { status: 400, headers: { "Content-Type": "application/json" } }
    );
  }

  // Find the matching generation log entry
  const [logEntry] = await db
    .select({ id: generationLogs.id })
    .from(generationLogs)
    .where(
      and(
        eq(generationLogs.conversationId, conversationId),
        eq(generationLogs.turnNumber, turnNumber ?? 0)
      )
    )
    .limit(1);

  if (!logEntry) {
    return new Response(
      JSON.stringify({ error: "Generation log not found" }),
      { status: 404, headers: { "Content-Type": "application/json" } }
    );
  }

  const [rating] = await db
    .insert(generationRatings)
    .values({
      generationLogId: logEntry.id,
      score,
      notes: notes ?? null,
      tags: tags ? JSON.stringify(tags) : null,
      fullMessages: fullMessages ? JSON.stringify(fullMessages) : null,
    })
    .returning({ id: generationRatings.id });

  return Response.json({ ok: true, ratingId: rating.id });
}
