import { useState } from "react";
import { trpc } from "@/lib/trpc";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { History, Search, ExternalLink, Trash2 } from "lucide-react";
import { ContentTypeBadge } from "@/components/ContentTypeBadge";
import { toast } from "sonner";
import { format } from "date-fns";
import { th } from "date-fns/locale";

export default function ContentHistory() {
  const utils = trpc.useUtils();
  const [search, setSearch] = useState("");
  const { data: items = [], isLoading } = trpc.history.list.useQuery({ limit: 100, offset: 0 });
  const { data: skus = [] } = trpc.sku.list.useQuery({ brandId: undefined });

  const deleteMutation = trpc.history.delete.useMutation({
    onSuccess: () => { utils.history.list.invalidate(); toast.success("ลบสำเร็จ"); },
  });

  const filtered = items.filter(item =>
    !search || item.title.toLowerCase().includes(search.toLowerCase())
  );

  const skuMap = Object.fromEntries(skus.map(s => [s.id, s.name]));

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-bold flex items-center gap-2">
            <History className="h-5 w-5 text-primary" />
            Content History
          </h1>
          <p className="text-sm text-muted-foreground mt-0.5">บันทึก Content ที่ผ่านมาทั้งหมด</p>
        </div>
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground" />
          <Input
            placeholder="ค้นหา..."
            value={search}
            onChange={e => setSearch(e.target.value)}
            className="pl-8 h-8 text-sm w-48"
          />
        </div>
      </div>

      {isLoading ? (
        <div className="space-y-2">
          {[1,2,3,4,5].map(i => <div key={i} className="h-16 bg-card rounded-lg animate-pulse" />)}
        </div>
      ) : filtered.length === 0 ? (
        <Card className="bg-card border-border">
          <CardContent className="flex flex-col items-center py-12 gap-3">
            <History className="h-10 w-10 text-muted-foreground/40" />
            <p className="text-sm text-muted-foreground">
              {search ? "ไม่พบ Content ที่ค้นหา" : "ยังไม่มี Content History"}
            </p>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-2">
          <p className="text-xs text-muted-foreground">{filtered.length} รายการ</p>
          {filtered.map(item => {
            const skuName = item.skuId ? skuMap[item.skuId] : null;
            return (
              <Card key={item.id} className="bg-card border-border hover:border-primary/20 transition-colors group">
                <CardContent className="p-4">
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 flex-wrap mb-1">
                        <ContentTypeBadge type={item.contentType} />
                        {skuName && <Badge variant="secondary" className="text-xs">{skuName}</Badge>}
                        <span className="text-xs text-muted-foreground">
                          {format(new Date(item.createdAt), "d MMM yyyy", { locale: th })}
                        </span>
                        {item.publishedAt && (
                          <span className="text-xs text-green-400">
                            เผยแพร่ {format(new Date(item.publishedAt), "d MMM", { locale: th })}
                          </span>
                        )}
                      </div>
                      <p className="font-medium text-sm text-foreground">{item.title}</p>
                      {item.hook && (
                        <p className="text-xs text-muted-foreground mt-0.5 line-clamp-1">Hook: {item.hook}</p>
                      )}
                      {item.videoUrl && (
                        <a href={item.videoUrl} target="_blank" rel="noopener noreferrer" className="text-xs text-primary hover:underline flex items-center gap-1 mt-1">
                          <ExternalLink className="h-3 w-3" />
                          ดู Content
                        </a>
                      )}
                    </div>
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-7 w-7 text-destructive opacity-0 group-hover:opacity-100 transition-opacity shrink-0"
                      onClick={() => deleteMutation.mutate({ id: item.id })}
                    >
                      <Trash2 className="h-3.5 w-3.5" />
                    </Button>
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}
    </div>
  );
}
