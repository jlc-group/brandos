import { useMemo, useState } from "react";
import { Link } from "wouter";
import { format } from "date-fns";
import { th } from "date-fns/locale";
import { BarChart3, Eye, Package, Search, Sparkles, TrendingUp } from "lucide-react";
import { trpc } from "@/lib/trpc";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";

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

export default function ProductSets() {
  const initialSearch = useMemo(() => new URLSearchParams(window.location.search).get("search") ?? "", []);
  const [search, setSearch] = useState(initialSearch);
  const [sort, setSort] = useState<"contentCount" | "avgPfmScore" | "totalViews" | "totalMediaCost" | "lastContentAt">("contentCount");

  const { data: sets = [], isLoading } = trpc.productSets.list.useQuery({
    search: search.trim() || undefined,
    sortBy: sort,
    sortDir: "desc",
    limit: 120,
    offset: 0,
  });

  const totals = useMemo(() => ({
    sets: sets.length,
    contents: sets.reduce((sum, set) => sum + Number(set.contentCount ?? 0), 0),
    views: sets.reduce((sum, set) => sum + Number(set.totalViews ?? 0), 0),
    multiSku: sets.filter((set) => Number(set.skuCount ?? 0) > 1).length,
  }), [sets]);

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
        <div className="flex items-center gap-3">
          <span className="flex h-11 w-11 items-center justify-center rounded-2xl bg-primary/10 text-primary">
            <Package className="h-5 w-5" />
          </span>
          <div>
            <h1 className="text-2xl font-bold tracking-tight">Product Sets</h1>
            <p className="mt-0.5 text-sm text-muted-foreground">
              ชุด SKU ที่เกิดจริงจาก content เพื่อดู winning combinations และต่อยอด ads/sales
            </p>
          </div>
        </div>
        <Link href="/contents?view=multiSku">
          <Button className="gap-2 rounded-xl">
            <Sparkles className="h-4 w-4" />
            ดู Multi-SKU Content
          </Button>
        </Link>
      </div>

      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        <Card className="soft-card rounded-3xl">
          <CardContent className="flex items-center gap-4 p-5">
            <span className="flex h-12 w-12 items-center justify-center rounded-2xl bg-blue-50 text-blue-600">
              <Package className="h-5 w-5" />
            </span>
            <div>
              <p className="text-xs text-muted-foreground">Active Sets</p>
              <p className="text-2xl font-bold">{formatNumber(totals.sets)}</p>
            </div>
          </CardContent>
        </Card>
        <Card className="soft-card rounded-3xl">
          <CardContent className="flex items-center gap-4 p-5">
            <span className="flex h-12 w-12 items-center justify-center rounded-2xl bg-violet-50 text-violet-600">
              <BarChart3 className="h-5 w-5" />
            </span>
            <div>
              <p className="text-xs text-muted-foreground">Content Links</p>
              <p className="text-2xl font-bold">{formatNumber(totals.contents)}</p>
            </div>
          </CardContent>
        </Card>
        <Card className="soft-card rounded-3xl">
          <CardContent className="flex items-center gap-4 p-5">
            <span className="flex h-12 w-12 items-center justify-center rounded-2xl bg-emerald-50 text-emerald-600">
              <TrendingUp className="h-5 w-5" />
            </span>
            <div>
              <p className="text-xs text-muted-foreground">Total Views</p>
              <p className="text-2xl font-bold">{formatNumber(totals.views)}</p>
            </div>
          </CardContent>
        </Card>
        <Card className="soft-card rounded-3xl">
          <CardContent className="flex items-center gap-4 p-5">
            <span className="flex h-12 w-12 items-center justify-center rounded-2xl bg-amber-50 text-amber-600">
              <Eye className="h-5 w-5" />
            </span>
            <div>
              <p className="text-xs text-muted-foreground">Multi-SKU Sets</p>
              <p className="text-2xl font-bold">{formatNumber(totals.multiSku)}</p>
            </div>
          </CardContent>
        </Card>
      </div>

      <Card className="soft-card rounded-3xl">
        <CardContent className="grid gap-3 p-4 md:grid-cols-[1fr_220px]">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              placeholder="ค้นหา SKU set เช่น J1,K4 หรือชื่อสินค้า..."
              value={search}
              onChange={(event) => setSearch(event.target.value)}
              className="h-10 rounded-xl bg-background pl-9"
            />
          </div>
          <select
            value={sort}
            onChange={(event) => setSort(event.target.value as typeof sort)}
            className="h-10 rounded-xl border border-input bg-background px-3 text-sm"
          >
            <option value="contentCount">Content เยอะสุด</option>
            <option value="avgPfmScore">PFM สูงสุด</option>
            <option value="totalViews">Views สูงสุด</option>
            <option value="totalMediaCost">Media cost สูงสุด</option>
            <option value="lastContentAt">ล่าสุดที่เผยแพร่</option>
          </select>
        </CardContent>
      </Card>

      <Card className="soft-card overflow-hidden rounded-3xl">
        <div className="flex items-center justify-between border-b border-border px-5 py-4">
          <div className="text-sm font-medium">Product Set Library</div>
          <p className="text-xs text-muted-foreground">{formatNumber(sets.length)} sets</p>
        </div>
        {isLoading ? (
          <div className="space-y-2 p-4">
            {[1, 2, 3, 4].map((item) => <div key={item} className="h-20 animate-pulse rounded-2xl bg-muted" />)}
          </div>
        ) : sets.length === 0 ? (
          <CardContent className="py-14 text-center text-sm text-muted-foreground">ยังไม่พบ Product Set</CardContent>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full min-w-[980px] text-sm">
              <thead className="bg-muted/50 text-xs uppercase tracking-wide text-muted-foreground">
                <tr>
                  <th className="px-5 py-3 text-left font-medium">Product Set</th>
                  <th className="px-4 py-3 text-right font-medium">Contents</th>
                  <th className="px-4 py-3 text-right font-medium">Views</th>
                  <th className="px-4 py-3 text-right font-medium">Avg PFM</th>
                  <th className="px-4 py-3 text-right font-medium">TMC</th>
                  <th className="px-4 py-3 text-left font-medium">Latest</th>
                  <th className="px-5 py-3 text-right font-medium">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {sets.map((set) => (
                  <tr key={set.id} className="bg-card hover:bg-secondary/40">
                    <td className="px-5 py-4">
                      <div className="flex flex-wrap gap-1.5">
                        {set.skus.map((sku) => (
                          <Badge key={sku.skuId} variant="secondary" className="rounded-full">
                            {sku.sku}
                          </Badge>
                        ))}
                      </div>
                      <p className="mt-2 line-clamp-1 font-semibold">{set.name}</p>
                    </td>
                    <td className="px-4 py-4 text-right font-semibold">{formatNumber(set.contentCount)}</td>
                    <td className="px-4 py-4 text-right">{formatNumber(set.totalViews)}</td>
                    <td className="px-4 py-4 text-right">{Number(set.avgPfmScore ?? 0).toFixed(2)}</td>
                    <td className="px-4 py-4 text-right">{formatNumber(set.totalMediaCost)}</td>
                    <td className="px-4 py-4 text-muted-foreground">{formatDate(set.lastContentAt)}</td>
                    <td className="px-5 py-4 text-right">
                      <Link href={`/contents?productSetId=${set.id}&view=all`}>
                        <Button variant="outline" size="sm" className="rounded-xl bg-card">
                          ดู Content
                        </Button>
                      </Link>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </Card>
    </div>
  );
}
