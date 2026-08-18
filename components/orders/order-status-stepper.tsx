import { cn } from "@/lib/utils"
import { Check, X, Clock, PackageCheck, Truck, Home, CheckCircle2 } from "lucide-react"

// Master order steps
const MASTER_STEPS = [
  { key: "pending", label: "Pending", icon: Clock },
  { key: "confirmed", label: "Confirmed", icon: PackageCheck },
  { key: "processing", label: "Processing", icon: PackageCheck },
  { key: "shipped", label: "Shipped", icon: Truck },
  { key: "delivered", label: "Delivered", icon: Home },
  { key: "completed", label: "Completed", icon: CheckCircle2 },
] as const

// Suborder steps
const SUBORDER_STEPS = [
  { key: "pending", label: "Pending", icon: Clock },
  { key: "accepted", label: "Accepted", icon: PackageCheck },
  { key: "processing", label: "Processing", icon: PackageCheck },
  { key: "ready_for_delivery", label: "Ready", icon: Truck },
  { key: "out_for_delivery", label: "In Transit", icon: Truck },
  { key: "delivered", label: "Delivered", icon: Home },
] as const

interface OrderStatusStepperProps {
  status: string
  isSuborder?: boolean
  className?: string
}

export function OrderStatusStepper({ status, isSuborder = false, className }: OrderStatusStepperProps) {
  if (status === "cancelled") {
    return (
      <div className={cn("flex items-center gap-2 text-sm text-destructive", className)}>
        <X className="h-4 w-4" />
        <span className="font-medium">Cancelled</span>
      </div>
    )
  }

  const steps = isSuborder ? SUBORDER_STEPS : MASTER_STEPS
  const currentIndex = steps.findIndex((s) => s.key === status)
  const effectiveIndex = currentIndex >= 0 ? currentIndex : 0

  return (
    <div className={cn("flex items-center", className)}>
      {steps.map((step, index) => {
        const isComplete = index < effectiveIndex
        const isCurrent = index === effectiveIndex
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
            {index < steps.length - 1 && (
              <div className={cn("h-0.5 flex-1 mx-1 -mt-5", isComplete ? "bg-primary" : "bg-muted-foreground/20")} />
            )}
          </div>
        )
      })}
    </div>
  )
}
