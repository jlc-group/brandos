import { useMemo, useState } from "react";
import { trpc } from "@/lib/trpc";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { CheckCircle, Clock, Loader2, Plus, RefreshCw, RadioTower, Share2, TriangleAlert } from "lucide-react";
import { toast } from "sonner";
import { formatDistanceToNow } from "date-fns";
import { th } from "date-fns/locale";

const DEFAULT_BRAND_ID = 1;

type Platform = "tiktok" | "facebook";

export default function SocialSync() {
  const utils = trpc.useUtils();
  const [platform, setPlatform] = useState<Platform>("tiktok");
  const [accountName, setAccountName] = useState("");
  const [accountKey, setAccountKey] = useState("");
  const [pageId, setPageId] = useState("");
  const [businessId, setBusinessId] = useState("");
  const [advertiserId, setAdvertiserId] = useState("");

  const { data: status, isLoading } = trpc.social.status.useQuery({ brandId: DEFAULT_BRAND_ID });
  const { data: history = [] } = trpc.history.list.useQuery({ limit: 12, offset: 0, brandId: DEFAULT_BRAND_ID });

  const invalidateSocialData = () => {
    utils.social.status.invalidate();
    utils.social.accounts.invalidate();
    utils.history.list.invalidate();
    utils.performance.list.invalidate();
    utils.performance.summary.invalidate();
  };

  const upsertAccount = trpc.social.upsertAccount.useMutation({
    onSuccess: () => {
      invalidateSocialData();
      toast.success("บันทึก account แล้ว");
      setAccountName("");
      setAccountKey("");
      setPageId("");
      setBusinessId("");
      setAdvertiserId("");
    },
    onError: (error) => toast.error(error.message || "บันทึก account ไม่สำเร็จ"),
  });

  const syncTikTok = trpc.social.syncTikTokContent.useMutation({
    onSuccess: (stats) => {
      invalidateSocialData();
      toast.success(`TikTok sync สำเร็จ: ${stats.upserted}/${stats.fetched} รายการ`);
    },
    onError: (error) => toast.error(error.message || "TikTok sync ไม่สำเร็จ"),
  });

  const syncFacebook = trpc.social.syncFacebookPosts.useMutation({
    onSuccess: (stats) => {
      invalidateSocialData();
      toast.success(`Facebook sync สำเร็จ: ${stats.upserted}/${stats.fetched} รายการ`);
    },
    onError: (error) => toast.error(error.message || "Facebook sync ไม่สำเร็จ"),
  });

  const syncTikTokAds = trpc.social.syncTikTokAds.useMutation({
    onSuccess: (stats) => {
      invalidateSocialData();
      toast.success(`TikTok Ads sync สำเร็จ: ${stats.inserted}/${stats.fetched} รายการ`);
    },
    onError: (error) => toast.error(error.message || "TikTok Ads sync ไม่สำเร็จ"),
  });

  const syncedContent = useMemo(
    () => history.filter((item) => item.externalId || item.lastSyncedAt),
    [history],
  );

  const handleAddAccount = () => {
    const key = accountKey.trim() || pageId.trim() || businessId.trim() || advertiserId.trim();
    if (!key) {
      toast.error("กรอก Account Key, Page ID, Business ID หรือ Advertiser ID อย่างน้อย 1 ช่อง");
      return;
    }

    upsertAccount.mutate({
      brandId: DEFAULT_BRAND_ID,
      platform,
      accountKey: key,
      accountName: accountName.trim() || undefined,
      pageId: pageId.trim() || undefined,
      businessId: businessId.trim() || undefined,
      advertiserId: advertiserId.trim() || undefined,
    });
  };

  const running = syncTikTok.isPending || syncFacebook.isPending || syncTikTokAds.isPending;

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
        <div>
          <h1 className="text-xl font-bold flex items-center gap-2">
            <RadioTower className="h-5 w-5 text-primary" />
            Social Sync
          </h1>
          <p className="text-sm text-muted-foreground mt-0.5">
            ดึง Content และ Performance จาก TikTok/Facebook เข้า BrandOS
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <Button
            onClick={() => syncTikTok.mutate({ brandId: DEFAULT_BRAND_ID })}
            disabled={running}
            className="gap-2"
          >
            {syncTikTok.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : <RefreshCw className="h-4 w-4" />}
            Sync TikTok Content
          </Button>
          <Button
            variant="secondary"
            onClick={() => syncFacebook.mutate({ brandId: DEFAULT_BRAND_ID })}
            disabled={running}
            className="gap-2"
          >
            {syncFacebook.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Share2 className="h-4 w-4" />}
            Sync Facebook
          </Button>
          <Button
            variant="outline"
            onClick={() => syncTikTokAds.mutate({ brandId: DEFAULT_BRAND_ID })}
            disabled={running}
            className="gap-2"
          >
            {syncTikTokAds.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : <RefreshCw className="h-4 w-4" />}
            Sync TikTok Ads
          </Button>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <StatusCard label="TikTok Token" ready={status?.env.tiktokContentReady} />
        <StatusCard label="TikTok Business ID" ready={status?.env.tiktokBusinessIdReady} />
        <StatusCard label="TikTok Advertiser ID" ready={status?.env.tiktokAdvertiserIdReady} />
        <StatusCard label="Facebook Token" ready={status?.env.facebookReady} />
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-[420px_1fr] gap-6">
        <Card className="bg-card border-border">
          <CardHeader>
            <CardTitle className="text-sm flex items-center gap-2">
              <Plus className="h-4 w-4 text-primary" />
              Connected Account
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid gap-2">
              <Label>Platform</Label>
              <Select value={platform} onValueChange={(value) => setPlatform(value as Platform)}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="tiktok">TikTok</SelectItem>
                  <SelectItem value="facebook">Facebook</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="grid gap-2">
              <Label>ชื่อ Account</Label>
              <Input value={accountName} onChange={(event) => setAccountName(event.target.value)} placeholder="เช่น Julaherb Thailand" />
            </div>
            <div className="grid gap-2">
              <Label>Account Key</Label>
              <Input value={accountKey} onChange={(event) => setAccountKey(event.target.value)} placeholder="ใช้เป็น key สำหรับ upsert" />
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              <div className="grid gap-2">
                <Label>Page ID</Label>
                <Input value={pageId} onChange={(event) => setPageId(event.target.value)} placeholder="Facebook Page ID" />
              </div>
              <div className="grid gap-2">
                <Label>Business ID</Label>
                <Input value={businessId} onChange={(event) => setBusinessId(event.target.value)} placeholder="TikTok Business ID" />
              </div>
            </div>
            <div className="grid gap-2">
              <Label>Advertiser ID</Label>
              <Input value={advertiserId} onChange={(event) => setAdvertiserId(event.target.value)} placeholder="TikTok Advertiser ID" />
            </div>
            <Button onClick={handleAddAccount} disabled={upsertAccount.isPending} className="w-full gap-2">
              {upsertAccount.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Plus className="h-4 w-4" />}
              บันทึก Account
            </Button>
          </CardContent>
        </Card>

        <div className="space-y-6">
          <Card className="bg-card border-border">
            <CardHeader>
              <CardTitle className="text-sm">Accounts และ Sync ล่าสุด</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              {isLoading ? (
                <div className="h-20 rounded-lg bg-secondary/40 animate-pulse" />
              ) : status?.accounts.length ? (
                status.accounts.map((account) => (
                  <div key={account.id} className="flex items-center justify-between gap-3 rounded-lg border border-border p-3">
                    <div className="min-w-0">
                      <div className="flex items-center gap-2">
                        <Badge variant="secondary">{account.platform}</Badge>
                        <p className="text-sm font-medium truncate">{account.accountName || account.accountKey}</p>
                      </div>
                      <p className="text-xs text-muted-foreground mt-1">
                        {account.businessId || account.pageId || account.advertiserId || account.accountKey}
                      </p>
                    </div>
                    <div className="text-right shrink-0">
                      <Badge variant={account.status === "error" ? "destructive" : "outline"}>{account.status}</Badge>
                      <p className="text-xs text-muted-foreground mt-1">
                        {account.lastSyncedAt
                          ? formatDistanceToNow(new Date(account.lastSyncedAt), { addSuffix: true, locale: th })
                          : "ยังไม่เคย sync"}
                      </p>
                    </div>
                  </div>
                ))
              ) : (
                <p className="text-sm text-muted-foreground">
                  ยังไม่มี account ที่บันทึกไว้ แต่ยังสามารถ sync จากค่า env production ได้ถ้ามี token และ id ครบ
                </p>
              )}
            </CardContent>
          </Card>

          <Card className="bg-card border-border">
            <CardHeader>
              <CardTitle className="text-sm">Content ที่ Sync เข้ามาล่าสุด</CardTitle>
            </CardHeader>
            <CardContent>
              {syncedContent.length ? (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                  {syncedContent.map((item) => (
                    <div key={item.id} className="rounded-lg border border-border p-3">
                      <div className="flex items-center gap-2 mb-2">
                        <Badge variant="outline">{item.platform}</Badge>
                        {item.externalId && <span className="text-xs font-mono text-muted-foreground truncate">{item.externalId}</span>}
                      </div>
                      <p className="text-sm font-medium line-clamp-2">{item.title}</p>
                      <div className="grid grid-cols-4 gap-2 mt-3 text-xs text-muted-foreground">
                        <Metric label="Views" value={item.views ?? 0} />
                        <Metric label="Reach" value={item.reach ?? 0} />
                        <Metric label="Likes" value={item.likes ?? 0} />
                        <Metric label="Shares" value={item.shares ?? 0} />
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-sm text-muted-foreground">ยังไม่มี content ที่ sync จาก social platform</p>
              )}
            </CardContent>
          </Card>

          <Card className="bg-card border-border">
            <CardHeader>
              <CardTitle className="text-sm">Sync Runs</CardTitle>
            </CardHeader>
            <CardContent className="space-y-2">
              {status?.runs.length ? status.runs.map((run) => (
                <div key={run.id} className="flex items-center justify-between rounded-lg border border-border px-3 py-2 text-sm">
                  <div className="flex items-center gap-2">
                    <Clock className="h-4 w-4 text-muted-foreground" />
                    <span>{run.platform}</span>
                    <span className="text-muted-foreground">/</span>
                    <span>{run.syncType}</span>
                  </div>
                  <Badge variant={run.status === "failed" ? "destructive" : "outline"}>{run.status}</Badge>
                </div>
              )) : (
                <p className="text-sm text-muted-foreground">ยังไม่มีประวัติการ sync</p>
              )}
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}

function StatusCard({ label, ready }: { label: string; ready?: boolean }) {
  return (
    <Card className="bg-card border-border">
      <CardContent className="p-4 flex items-center justify-between">
        <div>
          <p className="text-xs text-muted-foreground">{label}</p>
          <p className="text-sm font-medium mt-1">{ready ? "พร้อมใช้งาน" : "ยังไม่พร้อม"}</p>
        </div>
        {ready ? <CheckCircle className="h-5 w-5 text-green-400" /> : <TriangleAlert className="h-5 w-5 text-yellow-400" />}
      </CardContent>
    </Card>
  );
}

function Metric({ label, value }: { label: string; value: number }) {
  return (
    <div>
      <p>{label}</p>
      <p className="font-medium text-foreground">{value.toLocaleString()}</p>
    </div>
  );
}
