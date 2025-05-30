import { ChatMessage } from "../utils/types/types";

export const fetchChatHistory = async (
  sessionID: string,
  modelID: string,
  sharedContext: boolean
): Promise<ChatMessage[]> => {
  try {
    const r = await fetch("/api/models/history", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({"session_id": sessionID, "model_id": modelID, "share_context": sharedContext }),
    });
    const d = await r.json();
    const msgs: ChatMessage[] = (d.messages || []).map((m: any) => ({
      role: m.role,
      name: m.role === "user" ? "You" : (m.name),
      time: new Date(m.timestamp).toLocaleTimeString([], {
        hour: "2-digit",
        minute: "2-digit",
      }),
      text: m.content,
    }));
    return msgs;
  } catch (error) {
    console.error(error);
    return [];
  }
};

export const sendChatMessage = async (
  sessionID: string,
  modelID: string,
  modelName: string,
  inputMessage: string,
  mode: string,
  maxNewTokens: number,
  sharedContext: boolean
): Promise<string> => {
  const res = await fetch("/api/models/infer", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      "session_id": sessionID,
      "model_id": modelID,
      "name": modelName,
      "prompt": inputMessage,
      "share_context": sharedContext,
      mode,
      "max_new_tokens": maxNewTokens,
    }),
  });
  if (!res.ok) throw new Error("Failed to send message");
  console.log("Response: ", res);
  const { message } = await res.json();
  return message;
};

export const clearChatContext = async (
  sessionID: string,
  modelID: string,
  sharedContext: boolean
): Promise<void> => {
  await fetch("/api/models/clear", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      "session_id": sessionID,
      "model_id": modelID,
      "share_context": sharedContext,
    }),
  });
};