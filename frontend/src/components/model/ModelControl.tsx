import React from "react";
import ModelSearch from "./ModelSearch";
import { ModelSelector } from "./ModelSelector";
import { useChat } from "../../context/ChatContext";
import { ModelFilters } from "./ModelFilter";

export const ModelControl: React.FC = () => {
  const {
    filteredModels,
    selectedModel,
    selectedFilter,
    handleSelectModel,
    setSelectedFilter,
    setModels,
    isLoadingModel,
    initialModels
  } = useChat();

  return (
    <div className="mb-6">
      <div className="flex items-center gap-8">
        <ModelSearch setDropdownModels={setModels} initialModels={initialModels}  />

        <ModelFilters
          selectedFilter={selectedFilter}
          onSelectFilter={setSelectedFilter}
        />

        <ModelSelector
          models={filteredModels}
          selectedModel={selectedModel}
          onSelectModel={handleSelectModel}
          isLoading={isLoadingModel}
        />
      </div>
    </div>
  );
};