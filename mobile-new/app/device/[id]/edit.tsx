/**
 * Editor screen — consumer-facing dashboard editor.
 *
 * The dashboard preview is visible on the Pi itself. This screen
 * provides a simple chat input and a minimal status feed showing
 * friendly progress summaries and AI responses. Technical details
 * (file paths, tool names) are hidden from the user.
 *
 * Feed entry types:
 * - status: brief operational milestones (muted, compact)
 * - response: AI text replies (primary, accent-colored)
 * - error: failure messages (red, brief)
 *
 * Lifecycle:
 * - On mount: starts the Pi's Vite dev server (POST /api/dev/start)
 * - On unmount: stops the Vite dev server (POST /api/dev/stop)
 * - Publish button: builds static assets (POST /api/build) and stops dev server
 *
 * Tool calls execute against the Pi's REST API. Each tool part with
 * state "input-available" is detected via useEffect, executed, and
 * the result is fed back via addToolOutput. sendAutomaticallyWhen
 * re-submits the conversation once all tool outputs are set.
 */

import { useEffect, useMemo, useRef, useState, useCallback } from "react";
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  ActivityIndicator,
  Alert,
  FlatList,
  KeyboardAvoidingView,
  Platform,
} from "react-native";
import { useLocalSearchParams, useRouter } from "expo-router";
import { useChat } from "@ai-sdk/react";
import {
  DefaultChatTransport,
  lastAssistantMessageIsCompleteWithToolCalls,
} from "ai";
import { fetch as expoFetch } from "expo/fetch";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { DeviceClient } from "@/lib/device-client";
import { authClient } from "@/lib/auth-client";
import EntityBrowser from "@/components/EntityBrowser";
import {
  COLORS,
  CLOUD_API_URL,
  PI_SERVER_PORT,
} from "@/lib/constants";

/** Return auth cookie headers for cloud API requests. */
function getAuthCookieHeaders(): Record<string, string> {
  const cookies = authClient.getCookie();
  return cookies ? { Cookie: cookies } : {};
}

// ---- Log entry types ----

type LogEntryType = "status" | "response" | "error";

interface LogEntry {
  id: string;
  type: LogEntryType;
  message: string;
  timestamp: number;
}

let logIdCounter = 0;

// Cycling progress messages for the working indicator
const PROGRESS_MESSAGES = ["Thinking...", "Making changes...", "Almost there..."];

export default function EditScreen() {
  const { id, localIP } = useLocalSearchParams<{
    id: string;
    localIP?: string;
  }>();
  const router = useRouter();
  const insets = useSafeAreaInsets();

  const [client, setClient] = useState<DeviceClient | null>(null);
  const [input, setInput] = useState("");
  const [chatError, setChatError] = useState<string | null>(null);
  const [devServerReady, setDevServerReady] = useState(false);
  const [publishing, setPublishing] = useState(false);
  const [credits, setCredits] = useState<number | null>(null);
  const [showEntityBrowser, setShowEntityBrowser] = useState(false);

  // Activity log
  const [logEntries, setLogEntries] = useState<LogEntry[]>([]);
  const logListRef = useRef<FlatList>(null);

  const addLog = useCallback(
    (type: LogEntryType, message: string) => {
      const entry: LogEntry = {
        id: String(++logIdCounter),
        type,
        message,
        timestamp: Date.now(),
      };
      setLogEntries((prev) => [...prev, entry]);
    },
    []
  );

  // Auto-scroll when new entries are added
  useEffect(() => {
    if (logEntries.length > 0) {
      const t = setTimeout(() => {
        logListRef.current?.scrollToEnd({ animated: true });
      }, 100);
      return () => clearTimeout(t);
    }
  }, [logEntries.length]);

  // Create device client
  useEffect(() => {
    if (!localIP) return;
    setClient(new DeviceClient(localIP, PI_SERVER_PORT));
  }, [localIP]);

  // Ref for client so the tool execution effect always has the latest
  const clientRef = useRef<DeviceClient | null>(null);
  useEffect(() => {
    clientRef.current = client;
  }, [client]);

  // Start dev server on mount, stop on unmount
  useEffect(() => {
    if (!client) return;

    let mounted = true;

    (async () => {
      try {
        await client.startDevServer();
        if (mounted) {
          setDevServerReady(true);
          addLog("status", "Connected to your device");
        }
      } catch (err: any) {
        console.warn("Failed to start dev server:", err?.message);
        if (mounted) {
          setDevServerReady(true);
          addLog("status", "Connected to your device");
        }
      }
    })();

    return () => {
      mounted = false;
      client.stopDevServer().catch(() => {});
    };
  }, [client]);

  // Fetch credit balance
  useEffect(() => {
    (async () => {
      try {
        const res = await expoFetch(`${CLOUD_API_URL}/api/credits`, {
          headers: getAuthCookieHeaders(),
        });
        const data = await res.json();
        setCredits(data.balance ?? 0);
      } catch {
        // Non-critical — just don't show credits
      }
    })();
  }, []);

  // Chat transport — sends to the cloud API (tools without execute)
  // HA entities are discovered by the LLM via readFile("src/lib/ha-catalog.json")
  // on the device filesystem, not sent with every request.
  const transport = useMemo(
    () =>
      new DefaultChatTransport({
        fetch: expoFetch as any,
        api: `${CLOUD_API_URL}/api/chat`,
        headers: () => getAuthCookieHeaders(),
      }),
    []
  );

  const { messages, sendMessage, addToolOutput, status, error, clearError } =
    useChat({
      transport,
      sendAutomaticallyWhen: lastAssistantMessageIsCompleteWithToolCalls,
      onError: (err) => {
        setChatError(err?.message || "Something went wrong");
      },
    });

  const isWorking = status === "submitted" || status === "streaming";

  // Cycling progress message
  const [progressIdx, setProgressIdx] = useState(0);
  useEffect(() => {
    if (!isWorking) {
      setProgressIdx(0);
      return;
    }
    const timer = setInterval(() => {
      setProgressIdx((i) => (i + 1) % PROGRESS_MESSAGES.length);
    }, 3000);
    return () => clearInterval(timer);
  }, [isWorking]);

  // ---- Tool execution via addToolOutput ----
  // Track which tool calls have been handled to prevent double execution
  const handledToolCalls = useRef<Set<string>>(new Set());

  useEffect(() => {
    const c = clientRef.current;
    if (!c) return;

    const lastMsg = messages[messages.length - 1];
    if (!lastMsg || lastMsg.role !== "assistant") return;

    for (const part of lastMsg.parts ?? []) {
      const p = part as any;

      // Only handle typed tool parts (e.g. tool-readFile) or dynamic-tool
      const isToolPart =
        (typeof p.type === "string" && p.type.startsWith("tool-")) ||
        p.type === "dynamic-tool";
      if (!isToolPart) continue;
      if (p.state !== "input-available") continue;

      const toolCallId: string | undefined = p.toolCallId;
      if (!toolCallId || handledToolCalls.current.has(toolCallId)) continue;
      handledToolCalls.current.add(toolCallId);

      // Extract tool name: "tool-readFile" → "readFile", or p.toolName for dynamic
      const toolName: string =
        p.type === "dynamic-tool"
          ? p.toolName
          : p.type.replace(/^tool-/, "");

      const input: Record<string, any> = p.input ?? {};

      // Execute tool async and call addToolOutput
      (async () => {
        try {
          let output: any;
          switch (toolName) {
            case "readFile": {
              const filePath = input.path ?? "src/Dashboard.tsx";
              // Suppressed — reading is an implementation detail
              const result = await c.readFile(filePath);
              output = { success: true, content: result.content };
              break;
            }
            case "writeFile": {
              const filePath = input.path ?? "unknown";
              addLog("status", "Applying changes");
              await c.writeFile(filePath, input.content ?? "");
              addLog("status", "Refreshing your display");
              output = { success: true, message: `Written to ${filePath}` };
              break;
            }
            case "listFiles": {
              // Suppressed — listing files is an implementation detail
              const result = await c.listFiles(input.path);
              output = { success: true, files: result.files };
              break;
            }
            case "installPackage": {
              addLog("status", "Adding new components");
              const result = await c.installPackage(input.packageName ?? "unknown");
              output = { success: true, message: result.message };
              break;
            }
            case "getDevServerErrors": {
              addLog("status", "Verifying everything works");
              const result = await c.getDevServerErrors();
              output = {
                success: true,
                errors: result.errors,
                count: result.count,
                running: result.running,
              };
              break;
            }
            default:
              output = { error: `Unknown tool: ${toolName}` };
          }

          await addToolOutput({
            tool: toolName as any,
            toolCallId,
            output,
          });
        } catch (err: any) {
          addLog("error", "Something went wrong — try again");
          await addToolOutput({
            tool: toolName as any,
            toolCallId,
            state: "output-error",
            errorText: err?.message || "Tool call failed",
          } as any);
        }
      })();
    }
  }, [messages, addToolOutput, addLog]);

  // Surface AI text responses into the log
  const lastSeenMsgCount = useRef(0);
  useEffect(() => {
    if (messages.length <= lastSeenMsgCount.current) return;

    const newMessages = messages.slice(lastSeenMsgCount.current);
    lastSeenMsgCount.current = messages.length;

    for (const msg of newMessages) {
      if (msg.role === "assistant" && msg.parts) {
        for (const part of msg.parts) {
          if (part.type === "text" && part.text.trim()) {
            const firstLine = part.text.trim().split("\n")[0];
            addLog("response", firstLine);
          }
        }
      }
    }
  }, [messages, addLog]);

  // Update credit count after a successful prompt
  useEffect(() => {
    if (status === "ready" && credits !== null && credits > 0) {
      setCredits((prev) => (prev !== null ? Math.max(0, prev - 1) : null));
    }
  }, [status]);

  // Clear chat error after a few seconds
  useEffect(() => {
    if (chatError) {
      const t = setTimeout(() => setChatError(null), 6000);
      return () => clearTimeout(t);
    }
  }, [chatError]);

  // Also surface useChat errors
  useEffect(() => {
    if (error) {
      setChatError(error.message);
      addLog("error", "Something went wrong — try again");
      clearError();
    }
  }, [error]);

  const handleSend = useCallback(() => {
    const text = input.trim();
    if (!text || isWorking) return;
    setChatError(null);
    setInput("");
    // Reset handled tool calls for the new conversation turn
    handledToolCalls.current.clear();
    sendMessage({ text });
  }, [input, isWorking, sendMessage]);

  // ---- Publish ----
  const handlePublish = useCallback(async () => {
    if (!client || publishing) return;

    Alert.alert(
      "Publish Dashboard",
      "This will build and deploy your dashboard to the device. The dev preview will stop.",
      [
        { text: "Cancel", style: "cancel" },
        {
          text: "Publish",
          onPress: async () => {
            setPublishing(true);
            addLog("status", "Publishing your dashboard...");
            try {
              await client.build();
              addLog("status", "Your dashboard is live");
              Alert.alert(
                "Published",
                "Your dashboard has been built and deployed to the device.",
                [{ text: "OK", onPress: () => router.back() }]
              );
            } catch (err: any) {
              addLog("error", "Something went wrong — try again");
              Alert.alert(
                "Build Failed",
                err?.message || "Something went wrong during the build."
              );
            } finally {
              setPublishing(false);
            }
          },
        },
      ]
    );
  }, [client, publishing, router, addLog]);

  // ---- Render helpers ----

  const renderLogEntry = ({ item }: { item: LogEntry }) => {
    const isResponse = item.type === "response";
    const isError = item.type === "error";

    return (
      <View style={isResponse ? styles.responseEntry : styles.statusEntry}>
        <Text
          style={[
            isResponse
              ? styles.responseText
              : isError
                ? styles.errorEntryText
                : styles.statusText,
          ]}
          numberOfLines={isResponse ? 4 : 1}
        >
          {item.message}
        </Text>
      </View>
    );
  };

  // ---- Render ----

  if (!localIP) {
    return (
      <View style={styles.centered}>
        <Text style={styles.errorText}>Device not reachable</Text>
      </View>
    );
  }

  if (!devServerReady) {
    return (
      <View style={styles.centered}>
        <ActivityIndicator size="large" color={COLORS.accent} />
        <Text style={[styles.errorText, { color: COLORS.textMuted, marginTop: 12 }]}>
          Connecting to your device...
        </Text>
      </View>
    );
  }

  return (
    <KeyboardAvoidingView
      style={styles.container}
      behavior={Platform.OS === "ios" ? "padding" : "height"}
    >
      {/* Top bar with credits and publish */}
      <View style={[styles.topBar, { paddingTop: insets.top + 8 }]}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
          <Text style={styles.backButtonText}>{"←"}</Text>
        </TouchableOpacity>

        <TouchableOpacity
          onPress={() => setShowEntityBrowser(true)}
          style={styles.entitiesButton}
        >
          <Text style={styles.entitiesButtonIcon}>🏠</Text>
          <Text style={styles.entitiesButtonText}>Entities</Text>
        </TouchableOpacity>

        <View style={styles.topBarRight}>
          {credits !== null && (
            <View style={styles.creditBadge}>
              <Text style={styles.creditText}>{credits} credits</Text>
            </View>
          )}

          <TouchableOpacity
            style={[styles.publishButton, publishing && styles.publishButtonDisabled]}
            onPress={handlePublish}
            disabled={publishing || isWorking}
          >
            {publishing ? (
              <ActivityIndicator size="small" color="#000" />
            ) : (
              <Text style={styles.publishButtonText}>Publish</Text>
            )}
          </TouchableOpacity>
        </View>
      </View>

      {/* Activity log — fills the screen */}
      <FlatList
        ref={logListRef}
        data={logEntries}
        keyExtractor={(item) => item.id}
        renderItem={renderLogEntry}
        style={styles.logList}
        contentContainerStyle={styles.logListContent}
        ListEmptyComponent={
          <View style={styles.emptyLog}>
            <Text style={styles.emptyLogText}>
              Tell me what you'd like your dashboard{"\n"}
              to look like — I'll make the changes{"\n"}
              live on your display.
            </Text>
          </View>
        }
      />

      {/* Working indicator */}
      {isWorking && (
        <View style={styles.workingBar}>
          <ActivityIndicator size="small" color={COLORS.accent} />
          <Text style={styles.workingText}>{PROGRESS_MESSAGES[progressIdx]}</Text>
        </View>
      )}

      {/* Chat bar at the bottom */}
      <View style={[styles.chatBar, { paddingBottom: Math.max(insets.bottom, 16) }]}>
        {/* Error banner */}
        {chatError && (
          <View style={styles.errorBanner}>
            <Text style={styles.errorBannerText}>{chatError}</Text>
          </View>
        )}

        {/* Input bar — always visible */}
        <View style={styles.inputRow}>
          <TextInput
            style={styles.input}
            placeholder="Describe how to change the dashboard…"
            placeholderTextColor="rgba(255,255,255,0.25)"
            value={input}
            onChangeText={setInput}
            multiline
            returnKeyType="send"
            blurOnSubmit
            onSubmitEditing={handleSend}
            editable={!isWorking}
          />
          <TouchableOpacity
            style={[
              styles.sendButton,
              (!input.trim() || isWorking) && styles.sendButtonDisabled,
            ]}
            onPress={handleSend}
            disabled={!input.trim() || isWorking}
          >
            <Text style={styles.sendButtonText}>↑</Text>
          </TouchableOpacity>
        </View>
      </View>

      {/* Entity browser modal */}
      <EntityBrowser
        client={client}
        visible={showEntityBrowser}
        onClose={() => setShowEntityBrowser(false)}
      />
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.background,
  },
  centered: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    backgroundColor: COLORS.background,
    paddingHorizontal: 24,
  },
  errorText: {
    fontSize: 15,
    color: COLORS.error,
    textAlign: "center",
  },

  // Top bar
  topBar: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 16,
    paddingTop: 8,
    paddingBottom: 8,
    backgroundColor: "rgba(0,0,0,0.8)",
    borderBottomWidth: 1,
    borderBottomColor: "rgba(255,255,255,0.05)",
  },
  backButton: {
    padding: 8,
  },
  backButtonText: {
    fontSize: 20,
    color: COLORS.text,
  },
  entitiesButton: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    backgroundColor: "rgba(255,255,255,0.06)",
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.08)",
    borderRadius: 12,
    paddingHorizontal: 10,
    paddingVertical: 6,
  },
  entitiesButtonIcon: {
    fontSize: 14,
  },
  entitiesButtonText: {
    fontSize: 12,
    color: "rgba(255,255,255,0.5)",
    fontWeight: "500",
  },
  topBarRight: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
  },
  creditBadge: {
    backgroundColor: "rgba(255,255,255,0.06)",
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.08)",
    borderRadius: 12,
    paddingHorizontal: 10,
    paddingVertical: 5,
  },
  creditText: {
    fontSize: 12,
    color: "rgba(255,255,255,0.5)",
  },
  publishButton: {
    backgroundColor: COLORS.accent,
    borderRadius: 12,
    paddingHorizontal: 16,
    paddingVertical: 8,
    minWidth: 80,
    alignItems: "center",
  },
  publishButtonDisabled: {
    opacity: 0.5,
  },
  publishButtonText: {
    fontSize: 13,
    fontWeight: "600",
    color: "#000",
  },

  // Activity log
  logList: {
    flex: 1,
  },
  logListContent: {
    paddingHorizontal: 20,
    paddingVertical: 16,
    flexGrow: 1,
  },

  // Status entries — compact breadcrumbs
  statusEntry: {
    paddingVertical: 3,
  },
  statusText: {
    fontSize: 12,
    lineHeight: 16,
    color: COLORS.textMuted,
  },

  // Response entries — primary content
  responseEntry: {
    paddingVertical: 8,
    paddingTop: 10,
  },
  responseText: {
    fontSize: 15,
    lineHeight: 22,
    color: COLORS.accent,
  },

  // Error entries
  errorEntryText: {
    fontSize: 13,
    lineHeight: 18,
    color: "rgba(248,113,113,0.9)",
  },

  emptyLog: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    paddingVertical: 60,
  },
  emptyLogText: {
    fontSize: 15,
    color: COLORS.textMuted,
    textAlign: "center",
    lineHeight: 24,
  },

  // Working indicator (above input)
  workingBar: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 20,
    paddingVertical: 8,
    gap: 8,
    backgroundColor: "rgba(0,0,0,0.5)",
  },
  workingText: {
    fontSize: 13,
    color: COLORS.textMuted,
  },

  // Chat bar sits at the bottom
  chatBar: {
    backgroundColor: "rgba(0,0,0,0.7)",
    paddingHorizontal: 16,
    paddingTop: 12,
    paddingBottom: 16,
  },

  // Error banner
  errorBanner: {
    marginBottom: 8,
    backgroundColor: "rgba(248,113,113,0.1)",
    borderWidth: 1,
    borderColor: "rgba(248,113,113,0.2)",
    borderRadius: 12,
    paddingHorizontal: 12,
    paddingVertical: 6,
  },
  errorBannerText: {
    fontSize: 12,
    color: "rgba(248,113,113,0.9)",
  },

  // Input row
  inputRow: {
    flexDirection: "row",
    alignItems: "flex-end",
    backgroundColor: "rgba(255,255,255,0.06)",
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.08)",
    borderRadius: 16,
    paddingLeft: 14,
    paddingRight: 6,
    paddingVertical: 4,
    gap: 6,
  },
  input: {
    flex: 1,
    fontSize: 15,
    color: "rgba(255,255,255,0.9)",
    paddingVertical: 8,
    maxHeight: 100,
  },
  sendButton: {
    width: 32,
    height: 32,
    borderRadius: 10,
    backgroundColor: "rgba(255,255,255,0.9)",
    justifyContent: "center",
    alignItems: "center",
    marginBottom: 4,
  },
  sendButtonDisabled: {
    opacity: 0.2,
  },
  sendButtonText: {
    fontSize: 16,
    color: "#000",
    fontWeight: "700",
  },
});
