import React from "react";
import {
  Listbox,
  ListboxButton,
  ListboxOptions,
  ListboxOption,
} from "@headlessui/react";
import { CheckIcon, ChevronUpDownIcon } from "@heroicons/react/20/solid";
import { FunnelIcon } from "@heroicons/react/24/solid";

// Create object-based filters like your models
const FILTER_OBJECTS = [
  { id: "All Filters", label: "All Filters" },
  { id: "Quantized", label: "Quantized" },
  { id: "Uncensored", label: "Unbiased + Uncensored" },
];

type ModelFiltersProps = {
  selectedFilter: string;
  onSelectFilter: (filter: string) => void;
};

export const ModelFilters: React.FC<ModelFiltersProps> = ({
  selectedFilter,
  onSelectFilter,
}) => {
  return (
    <div className="flex-1">
      <label className="flex items-center text-sm font-semibold text-gray-700 mb-1 space-x-2">
        <FunnelIcon className="w-5 h-5 text-purple-500" aria-hidden />
        <span>Filter By</span>
      </label>

      <Listbox
        value={selectedFilter}
        onChange={onSelectFilter}
      >
        <div className="relative">
          <ListboxButton className="w-full px-4 py-3 bg-white rounded-xl shadow-sm flex justify-between items-center focus:ring-2 focus:ring-indigo-300 transition">
            {FILTER_OBJECTS.find((f) => f.id === selectedFilter)?.label || "All Filters"}
            <ChevronUpDownIcon className="w-5 h-5 text-gray-500" />
          </ListboxButton>

          <ListboxOptions className="absolute z-10 mt-2 w-full max-h-34 overflow-auto rounded-2xl bg-white py-2 shadow-xl ring-1 ring-black/5 transition-all duration-200 scrollbar-thin scrollbar-thumb-gray-300 scrollbar-track-transparent outline-none">
            {FILTER_OBJECTS.map((filter) => (
              <ListboxOption
                key={filter.id}
                value={filter.id}
                className={({ active }) =>
                  `relative cursor-pointer select-none py-2 pl-4 pr-10 transition-all duration-200 ${active ? "bg-purple-100 text-purple-900" : "text-gray-900"
                  }`
                }
              >
                {({ selected }) => (
                  <>
                    <span className={`block truncate ${selected ? "font-semibold" : "font-normal"}`}>
                      {filter.label}
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
        </div>
      </Listbox >
    </div >
  );
};