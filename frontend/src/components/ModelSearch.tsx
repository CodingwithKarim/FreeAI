
import React, { useState, useEffect, useRef, useCallback } from "react";
import { Search, Zap, Cpu, Heart } from "lucide-react";

// Import shadcn components
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { ScrollArea } from "@/components/ui/scroll-area";
import lodash from "lodash";

// Type definitions
export interface ModelData {
  id: string;
  size: string;
  downloads: number;
  likes: number;
  isQuantized: boolean;
}

interface ModelOptionProps {
  label: string;
  size: string;
  downloads: number;
  likes: number;
  isQuantized: boolean;
  onClick: () => void;
}

// Model option component
const ModelOption: React.FC<ModelOptionProps> = ({ label, size, downloads, likes, isQuantized, onClick }) => {
  // Function to format long strings by inserting zero-width spaces
  const formatWithBreaks = (text: string) => {
    // Insert a zero-width space character after every 10 characters 
    // in segments that don't have spaces or hyphens
    return text.replace(/([^\s-]{10})/g, '$1\u200B');
  };

  return (
    <button
      className="w-full flex items-center justify-between py-3 px-3 hover:bg-gray-50 transition-colors focus:outline-none focus:bg-gray-50"
      onClick={onClick}
      style={{ maxWidth: '100%' }}
    >
      <div className="flex items-center gap-3 w-full min-w-0 max-w-full">
        <div className="flex-shrink-0">
          <div className={isQuantized ? "text-green-500" : "text-blue-500"}>
            {isQuantized ? <Zap className="h-5 w-5" /> : <Cpu className="h-5 w-5" />}
          </div>
        </div>
        <div className="text-left w-full min-w-0 overflow-hidden max-w-full">
          <div 
            className="text-sm text-gray-900 max-w-full"
            style={{
              overflowWrap: 'break-word',
              wordBreak: 'break-all',
              whiteSpace: 'normal'
            }}
          >
            {formatWithBreaks(label)}
          </div>
          <div className="flex items-center flex-wrap gap-2 mt-0.5">
            <span className="text-xs text-gray-500 flex-shrink-0">{parseFloat(size).toFixed(1)} GB</span>
            <span className="text-xs text-gray-400 flex-shrink-0">•</span>
            <span className="text-xs text-gray-500 flex-shrink-0">{downloads.toLocaleString()} downloads</span>
            <span className="text-xs text-gray-400 flex-shrink-0">•</span>
            <div className="flex items-center gap-1 flex-shrink-0">
              <Heart className="h-3 w-3 text-red-400" />
              <span className="text-xs text-gray-500">{likes.toLocaleString()}</span>
            </div>
          </div>
        </div>
      </div>
    </button>
  );
};

// Results count header
const ResultsHeader: React.FC<{ count: number }> = ({ count }) => (
  <div className="text-xs text-gray-500 font-medium">
    RESULTS ({count})
  </div>
);

// Main component
export default function ModelSearch() {
  // States
  const [open, setOpen] = useState<boolean>(false);
  const [query, setQuery] = useState<string>("");
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [models, setModels] = useState<ModelData[]>([]);
  const [selected, setSelected] = useState<ModelData | null>(null);
  const [sortBy, setSortBy] = useState<string>("downloads");
  const [dialogKey, setDialogKey] = useState<number>(0); // Force dialog re-render when needed

  // Refs
  const inputRef = useRef<HTMLInputElement>(null);
  const scrollAreaRef = useRef<HTMLDivElement>(null);

  // Mock data for demonstration
  const mockModels: ModelData[] = [
    { id: "unsloth/DeepSeek-R1-Distill-Llama-8B-unsloth-bnb-4bitqqqqqqqqqqq", size: "5.55", downloads: 136239, likes: 3427, isQuantized: true },
    { id: "unsloth/DeepSeek-R1-Distill-Qwen-1.5B-unsloth-bnb-4bit", size: "1.68", downloads: 89754, likes: 2105, isQuantized: true },
    { id: "unsloth/DeepSeek-R1-Distill-Qwen-7B-unsloth-bnb-4bit", size: "7.90", downloads: 33710, likes: 982, isQuantized: true },
    { id: "unsloth/DeepSeek-R1-Distill-Qwen-32B-bnb-4bit", size: "17.86", downloads: 21747, likes: 543, isQuantized: true },
    { id: "deepseek-ai/deepseek-llm-7b-base", size: "13.42", downloads: 67520, likes: 1876, isQuantized: false },
    { id: "deepseek-ai/deepseek-coder-6.7b-instruct", size: "12.86", downloads: 45230, likes: 1432, isQuantized: false }
  ];

  // The actual search function that makes API calls
  const performSearch = async (searchQuery: string): Promise<void> => {
    if (searchQuery.length < 0) {
      setModels([]);
      setIsLoading(false);
      return;
    }
    
    setIsLoading(true);
    
    try {
      // Use a real API endpoint
      const response = await fetch(`/models?query=${encodeURIComponent(searchQuery)}`);
      
      if (!response.ok) {
        throw new Error(`API request failed with status ${response.status}`);
      }
      
      const data = await response.json();
      const apiModels = data.models || [];
      
      console.log("Fetched models count:", apiModels.length);

      // Process models to ensure consistent formatting
      const processedModels = apiModels.map((model: any) => ({
        ...model,
        // Ensure size is a string
        size: typeof model.size === 'number' ? model.size.toString() : model.size,
        // Ensure downloads is a number
        downloads: typeof model.downloads === 'string' ? parseInt(model.downloads, 10) : model.downloads,
        // Ensure likes is a number
        likes: typeof model.likes === 'string' ? parseInt(model.likes, 10) : model.likes
      }));

      // Sort the results based on current sortBy value
      const sorted = [...processedModels];
      if (sortBy === "downloads") {
        sorted.sort((a, b) => b.downloads - a.downloads);
      } else if (sortBy === "size") {
        sorted.sort((a, b) => parseFloat(a.size) - parseFloat(b.size));
      } else if (sortBy === "name") {
        sorted.sort((a, b) => a.id.localeCompare(b.id));
      } else if (sortBy === "likes") {
        sorted.sort((a, b) => b.likes - a.likes);
      }

      // Update state in a single batch
      setModels(sorted);
    } catch (error) {
      console.error("Error fetching models:", error);
      
      // Fallback to mock data if API fails
      console.log("Falling back to mock data");
      const filtered = mockModels.filter(model => 
        model.id.toLowerCase().includes(searchQuery.toLowerCase())
      );
      
      // Sort the filtered results
      const sorted = [...filtered];
      if (sortBy === "downloads") {
        sorted.sort((a, b) => b.downloads - a.downloads);
      } else if (sortBy === "size") {
        sorted.sort((a, b) => parseFloat(a.size) - parseFloat(b.size));
      } else if (sortBy === "name") {
        sorted.sort((a, b) => a.id.localeCompare(b.id));
      } else if (sortBy === "likes") {
        sorted.sort((a, b) => b.likes - a.likes);
      }
      
      setModels(sorted);
    } finally {
      setIsLoading(false);
    }
  };

  // Create a debounced version of the search function
  // eslint-disable-next-line react-hooks/exhaustive-deps
  const debouncedSearch = useCallback(
    lodash.debounce((searchQuery: string) => {
      performSearch(searchQuery);
    }, 1000), // 300ms delay
    [sortBy] // Re-create when sort option changes
  );

  // Handle input change
  const handleSearch = (e: React.ChangeEvent<HTMLInputElement>): void => {
    const value = e.target.value;
    setQuery(value);
    
    // Reset models first to clear any existing UI state
    if (value.length < 1) {
      setModels([]);
      setIsLoading(false);
    } else {
      setIsLoading(true);
      debouncedSearch(value);
    }
  };

  const handleSelect = (model: ModelData): void => {
    setSelected(model);
    setOpen(false);
  };

  // Focus input when dialog opens
  useEffect(() => {
    if (open) {
      // Reset the dialog state when opening
      setQuery("");
      setModels([]);
      setIsLoading(false);
      
      // Force a dialog re-render by updating key
      setDialogKey(prev => prev + 1);
      
      // Focus the input
      setTimeout(() => {
        if (inputRef.current) {
          inputRef.current.focus();
        }
      }, 100);
    }
  }, [open]);
  
  // Effect for sort changes
  useEffect(() => {
    if (query.length >= 2 && open) {
      // Trigger new search with updated sort parameter
      setIsLoading(true);
      debouncedSearch(query);
    }
  }, [sortBy, query, open, debouncedSearch]);

  return (
    <div className="w-full max-w-md mx-auto">
      {/* Trigger button */}
      <Button
        variant="outline"
        className="w-full justify-start h-10 px-3 bg-gray-50 hover:bg-gray-100 text-gray-700 border-gray-200"
        onClick={() => setOpen(true)}
      >
        <div className="flex items-center gap-2 w-full">
          <Search className="w-5 h-5 text-gray-400 flex-shrink-0" />
          {selected ?
            <div className="flex flex-col w-full overflow-hidden">
              <span className="text-gray-700 text-sm truncate">{selected.id}</span>
              <div className="flex items-center gap-1 text-gray-400 text-xs">
                <span>{selected.size} GB</span>
                <span>•</span>
                <span>{selected.downloads.toLocaleString()} downloads</span>
                <span>•</span>
                <div className="flex items-center gap-1">
                  <Heart className="h-3 w-3 text-red-400" />
                  <span>{selected.likes.toLocaleString()}</span>
                </div>
                <span>•</span>
                <span className={selected.isQuantized ? "text-green-500" : "text-blue-500"}>
                  {selected.isQuantized ? "Quantized" : "Full Precision"}
                </span>
              </div>
            </div>
            :
            <span className="text-gray-500">Search models...</span>
          }
        </div>
      </Button>

      {/* Dialog */}
      <Dialog 
        open={open} 
        onOpenChange={setOpen}
        key={dialogKey} // Force re-render when the key changes
      >
        <DialogContent className="w-full max-w-md p-0 gap-0 rounded-lg border border-gray-200 shadow-lg overflow-hidden">
          <div className="flex items-center p-4 border-b border-gray-100">
            <DialogTitle className="text-base font-medium">Search Models</DialogTitle>
          </div>

          <div className="p-4 pb-2 overflow-hidden">
            <div className="relative w-full">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
              <Input
                ref={inputRef}
                value={query}
                onChange={handleSearch}
                placeholder="Type to search models"
                className="pl-9 pr-4 h-10 border-gray-200 bg-gray-50 focus-visible:bg-white"
              />
            </div>
          </div>

          <ScrollArea className="max-h-72 pb-4 px-4" ref={scrollAreaRef}>
            {isLoading && (
              <div className="flex items-center justify-center py-8 text-gray-500">
                <div className="animate-spin rounded-full h-5 w-5 border-2 border-gray-300 border-t-blue-500 mr-2"></div>
                <span className="text-sm">Searching...</span>
              </div>
            )}

            {!isLoading && query.length > 0 && models.length === 0 && (
              <div className="py-8 text-center text-gray-500">
                <p className="text-sm font-medium">No models found</p>
                <p className="text-xs mt-1">Try a different search term</p>
              </div>
            )}

            {!isLoading && models.length > 0 && (
              <div className="rounded-md border border-gray-200 overflow-hidden">
                <div className="flex items-center justify-between px-3 py-2 bg-gray-50 border-b border-gray-200">
                  <ResultsHeader count={models.length} />
                  <div className="flex items-center gap-2">
                    <span className="text-xs text-gray-500">Sort by:</span>
                    <select
                      className="text-xs border-0 bg-transparent focus:outline-none text-gray-500 cursor-pointer"
                      value={sortBy}
                      onChange={(e) => {
                        const value = e.target.value;
                        setSortBy(value);
                      }}
                    >
                      <option value="downloads">Downloads</option>
                      <option value="likes">Likes</option>
                      <option value="size">Size</option>
                      <option value="name">Name</option>
                    </select>
                  </div>
                </div>
                <div className="max-h-60 overflow-y-auto w-full" style={{ maxWidth: '100%' }}>
                  {models.map((model) => (
                    <div key={model.id} className="w-full max-w-full">
                      <ModelOption
                        label={model.id}
                        size={model.size}
                        downloads={model.downloads}
                        likes={model.likes}
                        isQuantized={model.isQuantized}
                        onClick={() => handleSelect(model)}
                      />
                    </div>
                  ))}
                </div>
              </div>
            )}

            {query.length === 0 && !isLoading && (
              <div className="flex flex-col items-center justify-center py-12">
                <div className="w-12 h-12 rounded-full bg-gray-100 flex items-center justify-center mb-3">
                  <Search className="w-6 h-6 text-gray-400" />
                </div>
                <p className="text-gray-600 text-sm font-medium">Type to search models</p>
                <p className="text-xs text-gray-400 mt-1">Minimum 2 characters required</p>
              </div>
            )}
          </ScrollArea>
        </DialogContent>
      </Dialog>
    </div>
  );
}