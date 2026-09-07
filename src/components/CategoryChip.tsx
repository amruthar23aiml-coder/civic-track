import { CATEGORY_MAP, categoryLabel, type EventCategory } from "@/lib/categories";
import { cn } from "@/lib/utils";

export function CategoryChip({
  category,
  custom,
  className,
}: {
  category: EventCategory;
  custom?: string | null;
  className?: string;
}) {
  const def = CATEGORY_MAP[category];
  const Icon = def?.icon;
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1.5 rounded-full border px-2.5 py-1 text-xs font-medium",
        def?.tone,
        className,
      )}
    >
      {Icon && <Icon className="size-3.5" />}
      {categoryLabel(category, custom)}
    </span>
  );
}
