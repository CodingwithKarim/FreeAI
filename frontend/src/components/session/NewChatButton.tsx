import React from "react";
import { Button } from "../shared/Button";
import { Plus } from "lucide-react";

type NewChatButtonProps = {
  onNewSession: () => void;
};

export const NewChatButton: React.FC<NewChatButtonProps> = ({ onNewSession }) => {
  return (
    <Button
      onClick={onNewSession}
      className="flex items-center px-6 py-3 !bg-purple-400 text-glow text-white font-large rounded-xl shadow-sm hover:shadow-md transition"
    >
      <Plus className="inline-block w-5 h-5 mr-2 text-white pb-0.5"/>
      New Chat
    </Button>
  );
};
