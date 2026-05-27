"use client";

import { useSession } from "next-auth/react";
import { useRouter } from "next/navigation";
import { useEffect, useState, useCallback, startTransition } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { toast } from "sonner";
import { Users, Search, ChevronRight } from "lucide-react";
import Link from "next/link";

interface UserItem {
  id: string;
  name: string;
  email: string;
  role: string;
  city: string;
  department: string;
  createdAt: string;
  church: { id: string; name: string; code: string } | null;
}

const ROLE_COLORS: Record<string, string> = {
  SUPER_ADMIN: "bg-purple-100 text-purple-800",
  ADMIN: "bg-indigo-100 text-indigo-800",
  TREASURER: "bg-blue-100 text-blue-800",
  WORKER: "bg-gray-100 text-gray-800",
  CHURCH_TREASURER: "bg-emerald-100 text-emerald-800",
  CHURCH_PASTOR: "bg-teal-100 text-teal-800",
  CHURCH_USER: "bg-cyan-100 text-cyan-800",
};

const ROLE_LABELS: Record<string, string> = {
  SUPER_ADMIN: "Super Admin",
  ADMIN: "Admin",
  TREASURER: "Treasurer",
  WORKER: "Worker",
  CHURCH_TREASURER: "Church Treasurer",
  CHURCH_PASTOR: "Church Pastor",
  CHURCH_USER: "Church User",
};

export default function AdminUsersPage() {
  const { data: session, status } = useSession();
  const router = useRouter();
  const [users, setUsers] = useState<UserItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [roleFilter, setRoleFilter] = useState("ALL");

  useEffect(() => {
    if (status === "unauthenticated") router.push("/login");
  }, [status, router]);

  const role = session?.user?.role;
  const isAdmin = role === "ADMIN" || role === "SUPER_ADMIN";

  useEffect(() => {
    if (status === "authenticated" && !isAdmin) router.push("/dashboard");
  }, [status, isAdmin, router]);

  const loadUsers = useCallback(async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      if (roleFilter !== "ALL") params.set("role", roleFilter);
      if (search.trim()) params.set("search", search.trim());

      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 15000);
      const res = await fetch(`/api/admin/users?${params}`, { signal: controller.signal });
      clearTimeout(timeoutId);

      if (!res.ok) throw new Error();
      const json = await res.json();
      setUsers(json);
    } catch {
      toast.error("Failed to load users");
    } finally {
      setLoading(false);
    }
  }, [roleFilter, search]);

  useEffect(() => {
    if (status === "authenticated" && isAdmin) startTransition(() => { loadUsers(); });
  }, [status, isAdmin, loadUsers]);

  if (status === "loading") {
    return <div className="animate-pulse text-muted-foreground">Loading...</div>;
  }

  const roleCounts = users.reduce<Record<string, number>>((acc, u) => {
    acc[u.role] = (acc[u.role] || 0) + 1;
    return acc;
  }, {});

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">User Management</h1>
          <p className="text-muted-foreground mt-1">
            {users.length} user{users.length !== 1 ? "s" : ""} total
          </p>
        </div>
      </div>

      <div className="grid gap-3 grid-cols-2 sm:grid-cols-4">
        {[
          { label: "Workers", count: roleCounts["WORKER"] || 0, color: "text-gray-600" },
          { label: "Treasurers", count: roleCounts["TREASURER"] || 0, color: "text-blue-600" },
          { label: "Admins", count: (roleCounts["ADMIN"] || 0) + (roleCounts["SUPER_ADMIN"] || 0), color: "text-purple-600" },
          { label: "Church Roles", count: (roleCounts["CHURCH_TREASURER"] || 0) + (roleCounts["CHURCH_PASTOR"] || 0) + (roleCounts["CHURCH_USER"] || 0), color: "text-emerald-600" },
        ].map((stat) => (
          <Card key={stat.label}>
            <CardContent className="p-4">
              <p className="text-sm text-muted-foreground">{stat.label}</p>
              <p className={`text-2xl font-bold ${stat.color}`}>{stat.count}</p>
            </CardContent>
          </Card>
        ))}
      </div>

      <div className="flex gap-3">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Search by name or email..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-9"
          />
        </div>
        <Select value={roleFilter} onValueChange={(v) => v && setRoleFilter(v)}>
          <SelectTrigger className="w-48">
            <SelectValue placeholder="Filter by role" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="ALL">All Roles</SelectItem>
            {Object.entries(ROLE_LABELS).map(([value, label]) => (
              <SelectItem key={value} value={value}>{label}</SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Users className="h-5 w-5" />
            Users
          </CardTitle>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="animate-pulse text-muted-foreground py-8 text-center">Loading users...</div>
          ) : users.length === 0 ? (
            <p className="text-muted-foreground text-center py-8">No users found</p>
          ) : (
            <div className="divide-y">
              {users.map((user) => (
                <Link key={user.id} href={`/admin/users/${user.id}`}>
                  <div className="flex items-center justify-between py-3 px-2 -mx-2 rounded-lg hover:bg-muted transition-colors">
                    <div className="flex items-center gap-4 min-w-0">
                      <div className="h-10 w-10 rounded-full bg-primary/10 flex items-center justify-center flex-shrink-0">
                        <span className="text-sm font-semibold text-primary">
                          {user.name.charAt(0).toUpperCase()}
                        </span>
                      </div>
                      <div className="min-w-0">
                        <p className="font-medium truncate">{user.name}</p>
                        <p className="text-sm text-muted-foreground truncate">{user.email}</p>
                      </div>
                    </div>
                    <div className="flex items-center gap-3 flex-shrink-0">
                      {user.church && (
                        <span className="text-xs text-muted-foreground hidden sm:inline">
                          {user.church.name}
                        </span>
                      )}
                      <Badge className={ROLE_COLORS[user.role] || "bg-gray-100 text-gray-800"}>
                        {ROLE_LABELS[user.role] || user.role}
                      </Badge>
                      <ChevronRight className="h-4 w-4 text-muted-foreground" />
                    </div>
                  </div>
                </Link>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
