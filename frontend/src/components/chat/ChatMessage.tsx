import React from "react";
import { ChatMessage as ChatMessageType } from "../../utils/types/types";

type ChatMessageProps = {
  message: ChatMessageType;
};

export const ChatMessage: React.FC<ChatMessageProps> = ({ message }) => {
  const isUser = message.role === "user";

  // bubble styles for user vs. bot
  const bubbleClasses = isUser
    ? [
        // purple‐themed for the user
        "bg-purple-50",          // very light purple bg
        "border border-purple-200", 
        "text-purple-800",        // dark purple text
        "rounded-tl-2xl rounded-br-2xl", 
      ]
    : [
        // neutral for the assistant
        "bg-white",
        "border border-gray-200",
        "text-gray-800",
        "rounded-tr-2xl rounded-bl-2xl",
      ];

  return (
    <div className={`flex mb-2 ${isUser ? "justify-end" : "justify-start"}`}>
      <div className="flex flex-col items-start space-y-1 max-w-[75%]">
        <span
          className={`text-xs ${
            isUser ? "text-purple-400" : "text-gray-400"
          }`}
        >
          {message.name} • {message.time}
        </span>
        <div
          className={[
            ...bubbleClasses,
            "px-5",
            "py-3",
            "shadow-sm",
          ].join(" ")}
        >
          {message.text}
        </div>
      </div>
    </div>
  );
};
