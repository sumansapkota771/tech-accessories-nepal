export function getStatusColor(status: string) {
  switch (status) {
    case "pending":
      return "bg-yellow-100 text-yellow-800"
    case "confirmed":
    case "accepted":
      return "bg-blue-100 text-blue-800"
    case "processing":
    case "ready_for_delivery":
      return "bg-indigo-100 text-indigo-800"
    case "partially_shipped":
    case "shipped":
    case "out_for_delivery":
      return "bg-purple-100 text-purple-800"
    case "partially_delivered":
    case "delivered":
    case "completed":
      return "bg-green-100 text-green-800"
    case "cancelled":
      return "bg-red-100 text-red-800"
    default:
      return "bg-gray-100 text-gray-800"
  }
}

export function formatStatus(status: string) {
  return status.replace(/_/g, " ").replace(/\b\w/g, (c) => c.toUpperCase())
}
