import React from "react";
import { Trash2 } from "lucide-react";
import { Button } from "../shared/Button";

type DeleteChatButtonProps = {
  onDeleteSession: () => void;
  disabled: boolean;
};

export const DeleteChatButton: React.FC<DeleteChatButtonProps> = ({
  onDeleteSession,
  disabled,
}) => {
  return (
    <Button
      onClick={onDeleteSession}
      disabled={disabled}
      className={`
        h-10 px-4 
        flex items-center justify-center 
        rounded-xl 
        border border-gray-200 
        shadow-sm 
        transition
        py-6
        ${disabled ? "text-gray-300" : "text-gray-300"}
      `}
    >
      <Trash2
        className={`
          w-6 h-5 
          transition-colors 
          ${disabled ? "text-gray-300" : "text-purple-600 hover:text-purple-600"}
        `}
        strokeWidth={2.5}
      />
    </Button>
  );
};
