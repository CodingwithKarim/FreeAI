export type Session = {
    id: string;
    name: string;
  };

export type SessionSelectorProps = {
    sessions: Session[];
    selectedSession: string;
    onSelectSession: (sessionId: string) => void;
}

export type Model = {
  id: string;
  name: string;
  is_quantized: boolean;
  is_uncensored: boolean;
};

export type ChatMessage = {
  role: "user" | "assistant";
  name: string;
  time: string;
  text: string;
};

export interface ModelSearchData {
    id: string;
    size: string;
    downloads: number;
    likes: number;
    isQuantized: boolean;
    isUncensored: boolean;
    trending_score: number;
}

export type Provider = "OpenAI" | "Anthropic" | "Google" |  "Groq" | "Perplexity" | "Cohere" | "HuggingFace" | ""

export type ModelDropdownFilters = "Uncensored" | "Quantized" | "All Filters"

export type ChatMode = "conversation" | "qa" | "generate"