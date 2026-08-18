import type { OrderStatus, SuborderStatus } from "@/lib/types"

// Get valid next statuses for a suborder
export function getValidSuborderTransitions(currentStatus: SuborderStatus): { status: SuborderStatus; label: string }[] {
  const transitions: Record<SuborderStatus, { status: SuborderStatus; label: string }[]> = {
    pending: [{ status: "accepted", label: "Accept Order" }],
    accepted: [{ status: "processing", label: "Start Processing" }],
    processing: [{ status: "ready_for_delivery", label: "Ready for Delivery" }],
    ready_for_delivery: [{ status: "out_for_delivery", label: "Out for Delivery" }],
    out_for_delivery: [{ status: "delivered", label: "Mark as Delivered" }],
    delivered: [],
    cancelled: [],
  }
  return transitions[currentStatus] || []
}

// Get valid next statuses for a master order
export function getValidMasterTransitions(currentStatus: OrderStatus): { status: OrderStatus; label: string }[] {
  const transitions: Record<OrderStatus, { status: OrderStatus; label: string }[]> = {
    pending: [{ status: "confirmed", label: "Confirm" }],
    confirmed: [{ status: "processing", label: "Process" }],
    processing: [
      { status: "partially_shipped", label: "Partially Shipped" },
      { status: "shipped", label: "Ship" },
    ],
    partially_shipped: [{ status: "shipped", label: "Ship All" }],
    shipped: [
      { status: "partially_delivered", label: "Partially Delivered" },
      { status: "delivered", label: "Delivered" },
    ],
    partially_delivered: [{ status: "delivered", label: "Delivered" }],
    delivered: [{ status: "completed", label: "Complete" }],
    completed: [],
    cancelled: [],
  }
  return transitions[currentStatus] || []
}
