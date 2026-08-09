import { cn } from "@/lib/utils"
import { Check, X, Clock, PackageCheck, Truck, Home } from "lucide-react"

const STEPS = [
  { key: "pending", label: "Pending", icon: Clock },
  { key: "confirmed", label: "Confirmed", icon: PackageCheck },
  { key: "shipped", label: "Shipped", icon: Truck },
  { key: "delivered", label: "Delivered", icon: Home },
] as const

interface OrderStatusStepperProps {
  status: "pending" | "confirmed" | "shipped" | "delivered" | "cancelled"
  className?: string
}

export function OrderStatusStepper({ status, className }: OrderStatusStepperProps) {
  if (status === "cancelled") {
    return (
      <div className={cn("flex items-center gap-2 text-sm text-destructive", className)}>
        <X className="h-4 w-4" />
        <span className="font-medium">Order cancelled</span>
      </div>
    )
  }

  const currentIndex = STEPS.findIndex((s) => s.key === status)

  return (
    <div className={cn("flex items-center", className)}>
      {STEPS.map((step, index) => {
        const isComplete = index < currentIndex
        const isCurrent = index === currentIndex
        const isDone = isComplete || isCurrent
        const Icon = isComplete ? Check : step.icon

        return (
          <div key={step.key} className="flex items-center flex-1 last:flex-initial">
            <div className="flex flex-col items-center gap-1.5">
              <div
                className={cn(
                  "h-8 w-8 rounded-full flex items-center justify-center border-2 shrink-0 transition-colors",
                  isDone
                    ? "bg-primary border-primary text-primary-foreground"
                    : "bg-background border-muted-foreground/30 text-muted-foreground",
                )}
              >
                <Icon className="h-4 w-4" />
              </div>
              <span
                className={cn(
                  "text-xs whitespace-nowrap",
                  isDone ? "font-medium text-foreground" : "text-muted-foreground",
                )}
              >
                {step.label}
              </span>
            </div>
            {index < STEPS.length - 1 && (
              <div className={cn("h-0.5 flex-1 mx-1 -mt-5", isComplete ? "bg-primary" : "bg-muted-foreground/20")} />
            )}
          </div>
        )
      })}
    </div>
  )
}
