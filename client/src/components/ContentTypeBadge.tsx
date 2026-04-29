import { cn } from "@/lib/utils";

const typeConfig: Record<string, { label: string; className: string }> = {
  sale: { label: "ขาย", className: "bg-rose-500/20 text-rose-300 border border-rose-500/30" },
  education: { label: "ให้ความรู้", className: "bg-blue-500/20 text-blue-300 border border-blue-500/30" },
  entertainment: { label: "บันเทิง", className: "bg-yellow-500/20 text-yellow-300 border border-yellow-500/30" },
  review: { label: "รีวิว", className: "bg-green-500/20 text-green-300 border border-green-500/30" },
  lifestyle: { label: "Lifestyle", className: "bg-purple-500/20 text-purple-300 border border-purple-500/30" },
  before_after: { label: "Before/After", className: "bg-orange-500/20 text-orange-300 border border-orange-500/30" },
  ugc: { label: "UGC", className: "bg-pink-500/20 text-pink-300 border border-pink-500/30" },
};

export function ContentTypeBadge({ type, className }: { type: string; className?: string }) {
  const config = typeConfig[type] ?? { label: type, className: "bg-muted text-muted-foreground border border-border" };
  return (
    <span className={cn("inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium", config.className, className)}>
      {config.label}
    </span>
  );
}

export const contentTypeOptions = Object.entries(typeConfig).map(([value, { label }]) => ({ value, label }));
