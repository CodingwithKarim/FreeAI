import React, { useState, useEffect, useMemo, useRef, useCallback } from "react";
import DownloadIcon from "@mui/icons-material/CloudDownload";
import ThumbUpIcon from "@mui/icons-material/ThumbUp";
import StorageIcon from "@mui/icons-material/Storage";
import BoltIcon from "@mui/icons-material/Bolt";
import TrendingUpIcon from "@mui/icons-material/TrendingUp";
import LinkOffIcon from "@mui/icons-material/LinkOff";
import {
  Chip,
  Divider,
  Tab,
  Tabs,
  Tooltip,
  useTheme,
  Box,
  Paper,
  Typography,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  TextField,
  InputAdornment,
  CircularProgress,
  List,
  ListItemButton,
  IconButton,
  Fade,
  alpha,
  Slider,
  Stack,
  ListItemText,
} from "@mui/material";
import SearchIcon from "@mui/icons-material/Search";
import MemoryIcon from "@mui/icons-material/Memory";
import FlashOnIcon from "@mui/icons-material/FlashOn";
import FavoriteIcon from "@mui/icons-material/Favorite";
import CloseIcon from "@mui/icons-material/Close";
import debounce from "lodash.debounce";

export interface ModelData {
  id: string;
  size: string;
  downloads: number;
  likes: number;
  isQuantized: boolean;
  trending_score: number;
}

// ─── Pill‐style trigger ─────────────────────────────────────────────────────
function SearchTrigger({ onClick }: { onClick: () => void }) {
  return (
    <Paper
      component="button"
      onClick={onClick}
      onMouseDown={(e) => e.preventDefault()}
      elevation={1}
      sx={{
        p: 1.5,
        display: "flex",
        alignItems: "center",
        gap: 1.5,
        borderRadius: "999px",
        width: "100%",
        maxWidth: 480,
        bgcolor: "background.paper",
        border: "1px solid",
        borderColor: "grey.300",
        cursor: "pointer",
        transition: "all 0.2s ease",
        textAlign: "left",
        outline: "none",
        "&:focus-visible": {
          outline: "none",
          borderColor: (theme) => theme.palette.primary.main,
          boxShadow: (theme) =>
            `0 0 0 2px ${alpha(theme.palette.primary.main, 0.25)}`,
        },
        "&:hover": {
          boxShadow: (theme) => theme.shadows[4],
          borderColor: "grey.400",
        },
        "&:active": {
          boxShadow: (theme) => theme.shadows[1],
        },
      }}
    >
      <SearchIcon color="action" />
      <Typography variant="body2" color="text.secondary" noWrap sx={{ flexGrow: 1 }}>
        Search models…
      </Typography>
    </Paper>
  );
}

export default function ModelSearch() {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [models, setModels] = useState<ModelData[]>([]);
  const [sortBy, setSortBy] = useState<"downloads" | "likes" | "trending_score">("downloads");
  const [error, setError] = useState<string | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  const [limit, setLimit] = useState<number>(25);
  const [sliderValue, setSliderValue] = useState<number>(limit);
  const [filters, setFilters] = useState<string[]>([]);
  const theme = useTheme();

  // track download status & progress per model
  const [downloadStatus, setDownloadStatus] = useState<{
    [modelId: string]: { status: "pending" | "downloading" | "ready" | "error"; progress: number };
  }>({});

  const filtersLabels = [
    { key: "bitsandbytes", label: "Quantized", icon: <BoltIcon /> },
    { key: "uncensored", label: "Uncensored", icon: <LinkOffIcon /> },
  ];

  const toggleFilter = (f: string) => {
    setFilters((prev) =>
      prev.includes(f) ? prev.filter((x) => x !== f) : [...prev, f]
    );
  };

  // ─── Fetch & sort ────────────────────────────────────────────────────────
  const fetchModels = useCallback(
    async (q: string) => {
      setIsLoading(true);
      setError(null);
      try {
        const res = await fetch("/models/search", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ query: q, limit, sortBy, filters }),
        });
        if (!res.ok) throw new Error(`Status ${res.status}`);
        const data = await res.json();
        const list: ModelData[] = (data.models || []).map((m: any) => ({
          id: m.id,
          size: String(m.size),
          downloads: Number(m.downloads),
          likes: Number(m.likes),
          isQuantized: Boolean(m.isQuantized),
          trending_score: Number(m.trending_score || 0),
        }));
        list.sort(sortFn(sortBy));
        setModels(list);
      } catch (e: any) {
        console.error(e);
        setError("Failed to load models. Try again.");
        setModels([]);
      } finally {
        setIsLoading(false);
      }
    },
    [sortBy, limit, filters]
  );

  // Debounced search while typing
  const debouncedSearch = useMemo(() => debounce((q: string) => fetchModels(q), 500), [
    fetchModels,
  ]);
  useEffect(() => {
    return () => debouncedSearch.cancel();
  }, [debouncedSearch]);

  // Re‐sort on sortBy change
  useEffect(() => {
    if (models.length) setModels((prev) => [...prev].sort(sortFn(sortBy)));
  }, [sortBy]);

  // Poll download statuses every 2s
  useEffect(() => {
    const iv = setInterval(async () => {
      try {
        const res = await fetch("/models/status");
        if (!res.ok) throw new Error(`Status ${res.status}`);
        const { models: statuses } = await res.json() as {
          models: Array<{ model_id: string; status: string; progress: number }>;
        };
        setDownloadStatus((d) => {
          const updated = { ...d };
          statuses.forEach((s) => {
            if (updated[s.model_id]) {
              updated[s.model_id] = {
                status: s.status as any,
                progress: s.progress,
              };
            }
          });
          return updated;
        });
      } catch (e) {
        console.error("Failed to fetch model statuses:", e);
      }
    }, 2000);
    return () => clearInterval(iv);
  }, []);

  // Handlers
  const handleSearchChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const v = e.target.value;
    setQuery(v);
    setIsLoading(true);
    debouncedSearch(v);
  };

  const handleDownload = useCallback(async (m: ModelData) => {
    // set pending immediately
    setDownloadStatus((d) => ({
      ...d,
      [m.id]: { status: "pending", progress: 0 },
    }));
    try {
      const res = await fetch("/models/download", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ model_id: m.id }),
      });
      if (!res.ok) throw new Error(await res.text());
      setDownloadStatus((d) => ({
        ...d,
        [m.id]: { status: "downloading", progress: 0 },
      }));
    } catch (e) {
      console.error(e);
      setDownloadStatus((d) => ({
        ...d,
        [m.id]: { status: "error", progress: 0 },
      }));
    }
  }, []);

  // Focus input when dialog opens
  useEffect(() => {
    if (open) setTimeout(() => inputRef.current?.focus(), 100);
  }, [open]);

  return (
    <>
      <SearchTrigger onClick={() => setOpen(true)} />

      <Dialog open={open} onClose={() => setOpen(false)} fullWidth maxWidth="sm" TransitionComponent={Fade}>
        <DialogTitle sx={{ textAlign: "center", fontWeight: 600 }}>
          Search Models
          <IconButton aria-label="close" onClick={() => setOpen(false)} sx={{ position: "absolute", right: 8, top: 8 }}>
            <CloseIcon />
          </IconButton>
        </DialogTitle>

        <DialogContent dividers sx={{ py: 2, px: 3 }}>
          {/* SEARCH FIELD */}
          <TextField
            fullWidth
            size="medium"
            variant="outlined"
            inputRef={inputRef}
            value={query}
            onChange={handleSearchChange}
            onKeyDown={(e) => {
              if (e.key === "Enter") {
                e.preventDefault();
                handleSearchChange(e as any);
              }
            }}
            placeholder="Search models…"
            sx={{
              mb: 2,
              "& .MuiOutlinedInput-root": {
                borderRadius: 3,
                boxShadow: (theme) => `0 2px 6px ${alpha(theme.palette.grey[900], 0.08)}`,
                transition: "all 0.2s ease",
                "&:hover": {
                  boxShadow: (theme) => `0 3px 8px ${alpha(theme.palette.grey[900], 0.12)}`,
                },
                "&.Mui-focused": {
                  backgroundColor: (theme) => theme.palette.background.paper,
                  boxShadow: (theme) => `0 4px 12px ${alpha(theme.palette.primary.main, 0.15)}`,
                },
                "& fieldset": { border: "none" },
              },
            }}
            InputProps={{
              startAdornment: (
                <InputAdornment position="start">
                  <SearchIcon color="action" />
                </InputAdornment>
              ),
              endAdornment: (
                <>
                  {isLoading && <CircularProgress size={20} sx={{ mr: 1 }} />}
                  {query && !isLoading && (
                    <IconButton size="small" onClick={() => { setQuery(""); setModels([]); }}>
                      <CloseIcon fontSize="small" />
                    </IconButton>
                  )}
                </>
              ),
            }}
          />

          {isLoading ? (
            <Box sx={{ mb: 2 }}>
              <Typography variant="caption" color="text.secondary" align="center">
                Pulling models from the Hugging Face Platform, please be patient.
              </Typography>
            </Box>
          ) : (
            <>
              {/* INTRO / NO RESULTS / ERROR */}
              {!error && models.length < 1 && (
                <Box sx={{ backgroundColor: (t) => t.palette.grey[100], borderRadius: 2, px: 3, py: 2, my: 3, textAlign: "center", boxShadow: (t) => `0 1px 4px ${t.palette.grey[300]}` }}>
                  <MemoryIcon fontSize="small" color="primary" sx={{ mb: 1 }} />
                  <Typography variant="subtitle2" fontWeight={600}>Local Model Search</Typography>
                  <Typography variant="body2" color="text.secondary">
                    Browse the Hugging Face Hub for tens of thousands of models optimized for private, on-device inference — all free to download and run locally.
                  </Typography>
                </Box>
              )}
              {error && <Box textAlign="center" py={2} color="error.main">{error}</Box>}
              {!isLoading && query && !error && models.length === 0 && (
                <Box textAlign="center" py={4} color="text.secondary">
                  <Typography variant="body2">No models found for "{query}".</Typography>
                </Box>
              )}

              {/* FILTER / SORT CONTROLS */}
              {models.length > 0 && (
                <>
                  <Paper elevation={1} sx={{ p: 2, borderRadius: 2, bgcolor: "background.paper", boxShadow: (t) => `0 1px 6px ${alpha(t.palette.grey[900], 0.08)}`, mb: 2 }}>
                    <Stack spacing={2.5} alignItems="center">
                      <Tabs
                        value={sortBy}
                        onChange={(_, v) => v && setSortBy(v)}
                        variant="scrollable"
                        scrollButtons="auto"
                        allowScrollButtonsMobile
                        sx={{
                          width: "100%",
                          minHeight: 0,
                          "& .MuiTabs-flexContainer": { justifyContent: "center", gap: 1 },
                          "& .MuiTab-root": { textTransform: "none", minHeight: 0, py: 0.75, px: 2, borderRadius: 1, fontSize: "0.875rem", "&:focus, &:hover": { outline: "none", boxShadow: "none" } },
                          "& .MuiTabs-indicator": { height: 3, borderRadius: 3 },
                        }}
                      >
                        <Tab value="downloads" icon={<DownloadIcon />} label="Most downloads" />
                        <Tab value="likes" icon={<ThumbUpIcon />} label="Most likes" />
                        <Tab value="trending_score" icon={<TrendingUpIcon />} label="Trending" />
                      </Tabs>
                      <Divider flexItem />
                      <Box display="flex" alignItems="center" justifyContent="center" gap={2}>
                        <Box display="flex" gap={2}>
                          {filtersLabels.map(({ key, label, icon }) => {
                            const active = filters.includes(key);
                            return (
                              <Chip
                                key={key}
                                label={label}
                                icon={icon}
                                clickable
                                variant={active ? "filled" : "outlined"}
                                color={active ? "primary" : "default"}
                                onClick={() => toggleFilter(key)}
                                sx={{ fontWeight: 500, borderRadius: 2, "&:focus-visible": { outline: "none", boxShadow: "none" } }}
                              />
                            );
                          })}
                        </Box>
                        <Tooltip title="Number of models to fetch" arrow>
                          <Slider
                            value={sliderValue}
                            onChange={(_, v) => setSliderValue(v as number)}
                            onChangeCommitted={(_, v) => setLimit(v as number)}
                            min={1}
                            max={200}
                            size="small"
                            valueLabelDisplay="auto"
                            valueLabelFormat={(v) => `${v}`}
                            sx={{ width: 120, '& .MuiSlider-thumb': { width: 16, height: 16 }, '& .MuiSlider-root': { height: 4 } }}
                          />
                        </Tooltip>
                      </Box>
                    </Stack>
                  </Paper>

                  {/* RESULTS LIST */}
                  <List sx={{ maxHeight: 300, overflowY: "auto", px: 0 }}>
                    {models.map((m) => {
                      const ds = downloadStatus[m.id];
                      const isBusy = ds && (ds.status === "pending" || ds.status === "downloading");
                      return (
                        <ListItemButton
                          key={m.id}
                          onClick={() => handleDownload(m)}
                          disabled={isBusy}
                          sx={{ mb: 2, borderRadius: 2, boxShadow: 1, "&:hover": { bgcolor: "action.hover" } }}
                        >
                          <ListItemText
                            primary={m.id}
                            secondary={
                              ds
                                ? ds.status === "error"
                                  ? "Download failed"
                                  : ds.status === "ready"
                                  ? "Downloaded ✓"
                                  : `Progress: ${ds.progress}%`
                                : ""
                            }
                            primaryTypographyProps={{ sx: { wordBreak: "break-all", fontWeight: 500 } }}
                          />
                          {isBusy && (
                            <CircularProgress
                              size={24}
                              variant={ds!.status === "downloading" ? "determinate" : "indeterminate"}
                              value={ds!.progress}
                            />
                          )}
                          {ds?.status === "ready" && (
                            <Typography sx={{ color: "success.main", ml: 1 }}>✓</Typography>
                          )}
                        </ListItemButton>
                      );
                    })}
                  </List>
                </>
              )}
            </>
          )}
        </DialogContent>

        <DialogActions sx={{ justifyContent: "center", p: 2 }}>
          <Typography
            component="button"
            onClick={() => setOpen(false)}
            sx={{ background: "none", border: "none", color: "text.secondary", cursor: "pointer", fontSize: "0.875rem", textTransform: "uppercase", letterSpacing: 1 }}
          >
            Close
          </Typography>
        </DialogActions>
      </Dialog>
    </>
  );
}

// ─── Sorting helper ───────────────────────────────────────────────────────
function sortFn(sortBy: "downloads" | "likes" | "trending_score") {
  return (a: ModelData, b: ModelData) => {
    if (sortBy === "likes") return b.likes - a.likes;
    if (sortBy === "downloads") return b.downloads - a.downloads;
    return b.trending_score - a.trending_score;
  };
}
