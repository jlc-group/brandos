import { useState } from "react";
import { trpc } from "@/lib/trpc";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { BarChart3, TrendingUp, AlertTriangle, Info, CheckCircle, Loader2, DollarSign, Eye, MousePointer } from "lucide-react";
import { toast } from "sonner";
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, LineChart, Line, CartesianGrid } from "recharts";
import { format } from "date-fns";
import { th } from "date-fns/locale";

export default function PerformanceAnalysis() {
  const utils = trpc.useUtils();
  const { data: perfData = [], isLoading } = trpc.performance.list.useQuery({ limit: 50 });
  const { data: summary } = trpc.performance.summary.useQuery({ brandId: undefined });

  const analyzeMutation = trpc.performance.analyze.useMutation({
    onSuccess: () => toast.success("วิเคราะห์สำเร็จ"),
    onError: () => toast.error("วิเคราะห์ไม่สำเร็จ"),
  });

  const [analysisResult, setAnalysisResult] = useState<any>(null);

  const handleAnalyze = async () => {
    const result = await analyzeMutation.mutateAsync({});
    setAnalysisResult(result);
  };

  const chartData = perfData.slice(0, 20).map((d, i) => ({
    name: d.adId ?? `#${i + 1}`,
    views: d.views ?? 0,
    spend: d.spend ?? 0,
    roas: d.roas ?? 0,
    ctr: ((d.ctr ?? 0) * 100).toFixed(2),
  }));

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-bold flex items-center gap-2">
            <BarChart3 className="h-5 w-5 text-primary" />
            Performance Analysis
          </h1>
          <p className="text-sm text-muted-foreground mt-0.5">วิเคราะห์ผลลัพธ์ TikTok Ads ด้วย AI</p>
        </div>
        <Button onClick={handleAnalyze} disabled={analyzeMutation.isPending || perfData.length === 0} className="gap-1.5">
          {analyzeMutation.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : <TrendingUp className="h-4 w-4" />}
          AI วิเคราะห์
        </Button>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {[
          { label: "Total Spend", value: `฿${((summary?.totalSpend ?? 0) / 1000).toFixed(1)}K`, icon: DollarSign, color: "text-red-400" },
          { label: "Total Revenue", value: `฿${((summary?.totalRevenue ?? 0) / 1000).toFixed(1)}K`, icon: TrendingUp, color: "text-green-400" },
          { label: "Total Views", value: `${((summary?.totalViews ?? 0) / 1000).toFixed(1)}K`, icon: Eye, color: "text-blue-400" },
          { label: "Avg. CTR", value: `${((summary?.avgCtr ?? 0) * 100).toFixed(2)}%`, icon: MousePointer, color: "text-yellow-400" },
        ].map(({ label, value, icon: Icon, color }) => (
          <Card key={label} className="bg-card border-border">
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-xs text-muted-foreground">{label}</p>
                  <p className="text-xl font-bold mt-1">{value}</p>
                </div>
                <Icon className={`h-5 w-5 ${color}`} />
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Charts */}
      {chartData.length > 0 && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <Card className="bg-card border-border">
            <CardHeader className="pb-2">
              <CardTitle className="text-sm">Views per Content</CardTitle>
            </CardHeader>
            <CardContent>
              <ResponsiveContainer width="100%" height={200}>
                <BarChart data={chartData}>
                  <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" />
                  <XAxis dataKey="name" tick={{ fontSize: 10, fill: "var(--muted-foreground)" }} />
                  <YAxis tick={{ fontSize: 10, fill: "var(--muted-foreground)" }} />
                  <Tooltip contentStyle={{ background: "var(--card)", border: "1px solid var(--border)", borderRadius: "8px", fontSize: "12px" }} />
                  <Bar dataKey="views" fill="var(--color-chart-2)" radius={[4, 4, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>

          <Card className="bg-card border-border">
            <CardHeader className="pb-2">
              <CardTitle className="text-sm">ROAS Trend</CardTitle>
            </CardHeader>
            <CardContent>
              <ResponsiveContainer width="100%" height={200}>
                <LineChart data={chartData}>
                  <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" />
                  <XAxis dataKey="name" tick={{ fontSize: 10, fill: "var(--muted-foreground)" }} />
                  <YAxis tick={{ fontSize: 10, fill: "var(--muted-foreground)" }} />
                  <Tooltip contentStyle={{ background: "var(--card)", border: "1px solid var(--border)", borderRadius: "8px", fontSize: "12px" }} />
                  <Line type="monotone" dataKey="roas" stroke="var(--color-chart-1)" strokeWidth={2} dot={false} />
                </LineChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>
        </div>
      )}

      {/* AI Analysis Result */}
      {analysisResult && (
        <div className="space-y-4">
          <Card className="bg-primary/5 border-primary/20">
            <CardContent className="p-4">
              <p className="text-sm font-medium text-foreground">{analysisResult.summary}</p>
            </CardContent>
          </Card>

          {analysisResult.insights?.length > 0 && (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              {analysisResult.insights.map((insight: any, i: number) => {
                const Icon = insight.type === "warning" ? AlertTriangle : insight.type === "success" ? CheckCircle : Info;
                const color = insight.type === "warning" ? "text-yellow-400" : insight.type === "success" ? "text-green-400" : "text-blue-400";
                return (
                  <div key={i} className="flex items-start gap-2 p-3 bg-card border border-border rounded-lg">
                    <Icon className={`h-4 w-4 ${color} shrink-0 mt-0.5`} />
                    <p className="text-sm text-foreground/80">{insight.message}</p>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}

      {/* Data Table */}
      {perfData.length > 0 ? (
        <div>
          <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider mb-3">ข้อมูล Performance ({perfData.length} รายการ)</p>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-border">
                  {["Content ID", "วันที่", "Views", "Spend", "Revenue", "ROAS", "CTR"].map(h => (
                    <th key={h} className="text-left py-2 px-3 text-xs text-muted-foreground font-medium">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {perfData.slice(0, 20).map(d => (
                  <tr key={d.id} className="border-b border-border/50 hover:bg-secondary/20">
                    <td className="py-2 px-3 text-xs font-mono text-muted-foreground">{d.adId ?? `#${d.id}`}</td>
                    <td className="py-2 px-3 text-xs">{format(new Date(d.date), "d MMM", { locale: th })}</td>
                    <td className="py-2 px-3 text-xs">{(d.views ?? 0).toLocaleString()}</td>
                    <td className="py-2 px-3 text-xs">฿{(d.spend ?? 0).toLocaleString()}</td>
                    <td className="py-2 px-3 text-xs">฿{(d.revenue ?? 0).toLocaleString()}</td>
                    <td className="py-2 px-3 text-xs">
                      <span className={`font-medium ${(d.roas ?? 0) >= 2 ? "text-green-400" : (d.roas ?? 0) >= 1 ? "text-yellow-400" : "text-red-400"}`}>
                        {(d.roas ?? 0).toFixed(2)}x
                      </span>
                    </td>
                    <td className="py-2 px-3 text-xs">{((d.ctr ?? 0) * 100).toFixed(2)}%</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      ) : !isLoading ? (
        <Card className="bg-card border-border">
          <CardContent className="flex flex-col items-center py-12 gap-3">
            <BarChart3 className="h-10 w-10 text-muted-foreground/40" />
            <p className="text-sm text-muted-foreground">ยังไม่มีข้อมูล Performance</p>
            <p className="text-xs text-muted-foreground">ไปที่ "Import Data" เพื่อนำเข้าข้อมูลจาก TikTok Ads</p>
          </CardContent>
        </Card>
      ) : null}
    </div>
  );
}
