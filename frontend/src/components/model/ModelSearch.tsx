import React, { useState, useEffect, useMemo, useRef, useCallback } from "react";
import DownloadIcon from "@mui/icons-material/CloudDownload";
import ThumbUpIcon from "@mui/icons-material/ThumbUp";
import BoltIcon from "@mui/icons-material/Bolt";
import TrendingUpIcon from "@mui/icons-material/TrendingUp";
import LinkOffIcon from "@mui/icons-material/LinkOff";
import CheckIcon from '@mui/icons-material/Check';
import { Chip, Divider, Tab, Tabs, Tooltip, useTheme } from "@mui/material";
import ErrorOutlineIcon from '@mui/icons-material/ErrorOutline';

import {
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
    ListItem,
    ListItemAvatar,
    Avatar,
    ListItemText,
    ListItemButton,
    IconButton,
    Fade,
    alpha,
    Stack,
    Slider
} from "@mui/material";

import SearchIcon from "@mui/icons-material/Search";
import MemoryIcon from "@mui/icons-material/Memory";
import FlashOnIcon from "@mui/icons-material/FlashOn";
import FavoriteIcon from "@mui/icons-material/Favorite";
import CloseIcon from "@mui/icons-material/Close";

import debounce from "lodash.debounce";
import Swal from "sweetalert2";
import CloudDownloadIcon from "@mui/icons-material/CloudDownload";
import { Model, ModelSearchData } from "@/utils/types/types";



interface SearchTriggerProps {
    onClick: () => void;
    loading?: boolean;
}

interface ModelSearchProps {
    setDropdownModels: React.Dispatch<React.SetStateAction<Model[]>>
    initialModels: ModelSearchData[]
}

// ─── Pill‐style trigger ─────────────────────────────────────────────────────
function SearchTrigger({ onClick, loading = false }: SearchTriggerProps) {
    return (
        <div className="flex-1">
            <label className="text-sm font-semibold text-gray-700 mb-1 flex items-center space-x-2">
                <CloudDownloadIcon className="w-5 h-5 ml-3 text-purple-600" />
                <span>Model Registry</span>
            </label>
            <Paper
                component="button"
                onClick={onClick}
                onMouseDown={e => e.preventDefault()}
                elevation={1}
                sx={{
                    width: "100%",
                    p: 1.5,
                    display: "flex",
                    alignItems: "center",
                    gap: 1,
                    borderRadius: "999px",
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
                {loading
                    ? <CircularProgress color="inherit" size={18} thickness={6} className="ml-2 mr-1.5 text-purple-400" />
                    : <SearchIcon color="action" />
                }
                <Typography
                    variant="body2"
                    color="text.secondary"
                    noWrap
                    sx={{ flexGrow: 1, }}
                >
                    Browse & Download Models
                </Typography>
            </Paper>
        </div>
    );
}

export default function ModelSearch({ setDropdownModels, initialModels }: ModelSearchProps) {
    const [open, setOpen] = useState(false);
    const [query, setQuery] = useState("");
    const [isLoading, setIsLoading] = useState(false);
    const [models, setModels] = useState<ModelSearchData[]>(initialModels);
    const [sortBy, setSortBy] = useState<
        "downloads" | "likes" | "trending_score"
    >("downloads");
    const [error, setError] = useState<string | null>(null);
    const inputRef = useRef<HTMLInputElement>(null);

    // The actual limit passed to the API
    const [limit, setLimit] = useState<number>(25);

    const [filters, setFilters] = useState<string[]>([]);
    const [sliderValue, setSliderValue] = useState<number>(limit);
    const theme = useTheme();
    const [downloadStatus, setDownloadStatus] = useState<{
        [modelId: string]: { status: "pending" | "downloading" | "ready" | "error"; progress: number };
    }>({});

    const anyDownloading = React.useMemo(
        () =>
            Object.values(downloadStatus).some(
                (ds) => ds.status === "pending" || ds.status === "downloading"
            ),
        [downloadStatus]
    );

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
            if (!navigator.onLine) {
                console.warn("User is offline. Skipping model fetch.");
                return;
            }

            setIsLoading(true);
            setError(null);

            try {
                let query = q;

                const res = await fetch("api/models/search", {
                    method: "POST",
                    headers: { "Content-Type": "application/json" },
                    body: JSON.stringify({ query, limit, sortBy, filters }),
                });

                if (!res.ok) throw new Error(`Status ${res.status}`);
                const data = await res.json();
                const list: ModelSearchData[] = (data.models || []).map((m: any) => ({
                    id: m.id,
                    size: String(m.size),
                    downloads: Number(m.downloads),
                    likes: Number(m.likes),
                    isQuantized: Boolean(m.isQuantized),
                    isUncensored: Boolean(m.isUncensored),
                    trending_score: Number(m.trending_score || 0)
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
    const debouncedSearch = useMemo(
        () => debounce((q: string) => fetchModels(q), 500),
        [fetchModels]
    );
    useEffect(() => debouncedSearch.cancel(), [debouncedSearch]);

    // Re‐sort on sortBy change
    useEffect(() => {
        if (models.length) setModels((prev) => [...prev].sort(sortFn(sortBy)));
    }, [sortBy]);

    // Handlers
    const handleSearchChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const v = e.target.value;
        setQuery(v);
        debouncedSearch(v);
    };

    const handleModelDelete = useCallback(async (model: ModelSearchData) => {
        const { isConfirmed } = await Swal.fire<string>({
            icon: 'warning',
            title: 'Remove this model?',
            text: `Are you sure you want to uninstall ${model.id}?`,
            iconColor: "#C084FC",
            showCancelButton: true,
            confirmButtonText: 'Yes, remove it',
            cancelButtonText: 'Cancel',
            buttonsStyling: false,
            customClass: {
                popup: 'rounded-3xl p-8 shadow-2xl bg-white',
                title: 'text-2xl font-bold text-gray-900 mb-4',
                actions: 'mt-6 flex justify-end space-x-4',
                confirmButton: 'px-5 py-2 rounded-lg bg-red-600 hover:bg-red-700 text-white font-medium',
                cancelButton: 'px-5 py-2 rounded-lg bg-gray-100 hover:bg-gray-200 text-gray-700 font-medium',
            }
        });

        if (!isConfirmed) return;

        try {
            const res = await fetch('/api/models/delete', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ model_id: model.id }),
            });

            if (!res.ok) throw new Error(await res.text());

            setDownloadStatus(d => {
                const next = { ...d };
                delete next[model.id];
                return next;
            });

            setDropdownModels(prev => prev.filter(m => m.id !== model.id))

            Swal.fire({
                icon: 'success',
                title: 'Uninstalled!',
                iconColor: "#C084FC",
                timer: 1200,
                showConfirmButton: false,
                customClass: { popup: 'rounded-lg p-4 bg-white' },
            });
        }
        catch (e) {

        }
    }, [])

    const handleModelSelect = useCallback(async (m: ModelSearchData) => {
        const { value: displayName } = await Swal.fire<string>({
            title: "Name your model",
            input: "text",
            inputPlaceholder: "E.g. My Tiny GPT",
            inputValue: m.id,
            showCancelButton: true,
            confirmButtonText: "Download",
            cancelButtonText: "Cancel",
            returnFocus: false,
            width: 420,
            backdrop: "rgba(0, 0, 0, 0.5)",
            buttonsStyling: false,
            customClass: {
                popup: "rounded-3xl p-8 shadow-2xl bg-white",
                title: "text-2xl font-bold text-gray-900 mb-4",
                input: "w-full border border-gray-300 rounded-lg p-3 focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500",
                actions: "mt-6 flex justify-end space-x-4",
                confirmButton: "px-5 py-2 rounded-lg bg-indigo-600 hover:bg-indigo-700 text-white font-medium",
                cancelButton: "px-5 py-2 rounded-lg bg-gray-100 hover:bg-gray-200 text-gray-700 font-medium",
            },
            inputValidator: (v) => {
                if (!v || !v.trim()) return "Display name cannot be empty";
            },
        });

        if (!displayName) return;

        setDownloadStatus((d) => ({
            ...d,
            [m.id]: { status: "pending", progress: 0 },
        }));

        try {
            const res = await fetch("api/models/download", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ model_id: m.id, model_name: displayName, is_quantized: m.isQuantized, is_uncensored: m.isUncensored }),
            });

            if (!res.ok) throw new Error(await res.text());

            setDownloadStatus((d) => ({
                ...d,
                [m.id]: { status: "downloading", progress: 0 },
            }));

            let finalStatus = "";

            while (finalStatus !== "ready") {
                await new Promise(r => setTimeout(r, 3000))
                const res = await fetch("api/models/status")
                const { models: statuses } = await res.json()
                const me: { model_id: string; status: string; progress: number } | undefined = statuses.find((s: any) => s.model_id === m.id)
                finalStatus = me?.status || ""
                // update your downloadStatus map so the UI updates
                setDownloadStatus(d => ({
                    ...d,
                    [m.id]: { status: finalStatus as any, progress: me?.progress ?? 0 }
                }))
            }

            setDropdownModels((prev: Model[]) => [...prev, { id: m.id, name: displayName, is_quantized: m.isQuantized, is_uncensored: m.isUncensored }])
        } catch (e) {
            console.error(e);
            setDownloadStatus((d) => ({
                ...d,
                [m.id]: { status: "error", progress: 0 },
            }));
        }
    }, []);

    const fetchStatuses = React.useCallback(async () => {
        try {
            const res = await fetch("api/models/status");
            if (!res.ok) throw new Error(res.statusText);
            const { models: statuses } = await res.json() as {
                models: Array<{ model_id: string; status: string; progress: number }>
            };
            setDownloadStatus((prev) => {
                const next = { ...prev };
                statuses.forEach(({ model_id, status, progress }) => {
                    next[model_id] = { status: status as any, progress };
                });
                return next;
            });
        } catch (e) {
            console.error("Status poll error:", e);
        }
    }, []);


    // Focus input when dialog opens
    useEffect(() => {
        if (!open) return;

        // Focus the input
        setTimeout(() => inputRef.current?.focus(), 100);

        // Fetch any existing download statuses (including “ready”)
        fetchStatuses();
    }, [open, fetchStatuses]);

    useEffect(() => {
        fetchStatuses();
    }, [fetchStatuses]);

    useEffect(() => {
        if (!anyDownloading) return;

        fetchStatuses();                           // ← hit once immediately
        const timer = setInterval(fetchStatuses, 2_000);
        return () => clearInterval(timer);         // ← clean up as soon as all downloads finish
    }, [anyDownloading, fetchStatuses]);


    return (
        <>
            <SearchTrigger onClick={() => setOpen(true)} loading={anyDownloading} />
            <Dialog
                open={open}
                onClose={() => setOpen(false)}
                fullWidth
                maxWidth="sm"
                TransitionComponent={Fade}

                disableEnforceFocus
                disableAutoFocus
                disableRestoreFocus
            >
                <DialogTitle sx={{ textAlign: "center", fontWeight: 600 }}>
                    Search Models
                    <IconButton
                        aria-label="close"
                        onClick={() => setOpen(false)}
                        sx={{ position: "absolute", right: 8, top: 8 }}
                    >
                        <CloseIcon />
                    </IconButton>
                </DialogTitle>

                <DialogContent dividers sx={{ py: 2, px: 3 }}>
                    <TextField
                        fullWidth
                        size="medium"
                        variant="outlined"
                        inputRef={inputRef}
                        value={query}
                        onChange={handleSearchChange}
                        onKeyDown={(e) => {
                            if (e.key === 'Enter') {
                                e.preventDefault();
                                handleSearchChange(e as unknown as React.ChangeEvent<HTMLInputElement>);
                            }
                        }}
                        placeholder="Search models…"
                        sx={{
                            mb: 2,
                            "& .MuiOutlinedInput-root": {
                                borderRadius: 3,
                                boxShadow: (theme) =>
                                    `0 2px 6px ${alpha(theme.palette.grey[900], 0.08)}`,
                                transition: "all 0.2s ease",
                                "&:hover": {
                                    boxShadow: (theme) =>
                                        `0 3px 8px ${alpha(theme.palette.grey[900], 0.12)}`,
                                },
                                "&.Mui-focused": {
                                    backgroundColor: (theme) =>
                                        theme.palette.background.paper,
                                    boxShadow: (theme) =>
                                        `0 4px 12px ${alpha(
                                            theme.palette.primary.main,
                                            0.15
                                        )}`,
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
                                        <IconButton
                                            size="small"
                                            onClick={() => {
                                                setQuery("");
                                                setModels([]);
                                            }}
                                        >
                                            <CloseIcon fontSize="small" />
                                        </IconButton>
                                    )}
                                </>
                            ),
                        }}
                    />

                    {isLoading ? (
                        <Box sx={{ mb: 2 }}>
                            <Typography
                                variant="caption"
                                color="text.secondary"
                                align="center"
                            >
                                Pulling models from the Hugging Face Platform, please be
                                patient.
                            </Typography>
                        </Box>
                    ) : (
                        <>
                            {/* ─── INTRO MESSAGE ─────────────────────────────────────── */}
                            {models.length < 1 && !error && (
                                <Box
                                    sx={{
                                        backgroundColor: (theme) => theme.palette.grey[100],
                                        borderRadius: 2,
                                        px: 3,
                                        py: 2,
                                        my: 3,
                                        textAlign: "center",
                                        boxShadow: (theme) =>
                                            `0 1px 4px ${theme.palette.grey[300]}`,
                                    }}
                                >
                                    <Box
                                        display="flex"
                                        alignItems="center"
                                        justifyContent="center"
                                        gap={1}
                                        mb={1}
                                    >
                                        <MemoryIcon fontSize="small" color="secondary" />
                                        <Typography variant="subtitle2" fontWeight={600}>
                                            Local Model Search
                                        </Typography>
                                    </Box>
                                    <Typography variant="body2" color="text.secondary">
                                        Browse the Hugging Face Hub for tens of thousands of models
                                        optimized for private, on-device inference — all free to
                                        download and run locally.
                                    </Typography>
                                </Box>
                            )}

                            {/* ─── ERROR MESSAGE ─────────────────────────────────────── */}
                            {error && (
                                <Box textAlign="center" py={2} color="error.main">
                                    {error}
                                </Box>
                            )}

                            {/* ─── NO RESULTS ───────────────────────────────────────── */}
                            {!isLoading &&
                                query.length >= 1 &&
                                !error &&
                                models.length === 0 && (
                                    <Box textAlign="center" py={4} color="text.secondary">
                                        <Typography variant="body2">
                                            No models found for "{query}."
                                        </Typography>
                                    </Box>
                                )}

                            {/* ─── RESULTS LIST ─────────────────────────────────────── */}
                            {models.length > 0 && (
                                <>
                                    <Paper
                                        elevation={1}
                                        sx={{
                                            p: 2,
                                            borderRadius: 2,
                                            bgcolor: "background.paper",
                                            boxShadow: (t) => `0 1px 6px ${alpha(t.palette.grey[900], 0.08)}`,
                                            mb: 2,
                                        }}
                                    >
                                        <Stack spacing={2.5} alignItems="center">
                                            {/* ─── SORT ROW ─────────────────────────────────────────────── */}
                                            <Tabs
                                                value={sortBy}
                                                onChange={(_, v) => v && setSortBy(v)}
                                                variant="scrollable"
                                                scrollButtons="auto"
                                                indicatorColor="secondary"
                                                textColor="secondary"
                                                allowScrollButtonsMobile
                                                sx={{
                                                    width: "100%",
                                                    minHeight: 0,
                                                    "& .MuiTabs-flexContainer": { justifyContent: "center", gap: 1 },
                                                    "& .MuiTab-root": {
                                                        textTransform: "none",
                                                        minHeight: 0,
                                                        py: 0.75,
                                                        px: 2,
                                                        borderRadius: 1,
                                                        fontSize: "0.875rem",
                                                        "&:focus, &.Mui-focusVisible": {
                                                            outline: "none",
                                                            boxShadow: "none",
                                                        },
                                                    },
                                                    "& .MuiTabs-indicator": {
                                                        height: 3,
                                                        borderRadius: 3,
                                                    },
                                                }}
                                            >
                                                <Tab
                                                    value="downloads"
                                                    icon={<DownloadIcon fontSize="small" />}
                                                    iconPosition="start"
                                                    label="Most downloads"
                                                />
                                                <Tab
                                                    value="likes"
                                                    icon={<ThumbUpIcon fontSize="small" />}
                                                    iconPosition="start"
                                                    label="Most likes"
                                                />

                                                <Tab
                                                    value="trending_score"
                                                    icon={<TrendingUpIcon fontSize="small" />}
                                                    iconPosition="start"
                                                    label="Trending"
                                                />
                                            </Tabs>

                                            <Divider flexItem />

                                            {/* ─── FILTER + LIMIT ROW ──────────────────────────────────── */}
                                            <Box display="flex" alignItems="center" justifyContent="center" gap={2}>
                                                {/* Filters */}
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
                                                                color={active ? "secondary" : "default"}
                                                                onClick={() => toggleFilter(key)}
                                                                sx={{
                                                                    fontWeight: 500,
                                                                    borderRadius: 2,
                                                                    "& .MuiChip-icon": { color: active ? "#fff" : theme.palette.text.secondary },
                                                                    // remove focus ring entirely
                                                                    "&:focus-visible": { outline: "none", boxShadow: "none" },
                                                                }}
                                                            />
                                                        );
                                                    })}
                                                </Box>

                                                {/* Limit */}
                                                <Box sx={{ width: 120, px: 1 }}>
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
                                                            sx={{
                                                                width: 100,
                                                                '& .MuiSlider-thumb': { width: 16, height: 16, color: "#C084FC" },
                                                                '& .MuiSlider-track': { border: 'none' },
                                                                '& .MuiSlider-rail': { opacity: 0.9, color: "#C084FC" },
                                                                '& .MuiSlider-root': { height: 4 },
                                                            }}
                                                        />
                                                    </Tooltip>
                                                </Box>
                                            </Box>
                                        </Stack>
                                    </Paper>

                                    <List sx={{ maxHeight: 300, overflowY: "auto", px: 0 }}>
                                        {models.map((m) => {
                                            // pull the status entry for this model
                                            const ds = downloadStatus[m.id];
                                            const isBusy = ds?.status === "pending" || ds?.status === "downloading";

                                            return (
                                                <ListItem
                                                    disablePadding
                                                    key={m.id}
                                                    secondaryAction={
                                                        isBusy ? (
                                                            <CircularProgress
                                                                size={24}
                                                                color="secondary"
                                                                variant={ds?.progress! > 0 ? 'determinate' : 'indeterminate'}
                                                                value={ds?.progress}
                                                                sx={{ mr: 2 }}
                                                            />
                                                        ) : ds?.status === 'ready' ? (
                                                            <IconButton
                                                                edge="end"
                                                                size="small"
                                                                disableRipple
                                                                sx={{
                                                                    color: 'purple',
                                                                    '&:hover': { backgroundColor: 'transparent' },
                                                                    mr: 1,
                                                                }}
                                                            >
                                                                <CheckIcon fontSize="large" />
                                                            </IconButton>
                                                        ) : ds?.status === 'error' ? (
                                                            <Tooltip title="Download failed — retry">
                                                                <IconButton
                                                                    edge="end"
                                                                    size="small"
                                                                    sx={{ color: 'error.main', mr: 1 }}
                                                                    onClick={() => handleModelSelect(m)}  // retry download
                                                                >
                                                                    <ErrorOutlineIcon fontSize="small" />
                                                                </IconButton>
                                                            </Tooltip>
                                                        ) : null
                                                    }
                                                >
                                                    <ListItemButton
                                                        onClick={() =>
                                                            ds?.status === "ready"
                                                                ? handleModelDelete(m)    // already downloaded → uninstall
                                                                : handleModelSelect(m)    // not downloaded → start download
                                                        }
                                                        disabled={isBusy}
                                                        sx={{
                                                            py: 1.5,
                                                            px: 3,
                                                            mb: 2,
                                                            borderRadius: 2,
                                                            boxShadow: 1,
                                                            "&:hover": { bgcolor: "action.hover" },
                                                            position: "relative",
                                                        }}
                                                    >
                                                        <ListItemAvatar>
                                                            <Avatar sx={{ bgcolor: m.isQuantized ? "success.main" : "info.main" }}>
                                                                {m.isQuantized ? <FlashOnIcon /> : <MemoryIcon />}
                                                            </Avatar>
                                                        </ListItemAvatar>

                                                        <ListItemText
                                                            primary={m.id}
                                                            slotProps={{
                                                                secondary: { component: "div" },
                                                                primary: { sx: { wordBreak: "break-all", fontWeight: 500 } }
                                                            }}
                                                            secondary={
                                                                <Box
                                                                    sx={{
                                                                        display: "flex",
                                                                        gap: 5,
                                                                        flexWrap: "wrap",
                                                                        alignItems: "center",
                                                                        fontSize: "0.875rem",
                                                                    }}
                                                                >
                                                                    <span>{parseFloat(m.size).toFixed(1)} GB</span>
                                                                    <span>
                                                                        {Intl.NumberFormat("en", { notation: "compact" }).format(m.downloads)} downloads
                                                                    </span>
                                                                    <Box sx={{ display: "flex", alignItems: "center", gap: 0.5 }}>
                                                                        <FavoriteIcon fontSize="inherit" sx={{ color: "#B7121F" }} />
                                                                        {m.likes.toLocaleString()}
                                                                    </Box>
                                                                    <Box sx={{ display: "flex", alignItems: "center", gap: 0.5 }}>
                                                                        <TrendingUpIcon fontSize="small" sx={{ color: "#A78BFA" }} />
                                                                        {m.trending_score}
                                                                    </Box>
                                                                </Box>
                                                            }
                                                        />
                                                    </ListItemButton>
                                                </ListItem>
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
                        sx={{
                            background: "none",
                            border: "none",
                            color: "text.secondary",
                            cursor: "pointer",
                            fontSize: "0.875rem",
                            textTransform: "uppercase",
                            letterSpacing: 1,
                        }}
                    >
                        Close
                    </Typography>
                </DialogActions>
            </Dialog>
        </>
    );
}

// ─── Sorting helper ───────────────────────────────────────────────────────
function sortFn(
    sortBy: "downloads" | "likes" | "trending_score"
): (a: ModelSearchData, b: ModelSearchData) => number {
    return (a, b) => {
        if (sortBy === "likes") return b.likes - a.likes;
        if (sortBy === "downloads") return b.downloads - a.downloads;
        if (sortBy === "trending_score") return b.trending_score - a.trending_score;
        return Number(b.isQuantized) - Number(a.isQuantized);
    };
}