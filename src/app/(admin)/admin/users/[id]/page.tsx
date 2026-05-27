"use client";

import { useSession } from "next-auth/react";
import { useRouter } from "next/navigation";
import { use, useEffect, useState, useCallback, startTransition } from "react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { toast } from "sonner";
import { ArrowLeft, Loader2, Save, FileText, Receipt, DollarSign } from "lucide-react";
import Link from "next/link";

interface Church {
  id: string;
  name: string;
  code: string;
}

interface UserDetail {
  id: string;
  name: string;
  email: string;
  role: string;
  city: string;
  department: string;
  title: string;
  defaultCurrency: string;
  monthlyLimit: number;
  receiptLimit: number;
  createdAt: string;
  churchId: string | null;
  church: Church | null;
  _count: { reports: number; expenses: number; receipts: number };
}

const ROLES = [
  { value: "WORKER", label: "Worker" },
  { value: "TREASURER", label: "Treasurer" },
  { value: "ADMIN", label: "Admin" },
  { value: "SUPER_ADMIN", label: "Super Admin" },
  { value: "CHURCH_TREASURER", label: "Church Treasurer" },
  { value: "CHURCH_PASTOR", label: "Church Pastor" },
  { value: "CHURCH_USER", label: "Church User" },
];

const ROLE_COLORS: Record<string, string> = {
  SUPER_ADMIN: "bg-purple-100 text-purple-800",
  ADMIN: "bg-indigo-100 text-indigo-800",
  TREASURER: "bg-blue-100 text-blue-800",
  WORKER: "bg-gray-100 text-gray-800",
  CHURCH_TREASURER: "bg-emerald-100 text-emerald-800",
  CHURCH_PASTOR: "bg-teal-100 text-teal-800",
  CHURCH_USER: "bg-cyan-100 text-cyan-800",
};

export default function AdminUserDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const { data: session, status } = useSession();
  const router = useRouter();
  const [user, setUser] = useState<UserDetail | null>(null);
  const [churches, setChurches] = useState<Church[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  const [formRole, setFormRole] = useState("");
  const [formChurchId, setFormChurchId] = useState("");
  const [formCity, setFormCity] = useState("");
  const [formDepartment, setFormDepartment] = useState("");
  const [formTitle, setFormTitle] = useState("");
  const [formMonthlyLimit, setFormMonthlyLimit] = useState("");
  const [formReceiptLimit, setFormReceiptLimit] = useState("");

  const currentRole = session?.user?.role;
  const isAdmin = currentRole === "ADMIN" || currentRole === "SUPER_ADMIN";

  useEffect(() => {
    if (status === "unauthenticated") router.push("/login");
    if (status === "authenticated" && !isAdmin) router.push("/dashboard");
  }, [status, isAdmin, router]);

  const loadUser = useCallback(async () => {
    try {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 15000);
      const res = await fetch(`/api/admin/users/${id}`, { signal: controller.signal });
      clearTimeout(timeoutId);

      if (!res.ok) throw new Error();
      const json: UserDetail = await res.json();
      setUser(json);
      setFormRole(json.role);
      setFormChurchId(json.churchId || "NONE");
      setFormCity(json.city);
      setFormDepartment(json.department);
      setFormTitle(json.title);
      setFormMonthlyLimit(String(json.monthlyLimit));
      setFormReceiptLimit(String(json.receiptLimit));
    } catch {
      toast.error("Failed to load user");
    } finally {
      setLoading(false);
    }
  }, [id]);

  const loadChurches = useCallback(async () => {
    try {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 15000);
      const res = await fetch("/api/churches", { signal: controller.signal });
      clearTimeout(timeoutId);
      if (res.ok) {
        const json = await res.json();
        setChurches(Array.isArray(json) ? json : json.churches || []);
      }
    } catch {
      // churches load is non-critical
    }
  }, []);

  useEffect(() => {
    if (status === "authenticated" && isAdmin) {
      startTransition(() => { loadUser(); loadChurches(); });
    }
  }, [status, isAdmin, loadUser, loadChurches]);

  async function handleSave() {
    setSaving(true);
    try {
      const res = await fetch(`/api/admin/users/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          role: formRole,
          churchId: formChurchId === "NONE" ? null : formChurchId,
          city: formCity,
          department: formDepartment,
          title: formTitle,
          monthlyLimit: parseFloat(formMonthlyLimit) || 5000,
          receiptLimit: parseFloat(formReceiptLimit) || 500,
        }),
      });

      if (!res.ok) {
        const json = await res.json();
        toast.error(json.error || "Failed to update user");
        return;
      }

      toast.success("User updated!");
      await loadUser();
    } catch {
      toast.error("Failed to update user");
    } finally {
      setSaving(false);
    }
  }

  if (loading) {
    return <div className="animate-pulse text-muted-foreground">Loading user...</div>;
  }
  if (!user) return <div>User not found</div>;

  const isChurchRole = formRole.startsWith("CHURCH_");

  return (
    <div className="max-w-3xl mx-auto space-y-6">
      <div className="flex items-center gap-4">
        <Button variant="ghost" size="icon" asChild>
          <Link href="/admin/users">
            <ArrowLeft className="h-4 w-4" />
          </Link>
        </Button>
        <div>
          <div className="flex items-center gap-3">
            <h1 className="text-3xl font-bold tracking-tight">{user.name}</h1>
            <Badge className={ROLE_COLORS[user.role] || "bg-gray-100 text-gray-800"}>
              {ROLES.find((r) => r.value === user.role)?.label || user.role}
            </Badge>
          </div>
          <p className="text-muted-foreground mt-1">{user.email}</p>
        </div>
      </div>

      <div className="grid gap-4 grid-cols-3">
        <Card>
          <CardContent className="p-4 flex items-center gap-3">
            <FileText className="h-5 w-5 text-blue-500" />
            <div>
              <p className="text-2xl font-bold">{user._count.reports}</p>
              <p className="text-xs text-muted-foreground">Reports</p>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4 flex items-center gap-3">
            <DollarSign className="h-5 w-5 text-green-500" />
            <div>
              <p className="text-2xl font-bold">{user._count.expenses}</p>
              <p className="text-xs text-muted-foreground">Expenses</p>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4 flex items-center gap-3">
            <Receipt className="h-5 w-5 text-amber-500" />
            <div>
              <p className="text-2xl font-bold">{user._count.receipts}</p>
              <p className="text-xs text-muted-foreground">Receipts</p>
            </div>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Role & Assignment</CardTitle>
          <CardDescription>Manage this user&apos;s role and church assignment</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>Role</Label>
              <Select value={formRole} onValueChange={(v) => v && setFormRole(v)}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {ROLES.map((r) => (
                    <SelectItem key={r.value} value={r.value}>{r.label}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>Church Assignment</Label>
              <Select value={formChurchId} onValueChange={(v) => v && setFormChurchId(v)}>
                <SelectTrigger>
                  <SelectValue placeholder="No church" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="NONE">No church</SelectItem>
                  {churches.map((c) => (
                    <SelectItem key={c.id} value={c.id}>{c.name} ({c.code})</SelectItem>
                  ))}
                </SelectContent>
              </Select>
              {isChurchRole && formChurchId === "NONE" && (
                <p className="text-xs text-amber-600">Church roles should be assigned to a church</p>
              )}
            </div>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Profile Details</CardTitle>
          <CardDescription>Edit this user&apos;s profile information</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>City</Label>
              <Input value={formCity} onChange={(e) => setFormCity(e.target.value)} />
            </div>
            <div className="space-y-2">
              <Label>Department</Label>
              <Input value={formDepartment} onChange={(e) => setFormDepartment(e.target.value)} />
            </div>
          </div>
          <div className="space-y-2">
            <Label>Title</Label>
            <Input value={formTitle} onChange={(e) => setFormTitle(e.target.value)} />
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Reimbursement Limits</CardTitle>
          <CardDescription>Set spending limits for this user</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>Monthly Limit (TRY)</Label>
              <Input
                type="number"
                step="100"
                value={formMonthlyLimit}
                onChange={(e) => setFormMonthlyLimit(e.target.value)}
              />
            </div>
            <div className="space-y-2">
              <Label>Per-Receipt Limit (TRY)</Label>
              <Input
                type="number"
                step="50"
                value={formReceiptLimit}
                onChange={(e) => setFormReceiptLimit(e.target.value)}
              />
            </div>
          </div>
        </CardContent>
      </Card>

      <div className="flex gap-3">
        <Button onClick={handleSave} disabled={saving}>
          {saving && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
          <Save className="mr-2 h-4 w-4" />
          Save Changes
        </Button>
        <Button variant="outline" asChild>
          <Link href="/admin/users">Cancel</Link>
        </Button>
      </div>

      <Card>
        <CardContent className="py-3 text-xs text-muted-foreground">
          User created: {new Date(user.createdAt).toLocaleDateString()} &middot; ID: {user.id}
        </CardContent>
      </Card>
    </div>
  );
}
