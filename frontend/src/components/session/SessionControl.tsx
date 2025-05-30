import React from "react";
import { ChatSelector } from "./ChatSelector";
import { NewChatButton } from "./NewChatButton";
import { DeleteChatButton } from "./DeleteChatButton";
import { useChat } from "../../context/ChatContext";
import { ChatBubbleLeftRightIcon } from "@heroicons/react/24/solid";

export const SessionControl: React.FC = () => {
  const {
    sessions,
    selectedSession,
    handleSelectSession,
    handleNewChat,
    handleDeleteSession,
  } = useChat();

  const sessionActive = Boolean(selectedSession);

  return (
    <div className="mb-6">
      <label className="inline-flex items-center text-sm font-semibold text-gray-700 mb-1 space-x-2">
        <ChatBubbleLeftRightIcon className="w-5 h-5 ml-1 text-purple-600" aria-hidden />
        <span>Chat Session</span>
      </label>
      <div className="flex items-center gap-4">
        <ChatSelector
          sessions={sessions}
          selectedSession={selectedSession}
          onSelectSession={handleSelectSession}
        />
        <NewChatButton onNewSession={handleNewChat} />
        <DeleteChatButton
          onDeleteSession={handleDeleteSession}
          disabled={!sessionActive}
        />
      </div>
    </div>
  );
};