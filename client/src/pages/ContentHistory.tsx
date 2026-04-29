import { useEffect, useMemo, useState } from "react";
import { Link } from "wouter";
import type { inferRouterOutputs } from "@trpc/server";
import { format } from "date-fns";
import { th } from "date-fns/locale";
import {
  BarChart3,
  Check,
  ChevronsUpDown,
  Eye,
  ExternalLink,
  Filter,
  Heart,
  History,
  Lightbulb,
  MessageCircle,
  Package,
  RadioTower,
  Search,
  Share2,
  Sparkles,
  Trash2,
  TrendingUp,
  X,
} from "lucide-react";
import { trpc } from "@/lib/trpc";
import type { AppRouter } from "../../../server/routers";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Textarea } from "@/components/ui/textarea";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from "@/components/ui/command";
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import { ContentTypeBadge } from "@/components/ContentTypeBadge";
import { toast } from "sonner";
import { cn } from "@/lib/utils";

const platformOptions = [
  { value: "all", label: "ทุกแพลตฟอร์ม" },
  { value: "tiktok", label: "TikTok" },
  { value: "facebook", label: "Facebook" },
];

const typeOptions = [
  { value: "all", label: "ทุกประเภท" },
  { value: "SALE", label: "Sale" },
  { value: "EDUCATION", label: "Education" },
  { value: "ENTERTAINMENT", label: "Entertainment" },
  { value: "REVIEW", label: "Review" },
  { value: "LIFESTYLE", label: "Lifestyle" },
  { value: "HOOK", label: "Hook" },
  { value: "CHALLENGE", label: "Challenge" },
  { value: "COLLAB", label: "Collab" },
];

const statusOptions = [
  { value: "all", label: "ทุกสถานะ" },
  { value: "published", label: "เผยแพร่แล้ว" },
  { value: "unpublished", label: "ยังไม่เผยแพร่" },
];

const savedViewOptions = [
  { value: "all", label: "All", description: "content ทั้งหมด" },
  { value: "last100", label: "Last 100", description: "ล่าสุด 100 รายการ" },
  { value: "bestPFM", label: "Best PFM", description: "คะแนน PFM สูง" },
  { value: "shouldRunAds", label: "Should Run Ads", description: "ควรพิจารณายิงแอด" },
  { value: "notProper", label: "Need Fix", description: "ข้อมูลยังไม่ครบ" },
  { value: "noProductMapping", label: "No Product", description: "ยังไม่ผูกสินค้า" },
  { value: "highEngagement", label: "High Engage", description: "engagement rate สูง" },
  { value: "multiSku", label: "Multi SKU", description: "ขายหลายสินค้า" },
] as const;

const sortOptions = [
  { value: "publishedAt:desc", label: "ล่าสุดที่เผยแพร่" },
  { value: "createdAt:desc", label: "ล่าสุดที่นำเข้า" },
  { value: "pfmScore:desc", label: "PFM สูงสุด" },
  { value: "views:desc", label: "ยอดวิวสูงสุด" },
  { value: "reach:desc", label: "Reach สูงสุด" },
  { value: "likes:desc", label: "Like สูงสุด" },
  { value: "shares:desc", label: "Share สูงสุด" },
  { value: "bookmarks:desc", label: "Bookmark สูงสุด" },
  { value: "totalMediaCost:desc", label: "Media cost สูงสุด" },
];

const pageSizeOptions = [25, 50, 100];

function formatNumber(value?: number | null) {
  const number = Number(value ?? 0);
  if (number >= 1_000_000) return `${(number / 1_000_000).toFixed(1)}M`;
  if (number >= 1_000) return `${(number / 1_000).toFixed(1)}K`;
  return new Intl.NumberFormat("th-TH").format(number);
}

function formatDate(date?: Date | string | null) {
  if (!date) return "-";
  return format(new Date(date), "d MMM yyyy", { locale: th });
}

function platformBadgeClass(platform?: string | null) {
  if (platform === "facebook") return "bg-blue-50 text-blue-700 border-blue-200";
  if (platform === "tiktok") return "bg-slate-900 text-white border-slate-800";
  return "bg-secondary text-secondary-foreground border-border";
}

function contentStatusBadgeClass(status?: string | null) {
  if (!status) return "bg-amber-50 text-amber-700 border-amber-200";
  if (["DELETED", "CLOSE", "NO_IDENTITY"].includes(status)) return "bg-rose-50 text-rose-700 border-rose-200";
  if (["ACE_AD", "ABX_AD", "BOOST"].includes(status)) return "bg-emerald-50 text-emerald-700 border-emerald-200";
  return "bg-sky-50 text-sky-700 border-sky-200";
}

type RouterOutputs = inferRouterOutputs<AppRouter>;
type ContentItem = RouterOutputs["history"]["list"][number];

type AiInsight = {
  summary?: string;
  salesAngle?: string;
  recommendedSkuId?: number | null;
  recommendedSkuName?: string | null;
  recommendedSkuIds?: number[];
  recommendedSkuNames?: string[];
  funnelStage?: string;
  organicScore?: number;
  adsPotential?: "low" | "medium" | "high" | string;
  recommendedActions?: string[];
  nextContentIdeas?: string[];
  reasoning?: string;
};

type SkuOption = {
  id: number;
  name: string;
  sku: string;
  category?: string | null;
};

function SkuCombobox({
  skus,
  value,
  onChange,
  placeholder = "เลือก SKU",
  className,
}: {
  skus: SkuOption[];
  value?: number | null;
  onChange: (value: number | null) => void;
  placeholder?: string;
  className?: string;
}) {
  const [open, setOpen] = useState(false);
  const selected = skus.find((sku) => sku.id === value);

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button
          type="button"
          variant="outline"
          role="combobox"
          aria-expanded={open}
          className={cn("h-9 justify-between rounded-xl bg-card px-3 text-left font-normal", className)}
        >
          <span className={cn("truncate", !selected && "text-muted-foreground")}>
            {selected ? selected.name : placeholder}
          </span>
          <ChevronsUpDown className="ml-2 h-3.5 w-3.5 shrink-0 opacity-50" />
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-[320px] p-0" align="start">
        <Command>
          <CommandInput placeholder="ค้นหา SKU / ชื่อสินค้า..." />
          <CommandList>
            <CommandEmpty>ไม่พบสินค้า</CommandEmpty>
            <CommandGroup>
              <CommandItem
                value="__clear__"
                onSelect={() => {
                  onChange(null);
                  setOpen(false);
                }}
              >
                <X className="h-4 w-4 text-muted-foreground" />
                ไม่ผูก SKU
              </CommandItem>
              {skus.map((sku) => (
                <CommandItem
                  key={sku.id}
                  value={`${sku.sku} ${sku.name} ${sku.category ?? ""}`}
                  onSelect={() => {
                    onChange(sku.id);
                    setOpen(false);
                  }}
                >
                  <Check className={cn("h-4 w-4", value === sku.id ? "opacity-100" : "opacity-0")} />
                  <div className="min-w-0">
                    <p className="truncate text-sm">{sku.name}</p>
                    <p className="truncate text-xs text-muted-foreground">{sku.sku}{sku.category ? ` · ${sku.category}` : ""}</p>
                  </div>
                </CommandItem>
              ))}
            </CommandGroup>
          </CommandList>
        </Command>
      </PopoverContent>
    </Popover>
  );
}

function MultiSkuCombobox({
  skus,
  values,
  onChange,
  placeholder = "เลือกหลาย SKU",
  className,
}: {
  skus: SkuOption[];
  values: number[];
  onChange: (values: number[]) => void;
  placeholder?: string;
  className?: string;
}) {
  const [open, setOpen] = useState(false);
  const selected = skus.filter((sku) => values.includes(sku.id));

  const toggleSku = (skuId: number) => {
    onChange(values.includes(skuId) ? values.filter((id) => id !== skuId) : [...values, skuId]);
  };

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button
          type="button"
          variant="outline"
          role="combobox"
          aria-expanded={open}
          className={cn("h-auto min-h-9 justify-between rounded-xl bg-card px-3 py-2 text-left font-normal", className)}
        >
          <span className={cn("flex min-w-0 flex-1 flex-wrap gap-1", selected.length === 0 && "text-muted-foreground")}>
            {selected.length > 0
              ? selected.slice(0, 3).map((sku) => (
                <span key={sku.id} className="rounded-full bg-secondary px-2 py-0.5 text-xs text-secondary-foreground">
                  {sku.sku}
                </span>
              ))
              : placeholder}
            {selected.length > 3 && <span className="text-xs text-muted-foreground">+{selected.length - 3}</span>}
          </span>
          <ChevronsUpDown className="ml-2 h-3.5 w-3.5 shrink-0 opacity-50" />
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-[360px] p-0" align="start">
        <Command>
          <CommandInput placeholder="ค้นหา SKU / ชื่อสินค้า..." />
          <CommandList>
            <CommandEmpty>ไม่พบสินค้า</CommandEmpty>
            <CommandGroup>
              <CommandItem
                value="__clear__"
                onSelect={() => onChange([])}
              >
                <X className="h-4 w-4 text-muted-foreground" />
                ล้าง SKU ทั้งหมด
              </CommandItem>
              {skus.map((sku) => (
                <CommandItem
                  key={sku.id}
                  value={`${sku.sku} ${sku.name} ${sku.category ?? ""}`}
                  onSelect={() => toggleSku(sku.id)}
                >
                  <Check className={cn("h-4 w-4", values.includes(sku.id) ? "opacity-100" : "opacity-0")} />
                  <div className="min-w-0">
                    <p className="truncate text-sm">{sku.name}</p>
                    <p className="truncate text-xs text-muted-foreground">{sku.sku}{sku.category ? ` · ${sku.category}` : ""}</p>
                  </div>
                </CommandItem>
              ))}
            </CommandGroup>
          </CommandList>
        </Command>
      </PopoverContent>
    </Popover>
  );
}

export default function ContentHistory() {
  const utils = trpc.useUtils();
  const initialParams = useMemo(() => new URLSearchParams(window.location.search), []);
  const initialView = savedViewOptions.some((option) => option.value === initialParams.get("view"))
    ? initialParams.get("view") as (typeof savedViewOptions)[number]["value"]
    : "all";
  const initialProductSetId = Number(initialParams.get("productSetId"));
  const [search, setSearch] = useState("");
  const [platform, setPlatform] = useState("all");
  const [contentType, setContentType] = useState("all");
  const [savedView, setSavedView] = useState<(typeof savedViewOptions)[number]["value"]>(initialView);
  const [status, setStatus] = useState<"all" | "published" | "unpublished">("all");
  const [mapping, setMapping] = useState<"all" | "mapped" | "unmapped">("all");
  const [skuFilterId, setSkuFilterId] = useState<number | null>(null);
  const [productSetId, setProductSetId] = useState<number | null>(Number.isFinite(initialProductSetId) && initialProductSetId > 0 ? initialProductSetId : null);
  const [sort, setSort] = useState("publishedAt:desc");
  const [pageSize, setPageSize] = useState(50);
  const [page, setPage] = useState(0);
  const [selectedIds, setSelectedIds] = useState<Set<number>>(new Set());
  const [bulkSkuIds, setBulkSkuIds] = useState<number[]>([]);
  const [selectedItem, setSelectedItem] = useState<ContentItem | null>(null);
  const [selectedSkuIds, setSelectedSkuIds] = useState<number[]>([]);
  const [notes, setNotes] = useState("");
  const [aiInsight, setAiInsight] = useState<AiInsight | null>(null);
  const [sortBy, sortDir] = sort.split(":") as [
    "publishedAt" | "createdAt" | "views" | "reach" | "likes" | "comments" | "shares" | "bookmarks" | "pfmScore" | "totalMediaCost" | "adsCount",
    "asc" | "desc",
  ];

  const queryInput = useMemo(() => ({
    limit: pageSize,
    offset: page * pageSize,
    search: search.trim() || undefined,
    view: savedView,
    platform,
    contentType,
    skuId: skuFilterId ?? undefined,
    productSetId: productSetId ?? undefined,
    mapping,
    status,
    sortBy,
    sortDir,
  }), [contentType, mapping, page, pageSize, platform, productSetId, savedView, search, skuFilterId, sortBy, sortDir, status]);

  const summaryInput = useMemo(() => ({
    search: search.trim() || undefined,
    view: savedView,
    platform,
    contentType,
    skuId: skuFilterId ?? undefined,
    productSetId: productSetId ?? undefined,
    mapping,
    status,
    sortBy,
    sortDir,
  }), [contentType, mapping, platform, productSetId, savedView, search, skuFilterId, sortBy, sortDir, status]);

  const { data: items = [], isLoading } = trpc.history.list.useQuery(queryInput);
  const { data: summary } = trpc.history.summary.useQuery(summaryInput);
  const { data: skus = [] } = trpc.sku.list.useQuery({ brandId: undefined });

  const deleteMutation = trpc.history.delete.useMutation({
    onSuccess: () => {
      utils.history.list.invalidate();
      utils.history.summary.invalidate();
      toast.success("ลบสำเร็จ");
    },
  });

  const updateMutation = trpc.history.update.useMutation({
    onSuccess: () => {
      utils.history.list.invalidate();
      utils.history.summary.invalidate();
    },
  });

  const analyzeMutation = trpc.history.analyzeWithAI.useMutation({
    onSuccess: (data) => {
      setAiInsight(data as AiInsight);
      toast.success("AI วิเคราะห์ content ให้แล้ว");
    },
    onError: (error) => {
      toast.error(error.message || "AI วิเคราะห์ไม่สำเร็จ");
    },
  });

  const total = summary?.totalContents ?? 0;
  const from = total === 0 ? 0 : page * pageSize + 1;
  const to = Math.min((page + 1) * pageSize, total);
  const canPrev = page > 0;
  const canNext = to < total;
  const selectedCount = selectedIds.size;
  const allVisibleSelected = items.length > 0 && items.every((item) => selectedIds.has(item.id));

  const updateFilter = (setter: (value: string) => void, value: string) => {
    setter(value);
    setPage(0);
    setSelectedIds(new Set());
  };

  const applySavedView = (view: typeof savedView) => {
    setSavedView(view);
    setPage(0);
    setSelectedIds(new Set());
    if (view === "last100") {
      setSort("publishedAt:desc");
      setPageSize(100);
    }
    if (view === "bestPFM" || view === "shouldRunAds") setSort("pfmScore:desc");
    if (view === "noProductMapping") setMapping("unmapped");
    if (view === "multiSku") setMapping("mapped");
  };

  useEffect(() => {
    if (!selectedItem) return;
    setSelectedSkuIds(selectedItem.skuMappings.map((mapping) => mapping.skuId));
    setNotes(selectedItem.notes ?? "");
    setAiInsight(null);
  }, [selectedItem]);

  const saveSelectedItem = async () => {
    if (!selectedItem) return;
    await updateMutation.mutateAsync({
      id: selectedItem.id,
      skuIds: selectedSkuIds,
      notes: notes || undefined,
    });
    toast.success("บันทึก content asset แล้ว");
  };

  const updateItemSkus = async (item: ContentItem, skuIds: number[]) => {
    await updateMutation.mutateAsync({ id: item.id, skuIds });
    toast.success(`อัปเดตสินค้าให้ ${item.title}`);
  };

  const toggleSelected = (id: number) => {
    setSelectedIds((current) => {
      const next = new Set(current);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const toggleAllVisible = () => {
    setSelectedIds((current) => {
      const next = new Set(current);
      if (allVisibleSelected) items.forEach((item) => next.delete(item.id));
      else items.forEach((item) => next.add(item.id));
      return next;
    });
  };

  const bulkApplySku = async () => {
    const ids = Array.from(selectedIds);
    if (ids.length === 0) return;
    await Promise.all(ids.map((id) => updateMutation.mutateAsync({ id, skuIds: bulkSkuIds })));
    setSelectedIds(new Set());
    toast.success(`อัปเดตสินค้าให้ ${ids.length} รายการแล้ว`);
  };

  const setSortByColumn = (column: typeof sortBy) => {
    const nextDir = sortBy === column && sortDir === "desc" ? "asc" : "desc";
    setSort(`${column}:${nextDir}`);
    setPage(0);
  };

  const applyAiSuggestion = () => {
    if (!aiInsight) return;
    const aiSkuIds = aiInsight.recommendedSkuIds?.length
      ? aiInsight.recommendedSkuIds
      : aiInsight.recommendedSkuId
        ? [aiInsight.recommendedSkuId]
        : [];
    if (aiSkuIds.length > 0) {
      setSelectedSkuIds((current) => Array.from(new Set([...current, ...aiSkuIds])));
    }
    const aiNotes = [
      aiInsight.summary ? `AI Summary: ${aiInsight.summary}` : "",
      aiInsight.salesAngle ? `Sales Angle: ${aiInsight.salesAngle}` : "",
      aiInsight.funnelStage ? `Funnel: ${aiInsight.funnelStage}` : "",
      aiInsight.adsPotential ? `Ads Potential: ${aiInsight.adsPotential}` : "",
      aiInsight.recommendedActions?.length ? `Actions: ${aiInsight.recommendedActions.join("; ")}` : "",
      aiInsight.nextContentIdeas?.length ? `Next Ideas: ${aiInsight.nextContentIdeas.join("; ")}` : "",
    ].filter(Boolean).join("\n");
    setNotes((current) => [current, aiNotes].filter(Boolean).join("\n\n"));
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
        <div className="flex items-center gap-3">
          <span className="flex h-11 w-11 items-center justify-center rounded-2xl bg-primary/10 text-primary">
            <History className="h-5 w-5" />
          </span>
          <div>
            <h1 className="text-2xl font-bold tracking-tight">Content Library</h1>
            <p className="mt-0.5 text-sm text-muted-foreground">
              คลัง content asset ที่ทีมยังใช้ต่อยอด sale, marketing และ ads ได้จริง
            </p>
          </div>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <Link href="/social-sync">
            <Button variant="outline" className="gap-2 rounded-xl bg-card">
              <RadioTower className="h-4 w-4" />
              Social Sync
            </Button>
          </Link>
          <Link href="/import">
            <Button className="gap-2 rounded-xl">
              <Sparkles className="h-4 w-4" />
              Import Data
            </Button>
          </Link>
        </div>
      </div>

      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        <Card className="soft-card rounded-3xl">
          <CardContent className="flex items-center gap-4 p-5">
            <span className="flex h-12 w-12 items-center justify-center rounded-2xl bg-blue-50 text-blue-600">
              <BarChart3 className="h-5 w-5" />
            </span>
            <div>
              <p className="text-xs text-muted-foreground">Content Assets</p>
              <p className="text-2xl font-bold">{formatNumber(summary?.totalContents)}</p>
            </div>
          </CardContent>
        </Card>
        <Card className="soft-card rounded-3xl">
          <CardContent className="flex items-center gap-4 p-5">
            <span className="flex h-12 w-12 items-center justify-center rounded-2xl bg-violet-50 text-violet-600">
              <Eye className="h-5 w-5" />
            </span>
            <div>
              <p className="text-xs text-muted-foreground">Views</p>
              <p className="text-2xl font-bold">{formatNumber(summary?.totalViews)}</p>
            </div>
          </CardContent>
        </Card>
        <Card className="soft-card rounded-3xl">
          <CardContent className="flex items-center gap-4 p-5">
            <span className="flex h-12 w-12 items-center justify-center rounded-2xl bg-emerald-50 text-emerald-600">
              <TrendingUp className="h-5 w-5" />
            </span>
            <div>
              <p className="text-xs text-muted-foreground">Reach</p>
              <p className="text-2xl font-bold">{formatNumber(summary?.totalReach)}</p>
            </div>
          </CardContent>
        </Card>
        <Card className="soft-card rounded-3xl">
          <CardContent className="flex items-center gap-4 p-5">
            <span className="flex h-12 w-12 items-center justify-center rounded-2xl bg-amber-50 text-amber-600">
              <Heart className="h-5 w-5" />
            </span>
            <div>
              <p className="text-xs text-muted-foreground">Avg Engagement Score</p>
              <p className="text-2xl font-bold">{Number(summary?.avgScore ?? 0).toFixed(2)}%</p>
            </div>
          </CardContent>
        </Card>
      </div>

      <Card className="soft-card rounded-3xl">
        <CardContent className="space-y-3 p-4">
          <div className="flex items-center gap-2 text-sm font-medium">
            <Sparkles className="h-4 w-4 text-primary" />
            Saved Views
          </div>
          <div className="flex flex-wrap gap-2">
            {savedViewOptions.map((option) => (
              <Button
                key={option.value}
                variant={savedView === option.value ? "default" : "outline"}
                size="sm"
                className="h-auto rounded-2xl px-3 py-2"
                onClick={() => applySavedView(option.value)}
              >
                <span className="text-left">
                  <span className="block text-xs font-semibold">{option.label}</span>
                  <span className={cn("block text-[11px]", savedView === option.value ? "text-primary-foreground/80" : "text-muted-foreground")}>
                    {option.description}
                  </span>
                </span>
              </Button>
            ))}
          </div>
        </CardContent>
      </Card>

      <Card className="soft-card rounded-3xl">
        <CardContent className="p-4">
          <div className="grid gap-3 xl:grid-cols-[minmax(260px,1fr)_repeat(7,160px)]">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <Input
                placeholder="ค้นหา caption, hook, external id..."
                value={search}
                onChange={(event) => {
                  setSearch(event.target.value);
                  setPage(0);
                }}
                className="h-10 rounded-xl bg-background pl-9"
              />
            </div>
            <select
              value={platform}
              onChange={(event) => updateFilter(setPlatform, event.target.value)}
              className="h-10 rounded-xl border border-input bg-background px-3 text-sm"
            >
              {platformOptions.map((option) => <option key={option.value} value={option.value}>{option.label}</option>)}
            </select>
            <select
              value={contentType}
              onChange={(event) => updateFilter(setContentType, event.target.value)}
              className="h-10 rounded-xl border border-input bg-background px-3 text-sm"
            >
              {typeOptions.map((option) => <option key={option.value} value={option.value}>{option.label}</option>)}
            </select>
            <select
              value={status}
              onChange={(event) => {
                setStatus(event.target.value as "all" | "published" | "unpublished");
                setPage(0);
                setSelectedIds(new Set());
              }}
              className="h-10 rounded-xl border border-input bg-background px-3 text-sm"
            >
              {statusOptions.map((option) => <option key={option.value} value={option.value}>{option.label}</option>)}
            </select>
            <select
              value={mapping}
              onChange={(event) => {
                setMapping(event.target.value as "all" | "mapped" | "unmapped");
                setPage(0);
                setSelectedIds(new Set());
              }}
              className="h-10 rounded-xl border border-input bg-background px-3 text-sm"
            >
              <option value="all">ทุก mapping</option>
              <option value="unmapped">ยังไม่ผูกสินค้า</option>
              <option value="mapped">ผูกสินค้าแล้ว</option>
            </select>
            <SkuCombobox
              skus={skus}
              value={skuFilterId}
              onChange={(value) => {
                setSkuFilterId(value);
                setPage(0);
                setSelectedIds(new Set());
              }}
              placeholder="Filter SKU"
              className="w-full"
            />
            <select
              value={sort}
              onChange={(event) => updateFilter(setSort, event.target.value)}
              className="h-10 rounded-xl border border-input bg-background px-3 text-sm"
            >
              {sortOptions.map((option) => <option key={option.value} value={option.value}>{option.label}</option>)}
            </select>
            <select
              value={pageSize}
              onChange={(event) => {
                setPageSize(Number(event.target.value));
                setPage(0);
              }}
              className="h-10 rounded-xl border border-input bg-background px-3 text-sm"
            >
              {pageSizeOptions.map((option) => <option key={option} value={option}>{option} / page</option>)}
            </select>
          </div>
        </CardContent>
      </Card>

      <div className="flex flex-wrap items-center gap-2">
        {([
          ["all", "ทั้งหมด"],
          ["unmapped", "ยังไม่ผูกสินค้า"],
          ["mapped", "ผูกสินค้าแล้ว"],
        ] as const).map(([value, label]) => (
          <Button
            key={value}
            variant={mapping === value ? "default" : "outline"}
            size="sm"
            className="rounded-full"
            onClick={() => {
              setMapping(value);
              setPage(0);
              setSelectedIds(new Set());
            }}
          >
            {label}
          </Button>
        ))}
        {skuFilterId && (
          <Button
            variant="ghost"
            size="sm"
            className="rounded-full text-muted-foreground"
            onClick={() => {
              setSkuFilterId(null);
              setPage(0);
            }}
          >
            <X className="mr-1 h-3.5 w-3.5" />
            ล้าง SKU filter
          </Button>
        )}
        {productSetId && (
          <Button
            variant="ghost"
            size="sm"
            className="rounded-full text-muted-foreground"
            onClick={() => {
              setProductSetId(null);
              setPage(0);
            }}
          >
            <X className="mr-1 h-3.5 w-3.5" />
            ล้าง Product Set filter
          </Button>
        )}
      </div>

      <Card className="soft-card overflow-hidden rounded-3xl">
        <div className="flex items-center justify-between border-b border-border px-5 py-4">
          <div className="flex items-center gap-2 text-sm font-medium">
            <Filter className="h-4 w-4 text-primary" />
            Content Library
          </div>
          <p className="text-xs text-muted-foreground">
            แสดง {formatNumber(from)}-{formatNumber(to)} จาก {formatNumber(total)} รายการ
          </p>
        </div>

        {selectedCount > 0 && (
          <div className="flex flex-col gap-3 border-b border-border bg-primary/5 px-5 py-3 lg:flex-row lg:items-center lg:justify-between">
            <div className="flex items-center gap-2 text-sm font-medium text-primary">
              <Package className="h-4 w-4" />
              เลือกอยู่ {selectedCount} รายการ
            </div>
            <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
              <MultiSkuCombobox
                skus={skus}
                values={bulkSkuIds}
                onChange={setBulkSkuIds}
                placeholder="เลือกหลาย SKU สำหรับ bulk mapping"
                className="w-full sm:w-80"
              />
              <Button
                size="sm"
                className="rounded-xl"
                disabled={updateMutation.isPending}
                onClick={bulkApplySku}
              >
                Apply Products
              </Button>
              <Button
                size="sm"
                variant="ghost"
                className="rounded-xl"
                onClick={() => setSelectedIds(new Set())}
              >
                ยกเลิกเลือก
              </Button>
            </div>
          </div>
        )}

        {isLoading ? (
          <div className="space-y-2 p-4">
            {[1, 2, 3, 4, 5].map((item) => <div key={item} className="h-20 animate-pulse rounded-2xl bg-muted" />)}
          </div>
        ) : items.length === 0 ? (
          <CardContent className="flex flex-col items-center gap-3 py-14">
            <History className="h-10 w-10 text-muted-foreground/40" />
            <p className="text-sm text-muted-foreground">
              {search ? "ไม่พบ content asset ที่ค้นหา" : "ยังไม่มี content asset"}
            </p>
          </CardContent>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full min-w-[1320px] text-sm">
              <thead className="bg-muted/50 text-xs uppercase tracking-wide text-muted-foreground">
                <tr>
                  <th className="px-5 py-3 text-left font-medium">
                    <input
                      type="checkbox"
                      checked={allVisibleSelected}
                      onChange={toggleAllVisible}
                      aria-label="เลือกทั้งหมดในหน้านี้"
                      className="h-4 w-4 rounded border-border"
                    />
                  </th>
                  <th className="px-3 py-3 text-left font-medium">
                    <button type="button" className="inline-flex items-center gap-1 hover:text-primary" onClick={() => setSortByColumn("publishedAt")}>
                      Content
                      {sortBy === "publishedAt" && <span>{sortDir === "desc" ? "↓" : "↑"}</span>}
                    </button>
                  </th>
                  <th className="px-3 py-3 text-left font-medium">Product Mapping</th>
                  <th className="px-4 py-3 text-left font-medium">Platform</th>
                  <th className="px-4 py-3 text-right font-medium">
                    <button type="button" className="inline-flex items-center gap-1 hover:text-primary" onClick={() => setSortByColumn("pfmScore")}>
                      PFM
                      {sortBy === "pfmScore" && <span>{sortDir === "desc" ? "↓" : "↑"}</span>}
                    </button>
                  </th>
                  <th className="px-4 py-3 text-right font-medium">
                    <button type="button" className="inline-flex items-center gap-1 hover:text-primary" onClick={() => setSortByColumn("views")}>
                      Views
                      {sortBy === "views" && <span>{sortDir === "desc" ? "↓" : "↑"}</span>}
                    </button>
                  </th>
                  <th className="px-4 py-3 text-right font-medium">
                    <button type="button" className="inline-flex items-center gap-1 hover:text-primary" onClick={() => setSortByColumn("reach")}>
                      Reach
                      {sortBy === "reach" && <span>{sortDir === "desc" ? "↓" : "↑"}</span>}
                    </button>
                  </th>
                  <th className="px-4 py-3 text-right font-medium">Engagement</th>
                  <th className="px-4 py-3 text-left font-medium">Date</th>
                  <th className="px-4 py-3 text-left font-medium">Ops Status</th>
                  <th className="px-5 py-3 text-right font-medium">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {items.map((item) => {
                  const engagement = Number(item.likes ?? 0) + Number(item.comments ?? 0) + Number(item.shares ?? 0);
                  return (
                    <tr key={item.id} className="group bg-card transition-colors hover:bg-secondary/40">
                      <td className="px-5 py-4 align-top">
                        <input
                          type="checkbox"
                          checked={selectedIds.has(item.id)}
                          onChange={() => toggleSelected(item.id)}
                          aria-label={`เลือก content ${item.title}`}
                          className="mt-5 h-4 w-4 rounded border-border"
                        />
                      </td>
                      <td className="px-3 py-4">
                        <div className="flex min-w-0 items-start gap-3">
                          <div className="flex h-16 w-20 shrink-0 items-center justify-center overflow-hidden rounded-2xl bg-secondary">
                            {item.thumbnailUrl ? (
                              <img src={item.thumbnailUrl} alt="" className="h-full w-full object-cover" />
                            ) : (
                              <History className="h-5 w-5 text-muted-foreground/50" />
                            )}
                          </div>
                          <div className="min-w-0">
                            <div className="mb-1 flex flex-wrap items-center gap-2">
                              <ContentTypeBadge type={item.contentType} />
                              {item.skuMappings.slice(0, 3).map((mapping) => (
                                <Link key={mapping.skuId} href={`/product-sets?search=${encodeURIComponent(mapping.sku)}`}>
                                  <Badge variant="secondary" className="rounded-full text-xs hover:bg-primary hover:text-primary-foreground">
                                    {mapping.sku}
                                  </Badge>
                                </Link>
                              ))}
                              {item.skuMappings.length > 3 && (
                                <Link href={`/product-sets?search=${encodeURIComponent(item.skuMappings.map((mapping) => mapping.sku).join(","))}`}>
                                  <Badge variant="outline" className="rounded-full text-xs hover:bg-primary hover:text-primary-foreground">+{item.skuMappings.length - 3}</Badge>
                                </Link>
                              )}
                              {item.externalId && <span className="metric-chip">ID: {item.externalId}</span>}
                            </div>
                            <button
                              type="button"
                              onClick={() => setSelectedItem(item)}
                              className="line-clamp-1 text-left font-semibold text-foreground hover:text-primary hover:underline"
                            >
                              {item.title}
                            </button>
                            <p className="line-clamp-2 max-w-xl text-xs text-muted-foreground">
                              {item.caption || item.hook || "ไม่มี caption"}
                            </p>
                          </div>
                        </div>
                      </td>
                      <td className="px-3 py-4 align-top">
                        <MultiSkuCombobox
                          skus={skus}
                          values={item.skuMappings.map((mapping) => mapping.skuId)}
                          onChange={(values) => updateItemSkus(item, values)}
                          placeholder="Map products..."
                          className={cn("w-60", item.skuMappings.length === 0 && "border-amber-200 bg-amber-50 text-amber-700")}
                        />
                        {item.skuMappings.length === 0 && (
                          <p className="mt-1 text-xs text-amber-600">ยังไม่ผูกสินค้า</p>
                        )}
                      </td>
                      <td className="px-4 py-4">
                        <Badge className={`rounded-full capitalize ${platformBadgeClass(item.platform)}`}>
                          {item.platform ?? "unknown"}
                        </Badge>
                      </td>
                      <td className="px-4 py-4 text-right">
                        <p className="font-semibold">{Number(item.pfmScore ?? 0).toFixed(2)}</p>
                        <p className="text-xs text-muted-foreground">{formatNumber(item.adsCount)} ads</p>
                      </td>
                      <td className="px-4 py-4 text-right font-medium">{formatNumber(item.views)}</td>
                      <td className="px-4 py-4 text-right font-medium">{formatNumber(item.reach)}</td>
                      <td className="px-4 py-4">
                        <div className="flex justify-end gap-2 text-xs text-muted-foreground">
                          <span className="inline-flex items-center gap-1"><Heart className="h-3 w-3 text-rose-500" />{formatNumber(item.likes)}</span>
                          <span className="inline-flex items-center gap-1"><Package className="h-3 w-3 text-amber-500" />{formatNumber(item.bookmarks)}</span>
                          <span className="inline-flex items-center gap-1"><MessageCircle className="h-3 w-3 text-blue-500" />{formatNumber(item.comments)}</span>
                          <span className="inline-flex items-center gap-1"><Share2 className="h-3 w-3 text-emerald-500" />{formatNumber(item.shares)}</span>
                        </div>
                        <p className="mt-1 text-right text-xs font-medium text-foreground">{formatNumber(engagement)} total</p>
                      </td>
                      <td className="px-4 py-4">
                        <p className="text-xs text-muted-foreground">เผยแพร่</p>
                        <p className="font-medium">{formatDate(item.publishedAt)}</p>
                        <p className="text-xs text-muted-foreground">นำเข้า {formatDate(item.createdAt)}</p>
                      </td>
                      <td className="px-4 py-4">
                        <Badge className={`rounded-full ${contentStatusBadgeClass(item.contentStatus)}`}>
                          {item.contentStatus || "Need Status"}
                        </Badge>
                        <p className="mt-1 text-xs text-muted-foreground">EXP {formatDate(item.contentExpireDate)}</p>
                        {Number(item.totalMediaCost ?? 0) > 0 && (
                          <p className="text-xs text-muted-foreground">TMC {formatNumber(item.totalMediaCost)}</p>
                        )}
                      </td>
                      <td className="px-5 py-4">
                        <div className="flex justify-end gap-1">
                          {item.videoUrl && (
                            <Button asChild variant="ghost" size="icon" className="h-8 w-8 rounded-xl text-primary">
                              <a href={item.videoUrl} target="_blank" rel="noopener noreferrer" aria-label="เปิด content">
                                <ExternalLink className="h-4 w-4" />
                              </a>
                            </Button>
                          )}
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-8 w-8 rounded-xl text-amber-600"
                            onClick={() => setSelectedItem(item)}
                            aria-label="AI วิเคราะห์ content"
                          >
                            <Lightbulb className="h-4 w-4" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-8 w-8 rounded-xl text-destructive opacity-70 transition-opacity group-hover:opacity-100"
                            onClick={() => deleteMutation.mutate({ id: item.id })}
                            aria-label="ลบ content"
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}

        <div className="flex flex-col gap-3 border-t border-border px-5 py-4 sm:flex-row sm:items-center sm:justify-between">
          <p className="text-xs text-muted-foreground">
            แสดง {formatNumber(from)}-{formatNumber(to)} จาก {formatNumber(total)} รายการ
          </p>
          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              className="rounded-xl"
              disabled={!canPrev}
              onClick={() => setPage((current) => Math.max(0, current - 1))}
            >
              ก่อนหน้า
            </Button>
            <span className="rounded-xl bg-secondary px-3 py-1.5 text-xs font-medium">
              หน้า {page + 1}
            </span>
            <Button
              variant="outline"
              size="sm"
              className="rounded-xl"
              disabled={!canNext}
              onClick={() => setPage((current) => current + 1)}
            >
              ถัดไป
            </Button>
          </div>
        </div>
      </Card>

      <Sheet open={!!selectedItem} onOpenChange={(open) => { if (!open) setSelectedItem(null); }}>
        <SheetContent className="w-full overflow-y-auto sm:max-w-2xl">
          {selectedItem && (
            <>
              <SheetHeader className="border-b border-border px-0 pb-4">
                <SheetTitle className="pr-8 text-xl">{selectedItem.title}</SheetTitle>
                <SheetDescription>
                  AI-assisted content asset detail สำหรับผูกหลายสินค้า, สรุปมุมขาย และหา action ถัดไป
                </SheetDescription>
              </SheetHeader>

              <div className="space-y-5">
                <div className="overflow-hidden rounded-3xl border border-border bg-card">
                  {selectedItem.thumbnailUrl ? (
                    <img src={selectedItem.thumbnailUrl} alt="" className="h-56 w-full object-cover" />
                  ) : (
                    <div className="flex h-40 items-center justify-center bg-secondary text-muted-foreground">
                      ไม่มี thumbnail
                    </div>
                  )}
                  <div className="space-y-3 p-4">
                    <div className="flex flex-wrap items-center gap-2">
                      <ContentTypeBadge type={selectedItem.contentType} />
                      <Badge className={`rounded-full capitalize ${platformBadgeClass(selectedItem.platform)}`}>
                        {selectedItem.platform ?? "unknown"}
                      </Badge>
                      <Badge variant={selectedItem.publishedAt ? "default" : "secondary"} className="rounded-full">
                        {selectedItem.publishedAt ? "Published" : "Unpublished"}
                      </Badge>
                      <Badge className={`rounded-full ${contentStatusBadgeClass(selectedItem.contentStatus)}`}>
                        {selectedItem.contentStatus || "Need Status"}
                      </Badge>
                    </div>
                    <p className="whitespace-pre-wrap text-sm text-muted-foreground">
                      {selectedItem.caption || selectedItem.hook || "ไม่มี caption/hook"}
                    </p>
                    <div className="grid grid-cols-4 gap-2 text-center text-xs">
                      <div className="rounded-2xl bg-secondary p-3">
                        <p className="text-muted-foreground">Views</p>
                        <p className="font-bold">{formatNumber(selectedItem.views)}</p>
                      </div>
                      <div className="rounded-2xl bg-secondary p-3">
                        <p className="text-muted-foreground">Reach</p>
                        <p className="font-bold">{formatNumber(selectedItem.reach)}</p>
                      </div>
                      <div className="rounded-2xl bg-secondary p-3">
                        <p className="text-muted-foreground">Likes</p>
                        <p className="font-bold">{formatNumber(selectedItem.likes)}</p>
                      </div>
                      <div className="rounded-2xl bg-secondary p-3">
                        <p className="text-muted-foreground">Shares</p>
                        <p className="font-bold">{formatNumber(selectedItem.shares)}</p>
                      </div>
                      <div className="rounded-2xl bg-secondary p-3">
                        <p className="text-muted-foreground">PFM</p>
                        <p className="font-bold">{Number(selectedItem.pfmScore ?? 0).toFixed(2)}</p>
                      </div>
                      <div className="rounded-2xl bg-secondary p-3">
                        <p className="text-muted-foreground">Bookmarks</p>
                        <p className="font-bold">{formatNumber(selectedItem.bookmarks)}</p>
                      </div>
                      <div className="rounded-2xl bg-secondary p-3">
                        <p className="text-muted-foreground">TMC</p>
                        <p className="font-bold">{formatNumber(selectedItem.totalMediaCost)}</p>
                      </div>
                      <div className="rounded-2xl bg-secondary p-3">
                        <p className="text-muted-foreground">Expire</p>
                        <p className="font-bold">{formatDate(selectedItem.contentExpireDate)}</p>
                      </div>
                    </div>
                  </div>
                </div>

                <Card className="rounded-3xl">
                  <CardContent className="space-y-3 p-4">
                    <div className="flex items-center justify-between gap-3">
                      <div>
                        <h3 className="font-semibold">AI Strategy Assistant</h3>
                        <p className="text-xs text-muted-foreground">
                          ให้ AI ช่วยอ่าน content, metrics, brand rules และรายการสินค้า เพื่อแนะนำการขาย/ยิงแอด
                        </p>
                      </div>
                      <Button
                        className="rounded-xl"
                        disabled={analyzeMutation.isPending}
                        onClick={() => analyzeMutation.mutate({ id: selectedItem.id, brandId: selectedItem.brandId ?? undefined })}
                      >
                        <Sparkles className="mr-2 h-4 w-4" />
                        {analyzeMutation.isPending ? "กำลังคิด..." : "วิเคราะห์ด้วย AI"}
                      </Button>
                    </div>

                    {aiInsight && (
                      <div className="space-y-3 rounded-2xl border border-primary/20 bg-primary/5 p-4">
                        <div className="flex flex-wrap gap-2">
                          <Badge className="rounded-full bg-primary text-primary-foreground">
                            Score {Math.round(Number(aiInsight.organicScore ?? 0))}/100
                          </Badge>
                          <Badge variant="secondary" className="rounded-full">
                            Funnel: {aiInsight.funnelStage ?? "-"}
                          </Badge>
                          <Badge variant="secondary" className="rounded-full">
                            Ads: {aiInsight.adsPotential ?? "-"}
                          </Badge>
                        </div>
                        {aiInsight.summary && <p className="text-sm">{aiInsight.summary}</p>}
                        {aiInsight.salesAngle && (
                          <p className="text-sm"><span className="font-semibold">มุมขาย:</span> {aiInsight.salesAngle}</p>
                        )}
                        {(aiInsight.recommendedSkuNames?.length || aiInsight.recommendedSkuName) && (
                          <p className="text-sm">
                            <span className="font-semibold">สินค้าที่แนะนำ:</span>{" "}
                            {aiInsight.recommendedSkuNames?.length ? aiInsight.recommendedSkuNames.join(", ") : aiInsight.recommendedSkuName}
                          </p>
                        )}
                        {!!aiInsight.recommendedActions?.length && (
                          <div>
                            <p className="mb-1 text-sm font-semibold">Actions</p>
                            <ul className="list-disc space-y-1 pl-5 text-sm text-muted-foreground">
                              {aiInsight.recommendedActions.map((action) => <li key={action}>{action}</li>)}
                            </ul>
                          </div>
                        )}
                        {!!aiInsight.nextContentIdeas?.length && (
                          <div>
                            <p className="mb-1 text-sm font-semibold">Next Content Ideas</p>
                            <ul className="list-disc space-y-1 pl-5 text-sm text-muted-foreground">
                              {aiInsight.nextContentIdeas.map((idea) => <li key={idea}>{idea}</li>)}
                            </ul>
                          </div>
                        )}
                        <Button variant="outline" className="rounded-xl bg-card" onClick={applyAiSuggestion}>
                          ใช้คำแนะนำ AI ใส่ใน products/notes
                        </Button>
                      </div>
                    )}
                  </CardContent>
                </Card>

                <Card className="rounded-3xl">
                  <CardContent className="space-y-4 p-4">
                    <div>
                      <label className="mb-2 block text-sm font-medium">ผูกสินค้า/SKU หลายรายการ</label>
                      <MultiSkuCombobox
                        skus={skus}
                        values={selectedSkuIds}
                        onChange={setSelectedSkuIds}
                        placeholder="ค้นหาและเลือกหลาย SKU"
                        className="w-full"
                      />
                      {selectedSkuIds.length > 0 && (
                        <p className="mt-1 text-xs text-muted-foreground">เลือกอยู่ {selectedSkuIds.length} SKU</p>
                      )}
                    </div>

                    <div>
                      <label className="mb-2 block text-sm font-medium">Strategy Notes</label>
                      <Textarea
                        value={notes}
                        onChange={(event) => setNotes(event.target.value)}
                        placeholder="บันทึก insight, มุมขาย, action ถัดไป..."
                        rows={8}
                        className="rounded-2xl"
                      />
                    </div>

                    <div className="flex flex-wrap justify-between gap-2">
                      {selectedItem.videoUrl ? (
                        <Button asChild variant="outline" className="rounded-xl bg-card">
                          <a href={selectedItem.videoUrl} target="_blank" rel="noopener noreferrer">
                            <ExternalLink className="mr-2 h-4 w-4" />
                            เปิด content ต้นทาง
                          </a>
                        </Button>
                      ) : <span />}
                      <Button className="rounded-xl" disabled={updateMutation.isPending} onClick={saveSelectedItem}>
                        {updateMutation.isPending ? "กำลังบันทึก..." : "บันทึก products/notes"}
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              </div>
            </>
          )}
        </SheetContent>
      </Sheet>
    </div>
  );
}
