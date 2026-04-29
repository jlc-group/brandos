import { useState, useRef } from "react";
import { trpc } from "@/lib/trpc";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Upload, FileText, CheckCircle, AlertCircle, Loader2, Plus, Trash2 } from "lucide-react";
import { toast } from "sonner";

type ManualRow = {
  externalId: string;
  date: string;
  views: string;
  spend: string;
  revenue: string;
  roas: string;
  ctr: string;
  clicks: string;
  impressions: string;
};

const emptyRow = (): ManualRow => ({
  externalId: "",
  date: new Date().toISOString().split("T")[0],
  views: "",
  spend: "",
  revenue: "",
  roas: "",
  ctr: "",
  clicks: "",
  impressions: "",
});

export default function PerformanceImport() {
  const utils = trpc.useUtils();
  const importMutation = trpc.performance.import.useMutation({
    onSuccess: (data) => {
      utils.performance.list.invalidate();
      utils.performance.summary.invalidate();
      toast.success(`นำเข้าสำเร็จ`);
      setManualRows([emptyRow()]);
      setCsvPreview(null);
    },
    onError: () => toast.error("นำเข้าไม่สำเร็จ"),
  });

  const [manualRows, setManualRows] = useState<ManualRow[]>([emptyRow()]);
  const [csvPreview, setCsvPreview] = useState<any[] | null>(null);
  const [csvFile, setCsvFile] = useState<File | null>(null);
  const fileRef = useRef<HTMLInputElement>(null);

  const updateRow = (i: number, field: keyof ManualRow, value: string) => {
    setManualRows(rows => rows.map((r, idx) => idx === i ? { ...r, [field]: value } : r));
  };

  const addRow = () => setManualRows(rows => [...rows, emptyRow()]);
  const removeRow = (i: number) => setManualRows(rows => rows.filter((_, idx) => idx !== i));

  const handleCsvChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setCsvFile(file);
    const reader = new FileReader();
    reader.onload = (ev) => {
      const text = ev.target?.result as string;
      const lines = text.trim().split("\n");
      if (lines.length < 2) return;
      const headers = lines[0].split(",").map(h => h.trim().replace(/"/g, ""));
      const rows = lines.slice(1).map(line => {
        const vals = line.split(",").map(v => v.trim().replace(/"/g, ""));
        return Object.fromEntries(headers.map((h, i) => [h, vals[i] ?? ""]));
      });
      setCsvPreview(rows.slice(0, 5));
    };
    reader.readAsText(file);
  };

  const handleManualImport = () => {
    const rows = manualRows
      .filter(r => r.date)
      .map(r => ({
        externalId: r.externalId || undefined,
        platform: "tiktok",
        date: new Date(r.date),
        views: r.views ? parseInt(r.views) : undefined,
        spend: r.spend ? parseFloat(r.spend) : undefined,
        revenue: r.revenue ? parseFloat(r.revenue) : undefined,
        roas: r.roas ? parseFloat(r.roas) : undefined,
        ctr: r.ctr ? parseFloat(r.ctr) / 100 : undefined,
        clicks: r.clicks ? parseInt(r.clicks) : undefined,
        impressions: r.impressions ? parseInt(r.impressions) : undefined,
        
      }));
    if (rows.length === 0) return toast.error("ไม่มีข้อมูลที่จะนำเข้า");
    importMutation.mutate({ brandId: 1,  data: rows });
  };

  const handleCsvImport = () => {
    if (!csvFile) return;
    const reader = new FileReader();
    reader.onload = (ev) => {
      const text = ev.target?.result as string;
      const lines = text.trim().split("\n");
      if (lines.length < 2) return toast.error("ไฟล์ CSV ไม่มีข้อมูล");
      const headers = lines[0].split(",").map(h => h.trim().toLowerCase().replace(/"/g, "").replace(/\s+/g, "_"));
      const rows = lines.slice(1).map(line => {
        const vals = line.split(",").map(v => v.trim().replace(/"/g, ""));
        const obj: any = Object.fromEntries(headers.map((h, i) => [h, vals[i] ?? ""]));
        return {
          adId: obj.ad_id || obj.id || undefined,
          platform: "tiktok",
          date: new Date(obj.date || obj.data_date || new Date()),
          views: obj.views ? parseInt(obj.views) : undefined,
          spend: obj.spend || obj.cost ? parseFloat(obj.spend || obj.cost) : undefined,
          revenue: obj.revenue ? parseFloat(obj.revenue) : undefined,
          roas: obj.roas ? parseFloat(obj.roas) : undefined,
          ctr: obj.ctr ? parseFloat(obj.ctr) / 100 : undefined,
          clicks: obj.clicks ? parseInt(obj.clicks) : undefined,
          impressions: obj.impressions ? parseInt(obj.impressions) : undefined,
          
          rawData: JSON.stringify(obj),
        };
      });
      importMutation.mutate({ brandId: 1,  data: rows });
    };
    reader.readAsText(csvFile);
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-xl font-bold flex items-center gap-2">
          <Upload className="h-5 w-5 text-primary" />
          Import Performance Data
        </h1>
        <p className="text-sm text-muted-foreground mt-0.5">นำเข้าข้อมูล TikTok Ads Performance</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* CSV Upload */}
        <Card className="bg-card border-border">
          <CardHeader className="pb-3">
            <CardTitle className="text-sm flex items-center gap-2">
              <FileText className="h-4 w-4 text-blue-400" />
              นำเข้าจาก CSV
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div
              className="border-2 border-dashed border-border rounded-xl p-8 text-center cursor-pointer hover:border-primary/50 transition-colors"
              onClick={() => fileRef.current?.click()}
            >
              <Upload className="h-8 w-8 text-muted-foreground/50 mx-auto mb-2" />
              <p className="text-sm text-muted-foreground">
                {csvFile ? csvFile.name : "คลิกเพื่อเลือกไฟล์ CSV"}
              </p>
              <p className="text-xs text-muted-foreground/60 mt-1">
                รองรับ: date, views, spend, revenue, roas, ctr, clicks, impressions
              </p>
              <input ref={fileRef} type="file" accept=".csv" className="hidden" onChange={handleCsvChange} />
            </div>

            {csvPreview && (
              <div>
                <p className="text-xs text-muted-foreground mb-2">Preview (5 แถวแรก)</p>
                <div className="overflow-x-auto">
                  <table className="text-xs w-full">
                    <thead>
                      <tr className="border-b border-border">
                        {Object.keys(csvPreview[0] ?? {}).slice(0, 5).map(h => (
                          <th key={h} className="text-left py-1 px-2 text-muted-foreground">{h}</th>
                        ))}
                      </tr>
                    </thead>
                    <tbody>
                      {csvPreview.map((row, i) => (
                        <tr key={i} className="border-b border-border/50">
                          {Object.values(row).slice(0, 5).map((v: any, j) => (
                            <td key={j} className="py-1 px-2 text-foreground/70">{v}</td>
                          ))}
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            )}

            <Button
              onClick={handleCsvImport}
              disabled={!csvFile || importMutation.isPending}
              className="w-full gap-2"
            >
              {importMutation.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Upload className="h-4 w-4" />}
              นำเข้า CSV
            </Button>
          </CardContent>
        </Card>

        {/* Manual Input */}
        <Card className="bg-card border-border">
          <CardHeader className="pb-3">
            <CardTitle className="text-sm flex items-center gap-2">
              <Plus className="h-4 w-4 text-green-400" />
              กรอกข้อมูลด้วยตนเอง
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="overflow-x-auto">
              <table className="text-xs w-full">
                <thead>
                  <tr className="border-b border-border">
                    {["Content ID", "วันที่", "Views", "Spend (฿)", "Revenue (฿)", "ROAS", ""].map(h => (
                      <th key={h} className="text-left py-1 px-1 text-muted-foreground font-medium">{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {manualRows.map((row, i) => (
                    <tr key={i} className="border-b border-border/50">
                      <td className="py-1 px-1"><Input className="h-7 text-xs w-20" value={row.externalId} onChange={e => updateRow(i, "externalId", e.target.value)} placeholder="ID" /></td>
                      <td className="py-1 px-1"><Input type="date" className="h-7 text-xs w-28" value={row.date} onChange={e => updateRow(i, "date", e.target.value)} /></td>
                      <td className="py-1 px-1"><Input className="h-7 text-xs w-16" value={row.views} onChange={e => updateRow(i, "views", e.target.value)} placeholder="0" /></td>
                      <td className="py-1 px-1"><Input className="h-7 text-xs w-16" value={row.spend} onChange={e => updateRow(i, "spend", e.target.value)} placeholder="0" /></td>
                      <td className="py-1 px-1"><Input className="h-7 text-xs w-16" value={row.revenue} onChange={e => updateRow(i, "revenue", e.target.value)} placeholder="0" /></td>
                      <td className="py-1 px-1"><Input className="h-7 text-xs w-14" value={row.roas} onChange={e => updateRow(i, "roas", e.target.value)} placeholder="0.0" /></td>
                      <td className="py-1 px-1">
                        {manualRows.length > 1 && (
                          <Button variant="ghost" size="icon" className="h-7 w-7 text-destructive" onClick={() => removeRow(i)}>
                            <Trash2 className="h-3 w-3" />
                          </Button>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            <Button variant="outline" size="sm" onClick={addRow} className="gap-1.5 text-xs">
              <Plus className="h-3 w-3" />
              เพิ่มแถว
            </Button>
            <Button
              onClick={handleManualImport}
              disabled={importMutation.isPending}
              className="w-full gap-2"
            >
              {importMutation.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : <CheckCircle className="h-4 w-4" />}
              บันทึกข้อมูล
            </Button>
          </CardContent>
        </Card>
      </div>

      {/* Format Guide */}
      <Card className="bg-card border-border">
        <CardHeader className="pb-2">
          <CardTitle className="text-xs text-muted-foreground">รูปแบบ CSV ที่รองรับ</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="bg-secondary/50 rounded-lg p-3 font-mono text-xs text-muted-foreground">
            date,external_id,views,spend,revenue,roas,ctr,clicks,impressions<br />
            2024-01-15,AD001,10000,500,1500,3.0,2.5,250,10000<br />
            2024-01-16,AD002,8500,450,900,2.0,1.8,153,8500
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
