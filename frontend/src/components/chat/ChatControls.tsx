// ChatControls.tsx
import React from "react";
import { ToggleSwitch } from "../shared/ToggleSwitch";
import { Button } from "../shared/Button";
import { Trash2 } from "react-feather";
import { ChatMode } from "@/utils/types/types";

interface TooltipProps {
  /** The element that will be hovered/focused to show the tooltip */
  children: React.ReactNode;
  /** The tooltip’s content */
  content: React.ReactNode;
}

const modes: {key: ChatMode, label: string}[] = [
  { key: "qa",           label: "Ask" },
  { key: "conversation", label: "Chat" },
  { key: "generate",     label: "Complete" },
];


export const Tooltip: React.FC<TooltipProps> = ({ children, content }) => (
  <div className="relative inline-block">
    <div className="group">
      {children}
      <div
        className={`
          absolute bottom-full left-1/2 transform -translate-x-1/2
          mt-0 mb-2
          pointer-events-none
          opacity-0 group-hover:opacity-100
          scale-75 group-hover:scale-100
          transition-all duration-200 ease-out
          z-50
        `}
      >
        <div
          className={`
            bg-purple-400 bg-opacity-90 backdrop-blur-sm
            text-white text-xs font-medium
            rounded-lg px-3 py-1
            shadow-lg
            whitespace-nowrap
            relative
          `}
        >
          {content}
          {/* little arrow */}
          <div
            className={`
              absolute top-full left-1/2
              w-2 h-2
              bg-gray-800 bg-opacity-90
              transform -translate-x-1/2 rotate-45
            `}
          />
        </div>
      </div>
    </div>
  </div>
);

export const ChatControls: React.FC<{
  sharedContext: boolean;
  onToggleSharedContext: () => void;
  onClearContext: () => void;
  chatMode: string;
  setChatMode: (chatMode: ChatMode) => void;
  maxNewTokens: number;
  onMaxNewTokensChange: (maxNewTokens: number) => void;

}> = ({
  sharedContext,
  onToggleSharedContext,
  onClearContext,
  chatMode,
  setChatMode,
  maxNewTokens,
  onMaxNewTokensChange
}) => {
       return (
    <div className="flex flex-wrap items-center justify-between gap-4 bg-white p-4 rounded-2xl shadow">
      {/* Segmented control */}
      <div className="inline-flex border border-gray-200 rounded-lg bg-white-100 overflow-hidden">
        {modes.map(({ key, label }, i) => (
          <button
            key={key}
            onClick={() => setChatMode(key)}
            className={`
              px-4 py-1.5 text-sm font-medium transition-colors duration-150
              focus:outline-none focus:ring-2 focus:ring-purple-300
              ${chatMode === key
                ? "bg-purple-400 text-white"
                : "text-gray-600 hover:bg-gray-200"}
              ${i === 0 ? "rounded-l-lg" : ""}
              ${i === modes.length - 1 ? "rounded-r-lg" : ""}
            `}
          >
            {label}
          </button>
        ))}
      </div>

      {/* Max Tokens */}
      <div className="inline-flex items-center border border-gray-200 rounded-lg px-3 py-1.5">
        <span className="text-sm text-gray-600 mr-1">Max Tokens:</span>
        <input
          type="number" min={1} max={2048}
          className="w-8 bg-transparent text-right text-md font-medium focus:outline-none"
          value={maxNewTokens}
          onChange={e => onMaxNewTokensChange(+e.target.value)}
        />
      </div>

      {/* Share Context */}
      <ToggleSwitch
        isOn={sharedContext}
        onToggle={onToggleSharedContext}
        label="Share Context"
        disabled={chatMode !== "conversation"}
      />

      {/* Clear Context */}
      <Button
        onClick={onClearContext}
        variant="purp"
        className="rounded-lg px-4 py-1.5"
        icon={<Trash2 className="w-4 h-4" />}
        disabled={chatMode !== "conversation"}
      >
        Clear Context
      </Button>
    </div>
  );
  };
