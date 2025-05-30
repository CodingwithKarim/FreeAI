import React from "react";

export const LoadingIndicator: React.FC = () => {
  return (
    <div className="flex justify-center mt-9">
      <div className="flex space-x-2">
        <div
          className="w-2 h-2 bg-purple-400 animate-bounce rounded-full"
          style={{ animationDelay: "0s" }}
        />
        <div
          className="w-2 h-2 bg-purple-400 animate-bounce rounded-full"
          style={{ animationDelay: "0.2s" }}
        />
        <div
          className="w-2 h-2 bg-purple-400 animate-bounce rounded-full"
          style={{ animationDelay: "0.4s" }}
        />
      </div>
    </div>
  );
};
