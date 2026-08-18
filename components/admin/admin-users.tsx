"use client"

import { useEffect, useState, useMemo } from "react"
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Badge } from "@/components/ui/badge"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { createBrowserClient } from "@/lib/supabase/client"
import { updateUserRole, suspendUser } from "@/lib/actions/admin"
import { useToast } from "@/hooks/use-toast"
import type { Profile, Vendor } from "@/lib/types"
import { Search, Shield, UserCheck, UserX, Loader2, AlertTriangle } from "lucide-react"
import { format } from "date-fns"

interface UserWithVendor extends Profile {
  vendors?: Pick<Vendor, "id" | "store_name" | "status"> | null
}

export function AdminUsers() {
  const [users, setUsers] = useState<UserWithVendor[]>([])
  const [loading, setLoading] = useState(true)
  const [searchTerm, setSearchTerm] = useState("")
  const [roleFilter, setRoleFilter] = useState("all")
  const [processingId, setProcessingId] = useState<string | null>(null)
  const [roleDialogUser, setRoleDialogUser] = useState<UserWithVendor | null>(null)
  const [newRole, setNewRole] = useState<"user" | "vendor" | "admin">("user")
  const [suspendDialogUser, setSuspendDialogUser] = useState<UserWithVendor | null>(null)
  const [suspendReason, setSuspendReason] = useState("")
  const supabase = createBrowserClient()
  const { toast } = useToast()

  useEffect(() => {
    fetchUsers()
  }, [])

  async function fetchUsers() {
    try {
      const [{ data: profiles, error: profilesError }, { data: vendors, error: vendorsError }] = await Promise.all([
        supabase
          .from("profiles")
          .select("*")
          .order("created_at", { ascending: false })
          .limit(200),
        supabase
          .from("vendors")
          .select("id, user_id, store_name, status"),
      ])

      if (profilesError) throw profilesError

      const vendorMap = new Map<string, Pick<Vendor, "id" | "store_name" | "status">>()
      for (const v of vendors || []) {
        vendorMap.set(v.user_id, { id: v.id, store_name: v.store_name, status: v.status })
      }

      const merged = (profiles || []).map((p) => ({
        ...p,
        vendors: vendorMap.get(p.id) || null,
      }))

      setUsers(merged as UserWithVendor[])
    } catch (err) {
      console.error("Error fetching users:", err)
      toast({ title: "Error", description: "Failed to load users.", variant: "destructive" })
    } finally {
      setLoading(false)
    }
  }

  async function handleRoleChange() {
    if (!roleDialogUser) return
    setProcessingId(roleDialogUser.id)
    try {
      const result = await updateUserRole(roleDialogUser.id, newRole)
      if (!result.success) throw new Error(result.error)
      toast({ title: "Role updated", description: `${roleDialogUser.full_name || roleDialogUser.email} is now ${newRole}.` })
      setRoleDialogUser(null)
      await fetchUsers()
    } catch (err) {
      toast({ title: "Error", description: err instanceof Error ? err.message : "Failed.", variant: "destructive" })
    } finally {
      setProcessingId(null)
    }
  }

  async function handleSuspend() {
    if (!suspendDialogUser) return
    setProcessingId(suspendDialogUser.id)
    try {
      const result = await suspendUser(suspendDialogUser.id, suspendReason)
      if (!result.success) throw new Error(result.error)
      toast({ title: "User suspended" })
      setSuspendDialogUser(null)
      setSuspendReason("")
      await fetchUsers()
    } catch (err) {
      toast({ title: "Error", description: err instanceof Error ? err.message : "Failed.", variant: "destructive" })
    } finally {
      setProcessingId(null)
    }
  }

  const filtered = useMemo(() => {
    return users.filter((u) => {
      if (searchTerm) {
        const term = searchTerm.toLowerCase()
        if (
          !u.full_name?.toLowerCase().includes(term) &&
          !u.email.toLowerCase().includes(term) &&
          !u.vendors?.store_name?.toLowerCase().includes(term)
        ) return false
      }
      if (roleFilter !== "all" && u.role !== roleFilter) return false
      return true
    })
  }, [users, searchTerm, roleFilter])

  function roleBadge(role: string) {
    switch (role) {
      case "admin":
        return <Badge className="bg-red-100 text-red-700">Admin</Badge>
      case "vendor":
        return <Badge className="bg-blue-100 text-blue-700">Vendor</Badge>
      default:
        return <Badge variant="secondary">Buyer</Badge>
    }
  }

  function vendorStatusBadge(status: string | undefined) {
    if (!status) return null
    switch (status) {
      case "approved":
        return <Badge className="bg-emerald-100 text-emerald-700 text-[10px]">Approved</Badge>
      case "pending":
      case "under_review":
        return <Badge className="bg-orange-100 text-orange-700 text-[10px]">Pending</Badge>
      case "suspended":
        return <Badge className="bg-yellow-100 text-yellow-700 text-[10px]">Suspended</Badge>
      case "blocked":
        return <Badge variant="destructive" className="text-[10px]">Blocked</Badge>
      default:
        return <Badge variant="outline" className="text-[10px]">{status}</Badge>
    }
  }

  if (loading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Users</CardTitle>
          <CardDescription>Loading users...</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            {Array.from({ length: 5 }).map((_, i) => (
              <div key={i} className="h-12 bg-muted animate-pulse rounded" />
            ))}
          </div>
        </CardContent>
      </Card>
    )
  }

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Shield className="h-5 w-5" />
            User Management
          </CardTitle>
          <CardDescription>Manage buyers, vendors, and administrators</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex flex-wrap gap-3 mb-4">
            <div className="relative flex-1 min-w-[200px]">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Search by name, email, or store..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-9"
              />
            </div>
            <Select value={roleFilter} onValueChange={setRoleFilter}>
              <SelectTrigger className="w-[130px]">
                <SelectValue placeholder="Role" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All roles</SelectItem>
                <SelectItem value="user">Buyers</SelectItem>
                <SelectItem value="vendor">Vendors</SelectItem>
                <SelectItem value="admin">Admins</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <p className="text-xs text-muted-foreground mb-4">
            Showing {filtered.length} of {users.length} users
          </p>

          <div className="rounded-lg border">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>User</TableHead>
                  <TableHead>Role</TableHead>
                  <TableHead>Vendor Status</TableHead>
                  <TableHead>Joined</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filtered.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={5} className="text-center py-8 text-muted-foreground">
                      No users found.
                    </TableCell>
                  </TableRow>
                ) : (
                  filtered.map((user) => (
                    <TableRow key={user.id}>
                      <TableCell>
                        <div>
                          <p className="text-sm font-medium">{user.full_name || "Unnamed"}</p>
                          <p className="text-xs text-muted-foreground">{user.email}</p>
                          {user.vendors?.store_name && (
                            <p className="text-xs text-muted-foreground">{user.vendors.store_name}</p>
                          )}
                        </div>
                      </TableCell>
                      <TableCell>{roleBadge(user.role)}</TableCell>
                      <TableCell>
                        {user.vendors ? vendorStatusBadge(user.vendors.status) : <span className="text-xs text-muted-foreground">—</span>}
                      </TableCell>
                      <TableCell className="text-xs text-muted-foreground">
                        {format(new Date(user.created_at), "MMM dd, yyyy")}
                      </TableCell>
                      <TableCell className="text-right">
                        <div className="flex items-center justify-end gap-1">
                          {processingId === user.id ? (
                            <Loader2 className="h-4 w-4 animate-spin" />
                          ) : (
                            <>
                              <Button
                                variant="ghost"
                                size="sm"
                                className="h-7 text-xs"
                                onClick={() => {
                                  setRoleDialogUser(user)
                                  setNewRole(user.role as "user" | "vendor" | "admin")
                                }}
                              >
                                <UserCheck className="h-3 w-3 mr-1" />
                                Role
                              </Button>
                              {user.role !== "admin" && user.vendors?.status === "approved" && (
                                <Button
                                  variant="ghost"
                                  size="sm"
                                  className="h-7 text-xs text-orange-600"
                                  onClick={() => setSuspendDialogUser(user)}
                                >
                                  <UserX className="h-3 w-3 mr-1" />
                                  Suspend
                                </Button>
                              )}
                            </>
                          )}
                        </div>
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>

      {/* Role Change Dialog */}
      <Dialog open={!!roleDialogUser} onOpenChange={() => setRoleDialogUser(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Change User Role</DialogTitle>
            <DialogDescription>
              Update the role for {roleDialogUser?.full_name || roleDialogUser?.email}
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <Select value={newRole} onValueChange={(v) => setNewRole(v as "user" | "vendor" | "admin")}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="user">Buyer</SelectItem>
                <SelectItem value="vendor">Vendor</SelectItem>
                <SelectItem value="admin">Admin</SelectItem>
              </SelectContent>
            </Select>
            {newRole === "admin" && (
              <div className="flex items-start gap-2 rounded-lg border border-orange-200 bg-orange-50 p-3">
                <AlertTriangle className="h-4 w-4 text-orange-600 mt-0.5 shrink-0" />
                <p className="text-xs text-orange-800">
                  Granting admin access gives this user full platform control. Ensure this is intentional.
                </p>
              </div>
            )}
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setRoleDialogUser(null)}>Cancel</Button>
            <Button onClick={handleRoleChange} disabled={processingId === roleDialogUser?.id}>
              {processingId === roleDialogUser?.id ? <Loader2 className="h-4 w-4 animate-spin mr-1" /> : null}
              Update Role
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Suspend Dialog */}
      <Dialog open={!!suspendDialogUser} onOpenChange={() => setSuspendDialogUser(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Suspend Vendor</DialogTitle>
            <DialogDescription>
              Suspend the vendor account for {suspendDialogUser?.vendors?.store_name}
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <label className="text-sm font-medium">Reason (optional)</label>
              <Input
                placeholder="Reason for suspension..."
                value={suspendReason}
                onChange={(e) => setSuspendReason(e.target.value)}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setSuspendDialogUser(null)}>Cancel</Button>
            <Button
              variant="destructive"
              onClick={handleSuspend}
              disabled={processingId === suspendDialogUser?.id}
            >
              {processingId === suspendDialogUser?.id ? <Loader2 className="h-4 w-4 animate-spin mr-1" /> : null}
              Suspend
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
