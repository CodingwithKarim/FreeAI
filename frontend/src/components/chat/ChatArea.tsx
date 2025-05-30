import React from "react";
import { ChatControls } from "./ChatControls";
import { ChatHistory } from "./ChatHistory";
import { ChatInput } from "./ChatInput";
import { useChat } from "../../context/ChatContext";

export const ChatArea: React.FC = () => {
  const {
    chatMessages,
    sharedContext,
    inputPrompt,
    isLoading,
    chatMode,
    maxNewTokens,
    setMaxNewTokens,
    setSharedContext,
    setInputPrompt,
    handleClearContext,
    handleSubmit,
    handleSetChatMode,
  } = useChat();

  return (
    <>
      <ChatControls
        sharedContext={sharedContext}
        onToggleSharedContext={() => setSharedContext(!sharedContext)}
        onClearContext={handleClearContext}
        chatMode={chatMode}
        setChatMode={handleSetChatMode}
        maxNewTokens={maxNewTokens}
        onMaxNewTokensChange={setMaxNewTokens}

      />
      <ChatHistory
        messages={chatMessages}
        isLoading={isLoading}
      />
      <ChatInput
        value={inputPrompt}
        onChange={setInputPrompt}
        onSubmit={handleSubmit}
        isLoading={isLoading}
      />
    </>
  );
};