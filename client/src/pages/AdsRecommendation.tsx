import { useState } from "react";
import { trpc } from "@/lib/trpc";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Zap, TrendingUp, TrendingDown, Pause, Copy, CheckCircle, XCircle, Loader2 } from "lucide-react";
import { toast } from "sonner";
import { format } from "date-fns";
import { th } from "date-fns/locale";

const actionConfig: Record<string, { label: string; icon: React.ElementType; color: string; bg: string }> = {
  scale: { label: "Scale ขึ้น", icon: TrendingUp, color: "text-green-400", bg: "bg-green-400/10 border-green-400/20" },
  stop: { label: "หยุดยิง", icon: TrendingDown, color: "text-red-400", bg: "bg-red-400/10 border-red-400/20" },
  create_variation: { label: "ทดสอบ Variation", icon: Copy, color: "text-blue-400", bg: "bg-blue-400/10 border-blue-400/20" },
  test: { label: "ทดสอบ", icon: Pause, color: "text-yellow-400", bg: "bg-yellow-400/10 border-yellow-400/20" },
  monitor: { label: "ติดตาม", icon: Zap, color: "text-purple-400", bg: "bg-purple-400/10 border-purple-400/20" },
};

const statusConfig: Record<string, { label: string; color: string }> = {
  pending: { label: "รอดำเนินการ", color: "text-yellow-400 border-yellow-400/40" },
  applied: { label: "ดำเนินการแล้ว", color: "text-green-400 border-green-400/40" },
  dismissed: { label: "ข้ามไป", color: "text-muted-foreground border-border" },
};

export default function AdsRecommendation() {
  const utils = trpc.useUtils();
  const [statusFilter, setStatusFilter] = useState<string | undefined>(undefined);

  const { data: recommendations = [], isLoading } = trpc.adsRecommendation.list.useQuery({ brandId: undefined });

  const generateMutation = trpc.adsRecommendation.generate.useMutation({
    onSuccess: (data) => {
      utils.adsRecommendation.list.invalidate();
      toast.success(`สร้าง ${data.created} คำแนะนำใหม่`);
    },
    onError: () => toast.error("สร้างคำแนะนำไม่สำเร็จ"),
  });

  const updateStatusMutation = trpc.adsRecommendation.markActioned.useMutation({
    onSuccess: () => utils.adsRecommendation.list.invalidate(),
  });

  const handleGenerate = () => {
    generateMutation.mutate({ brandId: 1 });
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-bold flex items-center gap-2">
            <Zap className="h-5 w-5 text-purple-400" />
            Ads Recommendation Engine
          </h1>
          <p className="text-sm text-muted-foreground mt-0.5">AI แนะนำว่า Content ไหนควร Scale, หยุด หรือทดสอบ Variation</p>
        </div>
        <Button
          onClick={handleGenerate}
          disabled={generateMutation.isPending}
          className="gap-1.5"
        >
          {generateMutation.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Zap className="h-4 w-4" />}
          AI วิเคราะห์ใหม่
        </Button>
      </div>

      {/* Filter */}
      <div className="flex items-center gap-3">
        <p className="text-xs text-muted-foreground">กรอง:</p>
        <div className="flex gap-2">
          {[
            { value: undefined, label: "ทั้งหมด" },
            { value: "pending" as const, label: "รอดำเนินการ" },
            { value: "applied" as const, label: "ดำเนินการแล้ว" },
            { value: "dismissed" as const, label: "ข้ามไป" },
          ].map(opt => (
            <button
              key={String(opt.value)}
              onClick={() => setStatusFilter(opt.value)}
              className={`px-3 py-1 rounded-full text-xs font-medium transition-colors ${
                statusFilter === opt.value
                  ? "bg-primary text-primary-foreground"
                  : "bg-secondary text-muted-foreground hover:text-foreground"
              }`}
            >
              {opt.label}
            </button>
          ))}
        </div>
      </div>

      {isLoading ? (
        <div className="space-y-3">
          {[1,2,3].map(i => <div key={i} className="h-28 bg-card rounded-xl animate-pulse" />)}
        </div>
      ) : recommendations.length === 0 ? (
        <Card className="bg-card border-border">
          <CardContent className="flex flex-col items-center py-16 gap-4">
            <Zap className="h-12 w-12 text-muted-foreground/40" />
            <div className="text-center">
              <p className="font-medium">ยังไม่มีคำแนะนำ</p>
              <p className="text-sm text-muted-foreground mt-1">
                กด "AI วิเคราะห์ใหม่" เพื่อให้ AI วิเคราะห์ข้อมูล Performance และสร้างคำแนะนำ
              </p>
            </div>
            <Button onClick={handleGenerate} disabled={generateMutation.isPending} variant="outline">
              {generateMutation.isPending ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : <Zap className="h-4 w-4 mr-2" />}
              เริ่มวิเคราะห์
            </Button>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-3">
          {recommendations.map(rec => {
            const action = actionConfig[rec.action] ?? { label: rec.action, icon: Zap, color: "text-muted-foreground", bg: "bg-secondary" };
            const ActionIcon = action.icon;
            const recStatus = rec.isActioned ? 'applied' : 'pending'; const statusCfg = statusConfig[recStatus];

            return (
              <Card key={rec.id} className={`border ${!rec.isActioned ? "border-border hover:border-primary/30" : "border-border/50 opacity-70"} bg-card transition-colors`}>
                <CardContent className="p-4">
                  <div className="flex items-start gap-4">
                    <div className={`p-2.5 rounded-lg border ${action.bg} shrink-0`}>
                      <ActionIcon className={`h-5 w-5 ${action.color}`} />
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 flex-wrap mb-1">
                        <span className={`text-xs font-medium ${action.color}`}>{action.label}</span>
                        <Badge variant="outline" className={`text-xs ${statusCfg.color}`}>{statusCfg.label}</Badge>
                        {rec.priority && (
                          <Badge variant="secondary" className="text-xs">
                            {rec.priority >= 3 ? "สำคัญมาก" : rec.priority >= 2 ? "ปานกลาง" : "น้อย"}
                          </Badge>
                        )}
                      </div>
                      <p className="font-medium text-sm text-foreground mb-1">{rec.action}</p>
                      <p className="text-xs text-muted-foreground leading-relaxed">{rec.reason}</p>
                      {rec.aiAnalysis && (
                        <div className="mt-2 p-2 bg-secondary/30 rounded text-xs text-muted-foreground">
                          {rec.aiAnalysis}
                        </div>
                      )}
                      <p className="text-xs text-muted-foreground/60 mt-2">
                        {format(new Date(rec.createdAt), "d MMM yyyy HH:mm", { locale: th })}
                      </p>
                    </div>
                    {!rec.isActioned && (
                      <div className="flex gap-2 shrink-0">
                        <Button
                          size="sm"
                          variant="outline"
                          className="h-8 text-xs gap-1 border-green-500/30 text-green-400 hover:bg-green-500/10"
                          onClick={() => updateStatusMutation.mutate({ id: rec.id })}
                        >
                          <CheckCircle className="h-3.5 w-3.5" />
                          ทำแล้ว
                        </Button>
                        <Button
                          size="sm"
                          variant="ghost"
                          className="h-8 text-xs gap-1 text-muted-foreground"
                          onClick={() => updateStatusMutation.mutate({ id: rec.id })}
                        >
                          <XCircle className="h-3.5 w-3.5" />
                          ข้าม
                        </Button>
                      </div>
                    )}
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
