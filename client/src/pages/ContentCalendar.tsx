import { useState, useMemo } from "react";
import { trpc } from "@/lib/trpc";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Calendar, Plus, Sparkles, ChevronLeft, ChevronRight, Loader2 } from "lucide-react";
import { ContentTypeBadge, contentTypeOptions } from "@/components/ContentTypeBadge";
import { toast } from "sonner";
import { format, startOfWeek, addDays, addWeeks, subWeeks, isSameDay } from "date-fns";
import { th } from "date-fns/locale";

const objectiveOptions = [
  { value: "awareness", label: "Awareness" },
  { value: "consideration", label: "Consideration" },
  { value: "conversion", label: "Conversion" },
  { value: "retention", label: "Retention" },
];

const statusConfig: Record<string, { label: string; color: string }> = {
  planned: { label: "วางแผน", color: "bg-blue-500/20 text-blue-300" },
  in_progress: { label: "กำลังทำ", color: "bg-yellow-500/20 text-yellow-300" },
  published: { label: "เผยแพร่แล้ว", color: "bg-green-500/20 text-green-300" },
  cancelled: { label: "ยกเลิก", color: "bg-red-500/20 text-red-300" },
};

export default function ContentCalendar() {
  const utils = trpc.useUtils();
  const [weekStart, setWeekStart] = useState(() => startOfWeek(new Date(), { weekStartsOn: 1 }));

  const weekEnd = addDays(weekStart, 6);
  const { data: entries = [], isLoading } = trpc.calendar.list.useQuery({ from: weekStart, to: weekEnd });
  const { data: skus = [] } = trpc.sku.list.useQuery({ brandId: undefined });

  const createMutation = trpc.calendar.create.useMutation({
    onSuccess: () => { utils.calendar.list.invalidate(); toast.success("เพิ่ม Content สำเร็จ"); setShowDialog(false); },
    onError: () => toast.error("เกิดข้อผิดพลาด"),
  });
  const updateMutation = trpc.calendar.update.useMutation({
    onSuccess: () => { utils.calendar.list.invalidate(); toast.success("อัปเดตสำเร็จ"); setShowDialog(false); },
  });
  const deleteMutation = trpc.calendar.delete.useMutation({
    onSuccess: () => utils.calendar.list.invalidate(),
  });
  const aiGenerateMutation = trpc.calendar.generate.useMutation({
    onSuccess: (data) => { utils.calendar.list.invalidate(); toast.success(`AI สร้าง ${data.created} Content สำเร็จ`); },
    onError: () => toast.error("AI สร้าง Content ไม่สำเร็จ"),
  });

  const [showDialog, setShowDialog] = useState(false);
  const [editingEntry, setEditingEntry] = useState<any>(null);
  const [selectedDate, setSelectedDate] = useState<Date | null>(null);
  const [form, setForm] = useState({
    targetDate: new Date(),
    skuId: undefined as number | undefined,
    contentType: "sale",
    objective: "awareness",
    title: "",
    hook: "",
    caption: "",
    coverConcept: "",
    status: "planned" as "planned" | "in_progress" | "published" | "cancelled",
    adsMode: "none" as "organic" | "test" | "scale" | "none",
    notes: "",
  });

  const days = Array.from({ length: 7 }, (_, i) => addDays(weekStart, i));

  const entriesByDay = useMemo(() => {
    const map: Record<string, typeof entries> = {};
    for (const entry of entries) {
      const key = entry.targetDate ? format(new Date(entry.targetDate), "yyyy-MM-dd") : "unknown";
      if (!map[key]) map[key] = [];
      map[key].push(entry);
    }
    return map;
  }, [entries]);

  const openCreate = (date: Date) => {
    setEditingEntry(null);
    setForm({ targetDate: date, skuId: undefined, contentType: "sale", objective: "awareness", title: "", hook: "", caption: "", coverConcept: "", status: "planned", adsMode: "none", notes: "" });
    setShowDialog(true);
  };

  const openEdit = (entry: any) => {
    setEditingEntry(entry);
    setForm({
      targetDate: entry.targetDate ? new Date(entry.targetDate) : new Date(),
      skuId: entry.skuId ?? undefined,
      contentType: entry.contentType,
      objective: entry.objective,
      title: entry.title,
      hook: entry.hook ?? "",
      caption: entry.caption ?? "",
      coverConcept: entry.coverConcept ?? "",
      status: entry.status,
      adsMode: entry.adsMode,
      notes: entry.notes ?? "",
    });
    setShowDialog(true);
  };

  const handleSubmit = () => {
    if (!form.title.trim()) return toast.error("กรุณาใส่ชื่อ Content");
    if (editingEntry) {
      updateMutation.mutate({ id: editingEntry.id, ...form });
    } else {
      createMutation.mutate({ ...form, brandId: 1 });
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-bold flex items-center gap-2">
            <Calendar className="h-5 w-5 text-primary" />
            Content Calendar
          </h1>
          <p className="text-sm text-muted-foreground mt-0.5">วางแผน Content รายสัปดาห์</p>
        </div>
        <div className="flex gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={() => aiGenerateMutation.mutate({ brandId: 1, weekStart, postsPerWeek: 7 })}
            disabled={aiGenerateMutation.isPending}
            className="gap-1.5"
          >
            {aiGenerateMutation.isPending ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Sparkles className="h-3.5 w-3.5" />}
            AI สร้างแผน
          </Button>
          <Button size="sm" onClick={() => openCreate(weekStart)} className="gap-1.5">
            <Plus className="h-4 w-4" />
            เพิ่ม Content
          </Button>
        </div>
      </div>

      {/* Week Navigation */}
      <div className="flex items-center justify-between bg-card border border-border rounded-xl p-3">
        <Button variant="ghost" size="icon" onClick={() => setWeekStart(w => subWeeks(w, 1))}>
          <ChevronLeft className="h-4 w-4" />
        </Button>
        <div className="text-center">
          <p className="font-semibold text-sm">
            {format(weekStart, "d MMM", { locale: th })} — {format(weekEnd, "d MMM yyyy", { locale: th })}
          </p>
          <p className="text-xs text-muted-foreground">{entries.length} content ในสัปดาห์นี้</p>
        </div>
        <Button variant="ghost" size="icon" onClick={() => setWeekStart(w => addWeeks(w, 1))}>
          <ChevronRight className="h-4 w-4" />
        </Button>
      </div>

      {/* Calendar Grid */}
      <div className="grid grid-cols-7 gap-2">
        {days.map((day) => {
          const key = format(day, "yyyy-MM-dd");
          const dayEntries = entriesByDay[key] ?? [];
          const isToday = isSameDay(day, new Date());
          return (
            <div key={key} className="min-h-[120px]">
              <div className={`text-center py-1.5 rounded-t-lg mb-1 ${isToday ? "bg-primary/20" : ""}`}>
                <p className="text-xs text-muted-foreground">{format(day, "EEE", { locale: th })}</p>
                <p className={`text-sm font-semibold ${isToday ? "text-primary" : "text-foreground"}`}>
                  {format(day, "d")}
                </p>
              </div>
              <div className="space-y-1">
                {dayEntries.map(entry => (
                  <div
                    key={entry.id}
                    onClick={() => openEdit(entry)}
                    className="p-1.5 rounded-lg bg-card border border-border hover:border-primary/30 cursor-pointer transition-colors"
                  >
                    <ContentTypeBadge type={entry.contentType} className="text-[10px] px-1.5 py-0" />
                    <p className="text-[11px] text-foreground/80 mt-0.5 line-clamp-2 leading-tight">{entry.title}</p>
                  </div>
                ))}
                <button
                  onClick={() => openCreate(day)}
                  className="w-full text-xs text-muted-foreground/50 hover:text-muted-foreground py-1 rounded border border-dashed border-border/50 hover:border-border transition-colors"
                >
                  +
                </button>
              </div>
            </div>
          );
        })}
      </div>

      {/* Entry List */}
      {entries.length > 0 && (
        <div>
          <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider mb-3">รายละเอียด Content สัปดาห์นี้</p>
          <div className="space-y-2">
            {entries.map(entry => {
              const sku = skus.find(s => s.id === entry.skuId);
              const statusCfg = statusConfig[entry.status];
              return (
                <Card key={entry.id} className="bg-card border-border hover:border-primary/20 transition-colors cursor-pointer" onClick={() => openEdit(entry)}>
                  <CardContent className="p-4">
                    <div className="flex items-start justify-between gap-3">
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 flex-wrap mb-1">
                          <span className="text-xs text-muted-foreground">{entry.targetDate ? format(new Date(entry.targetDate), "d MMM", { locale: th }) : ""}</span>
                          <ContentTypeBadge type={entry.contentType} />
                          {sku && <Badge variant="secondary" className="text-xs">{sku.name}</Badge>}
                          <span className={`text-xs px-2 py-0.5 rounded-full ${statusCfg?.color}`}>{statusCfg?.label}</span>
                        </div>
                        <p className="font-medium text-sm text-foreground">{entry.title}</p>
                        {entry.hook && <p className="text-xs text-muted-foreground mt-0.5 line-clamp-1">Hook: {entry.hook}</p>}
                      </div>
                      <Button variant="ghost" size="icon" className="h-7 w-7 text-destructive shrink-0" onClick={e => { e.stopPropagation(); deleteMutation.mutate({ id: entry.id }); }}>
                        ×
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              );
            })}
          </div>
        </div>
      )}

      {/* Dialog */}
      <Dialog open={showDialog} onOpenChange={setShowDialog}>
        <DialogContent className="sm:max-w-lg max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{editingEntry ? "แก้ไข Content" : "เพิ่ม Content"}</DialogTitle>
          </DialogHeader>
          <div className="space-y-3 py-2">
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="text-xs font-medium text-muted-foreground mb-1 block">ประเภท Content</label>
                <Select value={form.contentType} onValueChange={v => setForm(f => ({ ...f, contentType: v }))}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>{contentTypeOptions.map(o => <SelectItem key={o.value} value={o.value}>{o.label}</SelectItem>)}</SelectContent>
                </Select>
              </div>
              <div>
                <label className="text-xs font-medium text-muted-foreground mb-1 block">Objective</label>
                <Select value={form.objective} onValueChange={v => setForm(f => ({ ...f, objective: v }))}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>{objectiveOptions.map(o => <SelectItem key={o.value} value={o.value}>{o.label}</SelectItem>)}</SelectContent>
                </Select>
              </div>
            </div>
            <div>
              <label className="text-xs font-medium text-muted-foreground mb-1 block">สินค้า</label>
              <Select value={form.skuId?.toString() ?? ""} onValueChange={v => setForm(f => ({ ...f, skuId: v ? parseInt(v) : undefined }))}>
                <SelectTrigger><SelectValue placeholder="เลือกสินค้า (ไม่บังคับ)" /></SelectTrigger>
                <SelectContent>
                  {skus.map(s => <SelectItem key={s.id} value={s.id.toString()}>{s.name}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div>
              <label className="text-xs font-medium text-muted-foreground mb-1 block">ชื่อ Content *</label>
              <Input placeholder="ชื่อ content" value={form.title} onChange={e => setForm(f => ({ ...f, title: e.target.value }))} />
            </div>
            <div>
              <label className="text-xs font-medium text-muted-foreground mb-1 block">Hook (3 วินาทีแรก)</label>
              <Textarea placeholder="สิ่งที่จะพูดหรือแสดงใน 3 วินาทีแรก..." value={form.hook} onChange={e => setForm(f => ({ ...f, hook: e.target.value }))} rows={2} />
            </div>
            <div>
              <label className="text-xs font-medium text-muted-foreground mb-1 block">Caption</label>
              <Textarea placeholder="Caption สำหรับ TikTok..." value={form.caption} onChange={e => setForm(f => ({ ...f, caption: e.target.value }))} rows={3} />
            </div>
            <div>
              <label className="text-xs font-medium text-muted-foreground mb-1 block">Cover Concept</label>
              <Input placeholder="Concept ภาพปก..." value={form.coverConcept} onChange={e => setForm(f => ({ ...f, coverConcept: e.target.value }))} />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="text-xs font-medium text-muted-foreground mb-1 block">Status</label>
                <Select value={form.status} onValueChange={v => setForm(f => ({ ...f, status: v as any }))}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {Object.entries(statusConfig).map(([v, { label }]) => <SelectItem key={v} value={v}>{label}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
              <div>
                <label className="text-xs font-medium text-muted-foreground mb-1 block">Ads Mode</label>
                <Select value={form.adsMode} onValueChange={v => setForm(f => ({ ...f, adsMode: v as any }))}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="none">ไม่ยิง Ads</SelectItem>
                    <SelectItem value="organic">Organic</SelectItem>
                    <SelectItem value="test">Test</SelectItem>
                    <SelectItem value="scale">Scale</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowDialog(false)}>ยกเลิก</Button>
            <Button onClick={handleSubmit} disabled={createMutation.isPending || updateMutation.isPending}>
              {editingEntry ? "บันทึก" : "เพิ่ม"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
