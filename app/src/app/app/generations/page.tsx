"use client";

import { useEffect, useState, useCallback } from "react";

type GenerationLog = {
  id: string;
  conversationId: string;
  deviceCode: string | null;
  turnNumber: number;
  userPrompt: string;
  toolCalls: string | null;
  filesChanged: string | null;
  aiResponseExcerpt: string | null;
  hadErrors: boolean | null;
  systemPromptHash: string | null;
  model: string | null;
  createdAt: string;
  ratingId: string | null;
  ratingScore: number | null;
  ratingNotes: string | null;
  ratingTags: string | null;
};

function ScoreBadge({ score }: { score: number | null }) {
  if (score == null) return <span className="text-white/20 text-xs">—</span>;
  const color =
    score >= 4
      ? "bg-green-500/15 text-green-400 border-green-500/20"
      : score <= 2
        ? "bg-red-500/15 text-red-400 border-red-500/20"
        : "bg-yellow-500/15 text-yellow-400 border-yellow-500/20";
  return (
    <span className={`text-xs px-2 py-0.5 rounded-md border ${color}`}>
      {score}/5
    </span>
  );
}

function ToolCallPills({ json }: { json: string | null }) {
  if (!json) return null;
  try {
    const calls: { tool: string }[] = JSON.parse(json);
    if (calls.length === 0) return null;
    return (
      <div className="flex flex-wrap gap-1 mt-1">
        {calls.map((c, i) => (
          <span
            key={i}
            className="text-[10px] px-1.5 py-0.5 rounded bg-white/5 text-white/30 font-mono"
          >
            {c.tool}
          </span>
        ))}
      </div>
    );
  } catch {
    return null;
  }
}

function FilePills({ json }: { json: string | null }) {
  if (!json) return null;
  try {
    const files: string[] = JSON.parse(json);
    if (files.length === 0) return null;
    return (
      <div className="flex flex-wrap gap-1 mt-1">
        {files.map((f, i) => (
          <span
            key={i}
            className="text-[10px] px-1.5 py-0.5 rounded bg-accent/10 text-accent/60 font-mono"
          >
            {f}
          </span>
        ))}
      </div>
    );
  } catch {
    return null;
  }
}

export default function GenerationsPage() {
  const [logs, setLogs] = useState<GenerationLog[]>([]);
  const [loading, setLoading] = useState(true);
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [ratingInput, setRatingInput] = useState<{
    id: string;
    score: number;
    notes: string;
  } | null>(null);

  const fetchLogs = useCallback(async () => {
    try {
      const res = await fetch("/api/generations?limit=100");
      const data = await res.json();
      setLogs(data.logs ?? []);
    } catch {
      /* ignore */
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchLogs();
  }, [fetchLogs]);

  const submitRating = async (logId: string, score: number, notes: string) => {
    const log = logs.find((l) => l.id === logId);
    if (!log) return;

    await fetch("/api/generations/rate", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        conversationId: log.conversationId,
        turnNumber: log.turnNumber,
        score,
        notes: notes || undefined,
      }),
    });

    setRatingInput(null);
    fetchLogs();
  };

  if (loading) {
    return (
      <div className="flex-1 flex items-center justify-center p-8">
        <div className="w-8 h-8 border-2 border-accent/30 border-t-accent rounded-full animate-spin" />
      </div>
    );
  }

  return (
    <div className="flex-1 flex flex-col p-8">
      <div className="max-w-5xl mx-auto w-full space-y-6">
        <div>
          <h1 className="text-3xl font-light tracking-tight">
            Generation Logs
          </h1>
          <p className="mt-1 text-white/40 text-sm">
            {logs.length} generation{logs.length !== 1 ? "s" : ""} logged.
            Rate them to improve the system prompt.
          </p>
        </div>

        {/* Stats */}
        <div className="flex gap-4">
          {[
            {
              label: "Total",
              value: logs.length,
            },
            {
              label: "Rated",
              value: logs.filter((l) => l.ratingScore != null).length,
            },
            {
              label: "Positive",
              value: logs.filter((l) => l.ratingScore != null && l.ratingScore >= 4).length,
            },
            {
              label: "Negative",
              value: logs.filter((l) => l.ratingScore != null && l.ratingScore <= 2).length,
            },
          ].map((stat) => (
            <div
              key={stat.label}
              className="px-4 py-3 bg-surface border border-white/5 rounded-xl flex-1"
            >
              <p className="text-[10px] text-white/30 uppercase tracking-wider">
                {stat.label}
              </p>
              <p className="text-xl font-light mt-0.5">{stat.value}</p>
            </div>
          ))}
        </div>

        {/* Table */}
        <div className="space-y-2">
          {logs.map((log) => {
            const isExpanded = expandedId === log.id;
            const isRating = ratingInput?.id === log.id;

            return (
              <div
                key={log.id}
                className="bg-surface border border-white/5 rounded-xl overflow-hidden"
              >
                <button
                  className="w-full px-5 py-4 flex items-start gap-4 text-left hover:bg-white/2 transition-colors"
                  onClick={() =>
                    setExpandedId(isExpanded ? null : log.id)
                  }
                >
                  <div className="flex-1 min-w-0">
                    <p className="text-sm truncate">{log.userPrompt}</p>
                    <div className="flex items-center gap-3 mt-1.5">
                      <span className="text-[10px] text-white/20 font-mono">
                        turn {log.turnNumber}
                      </span>
                      {log.deviceCode && (
                        <span className="text-[10px] text-white/20 font-mono">
                          {log.deviceCode}
                        </span>
                      )}
                      {log.hadErrors && (
                        <span className="text-[10px] text-red-400/60">
                          errors
                        </span>
                      )}
                      <span className="text-[10px] text-white/15">
                        {new Date(log.createdAt).toLocaleDateString()}{" "}
                        {new Date(log.createdAt).toLocaleTimeString()}
                      </span>
                    </div>
                  </div>
                  <ScoreBadge score={log.ratingScore} />
                </button>

                {isExpanded && (
                  <div className="px-5 pb-4 space-y-3 border-t border-white/5 pt-3">
                    {log.aiResponseExcerpt && (
                      <div>
                        <p className="text-[10px] text-white/30 uppercase tracking-wider mb-1">
                          AI Response
                        </p>
                        <p className="text-xs text-white/50 leading-relaxed">
                          {log.aiResponseExcerpt}
                        </p>
                      </div>
                    )}

                    <ToolCallPills json={log.toolCalls} />
                    <FilePills json={log.filesChanged} />

                    <div className="flex items-center gap-3 mt-1">
                      <span className="text-[10px] text-white/20 font-mono">
                        prompt hash: {log.systemPromptHash?.slice(0, 8)}
                      </span>
                      <span className="text-[10px] text-white/20 font-mono">
                        model: {log.model}
                      </span>
                    </div>

                    {log.ratingNotes && (
                      <p className="text-xs text-white/40 italic">
                        {log.ratingNotes}
                      </p>
                    )}

                    {!log.ratingId && !isRating && (
                      <button
                        className="text-xs px-3 py-1.5 bg-accent/10 border border-accent/20 text-accent rounded-lg hover:bg-accent/20 transition-colors"
                        onClick={(e) => {
                          e.stopPropagation();
                          setRatingInput({
                            id: log.id,
                            score: 3,
                            notes: "",
                          });
                        }}
                      >
                        Rate this generation
                      </button>
                    )}

                    {isRating && ratingInput && (
                      <div className="flex items-end gap-3 bg-white/2 rounded-lg p-3">
                        <div className="space-y-1">
                          <p className="text-[10px] text-white/30">Score</p>
                          <div className="flex gap-1">
                            {[1, 2, 3, 4, 5].map((s) => (
                              <button
                                key={s}
                                className={`w-7 h-7 rounded text-xs border ${
                                  ratingInput.score === s
                                    ? "bg-accent/20 border-accent/40 text-accent"
                                    : "border-white/10 text-white/30 hover:border-white/20"
                                }`}
                                onClick={() =>
                                  setRatingInput({ ...ratingInput, score: s })
                                }
                              >
                                {s}
                              </button>
                            ))}
                          </div>
                        </div>
                        <input
                          type="text"
                          placeholder="Notes (optional)"
                          value={ratingInput.notes}
                          onChange={(e) =>
                            setRatingInput({
                              ...ratingInput,
                              notes: e.target.value,
                            })
                          }
                          className="flex-1 text-xs bg-transparent border border-white/10 rounded-lg px-3 py-1.5 text-white/70 placeholder:text-white/20 focus:outline-none focus:border-accent/30"
                        />
                        <button
                          className="text-xs px-3 py-1.5 bg-accent text-black rounded-lg font-medium"
                          onClick={() =>
                            submitRating(
                              log.id,
                              ratingInput.score,
                              ratingInput.notes
                            )
                          }
                        >
                          Save
                        </button>
                        <button
                          className="text-xs px-2 py-1.5 text-white/30 hover:text-white/50"
                          onClick={() => setRatingInput(null)}
                        >
                          Cancel
                        </button>
                      </div>
                    )}
                  </div>
                )}
              </div>
            );
          })}

          {logs.length === 0 && (
            <div className="text-center py-16">
              <p className="text-sm text-white/30">
                No generations logged yet. Use the companion app to create some.
              </p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
