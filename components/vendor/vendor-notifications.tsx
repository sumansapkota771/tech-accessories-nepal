"use client"

import { useCallback, useEffect, useState } from "react"
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Skeleton } from "@/components/ui/skeleton"
import { createBrowserClient } from "@/lib/supabase/client"
import { useToast } from "@/hooks/use-toast"
import type { Notification } from "@/lib/types"
import { formatDistanceToNow } from "date-fns"
import {
  Bell,
  BellOff,
  Package,
  ShoppingCart,
  Star,
  DollarSign,
  Info,
  Check,
} from "lucide-react"

interface VendorNotificationsProps {
  userId: string
}

function notificationIcon(type: Notification["type"]) {
  switch (type) {
    case "order":
      return <Package className="h-4 w-4 text-blue-600" />
    case "product":
      return <ShoppingCart className="h-4 w-4 text-violet-600" />
    case "review":
      return <Star className="h-4 w-4 text-amber-500" />
    case "payment":
      return <DollarSign className="h-4 w-4 text-emerald-600" />
    case "system":
      return <Check className="h-4 w-4 text-muted-foreground" />
    default:
      return <Info className="h-4 w-4 text-sky-600" />
  }
}

export function VendorNotifications({ userId }: VendorNotificationsProps) {
  const [notifications, setNotifications] = useState<Notification[]>([])
  const [loading, setLoading] = useState(true)
  const [markingId, setMarkingId] = useState<string | null>(null)
  const supabase = createBrowserClient()
  const { toast } = useToast()

  const fetchNotifications = useCallback(async () => {
    try {
      const { data, error } = await supabase
        .from("notifications")
        .select("*")
        .eq("user_id", userId)
        .order("created_at", { ascending: false })
        .limit(50)

      if (error) throw error
      setNotifications((data as Notification[]) || [])
    } catch (err) {
      console.error("Error fetching notifications:", err)
      toast({ title: "Error", description: "Failed to load notifications.", variant: "destructive" })
    } finally {
      setLoading(false)
    }
  }, [userId, supabase, toast])

  useEffect(() => {
    fetchNotifications()
  }, [fetchNotifications])

  const unreadCount = notifications.filter((n) => !n.is_read).length

  async function handleMarkRead(notification: Notification) {
    if (notification.is_read) return
    setMarkingId(notification.id)
    try {
      await supabase
        .from("notifications")
        .update({ is_read: true })
        .eq("id", notification.id)
        .eq("user_id", userId)
      setNotifications((prev) =>
        prev.map((n) => (n.id === notification.id ? { ...n, is_read: true } : n))
      )
    } catch (err) {
      console.error("Error marking notification:", err)
    } finally {
      setMarkingId(null)
    }
  }

  async function handleMarkAllRead() {
    try {
      await supabase
        .from("notifications")
        .update({ is_read: true })
        .eq("user_id", userId)
        .eq("is_read", false)
      setNotifications((prev) => prev.map((n) => ({ ...n, is_read: true })))
      toast({ title: "Done", description: "All notifications marked as read." })
    } catch (err) {
      console.error("Error marking all:", err)
      toast({ title: "Error", description: "Failed to mark notifications.", variant: "destructive" })
    }
  }

  if (loading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Notifications</CardTitle>
          <CardDescription>Stay updated on your store activity</CardDescription>
        </CardHeader>
        <CardContent className="space-y-3">
          {[1, 2, 3, 4].map((i) => (
            <div key={i} className="flex gap-3 p-3 rounded-lg border">
              <Skeleton className="h-8 w-8 rounded-full shrink-0" />
              <div className="flex-1 space-y-2">
                <Skeleton className="h-4 w-3/4" />
                <Skeleton className="h-3 w-1/2" />
              </div>
            </div>
          ))}
        </CardContent>
      </Card>
    )
  }

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <div>
            <CardTitle className="flex items-center gap-2">
              <Bell className="h-5 w-5" />
              Notifications
              {unreadCount > 0 && (
                <Badge variant="default" className="ml-1">
                  {unreadCount}
                </Badge>
              )}
            </CardTitle>
            <CardDescription>Stay updated on your store activity</CardDescription>
          </div>
          {unreadCount > 0 && (
            <Button variant="outline" size="sm" onClick={handleMarkAllRead}>
              Mark all as read
            </Button>
          )}
        </div>
      </CardHeader>
      <CardContent>
        {notifications.length === 0 ? (
          <div className="rounded-lg border border-dashed p-8 text-center">
            <BellOff className="h-8 w-8 mx-auto text-muted-foreground mb-2" />
            <p className="text-sm text-muted-foreground">No notifications yet</p>
            <p className="text-xs text-muted-foreground mt-1">
              You will receive updates about orders, reviews, and payments here.
            </p>
          </div>
        ) : (
          <div className="space-y-1">
            {notifications.map((notification) => (
              <button
                key={notification.id}
                onClick={() => handleMarkRead(notification)}
                disabled={markingId === notification.id || notification.is_read}
                className={`w-full text-left flex gap-3 p-3 rounded-lg transition-colors ${
                  notification.is_read
                    ? "opacity-60 cursor-default"
                    : "hover:bg-accent cursor-pointer bg-accent/30"
                }`}
              >
                <div className="shrink-0 mt-0.5">
                  {notificationIcon(notification.type)}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-start justify-between gap-2">
                    <p className={`text-sm leading-snug ${!notification.is_read ? "font-medium" : ""}`}>
                      {notification.title}
                    </p>
                    {!notification.is_read && (
                      <span className="shrink-0 h-2 w-2 rounded-full bg-blue-600 mt-1.5" />
                    )}
                  </div>
                  <p className="text-xs text-muted-foreground mt-0.5 line-clamp-2">
                    {notification.message}
                  </p>
                  <p className="text-[11px] text-muted-foreground mt-1">
                    {formatDistanceToNow(new Date(notification.created_at), { addSuffix: true })}
                  </p>
                </div>
              </button>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  )
}
