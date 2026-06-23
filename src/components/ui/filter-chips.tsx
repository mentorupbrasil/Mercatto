"use client";

import { cn } from "@/lib/utils";

export interface FilterChip {
  id: string;
  label: string;
  count?: number;
}

interface FilterChipsProps {
  items: FilterChip[];
  activeId: string;
  onChange: (id: string) => void;
  className?: string;
}

export function FilterChips({ items, activeId, onChange, className }: FilterChipsProps) {
  return (
    <div className={cn("flex flex-wrap gap-2", className)}>
      {items.map((item) => {
        const active = activeId === item.id;
        return (
          <button
            key={item.id}
            type="button"
            onClick={() => onChange(item.id)}
            className={cn(
              "inline-flex items-center gap-1.5 rounded-full border px-3 py-1.5 text-sm font-medium transition-all",
              active
                ? "border-mercatto-500 bg-mercatto-50 text-mercatto-700 shadow-sm"
                : "border-gray-200 bg-white text-gray-600 hover:border-gray-300 hover:bg-gray-50"
            )}
          >
            {item.label}
            {item.count !== undefined && (
              <span
                className={cn(
                  "rounded-full px-1.5 py-0.5 text-xs",
                  active ? "bg-mercatto-100 text-mercatto-700" : "bg-gray-100 text-gray-500"
                )}
              >
                {item.count}
              </span>
            )}
          </button>
        );
      })}
    </div>
  );
}
