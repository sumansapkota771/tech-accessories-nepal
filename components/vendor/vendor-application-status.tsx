import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Clock, XCircle, Ban } from "lucide-react"
import type { Vendor } from "@/lib/types"

interface VendorApplicationStatusProps {
  vendor: Vendor
}

const statusCopy: Record<string, { icon: typeof Clock; title: string; description: string }> = {
  pending: {
    icon: Clock,
    title: "Application under review",
    description: "We're reviewing your seller application. You'll be able to access your vendor dashboard once it's approved.",
  },
  rejected: {
    icon: XCircle,
    title: "Application rejected",
    description: "Your seller application was not approved. Contact support if you'd like more information.",
  },
  suspended: {
    icon: Ban,
    title: "Store suspended",
    description: "Your store has been suspended. Contact support to resolve this.",
  },
}

export function VendorApplicationStatus({ vendor }: VendorApplicationStatusProps) {
  const copy = statusCopy[vendor.status] ?? statusCopy.pending
  const Icon = copy.icon

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Icon className="h-5 w-5" />
          {copy.title}
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <p className="text-muted-foreground">{copy.description}</p>
        <div className="flex items-center gap-2 text-sm">
          <span className="font-medium">Store name:</span>
          <span>{vendor.store_name}</span>
          <Badge variant="outline" className="capitalize">
            {vendor.status}
          </Badge>
        </div>
      </CardContent>
    </Card>
  )
}
