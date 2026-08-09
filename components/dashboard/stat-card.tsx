import type { ReactNode } from "react"
import { cn } from "@/lib/utils"

const GRADIENTS = {
  primary: "linear-gradient(135deg, var(--primary), var(--chart-4))",
  secondary: "linear-gradient(135deg, var(--secondary), var(--chart-3))",
  alert: "linear-gradient(135deg, var(--destructive), var(--chart-4))",
} as const

interface StatCardProps {
  title: string
  value: string | number
  description?: string
  icon: ReactNode
  gradient?: keyof typeof GRADIENTS
  className?: string
}

export function StatCard({ title, value, description, icon, gradient, className }: StatCardProps) {
  if (gradient) {
    return (
      <div
        className={cn("rounded-xl p-5 text-white shadow-sm flex flex-col justify-between min-h-32", className)}
        style={{ backgroundImage: GRADIENTS[gradient] }}
      >
        <div className="flex items-start justify-between">
          <span className="text-sm font-medium text-white/85">{title}</span>
          <span className="flex h-9 w-9 items-center justify-center rounded-lg bg-white/20 shrink-0">{icon}</span>
        </div>
        <div>
          <p className="text-2xl font-bold">{value}</p>
          {description && <p className="text-xs text-white/75 mt-0.5">{description}</p>}
        </div>
      </div>
    )
  }

  return (
    <div className={cn("rounded-xl border bg-card p-5 flex flex-col justify-between min-h-32", className)}>
      <div className="flex items-start justify-between">
        <span className="text-sm font-medium text-muted-foreground">{title}</span>
        <span className="flex h-9 w-9 items-center justify-center rounded-lg bg-muted text-muted-foreground shrink-0">
          {icon}
        </span>
      </div>
      <div>
        <p className="text-2xl font-bold text-foreground">{value}</p>
        {description && <p className="text-xs text-muted-foreground mt-0.5">{description}</p>}
      </div>
    </div>
  )
}
