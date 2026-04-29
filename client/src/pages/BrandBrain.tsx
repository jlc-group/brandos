import { useState } from "react";
import { trpc } from "@/lib/trpc";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Brain, Plus, Pencil, Trash2, BookOpen, AlertTriangle, BarChart3, MessageSquare } from "lucide-react";
import { toast } from "sonner";

const categoryConfig: Record<string, { label: string; icon: React.ElementType; color: string }> = {
  tone: { label: "Tone of Voice", icon: MessageSquare, color: "text-blue-400" },
  forbidden: { label: "ห้ามทำ", icon: AlertTriangle, color: "text-red-400" },
  content_ratio: { label: "สัดส่วน Content", icon: BarChart3, color: "text-green-400" },
  messaging: { label: "Key Messaging", icon: BookOpen, color: "text-purple-400" },
  hook: { label: "Hook Style", icon: Brain, color: "text-yellow-400" },
  audience: { label: "Target Audience", icon: Brain, color: "text-pink-400" },
};

const categoryOptions = Object.entries(categoryConfig).map(([value, { label }]) => ({ value, label }));

type Rule = {
  id: number;
  brandId: number | null;
  category: string;
  title: string;
  content: string;
  priority: number | null;
  isActive: boolean;
  createdAt: Date;
  updatedAt: Date;
};

export default function BrandBrain() {
  const utils = trpc.useUtils();
  const { data: rules = [], isLoading } = trpc.brandBrain.list.useQuery({ brandId: undefined });
  const createMutation = trpc.brandBrain.create.useMutation({
    onSuccess: () => { utils.brandBrain.list.invalidate(); toast.success("เพิ่มกฎสำเร็จ"); setShowDialog(false); },
    onError: () => toast.error("เกิดข้อผิดพลาด"),
  });
  const updateMutation = trpc.brandBrain.update.useMutation({
    onSuccess: () => { utils.brandBrain.list.invalidate(); toast.success("อัปเดตสำเร็จ"); setShowDialog(false); },
    onError: () => toast.error("เกิดข้อผิดพลาด"),
  });
  const deleteMutation = trpc.brandBrain.delete.useMutation({
    onSuccess: () => { utils.brandBrain.list.invalidate(); toast.success("ลบสำเร็จ"); },
  });

  const [showDialog, setShowDialog] = useState(false);
  const [editingRule, setEditingRule] = useState<Rule | null>(null);
  const [form, setForm] = useState({ category: "tone", title: "", description: "" });

  const openCreate = () => {
    setEditingRule(null);
    setForm({ category: "tone", title: "", description: "" });
    setShowDialog(true);
  };

  const openEdit = (rule: Rule) => {
    setEditingRule(rule);
    setForm({ category: rule.category, title: rule.title, description: rule.content ?? "" });
    setShowDialog(true);
  };

  const handleSubmit = () => {
    if (!form.title.trim()) return toast.error("กรุณาใส่ชื่อกฎ");
    if (editingRule) {
      updateMutation.mutate({ id: editingRule.id, category: form.category, title: form.title, description: form.description });
    } else {
      createMutation.mutate({ brandId: 1, category: form.category, title: form.title, description: form.description });
    }
  };

  const grouped = rules.reduce<Record<string, Rule[]>>((acc, rule) => {
    const cat = rule.category;
    if (!acc[cat]) acc[cat] = [];
    acc[cat].push(rule);
    return acc;
  }, {});

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-bold flex items-center gap-2">
            <Brain className="h-5 w-5 text-primary" />
            Brand Brain
          </h1>
          <p className="text-sm text-muted-foreground mt-0.5">กฎและทิศทางของแบรนด์ Jula's Herb</p>
        </div>
        <Button onClick={openCreate} size="sm" className="gap-1.5">
          <Plus className="h-4 w-4" />
          เพิ่มกฎ
        </Button>
      </div>

      {isLoading ? (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {[1,2,3,4].map(i => <div key={i} className="h-40 bg-card rounded-xl animate-pulse" />)}
        </div>
      ) : rules.length === 0 ? (
        <Card className="bg-card border-border">
          <CardContent className="flex flex-col items-center justify-center py-16 gap-4">
            <Brain className="h-12 w-12 text-muted-foreground/40" />
            <div className="text-center">
              <p className="font-medium text-foreground">ยังไม่มีกฎแบรนด์</p>
              <p className="text-sm text-muted-foreground mt-1">เริ่มต้นด้วยการเพิ่ม Tone of Voice และสิ่งที่ห้ามทำ</p>
            </div>
            <Button onClick={openCreate} variant="outline" size="sm">
              <Plus className="h-4 w-4 mr-1.5" />
              เพิ่มกฎแรก
            </Button>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-6">
          {Object.entries(grouped).map(([category, catRules]) => {
            const config = categoryConfig[category] ?? { label: category, icon: Brain, color: "text-muted-foreground" };
            const Icon = config.icon;
            return (
              <div key={category}>
                <div className="flex items-center gap-2 mb-3">
                  <Icon className={`h-4 w-4 ${config.color}`} />
                  <h2 className="text-sm font-semibold text-foreground">{config.label}</h2>
                  <Badge variant="secondary" className="text-xs">{catRules.length}</Badge>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                  {catRules.map((rule) => (
                    <Card key={rule.id} className="bg-card border-border hover:border-primary/20 transition-colors group">
                      <CardContent className="p-4">
                        <div className="flex items-start justify-between gap-2">
                          <div className="flex-1 min-w-0">
                            <p className="font-medium text-sm text-foreground">{rule.title}</p>
                            {rule.content && (
                              <p className="text-xs text-muted-foreground mt-1 leading-relaxed">{rule.content}</p>
                            )}
                            {rule.content && (
                              <div className="mt-2 p-2 bg-secondary/50 rounded text-xs text-muted-foreground font-mono">
                                {rule.content}
                              </div>
                            )}
                          </div>
                          <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity shrink-0">
                            <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => openEdit(rule)}>
                              <Pencil className="h-3.5 w-3.5" />
                            </Button>
                            <Button
                              variant="ghost"
                              size="icon"
                              className="h-7 w-7 text-destructive hover:text-destructive"
                              onClick={() => deleteMutation.mutate({ id: rule.id })}
                            >
                              <Trash2 className="h-3.5 w-3.5" />
                            </Button>
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  ))}
                </div>
              </div>
            );
          })}
        </div>
      )}

      <Dialog open={showDialog} onOpenChange={setShowDialog}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>{editingRule ? "แก้ไขกฎ" : "เพิ่มกฎใหม่"}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <div>
              <label className="text-xs font-medium text-muted-foreground mb-1.5 block">หมวดหมู่</label>
              <Select value={form.category} onValueChange={(v) => setForm(f => ({ ...f, category: v }))}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {categoryOptions.map(opt => (
                    <SelectItem key={opt.value} value={opt.value}>{opt.label}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div>
              <label className="text-xs font-medium text-muted-foreground mb-1.5 block">ชื่อกฎ *</label>
              <Input
                placeholder="เช่น ห้ามใช้ภาษาขายของมากเกินไป"
                value={form.title}
                onChange={(e) => setForm(f => ({ ...f, title: e.target.value }))}
              />
            </div>
            <div>
              <label className="text-xs font-medium text-muted-foreground mb-1.5 block">รายละเอียด</label>
              <Textarea
                placeholder="อธิบายกฎนี้เพิ่มเติม..."
                value={form.description}
                onChange={(e) => setForm(f => ({ ...f, description: e.target.value }))}
                rows={3}
              />
            </div>
            <div>
              <label className="text-xs font-medium text-muted-foreground mb-1.5 block">ค่า / ตัวอย่าง</label>
              <Textarea
                placeholder="เช่น sale:30%, education:20%, entertainment:20%"
                value={form.description}
                onChange={(e) => setForm(f => ({ ...f, description: e.target.value }))}
                rows={2}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowDialog(false)}>ยกเลิก</Button>
            <Button
              onClick={handleSubmit}
              disabled={createMutation.isPending || updateMutation.isPending}
            >
              {editingRule ? "บันทึก" : "เพิ่ม"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
