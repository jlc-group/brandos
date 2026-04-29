import { useState } from "react";
import { trpc } from "@/lib/trpc";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { ShieldAlert, AlertTriangle, CheckCircle, Info, Loader2, TrendingUp } from "lucide-react";
import { toast } from "sonner";
import { format, subDays } from "date-fns";
import { th } from "date-fns/locale";
import { RadialBarChart, RadialBar, ResponsiveContainer, PieChart, Pie, Cell, Tooltip } from "recharts";

const COLORS = {
  SALE: "#f43f5e",
  EDUCATION: "#3b82f6",
  ENTERTAINMENT: "#eab308",
  REVIEW: "#22c55e",
  LIFESTYLE: "#a855f7",
};

function ScoreGauge({ score }: { score: number }) {
  const getColor = (s: number) => s < 30 ? "#22c55e" : s < 60 ? "#eab308" : "#ef4444";
  const getLabel = (s: number) => s < 30 ? "ปลอดภัย" : s < 60 ? "ต้องระวัง" : "อันตราย!";
  const color = getColor(score);
  return (
    <div className="flex flex-col items-center gap-2">
      <div className="relative w-40 h-40">
        <ResponsiveContainer width="100%" height="100%">
          <RadialBarChart cx="50%" cy="50%" innerRadius="60%" outerRadius="90%" data={[{ value: score, fill: color }]} startAngle={180} endAngle={0}>
            <RadialBar dataKey="value" cornerRadius={8} />
          </RadialBarChart>
        </ResponsiveContainer>
        <div className="absolute inset-0 flex flex-col items-center justify-center mt-6">
          <span className="text-3xl font-bold" style={{ color }}>{score}</span>
          <span className="text-xs font-medium" style={{ color }}>{getLabel(score)}</span>
        </div>
      </div>
      <p className="text-xs text-muted-foreground">Anti-Annoy Score (0 = ดีมาก, 100 = น่าเบื่อมาก)</p>
    </div>
  );
}

type AnalysisResult = {
  score: number;
  totalContent: number;
  typeCounts: Record<string, number>;
  saleRatio: number;
  educationRatio: number;
  entertainmentRatio: number;
  reviewRatio: number;
  lifestyleRatio: number;
  repeatHookCount: number;
  repeatSkuCount: number;
  insights: Array<{ severity: string; message: string }>;
  recommendations: string[];
  analysisDate: Date;
};

export default function AntiAnnoy() {
  const [result, setResult] = useState<AnalysisResult | null>(null);
  const [history, setHistory] = useState<AnalysisResult[]>([]);

  const analyzeMutation = trpc.antiAnnoy.analyze.useMutation({
    onSuccess: (data: any) => {
      const newResult: AnalysisResult = {
        score: data.score ?? 0,
        totalContent: data.totalContent ?? 0,
        typeCounts: data.typeCounts ?? {},
        saleRatio: data.saleRatio ?? 0,
        educationRatio: data.educationRatio ?? 0,
        entertainmentRatio: data.entertainmentRatio ?? 0,
        reviewRatio: data.reviewRatio ?? 0,
        lifestyleRatio: data.lifestyleRatio ?? 0,
        repeatHookCount: data.repeatHookCount ?? 0,
        repeatSkuCount: data.repeatSkuCount ?? 0,
        insights: data.insights ?? [],
        recommendations: data.recommendations ?? [],
        analysisDate: new Date(),
      };
      setHistory(prev => [newResult, ...prev.slice(0, 4)]);
      setResult(newResult);
      toast.success("วิเคราะห์สำเร็จ");
    },
    onError: () => toast.error("วิเคราะห์ไม่สำเร็จ"),
  });

  const handleAnalyze = () => {
    analyzeMutation.mutate({
      periodStart: subDays(new Date(), 30),
      periodEnd: new Date(),
    });
  };

  const pieData = result ? [
    { name: "ขาย", value: Math.round(result.saleRatio * 100), fill: COLORS.SALE },
    { name: "ให้ความรู้", value: Math.round(result.educationRatio * 100), fill: COLORS.EDUCATION },
    { name: "บันเทิง", value: Math.round(result.entertainmentRatio * 100), fill: COLORS.ENTERTAINMENT },
    { name: "รีวิว", value: Math.round(result.reviewRatio * 100), fill: COLORS.REVIEW },
    { name: "Lifestyle", value: Math.round(result.lifestyleRatio * 100), fill: COLORS.LIFESTYLE },
  ].filter(d => d.value > 0) : [];

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-bold flex items-center gap-2">
            <ShieldAlert className="h-5 w-5 text-orange-400" />
            Anti-Annoy Detector
          </h1>
          <p className="text-sm text-muted-foreground mt-0.5">ตรวจสอบว่า Content ของคุณน่าเบื่อหรือขายของมากเกินไปไหม</p>
        </div>
        <Button onClick={handleAnalyze} disabled={analyzeMutation.isPending} className="gap-1.5">
          {analyzeMutation.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : <ShieldAlert className="h-4 w-4" />}
          วิเคราะห์ 30 วันล่าสุด
        </Button>
      </div>

      {!result ? (
        <Card className="bg-card border-border">
          <CardContent className="flex flex-col items-center justify-center py-16 gap-4">
            <ShieldAlert className="h-12 w-12 text-muted-foreground/40" />
            <div className="text-center">
              <p className="font-medium">ยังไม่มีการวิเคราะห์</p>
              <p className="text-sm text-muted-foreground mt-1">กดปุ่ม "วิเคราะห์" เพื่อเริ่มตรวจสอบ Content Mix</p>
            </div>
          </CardContent>
        </Card>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <Card className="bg-card border-border">
            <CardHeader className="pb-2">
              <CardTitle className="text-sm">Anti-Annoy Score</CardTitle>
            </CardHeader>
            <CardContent className="flex flex-col items-center">
              <ScoreGauge score={Math.round(result.score)} />
              <div className="grid grid-cols-2 gap-3 w-full mt-4">
                <div className="bg-secondary/50 rounded-lg p-3 text-center">
                  <p className="text-xs text-muted-foreground">Hook ซ้ำ</p>
                  <p className="text-xl font-bold text-foreground">{result.repeatHookCount}</p>
                </div>
                <div className="bg-secondary/50 rounded-lg p-3 text-center">
                  <p className="text-xs text-muted-foreground">SKU ซ้ำมาก</p>
                  <p className="text-xl font-bold text-foreground">{result.repeatSkuCount}</p>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="bg-card border-border">
            <CardHeader className="pb-2">
              <CardTitle className="text-sm">Content Mix</CardTitle>
            </CardHeader>
            <CardContent>
              {pieData.length > 0 ? (
                <ResponsiveContainer width="100%" height={200}>
                  <PieChart>
                    <Pie data={pieData} dataKey="value" nameKey="name" cx="50%" cy="50%" outerRadius={80} label={({ name, value }) => `${name} ${value}%`} labelLine={false}>
                      {pieData.map((entry, i) => <Cell key={i} fill={entry.fill} />)}
                    </Pie>
                    <Tooltip formatter={(v: any) => `${v}%`} contentStyle={{ background: "var(--card)", border: "1px solid var(--border)", borderRadius: "8px" }} />
                  </PieChart>
                </ResponsiveContainer>
              ) : (
                <div className="flex items-center justify-center h-40 text-muted-foreground text-sm">ไม่มีข้อมูล</div>
              )}
              <p className="text-xs text-muted-foreground text-center mt-2">
                วิเคราะห์เมื่อ {format(result.analysisDate, "d MMM yyyy HH:mm", { locale: th })}
              </p>
            </CardContent>
          </Card>

          {result.insights.length > 0 && (
            <Card className="bg-card border-border">
              <CardHeader className="pb-2">
                <CardTitle className="text-sm">AI Insights</CardTitle>
              </CardHeader>
              <CardContent className="space-y-2">
                {result.insights.map((insight, i) => {
                  const Icon = insight.severity === "high" ? AlertTriangle : insight.severity === "medium" ? Info : CheckCircle;
                  const color = insight.severity === "high" ? "text-red-400" : insight.severity === "medium" ? "text-yellow-400" : "text-green-400";
                  return (
                    <div key={i} className="flex items-start gap-2 p-3 bg-secondary/30 rounded-lg">
                      <Icon className={`h-4 w-4 ${color} shrink-0 mt-0.5`} />
                      <p className="text-sm text-foreground/80">{insight.message}</p>
                    </div>
                  );
                })}
              </CardContent>
            </Card>
          )}

          {result.recommendations.length > 0 && (
            <Card className="bg-card border-border">
              <CardHeader className="pb-2">
                <CardTitle className="text-sm flex items-center gap-2">
                  <TrendingUp className="h-4 w-4 text-primary" />
                  คำแนะนำ
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-2">
                {result.recommendations.map((rec, i) => (
                  <div key={i} className="flex items-start gap-2 p-3 bg-primary/5 border border-primary/20 rounded-lg">
                    <span className="text-primary font-bold text-xs shrink-0 mt-0.5">{i + 1}.</span>
                    <p className="text-sm text-foreground/80">{rec}</p>
                  </div>
                ))}
              </CardContent>
            </Card>
          )}
        </div>
      )}

      {history.length > 1 && (
        <div>
          <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider mb-3">ประวัติการวิเคราะห์</p>
          <div className="space-y-2">
            {history.slice(1).map((h, idx) => {
              const score = Math.round(h.score);
              const color = score < 30 ? "text-green-400" : score < 60 ? "text-yellow-400" : "text-red-400";
              return (
                <div key={idx} className="flex items-center justify-between p-3 bg-card border border-border rounded-lg">
                  <span className="text-sm text-muted-foreground">{format(h.analysisDate, "d MMM yyyy HH:mm", { locale: th })}</span>
                  <span className={`text-sm font-bold ${color}`}>Score: {score}</span>
                </div>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}
