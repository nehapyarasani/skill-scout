import { cn } from "@/lib/utils";
import { Badge } from "@/components/ui/badge";

interface SkillBadgeProps {
  name: string;
  type: "tech" | "soft" | "missing";
  score?: number; // 0-1 or 0-100
  className?: string;
}

export function SkillBadge({ name, type, score, className }: SkillBadgeProps) {
  const getStyles = () => {
    switch (type) {
      case "tech":
        return "bg-indigo-100 text-indigo-700 hover:bg-indigo-200 border-indigo-200";
      case "soft":
        return "bg-rose-100 text-rose-700 hover:bg-rose-200 border-rose-200";
      case "missing":
        return "bg-red-50 text-red-600 hover:bg-red-100 border-red-200 border-dashed";
      default:
        return "bg-slate-100 text-slate-700";
    }
  };

  return (
    <Badge
      variant="outline"
      className={cn(
        "px-3 py-1.5 text-sm font-medium transition-all duration-200 border",
        getStyles(),
        className
      )}
    >
      {name}
      {score !== undefined && (
        <span className="ml-2 opacity-75 text-xs">
           • {Math.round(score)}%
        </span>
      )}
    </Badge>
  );
}
