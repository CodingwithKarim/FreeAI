import React, { createContext, useContext, useState, useEffect } from "react";
import Swal from "sweetalert2";
import {
  ChatMessage,
  ChatMode,
  Model,
  ModelSearchData,
  Session,
} from "../utils/types/types";
import {
  fetchSessions,
  createSession,
  deleteSession
} from "../api/session";
import {
  fetchModels
} from "../api/modelApi";
import {
  fetchChatHistory,
  sendChatMessage,
  clearChatContext
} from "../api/chatApi";

type ChatContextType = {
  // Data states
  sessions: Session[];
  models: Model[];
  filteredModels: Model[];
  // providers: Provider[];
  chatMessages: ChatMessage[];

  // Selection states
  selectedSession: string;
  selectedModel: Model | undefined;
  selectedFilter: string;
  sharedContext: boolean;
  inputPrompt: string;
  isLoading: boolean;
  chatMode: ChatMode;
  maxNewTokens: number;
  isLoadingModel: boolean;
  initialModels: ModelSearchData[]

  // Actions
  setSelectedSession: (id: string) => void;
  setSelectedFilter: (filter: string) => void;
  setSharedContext: (shared: boolean) => void;
  setInputPrompt: (prompt: string) => void;
  setMaxNewTokens: (maxNewTokens: number) => void;
  setModels: React.Dispatch<React.SetStateAction<Model[]>>;
  setIsLoadingModel: React.Dispatch<React.SetStateAction<boolean>>;

  // Operations
  handleNewChat: () => Promise<void>;
  handleDeleteSession: () => Promise<void>;
  handleClearContext: () => Promise<void>;
  handleSubmit: () => Promise<void>;
  handleSelectModel: (id: Model) => Promise<void>
  handleSelectSession: (id: string) => Promise<void>;
  handleSetChatMode: (mode: ChatMode) => Promise<void>;
};

const ChatContext = createContext<ChatContextType | undefined>(undefined);

export const ChatProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  // Data states
  const [initialModels, setInitialModels] = useState<ModelSearchData[]>([]);
  const [sessions, setSessions] = useState<Session[]>([]);
  const [models, setModels] = useState<Model[]>([]);
  const [filteredModels, setFilteredModels] = useState<Model[]>([]);
  const [chatMessages, setChatMessages] = useState<ChatMessage[]>([]);

  const [conversationHistory, setConversationHistory] = useState<ChatMessage[]>([]);

  // Selection states
  const [selectedSession, setSelectedSession] = useState<string>("");
  const [selectedModel, setSelectedModel] = useState<Model>();
  const [selectedFilter, setSelectedFilter] = useState<string>("All Filters");
  const [sharedContext, setSharedContext] = useState<boolean>(false);
  const [inputPrompt, setInputPrompt] = useState<string>("");
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [chatMode, setChatMode] = useState<ChatMode>("conversation")
  const [maxNewTokens, setMaxNewTokens] = useState<number>(100);
  const [isLoadingModel, setIsLoadingModel] = useState<boolean>(false);

  const sessionActive = Boolean(selectedSession);

  // Initial data loading
  useEffect(() => {
    fetchSessions()
      .then(setSessions)
      .catch(console.error);

    fetchModels()
      .then((modelList) => {
        setModels(modelList);
        setFilteredModels(modelList)
      })
      .catch(console.error);
  }, []);

useEffect(() => {
  const fetchInitialModels = async () => {
    try {
      const res = await fetch("api/models/search", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          query: "",
          limit: 3,
          sortBy: "downloads",
          filters: [],
        }),
      });
      const data = await res.json();

      const topModels: ModelSearchData[] = (data.models || []).map((m: any) => ({
        id: m.id,
        size: String(m.size),
        downloads: Number(m.downloads),
        likes: Number(m.likes),
        isQuantized: Boolean(m.isQuantized),
        isUncensored: Boolean(m.isUncensored),
        trending_score: Number(m.trending_score || 0),
      }));

      console.log(topModels)

      setInitialModels(topModels);
    } catch (err) {
      console.error("Initial model fetch failed", err);
    }
  };

  fetchInitialModels();
}, []);

  useEffect(() => {
    if (!selectedSession) return;

    setSelectedFilter("")
    setSharedContext(false);
    setChatMessages([]);
    setConversationHistory([])
    setChatMode("conversation")

    setSelectedModel(undefined)

  }, [selectedSession]);

  useEffect(() => {
    let newList: Model[];

    switch (selectedFilter) {
      case "Quantized":
        console.log("testing IsQuantized")
        newList = models.filter(m => m.is_quantized);
        break;
      case "Uncensored":
        newList = models.filter(m => m.is_uncensored);
        break;
      default: // "All Filters"
        newList = models;
    }

    setFilteredModels(newList);

    if (!newList.some(model => model.id === selectedModel?.id)) {
      setSelectedModel(undefined)
    }

  }, [selectedFilter, models]);

  useEffect(() => {
    if (!sessionActive || !selectedModel) return;

    fetchChatHistory(selectedSession, selectedModel.id, sharedContext)
      .then(history => {
        setConversationHistory(history);

        // if we’re already in Conversation mode, show it immediately
        if (chatMode === "conversation") {
          setChatMessages(history);
        }
      })
      .catch(console.error);
  }, [
    selectedSession,
    selectedModel,
    sharedContext,
  ]);

  useEffect(() => {
    if (chatMode === "conversation") {
      setConversationHistory(chatMessages);
    }
  }, [chatMessages, chatMode]);

  useEffect(() => {
    if (!selectedModel) return;
    if (chatMode !== "conversation") {
      setChatMessages([]);
    }
  }, [selectedModel, chatMode]);

  const handleSetChatMode = async (mode: ChatMode) => {
    if (mode === "conversation") {
      setChatMessages(conversationHistory);
    } else {
      setChatMessages([]);
    }

    setChatMode(mode);
  }

  // Operation handlers
  const handleNewChat = async () => {
    const { value: name } = await Swal.fire<string>({
      title: "Enter Chat Name",
      input: "text",
      inputPlaceholder: "Type a chat name…",
      showCancelButton: true,
      confirmButtonText: "Create",
      cancelButtonText: "Cancel",
      returnFocus: false,
      customClass: {
        popup: "rounded-2xl p-6 shadow-lg bg-white",
        title: "text-xl font-semibold text-gray-800",
        input: "border border-gray-300 rounded-lg p-2 focus:ring-purple-400 focus:border-purple-500",
        actions: "mt-6 flex justify-end space-x-3",
        confirmButton: "px-4 py-2 rounded-lg bg-purple-400 hover:bg-purple-500 text-white",
        cancelButton: "px-4 py-2 rounded-lg bg-gray-200 hover:bg-gray-300 text-gray-700",
      },
      width: 400,
      backdrop: 'rgba(31, 41, 55, 0.6)',
      buttonsStyling: false,
      inputValidator(value) {
        if (!value || !value.trim()) {
          return "Chat name cannot be empty"
        }
      },
    });

    if (!name?.trim()) return;

    try {
      const session = await createSession(name.trim());
      setSessions((prev) => [...prev, session]);

      console.log("New session created:", session);

      setSelectedSession(session.id);

      setChatMessages([]);
      setSelectedFilter("");
      setSharedContext(false);
    } catch (error) {
      console.error(error);
    }
  };

  const handleDeleteSession = async () => {
    console.log("Session active:", sessionActive);
    if (!sessionActive) return;

    // 1) fire the warning
    const { isConfirmed } = await Swal.fire({
      icon: "warning",
      iconColor: "#A78BFA",  // tailwind’s purple-400
      showCancelButton: true,
      confirmButtonText: "Yes, delete it",
      cancelButtonText: "Cancel",
      reverseButtons: false,        // confirm on right
      buttonsStyling: false,
      width: 400,
      backdrop: "rgba(31, 41, 55, 0.6)",
      customClass: {
        popup: "rounded-2xl bg-white p-8 text-center shadow-xl",
        icon: "swal2-icon swal2-warning text-purple-400 w-16 h-16 mx-auto mb-4",
        title: "text-2xl font-bold text-gray-900 mb-2",
        htmlContainer: "text-gray-600 mb-6",
        actions: "flex justify-center space-x-4",
        confirmButton:
          "px-6 py-2 rounded-lg font-medium text-white " +
          "bg-gradient-to-tr from-purple-400 to-purple-500 " +
          "hover:from-purple-500 hover:to-purple-600 shadow-md",
        cancelButton:
          "px-6 py-2 rounded-lg font-medium text-gray-700 " +
          "bg-white border border-gray-300 hover:bg-gray-100",
      },
      title: `<span>Are you sure?</span>`,
      html: `<p>Deleting this chat is permanent and cannot be undone.</p>`,
      showClass: {
        popup: "animate__animated animate__fadeInDown",
      },
      hideClass: {
        popup: "animate__animated animate__fadeOutUp",
      },
    });

    // 2) if they clicked “Yes”
    if (!isConfirmed) return;

    try {
      const success = await deleteSession(selectedSession);

      console.log("Session deleted:", success);
      if (success) {
        setSessions((prev) => prev.filter((s) => s.id !== selectedSession));
        setSelectedSession("");
        setChatMessages([]);

        // optional success toast
        await Swal.fire({
          icon: "success",
          iconColor: "#A78BFA",
          title: "Deleted!",
          html: "<p>Your chat has been removed.</p>",
          showConfirmButton: false,
          timer: 1500,
          width: 380,
          backdrop: "rgba(31, 41, 55, 0.6)",
          customClass: {
            popup: "rounded-2xl bg-white p-8 text-center shadow-xl",
            icon: "swal2-icon swal2-success text-purple-400 w-16 h-16 mx-auto mb-4",
            title: "text-2xl font-semibold text-purple-600 mb-2",
            htmlContainer: "text-base text-gray-600 mb-0",
          },
          showClass: { popup: "animate__animated animate__fadeInDown" },
          hideClass: { popup: "animate__animated animate__fadeOutUp" },
        });
      }
    } catch (error) {
      console.error(error);
      await Swal.fire({
        icon: "error",
        title: "Oops…",
        text: "Something went wrong. Please try again.",
      });
    }
  };

  const handleClearContext = async () => {
    if (!sessionActive || !selectedModel) return;

    const warningMessage = sharedContext
      ? "This will delete all messages associated with this session across all models."
      : "This will delete messages for the selected model only.";

    const { isConfirmed } = await Swal.fire({
      title: "Clear Chat Context?",
      text: warningMessage,
      icon: "warning",
      iconColor: "#A78BFA", 
      showCancelButton: true,
      confirmButtonText: "Yes, clear it",
      cancelButtonText: "Cancel",
      buttonsStyling: false,
      customClass: {
        popup: "rounded-2xl p-6 shadow-lg bg-white",
        title: "text-lg font-semibold text-gray-800",
        htmlContainer: "text-sm text-gray-600 mt-2",
        confirmButton: "px-5 py-2.5 rounded-lg bg-red-600 hover:bg-red-700 text-white font-medium",
        cancelButton: "px-5 py-2.5 rounded-lg bg-gray-200 hover:bg-gray-300 text-gray-700 font-medium",
        actions: "mt-6 flex justify-end space-x-4",
      },
      backdrop: 'rgba(31, 41, 55, 0.6)',
    });

    if (!isConfirmed) return;

    try {
      await clearChatContext(selectedSession, selectedModel.id, sharedContext);
      const messages = await fetchChatHistory(selectedSession, selectedModel.id, sharedContext);
      setChatMessages(messages);

      await Swal.fire({
        icon: "success",
        iconColor: "#A78BFA",
        title: "Context Cleared!",
        text: "Chat history has been reset.",
        timer: 1500,
        showConfirmButton: false,
      });
    } catch (error) {
      console.error(error);
      await Swal.fire({
        icon: "error",
        title: "Error",
        text: "Failed to clear chat context. Please try again.",
      });
    }
  };

  const handleSubmit = async () => {
    if (!inputPrompt.trim() || !sessionActive || !selectedModel || isLoading) return;

    setIsLoading(true);

    const txt = inputPrompt.trim();

    setInputPrompt("");

    if (chatMode === "qa" || chatMode === "generate") setChatMessages([]);

    setChatMessages((prev) => [
      ...prev,
      {
        role: "user",
        name: "You",
        time: new Date().toLocaleTimeString([], {
          hour: "2-digit",
          minute: "2-digit",
        }),
        text: txt,
      },
    ]);



    try {
      const response = await sendChatMessage(
        selectedSession,
        selectedModel.id,
        selectedModel.name,
        txt,
        chatMode,
        maxNewTokens,
        sharedContext
      );

      if (typeof response !== "string") {
        return
      }

      setChatMessages((prev) => [
        ...prev,
        {
          role: "assistant",
          name: selectedModel.name,
          time: new Date().toLocaleTimeString([], {
            hour: "2-digit",
            minute: "2-digit",
          }),
          text: response,
        },
      ]);

      console.log(chatMessages)
    } catch (error) {
      alert("Something went wrong.");
      console.error(error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleSelectModel = async (selectedModel: Model) => {
    const { value: precision } = await Swal.fire<string>({
      title: "Select Precision Limit",
      html: `
    <div class="grid gap-4">
      
      <!-- 4-bit: neutral until checked → purple-400 -->
      <label class="flex items-center p-4 bg-white border border-gray-200 rounded-2xl shadow-sm hover:shadow-lg transition cursor-pointer">
        <input type="radio" name="precision" value="4bit" class="sr-only peer" />
        <span class="
          flex-shrink-0 w-6 h-6 mr-4 flex items-center justify-center
          rounded-full bg-gray-100 
          transition-colors
          peer-checked:bg-purple-400
        ">
          <div class="
            w-3 h-3 rounded-full bg-purple-400
            opacity-0 peer-checked:opacity-100
            transition-opacity
          "></div>
        </span>
        <div>
          <p class="font-semibold text-gray-900">4-bit</p>
          <p class="text-sm text-gray-500">Lowest VRAM</p>
        </div>
      </label>

      <!-- 8-bit: neutral until checked → purple-700 -->
      <label class="flex items-center p-4 bg-white border border-gray-200 rounded-2xl shadow-sm hover:shadow-lg transition cursor-pointer">
        <input type="radio" name="precision" value="8bit" class="sr-only peer" />
        <span class="
          flex-shrink-0 w-6 h-6 mr-4 flex items-center justify-center
          rounded-full bg-gray-100 
          transition-colors
          peer-checked:bg-purple-700
        ">
          <div class="
            w-3 h-3 rounded-full bg-purple-700
            opacity-0 peer-checked:opacity-100
            transition-opacity
          "></div>
        </span>
        <div>
          <p class="font-semibold text-gray-900">8-bit</p>
          <p class="text-sm text-gray-500">Middle ground</p>
        </div>
      </label>

      <!-- Standard: neutral until checked → purple-950 -->
      <label class="flex items-center p-4 bg-white border border-gray-200 rounded-2xl shadow-sm hover:shadow-lg transition cursor-pointer">
        <input type="radio" name="precision" value="standard" class="sr-only peer" />
        <span class="
          flex-shrink-0 w-6 h-6 mr-4 flex items-center justify-center
          rounded-full bg-gray-100 
          transition-colors
          peer-checked:bg-purple-950
        ">
          <div class="
            w-3 h-3 rounded-full bg-purple-950
            opacity-0 peer-checked:opacity-100
            transition-opacity
          "></div>
        </span>
        <div>
          <p class="font-semibold text-gray-900">Standard</p>
          <p class="text-sm text-gray-500">FP16 / FP32</p>
        </div>
      </label>

    </div>
  `,
      showCancelButton: true,
      confirmButtonText: "Load Model",
      cancelButtonText: "Cancel",
      focusConfirm: false,
      customClass: {
        popup: "bg-white rounded-2xl shadow-2xl p-6 max-w-md mx-auto",
        title: "text-2xl font-bold text-gray-900 mb-5",
        htmlContainer: "mb-5",
        confirmButton: "px-6 py-2 bg-purple-400 text-white rounded-lg hover:bg-purple-700",
        cancelButton: "px-6 py-2 bg-gray-200 text-gray-800 rounded-lg hover:bg-gray-300",
      },
      preConfirm: () => {
        const v = document.querySelector<HTMLInputElement>('input[name="precision"]:checked')?.value;
        if (!v) Swal.showValidationMessage("Please pick one style");
        return v;
      }
    });

    if (!precision) {
      return;
    }

    setIsLoadingModel(true);

    try {
      const resp = await fetch("api/models/load", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ model_id: selectedModel?.id, precision: precision }),
      });

      if (!resp.ok) {
        console.log("response failed")
        const body = await resp.json().catch(() => ({}));
        const msg = (body as any).detail || `HTTP ${resp.status}`;
        throw new Error(msg);
      }

      let state;
      do {
        const res = await fetch("api/models/load/status");

        const responseModels = await res.json();

        console.log(responseModels)

        const me = (responseModels as any[]).find((m: any) => m.model_id === selectedModel.id);

        state = me?.status;

        if (state === "loading") {
          await new Promise(r => setTimeout(r, 1000));
        } else if (state === "error") {
          throw new Error("Model load failed");
        }
      } while (state === "loading");

      setSelectedModel(selectedModel);

    }
    catch (err: any) {
      console.error("Failed to load model:", err);
      setSelectedModel(undefined);
    }
    finally {
      setIsLoadingModel(false);
    }
  }

  const handleSelectSession = async (sessionID: string) => {
    try {
      const resp = await fetch("api/sessions/cache", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id: sessionID }),
      });

      if (!resp.ok) {
        console.log("response failed")
        const body = await resp.json().catch(() => ({}));
        const msg = (body as any).detail || `HTTP ${resp.status}`;
        throw new Error(msg);
      }

      setSelectedSession(sessionID)
    }
    catch (error: any) {
      console.log(error);
    }
  }

  const value = {
    // Data states
    sessions,
    models,
    filteredModels,
    // providers,
    chatMessages,

    // Selection states
    selectedSession,
    selectedModel,
    selectedFilter,
    sharedContext,
    inputPrompt,
    isLoading,
    chatMode,
    maxNewTokens,
    isLoadingModel,
    initialModels,

    // Setters
    setSelectedSession,
    setSelectedModel,
    setSelectedFilter,
    setSharedContext,
    setInputPrompt,
    setMaxNewTokens,
    setModels,
    setIsLoadingModel,

    // Operations
    handleNewChat,
    handleDeleteSession,
    handleClearContext,
    handleSubmit,
    handleSelectModel,
    handleSelectSession,
    handleSetChatMode,
  };

  return (
    <ChatContext.Provider value={value}>
      {children}
    </ChatContext.Provider>
  );
};

export const useChat = (): ChatContextType => {
  const context = useContext(ChatContext);
  if (context === undefined) {
    throw new Error("useChat must be used within a ChatProvider");
  }
  return context;
};