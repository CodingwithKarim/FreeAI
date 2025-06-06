import React from "react";
import { Model } from "../../utils/types/types"
import { Listbox, ListboxButton, ListboxOption, ListboxOptions } from "@headlessui/react";
import { CheckIcon, ChevronUpDownIcon } from "@heroicons/react/20/solid";
import { CubeIcon } from "@heroicons/react/20/solid";
import { CircularProgress } from "@mui/material";

type ModelSelectorProps = {
  selectedModel: Model | undefined;
  models: Model[]
  onSelectModel: (model: Model) => void;
  isLoading: boolean;
}

export const ModelSelector: React.FC<ModelSelectorProps> = ({
  selectedModel,
  models,
  onSelectModel,
  isLoading
}) => {
  const placeholder: Model = {
    id: "__placeholder__",
    name: "Select a model",
    is_quantized: false,
    is_uncensored: false
  };

  const value = selectedModel ?? placeholder;

  // button text (falls back to placeholder.name)
  const displayName = value.name;

 return (
    <div className="flex-1">
      <label className="flex items-center text-sm font-semibold text-gray-700 mb-1 space-x-2">
        <CubeIcon className="w-5 h-5 text-purple-500"/>
        <span>Model</span>
      </label>

      <Listbox
        value={value}
        onChange={onSelectModel}
        disabled={isLoading}
      >
        <div className="relative">
          <ListboxButton
            className={`w-full px-4 py-3 bg-white rounded-xl shadow-sm flex justify-between items-center
              ${isLoading ? "opacity-70 cursor-not-allowed" : ""}
              transition`}
          >
            <div className="flex items-center">
              {isLoading && (
                <CircularProgress
                  color="inherit"
                  size={18}
                  thickness={6}
                  className="mr-3 text-purple-400"
                />
              )}
              <span>{isLoading ? "Loading Model…" : displayName}</span>
            </div>
            <ChevronUpDownIcon className="w-5 h-5 text-gray-500" />
          </ListboxButton>

          {!isLoading && (
            <ListboxOptions className="absolute z-10 mt-2 w-full max-h-32 overflow-auto rounded-2xl bg-white py-2 shadow-xl ring-1 ring-black/5 transition-all duration-200 scrollbar-thin scrollbar-thumb-gray-300 scrollbar-track-transparent outline-none">
              {models.map((m) => (
                <ListboxOption
                  key={m.id}
                  value={m}
                  className={({ active }) =>
                    `relative cursor-pointer select-none py-2 pl-4 pr-10 transition-all duration-200 ${
                      active
                        ? "bg-purple-100 text-purple-900"
                        : "text-gray-900"
                    }`
                  }
                >
                  {({ selected }) => (
                    <>
                      <span
                        className={`block truncate ${
                          selected ? "font-semibold" : "font-normal"
                        }`}
                      >
                        {m.name}
                      </span>
                      {selected && (
                        <span className="absolute inset-y-0 right-0 flex items-center pr-4 text-purple-600">
                          <CheckIcon className="w-5 h-5 stroke-purple-400" />
                        </span>
                      )}
                    </>
                  )}
                </ListboxOption>
              ))}
            </ListboxOptions>
          )}
        </div>
      </Listbox>
    </div>
  );
};