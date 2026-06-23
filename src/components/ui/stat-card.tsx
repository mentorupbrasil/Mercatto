import { type LucideIcon, TrendingDown, TrendingUp } from "lucide-react";
import { cn } from "@/lib/utils";
import { Card, CardContent } from "./card";

export interface StatCardProps {
  title: string;
  value: string;
  change?: number;
  changeLabel?: string;
  icon: LucideIcon;
  iconClassName?: string;
}

export function StatCard({
  title,
  value,
  change,
  changeLabel = "vs. mês anterior",
  icon: Icon,
  iconClassName,
}: StatCardProps) {
  const isPositive = change !== undefined && change >= 0;
  const hasChange = change !== undefined;

  return (
    <Card>
      <CardContent className="p-5">
        <div className="flex items-start justify-between">
          <div className="space-y-2">
            <p className="text-sm font-medium text-gray-500">{title}</p>
            <p className="text-2xl font-bold tracking-tight text-gray-900">
              {value}
            </p>
            {hasChange && (
              <div className="flex items-center gap-1.5">
                {isPositive ? (
                  <TrendingUp className="h-4 w-4 text-mercatto-600" />
                ) : (
                  <TrendingDown className="h-4 w-4 text-red-500" />
                )}
                <span
                  className={cn(
                    "text-sm font-medium",
                    isPositive ? "text-mercatto-600" : "text-red-600"
                  )}
                >
                  {isPositive ? "+" : ""}
                  {change.toFixed(1)}%
                </span>
                <span className="text-sm text-gray-400">{changeLabel}</span>
              </div>
            )}
          </div>
          <div
            className={cn(
              "flex h-11 w-11 items-center justify-center rounded-xl bg-mercatto-50",
              iconClassName
            )}
          >
            <Icon className="h-5 w-5 text-mercatto-600" />
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
