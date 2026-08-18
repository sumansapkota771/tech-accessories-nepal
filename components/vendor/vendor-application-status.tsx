import Link from "next/link"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Clock, XCircle, Ban, Eye, AlertTriangle, CalendarClock } from "lucide-react"
import { format } from "date-fns"
import type { Vendor } from "@/lib/types"

interface VendorApplicationStatusProps {
  vendor: Vendor
}

const statusCopy: Record<string, { icon: typeof Clock; title: string; description: string; variant: "default" | "secondary" | "destructive" | "outline" }> = {
  pending: {
    icon: Clock,
    title: "Application submitted",
    description: "Your seller application has been submitted and is waiting to be reviewed. You will be notified once our team begins reviewing it.",
    variant: "secondary",
  },
  under_review: {
    icon: Eye,
    title: "Application under review",
    description: "Our team is currently reviewing your seller application. We will notify you once a decision has been made.",
    variant: "default",
  },
  rejected: {
    icon: XCircle,
    title: "Application not approved",
    description: "Your seller application was not approved. Please see the reason below. You can reapply with corrected information.",
    variant: "destructive",
  },
  suspended: {
    icon: Ban,
    title: "Store suspended",
    description: "Your store has been suspended. Please contact support to resolve this issue.",
    variant: "destructive",
  },
  blocked: {
    icon: AlertTriangle,
    title: "Store blocked",
    description: "Your store has been blocked due to a policy violation. Contact support for more information.",
    variant: "destructive",
  },
  expired: {
    icon: CalendarClock,
    title: "Application expired",
    description: "Your application has expired. You can reapply to become a seller.",
    variant: "secondary",
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
          <Badge variant={copy.variant} className="capitalize">
            {vendor.status.replace("_", " ")}
          </Badge>
        </div>

        {vendor.rejection_reason && (
          <div className="rounded-md bg-destructive/10 p-3 text-sm">
            <p className="font-medium text-destructive mb-1">Rejection reason</p>
            <p className="text-muted-foreground">{vendor.rejection_reason}</p>
          </div>
        )}

        {vendor.under_review_at && vendor.status === "under_review" && (
          <p className="text-xs text-muted-foreground">
            Under review since {format(new Date(vendor.under_review_at), "MMM dd, yyyy")}
          </p>
        )}

        {(vendor.status === "rejected" || vendor.status === "expired") && (
          <Button asChild className="w-full">
            <Link href="/vendor/onboarding">Reapply as a Seller</Link>
          </Button>
        )}
      </CardContent>
    </Card>
  )
}
