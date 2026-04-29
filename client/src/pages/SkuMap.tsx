import { useState } from "react";
import { trpc } from "@/lib/trpc";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Package, Plus, Pencil, Trash2, ChevronRight, ExternalLink } from "lucide-react";
import { toast } from "sonner";

const CATEGORIES = [
  { value: "sunscreen", label: "กันแดด" },
  { value: "acne", label: "สิว" },
  { value: "brightening", label: "ผิวใส" },
  { value: "serum", label: "เซรั่ม" },
  { value: "oral_care", label: "ช่องปาก" },
  { value: "underarm", label: "รักแร้" },
  { value: "new", label: "สินค้าใหม่" },
  { value: "other", label: "อื่นๆ" },
];

const CONTENT_TYPES = ["SALE","EDUCATION","ENTERTAINMENT","REVIEW","LIFESTYLE","HOOK","CHALLENGE","COLLAB"];

type SkuForm = { name: string; sku: string; category: string; description: string; price: string };
const DEFAULT_SKU_FORM: SkuForm = { name: "", sku: "", category: "sunscreen", description: "", price: "" };

export default function SkuMap() {
  const utils = trpc.useUtils();
  const { data: skus = [], isLoading } = trpc.sku.list.useQuery({ brandId: undefined });
  const { data: allMatrix = [] } = trpc.sku.getAllMatrix.useQuery({ brandId: undefined });

  const [showSkuDialog, setShowSkuDialog] = useState(false);
  const [showMatrixDialog, setShowMatrixDialog] = useState(false);
  const [editingSkuId, setEditingSkuId] = useState<number | null>(null);
  const [selectedSkuId, setSelectedSkuId] = useState<number | null>(null);
  const [skuForm, setSkuForm] = useState<SkuForm>(DEFAULT_SKU_FORM);
  const [matrixForm, setMatrixForm] = useState({ contentType: "SALE", angle: "", notes: "", priority: 1 });

  const createSku = trpc.sku.create.useMutation({
    onSuccess: () => { utils.sku.list.invalidate(); toast.success("เพิ่มสินค้าสำเร็จ"); setShowSkuDialog(false); setSkuForm(DEFAULT_SKU_FORM); },
    onError: () => toast.error("เกิดข้อผิดพลาด"),
  });
  const updateSku = trpc.sku.update.useMutation({
    onSuccess: () => { utils.sku.list.invalidate(); toast.success("อัปเดตสำเร็จ"); setShowSkuDialog(false); },
    onError: () => toast.error("เกิดข้อผิดพลาด"),
  });
  const deleteSku = trpc.sku.delete.useMutation({
    onSuccess: () => { utils.sku.list.invalidate(); toast.success("ลบสำเร็จ"); setSelectedSkuId(null); },
    onError: () => toast.error("เกิดข้อผิดพลาด"),
  });
  const createMatrix = trpc.sku.createMatrix.useMutation({
    onSuccess: () => { utils.sku.getAllMatrix.invalidate(); toast.success("เพิ่ม Content Matrix สำเร็จ"); setShowMatrixDialog(false); },
    onError: () => toast.error("เกิดข้อผิดพลาด"),
  });
  const deleteMatrix = trpc.sku.deleteMatrix.useMutation({
    onSuccess: () => utils.sku.getAllMatrix.invalidate(),
    onError: () => toast.error("เกิดข้อผิดพลาด"),
  });

  const openCreate = () => { setEditingSkuId(null); setSkuForm(DEFAULT_SKU_FORM); setShowSkuDialog(true); };
  const openEdit = (sku: typeof skus[0]) => {
    setEditingSkuId(sku.id);
    setSkuForm({ name: sku.name, sku: sku.sku, category: sku.category ?? "other", description: sku.description ?? "", price: sku.price?.toString() ?? "" });
    setShowSkuDialog(true);
  };
  const openAddMatrix = (skuId: number) => {
    setSelectedSkuId(skuId);
    setMatrixForm({ contentType: "SALE", angle: "", notes: "", priority: 1 });
    setShowMatrixDialog(true);
  };

  const handleSaveSku = () => {
    if (!skuForm.name.trim()) return toast.error("กรุณาใส่ชื่อสินค้า");
    const price = skuForm.price ? parseFloat(skuForm.price) : undefined;
    if (editingSkuId) {
      updateSku.mutate({ id: editingSkuId, name: skuForm.name, category: skuForm.category, description: skuForm.description || undefined, price });
    } else {
      createSku.mutate({ brandId: 1, name: skuForm.name, sku: skuForm.sku || skuForm.name, category: skuForm.category, description: skuForm.description || undefined, price });
    }
  };

  const handleSaveMatrix = () => {
    if (!selectedSkuId) return;
    createMatrix.mutate({ skuId: selectedSkuId, contentType: matrixForm.contentType, framework: matrixForm.angle || undefined, notes: matrixForm.notes || undefined, priority: matrixForm.priority });
  };

  const selectedSku = skus.find(s => s.id === selectedSkuId);
  const skuMatrix = allMatrix.filter(m => m.skuId === selectedSkuId);

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-bold flex items-center gap-2">
            <Package className="h-5 w-5 text-primary" /> SKU Content Map
          </h1>
          <p className="text-sm text-muted-foreground mt-0.5">จัดการสินค้าและ Content Matrix</p>
        </div>
        <Button onClick={openCreate} size="sm" className="gap-1.5">
          <Plus className="h-4 w-4" /> เพิ่มสินค้า
        </Button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {/* SKU List */}
        <div className="md:col-span-1 space-y-2">
          <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider mb-3">สินค้าทั้งหมด ({skus.length})</p>
          {isLoading ? (
            <div className="space-y-2">{[1,2,3].map(i => <div key={i} className="h-16 bg-card rounded-lg animate-pulse" />)}</div>
          ) : skus.length === 0 ? (
            <Card className="bg-card border-border">
              <CardContent className="flex flex-col items-center py-8 gap-3">
                <Package className="h-8 w-8 text-muted-foreground/40" />
                <p className="text-sm text-muted-foreground">ยังไม่มีสินค้า</p>
                <Button variant="outline" size="sm" onClick={openCreate}>เพิ่มสินค้าแรก</Button>
              </CardContent>
            </Card>
          ) : (
            skus.map(sku => {
              const catLabel = CATEGORIES.find(c => c.value === sku.category)?.label ?? sku.category ?? "-";
              const matrixCount = allMatrix.filter(m => m.skuId === sku.id).length;
              const isSelected = selectedSkuId === sku.id;
              return (
                <div key={sku.id} onClick={() => setSelectedSkuId(isSelected ? null : sku.id)}
                  className={`p-3 rounded-lg border cursor-pointer transition-all ${isSelected ? "border-primary bg-primary/10" : "border-border bg-card hover:border-primary/30"}`}>
                  <div className="flex items-center justify-between">
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium text-foreground truncate">{sku.name}</p>
                      <div className="flex items-center gap-2 mt-1">
                        <Badge variant="secondary" className="text-xs">{catLabel}</Badge>
                        <span className="text-xs text-muted-foreground">{matrixCount} types</span>
                      </div>
                      {sku.price != null && <p className="text-xs text-muted-foreground mt-0.5">฿{sku.price.toLocaleString()}</p>}
                    </div>
                    <div className="flex gap-1 shrink-0">
                      <Button variant="ghost" size="icon" className="h-7 w-7" onClick={e => { e.stopPropagation(); openEdit(sku); }}>
                        <Pencil className="h-3 w-3" />
                      </Button>
                      <Button variant="ghost" size="icon" className="h-7 w-7 text-destructive" onClick={e => { e.stopPropagation(); deleteSku.mutate({ id: sku.id }); }}>
                        <Trash2 className="h-3 w-3" />
                      </Button>
                    </div>
                  </div>
                </div>
              );
            })
          )}
        </div>

        {/* Content Matrix */}
        <div className="md:col-span-2">
          {!selectedSku ? (
            <Card className="bg-card border-border h-full">
              <CardContent className="flex flex-col items-center justify-center h-64 gap-3">
                <ChevronRight className="h-8 w-8 text-muted-foreground/40" />
                <p className="text-sm text-muted-foreground">เลือกสินค้าเพื่อดู Content Matrix</p>
              </CardContent>
            </Card>
          ) : (
            <div className="space-y-4">
              <div className="flex items-start justify-between">
                <div>
                  <h2 className="font-semibold text-foreground">{selectedSku.name}</h2>
                  {selectedSku.description && <p className="text-xs text-muted-foreground mt-0.5">{selectedSku.description}</p>}
                  {selectedSku.shopeeUrl && (
                    <a href={selectedSku.shopeeUrl} target="_blank" rel="noreferrer" className="text-xs text-primary flex items-center gap-1 mt-1 hover:underline">
                      <ExternalLink className="h-3 w-3" />ดูบน Shopee
                    </a>
                  )}
                </div>
                <Button size="sm" variant="outline" onClick={() => openAddMatrix(selectedSku.id)} className="gap-1.5">
                  <Plus className="h-3.5 w-3.5" /> เพิ่ม Content Type
                </Button>
              </div>
              {skuMatrix.length === 0 ? (
                <Card className="bg-card border-border">
                  <CardContent className="flex flex-col items-center py-8 gap-3">
                    <p className="text-sm text-muted-foreground">ยังไม่มี Content Matrix สำหรับสินค้านี้</p>
                  </CardContent>
                </Card>
              ) : (
                <div className="grid grid-cols-1 gap-3">
                  {skuMatrix.map(matrix => (
                    <Card key={matrix.id} className="bg-card border-border">
                      <CardContent className="p-4">
                        <div className="flex items-start justify-between gap-3">
                          <div className="flex-1 min-w-0">
                            <Badge className="text-xs mb-2">{matrix.contentType}</Badge>
                            {matrix.angle && <p className="text-sm font-medium">{matrix.angle}</p>}
                            {matrix.hookIdeas && Array.isArray(matrix.hookIdeas) && (matrix.hookIdeas as string[]).length > 0 && (
                              <ul className="mt-1 space-y-0.5">
                                {(matrix.hookIdeas as string[]).map((h, i) => <li key={i} className="text-xs text-muted-foreground">• {h}</li>)}
                              </ul>
                            )}
                            {matrix.targetAudience && <p className="text-xs text-muted-foreground mt-1">🎯 {matrix.targetAudience}</p>}
                            {matrix.notes && <p className="text-xs text-muted-foreground mt-1 italic">{matrix.notes}</p>}
                          </div>
                          <Button variant="ghost" size="icon" className="h-7 w-7 text-destructive shrink-0" onClick={() => deleteMatrix.mutate({ id: matrix.id })}>
                            <Trash2 className="h-3.5 w-3.5" />
                          </Button>
                        </div>
                      </CardContent>
                    </Card>
                  ))}
                </div>
              )}
            </div>
          )}
        </div>
      </div>

      {/* SKU Dialog */}
      <Dialog open={showSkuDialog} onOpenChange={setShowSkuDialog}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader><DialogTitle>{editingSkuId ? "แก้ไขสินค้า" : "เพิ่มสินค้าใหม่"}</DialogTitle></DialogHeader>
          <div className="space-y-3 py-2">
            <div>
              <label className="text-xs font-medium text-muted-foreground mb-1 block">ชื่อสินค้า *</label>
              <Input placeholder="เช่น กันแดด SPF50" value={skuForm.name} onChange={e => setSkuForm(f => ({ ...f, name: e.target.value }))} />
            </div>
            {!editingSkuId && (
              <div>
                <label className="text-xs font-medium text-muted-foreground mb-1 block">รหัสสินค้า (SKU)</label>
                <Input placeholder="เช่น JH-SUN-001" value={skuForm.sku} onChange={e => setSkuForm(f => ({ ...f, sku: e.target.value }))} />
              </div>
            )}
            <div>
              <label className="text-xs font-medium text-muted-foreground mb-1 block">หมวดหมู่</label>
              <Select value={skuForm.category} onValueChange={v => setSkuForm(f => ({ ...f, category: v }))}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>{CATEGORIES.map(o => <SelectItem key={o.value} value={o.value}>{o.label}</SelectItem>)}</SelectContent>
              </Select>
            </div>
            <div>
              <label className="text-xs font-medium text-muted-foreground mb-1 block">คำอธิบาย / จุดเด่น</label>
              <Textarea placeholder="เช่น ป้องกัน UV ได้ 12 ชั่วโมง ไม่มัน" value={skuForm.description} onChange={e => setSkuForm(f => ({ ...f, description: e.target.value }))} rows={2} />
            </div>
            <div>
              <label className="text-xs font-medium text-muted-foreground mb-1 block">ราคา (บาท)</label>
              <Input placeholder="เช่น 299" type="number" value={skuForm.price} onChange={e => setSkuForm(f => ({ ...f, price: e.target.value }))} />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowSkuDialog(false)}>ยกเลิก</Button>
            <Button onClick={handleSaveSku} disabled={createSku.isPending || updateSku.isPending}>
              {editingSkuId ? "บันทึก" : "เพิ่ม"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Matrix Dialog */}
      <Dialog open={showMatrixDialog} onOpenChange={setShowMatrixDialog}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader><DialogTitle>เพิ่ม Content Type สำหรับ {selectedSku?.name}</DialogTitle></DialogHeader>
          <div className="space-y-3 py-2">
            <div>
              <label className="text-xs font-medium text-muted-foreground mb-1 block">ประเภท Content</label>
              <Select value={matrixForm.contentType} onValueChange={v => setMatrixForm(f => ({ ...f, contentType: v }))}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>{CONTENT_TYPES.map(t => <SelectItem key={t} value={t}>{t}</SelectItem>)}</SelectContent>
              </Select>
            </div>
            <div>
              <label className="text-xs font-medium text-muted-foreground mb-1 block">มุมมอง / Angle</label>
              <Input placeholder="เช่น เปิดด้วยปัญหา ตามด้วยวิธีแก้" value={matrixForm.angle} onChange={e => setMatrixForm(f => ({ ...f, angle: e.target.value }))} />
            </div>
            <div>
              <label className="text-xs font-medium text-muted-foreground mb-1 block">หมายเหตุ</label>
              <Textarea placeholder="รายละเอียดเพิ่มเติม..." value={matrixForm.notes} onChange={e => setMatrixForm(f => ({ ...f, notes: e.target.value }))} rows={2} />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowMatrixDialog(false)}>ยกเลิก</Button>
            <Button onClick={handleSaveMatrix} disabled={createMatrix.isPending}>เพิ่ม</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
