import { useState } from "react";
import { trpc } from "@/lib/trpc";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Sparkles, Copy, Save, Loader2, RefreshCw } from "lucide-react";
import { ContentTypeBadge, contentTypeOptions } from "@/components/ContentTypeBadge";
import { toast } from "sonner";
import { Streamdown } from "streamdown";

const objectiveOptions = [
  { value: "awareness", label: "Awareness" },
  { value: "consideration", label: "Consideration" },
  { value: "conversion", label: "Conversion" },
  { value: "retention", label: "Retention" },
];

export default function AiGenerator() {
  const utils = trpc.useUtils();
  const { data: skus = [] } = trpc.sku.list.useQuery({ brandId: undefined });

  const generateMutation = trpc.aiGenerator.generate.useMutation({
    onError: () => toast.error("AI สร้าง Content ไม่สำเร็จ"),
  });
  const saveMutation = trpc.history.create.useMutation({
    onSuccess: () => { utils.history.list.invalidate(); toast.success("บันทึกลง Content Library แล้ว"); },
    onError: () => toast.error("บันทึกไม่สำเร็จ"),
  });

  const [form, setForm] = useState({
    skuId: undefined as number | undefined,
    contentType: "education",
    objective: "awareness",
    additionalContext: "",
    count: 3,
  });

  const result = generateMutation.data;

  const handleGenerate = () => {
    generateMutation.mutate({ brandId: 1, skuId: form.skuId, contentType: form.contentType, count: form.count });
  };

  const handleSave = (idea: any) => {
    saveMutation.mutate({
      brandId: 1,
      skuId: form.skuId,
      contentType: form.contentType,
      title: idea.title ?? "AI Generated Content",
      hook: idea.hook,
      caption: idea.caption,
      notes: idea.coverConcept ? `Cover: ${idea.coverConcept}` : undefined,
    });
  };

  const handleCopy = (text: string) => {
    navigator.clipboard.writeText(text);
    toast.success("คัดลอกแล้ว");
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-xl font-bold flex items-center gap-2">
          <Sparkles className="h-5 w-5 text-yellow-400" />
          AI Content Generator
        </h1>
        <p className="text-sm text-muted-foreground mt-0.5">ให้ AI สร้าง Hook, Caption และ Cover Concept ตาม Brand Rules</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {/* Form */}
        <div className="md:col-span-1 space-y-4">
          <Card className="bg-card border-border">
            <CardHeader className="pb-3">
              <CardTitle className="text-sm">ตั้งค่า</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
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

              <div>
                <label className="text-xs font-medium text-muted-foreground mb-1 block">จำนวน Ideas</label>
                <Select value={form.count.toString()} onValueChange={v => setForm(f => ({ ...f, count: parseInt(v) }))}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {[1, 2, 3, 5].map(n => <SelectItem key={n} value={n.toString()}>{n} ideas</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>

              <div>
                <label className="text-xs font-medium text-muted-foreground mb-1 block">Context เพิ่มเติม</label>
                <Textarea
                  placeholder="เช่น เน้นช่วงหน้าร้อน, กลุ่มเป้าหมายเป็นแม่บ้าน..."
                  value={form.additionalContext}
                  onChange={e => setForm(f => ({ ...f, additionalContext: e.target.value }))}
                  rows={3}
                />
              </div>

              <Button
                onClick={handleGenerate}
                disabled={generateMutation.isPending}
                className="w-full gap-2"
              >
                {generateMutation.isPending
                  ? <><Loader2 className="h-4 w-4 animate-spin" /> กำลังสร้าง...</>
                  : <><Sparkles className="h-4 w-4" /> สร้าง Content Ideas</>
                }
              </Button>
            </CardContent>
          </Card>
        </div>

        {/* Results */}
        <div className="md:col-span-2 space-y-4">
          {generateMutation.isPending && (
            <Card className="bg-card border-border">
              <CardContent className="flex flex-col items-center py-12 gap-3">
                <Loader2 className="h-8 w-8 text-primary animate-spin" />
                <p className="text-sm text-muted-foreground">AI กำลังสร้าง Content Ideas...</p>
              </CardContent>
            </Card>
          )}

          {result && !generateMutation.isPending && (
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <p className="text-sm font-medium text-muted-foreground">{result.ideas?.length ?? 0} Content Ideas</p>
                <Button variant="ghost" size="sm" onClick={handleGenerate} className="gap-1.5 text-xs">
                  <RefreshCw className="h-3.5 w-3.5" />
                  สร้างใหม่
                </Button>
              </div>

              {result.ideas?.map((idea: any, i: number) => (
                <Card key={i} className="bg-card border-border hover:border-primary/20 transition-colors">
                  <CardContent className="p-4 space-y-3">
                    <div className="flex items-start justify-between gap-3">
                      <div className="flex items-center gap-2">
                        <span className="text-xs text-muted-foreground font-mono">#{i + 1}</span>
                        <ContentTypeBadge type={form.contentType} />
                      </div>
                      <div className="flex gap-1">
                        <Button
                          variant="ghost"
                          size="sm"
                          className="h-7 text-xs gap-1"
                          onClick={() => handleSave(idea)}
                          disabled={saveMutation.isPending}
                        >
                          <Save className="h-3 w-3" />
                          บันทึก
                        </Button>
                      </div>
                    </div>

                    {idea.title && (
                      <div>
                        <p className="text-xs text-muted-foreground mb-1">ชื่อ Content</p>
                        <p className="text-sm font-medium text-foreground">{idea.title}</p>
                      </div>
                    )}

                    {idea.hook && (
                      <div className="p-3 bg-yellow-500/10 border border-yellow-500/20 rounded-lg">
                        <div className="flex items-center justify-between mb-1">
                          <p className="text-xs font-medium text-yellow-400">Hook (3 วินาทีแรก)</p>
                          <Button variant="ghost" size="icon" className="h-5 w-5" onClick={() => handleCopy(idea.hook)}>
                            <Copy className="h-3 w-3" />
                          </Button>
                        </div>
                        <p className="text-sm text-foreground/90">{idea.hook}</p>
                      </div>
                    )}

                    {idea.caption && (
                      <div className="p-3 bg-blue-500/10 border border-blue-500/20 rounded-lg">
                        <div className="flex items-center justify-between mb-1">
                          <p className="text-xs font-medium text-blue-400">Caption</p>
                          <Button variant="ghost" size="icon" className="h-5 w-5" onClick={() => handleCopy(idea.caption)}>
                            <Copy className="h-3 w-3" />
                          </Button>
                        </div>
                        <p className="text-sm text-foreground/90 whitespace-pre-wrap">{idea.caption}</p>
                      </div>
                    )}

                    {idea.coverConcept && (
                      <div className="p-3 bg-purple-500/10 border border-purple-500/20 rounded-lg">
                        <p className="text-xs font-medium text-purple-400 mb-1">Cover Concept</p>
                        <p className="text-sm text-foreground/90">{idea.coverConcept}</p>
                      </div>
                    )}
                  </CardContent>
                </Card>
              ))}
            </div>
          )}

          {!result && !generateMutation.isPending && (
            <Card className="bg-card border-border">
              <CardContent className="flex flex-col items-center py-16 gap-4">
                <Sparkles className="h-12 w-12 text-muted-foreground/30" />
                <div className="text-center">
                  <p className="font-medium text-foreground">พร้อมสร้าง Content Ideas</p>
                  <p className="text-sm text-muted-foreground mt-1">เลือกสินค้าและประเภท Content แล้วกด "สร้าง"</p>
                </div>
              </CardContent>
            </Card>
          )}
        </div>
      </div>
    </div>
  );
}
