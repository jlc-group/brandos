import { trpc } from "@/lib/trpc";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  BarChart3,
  Brain,
  Calendar,
  History,
  ShieldAlert,
  TrendingUp,
  Zap,
  AlertTriangle,
  CheckCircle,
  DollarSign,
  Eye,
} from "lucide-react";
import { useLocation } from "wouter";

function KPICard({
  title,
  value,
  subtitle,
  icon: Icon,
  trend,
  color = "primary",
}: {
  title: string;
  value: string | number;
  subtitle?: string;
  icon: React.ElementType;
  trend?: "up" | "down" | "neutral";
  color?: "primary" | "green" | "yellow" | "red" | "blue";
}) {
  const colorMap = {
    primary: "text-primary bg-primary/10",
    green: "text-green-400 bg-green-400/10",
    yellow: "text-yellow-400 bg-yellow-400/10",
    red: "text-red-400 bg-red-400/10",
    blue: "text-blue-400 bg-blue-400/10",
  };

  return (
    <Card className="bg-card border-border hover:border-primary/30 transition-colors">
      <CardContent className="p-5">
        <div className="flex items-start justify-between">
          <div className="flex-1 min-w-0">
            <p className="text-xs text-muted-foreground font-medium uppercase tracking-wider mb-2">{title}</p>
            <p className="text-2xl font-bold text-foreground">{value}</p>
            {subtitle && <p className="text-xs text-muted-foreground mt-1">{subtitle}</p>}
          </div>
          <div className={`h-10 w-10 rounded-lg flex items-center justify-center shrink-0 ${colorMap[color]}`}>
            <Icon className="h-5 w-5" />
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

function AntiAnnoyGauge({ score }: { score: number | null }) {
  if (score === null) {
    return (
      <div className="flex flex-col items-center justify-center h-32 gap-2">
        <ShieldAlert className="h-8 w-8 text-muted-foreground" />
        <p className="text-sm text-muted-foreground">ยังไม่มีการวิเคราะห์</p>
      </div>
    );
  }

  const getColor = (s: number) => {
    if (s < 30) return { text: "text-green-400", label: "ปลอดภัย", bg: "bg-green-400" };
    if (s < 60) return { text: "text-yellow-400", label: "ระวัง", bg: "bg-yellow-400" };
    return { text: "text-red-400", label: "อันตราย!", bg: "bg-red-400" };
  };

  const { text, label, bg } = getColor(score);

  return (
    <div className="flex flex-col items-center gap-3">
      <div className={`text-5xl font-bold ${text}`}>{score}</div>
      <div className={`text-sm font-medium ${text}`}>{label}</div>
      <div className="w-full bg-muted rounded-full h-2">
        <div
          className={`h-2 rounded-full transition-all ${bg}`}
          style={{ width: `${score}%` }}
        />
      </div>
      <p className="text-xs text-muted-foreground">Anti-Annoy Score (0 = ดีมาก, 100 = น่าเบื่อมาก)</p>
    </div>
  );
}

export default function Dashboard() {
  const { data: kpis, isLoading } = trpc.dashboard.kpis.useQuery({ brandId: undefined });
  const [, setLocation] = useLocation();

  const quickActions = [
    { icon: Brain, label: "จัดการ Brand Rules", path: "/brand-brain", color: "text-primary" },
    { icon: Calendar, label: "วางแผน Content", path: "/calendar", color: "text-blue-400" },
    { icon: Zap, label: "AI สร้าง Content", path: "/ai-generator", color: "text-yellow-400" },
    { icon: ShieldAlert, label: "ตรวจ Anti-Annoy", path: "/anti-annoy", color: "text-orange-400" },
    { icon: BarChart3, label: "ดู Performance", path: "/performance", color: "text-green-400" },
    { icon: Zap, label: "Ads Recommendation", path: "/ads-recommendation", color: "text-purple-400" },
  ];

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold text-foreground flex items-center gap-2">
          <Brain className="h-6 w-6 text-primary" />
          <span className="gradient-text">BrandOS</span>
        </h1>
        <p className="text-muted-foreground text-sm mt-1">
          AI Operating System สำหรับ Content & Ads Strategy ของทุกแบรนด์ใน JLC Group
        </p>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <KPICard
          title="Content ที่วางแผน"
          value={isLoading ? "..." : (kpis?.plannedContent ?? 0)}
          icon={Calendar}
          color="primary"
        />
        <KPICard
          title="Content ที่เผยแพร่"
          value={isLoading ? "..." : (kpis?.publishedContent ?? 0)}
          icon={History}
          color="green"
        />
        <KPICard
          title="Ads Recommendations"
          value={isLoading ? "..." : (kpis?.pendingRecommendations ?? 0)}
          subtitle="รอดำเนินการ"
          icon={Zap}
          color="yellow"
        />
        <KPICard
          title="Total Views"
          value={isLoading ? "..." : ((kpis?.totalViews ?? 0) > 1000 ? `${((kpis?.totalViews ?? 0) / 1000).toFixed(1)}K` : (kpis?.totalViews ?? 0))}
          icon={Eye}
          color="blue"
        />
      </div>

      {/* Second Row */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <KPICard
          title="Total Spend"
          value={isLoading ? "..." : `฿${((kpis?.totalSpend ?? 0) / 1000).toFixed(1)}K`}
          icon={DollarSign}
          color="red"
        />
        <KPICard
          title="Total Revenue"
          value={isLoading ? "..." : `฿${((kpis?.totalRevenue ?? 0) / 1000).toFixed(1)}K`}
          icon={TrendingUp}
          color="green"
        />
        <KPICard
          title="Avg. ROAS"
          value={isLoading ? "..." : `${(kpis?.avgRoas ?? 0).toFixed(2)}x`}
          icon={BarChart3}
          color="primary"
        />
      </div>

      {/* Anti-Annoy + Quick Actions */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <Card className="bg-card border-border">
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-semibold flex items-center gap-2">
              <ShieldAlert className="h-4 w-4 text-orange-400" />
              Anti-Annoy Score
            </CardTitle>
          </CardHeader>
          <CardContent>
            <AntiAnnoyGauge score={null} />
          </CardContent>
        </Card>

        <Card className="bg-card border-border">
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-semibold">Quick Actions</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-2 gap-2">
              {quickActions.map((action) => (
                <button
                  key={action.path}
                  onClick={() => setLocation(action.path)}
                  className="flex items-center gap-2 p-3 rounded-lg bg-secondary/50 hover:bg-secondary transition-colors text-left"
                >
                  <action.icon className={`h-4 w-4 ${action.color} shrink-0`} />
                  <span className="text-xs font-medium text-foreground/80">{action.label}</span>
                </button>
              ))}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Status Banner */}
      <Card className="bg-primary/5 border-primary/20">
        <CardContent className="p-4">
          <div className="flex items-start gap-3">
            <CheckCircle className="h-5 w-5 text-primary shrink-0 mt-0.5" />
            <div>
              <p className="text-sm font-medium text-foreground">ระบบพร้อมใช้งาน</p>
              <p className="text-xs text-muted-foreground mt-0.5">
                เริ่มต้นด้วยการตั้งค่า Brand Rules และ SKU List เพื่อให้ AI สร้าง Content ได้อย่างแม่นยำ
              </p>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
