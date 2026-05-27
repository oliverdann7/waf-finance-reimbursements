"use client";

import { useSession } from "next-auth/react";
import { useRouter, useSearchParams } from "next/navigation";
import { use, useEffect, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { toast } from "sonner";
import { Save, ArrowLeft, Plus, Loader2 } from "lucide-react";
import Link from "next/link";
import { useLanguage } from "@/lib/i18n/client";
import { t } from "@/lib/i18n/client";

interface Church {
  id: string;
  name: string;
  code: string;
  city: string;
  district: string;
  address: string;
  phone: string;
  email: string;
  isActive: boolean;
  users: { id: string; name: string; email: string; role: string; title: string }[];
  _count: { users: number };
}

export default function ChurchDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const { lang } = useLanguage();
  const { data: session, status } = useSession();
  const router = useRouter();
  const searchParams = useSearchParams();

  const [church, setChurch] = useState<Church | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  const [form, setForm] = useState({
    name: "",
    code: "",
    city: "",
    district: "",
    address: "",
    phone: "",
    email: "",
    isActive: true,
  });

  const [addEmail, setAddEmail] = useState("");
  const [addRole, setAddRole] = useState("CHURCH_USER");
  const [addingUser, setAddingUser] = useState(false);

  const activeTab = searchParams.get("tab") || "details";

  const role = session?.user?.role;
  const isAdmin = role === "ADMIN" || role === "SUPER_ADMIN" || role === "TREASURER";

  useEffect(() => {
    if (status === "authenticated" && !isAdmin) router.push("/dashboard");
    if (status === "unauthenticated") router.push("/login");
  }, [status, isAdmin, router]);

  useEffect(() => {
    async function load() {
      try {
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), 15000);
        const res = await fetch(`/api/churches/${id}`, { signal: controller.signal });
        clearTimeout(timeoutId);
        const json = await res.json();
        setChurch(json);
        setForm({
          name: json.name,
          code: json.code,
          city: json.city || "",
          district: json.district || "",
          address: json.address || "",
          phone: json.phone || "",
          email: json.email || "",
          isActive: json.isActive ?? true,
        });
      } catch {
        toast.error("Failed to load church");
      } finally {
        setLoading(false);
      }
    }
    if (status === "authenticated" && isAdmin) load();
  }, [id, status, isAdmin]);

  async function handleSave() {
    if (!form.name || !form.code) {
      toast.error("Name and code are required");
      return;
    }
    setSaving(true);
    try {
      const res = await fetch(`/api/churches/${id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(form),
      });
      if (!res.ok) throw new Error();
      toast.success(t(lang, "church.admin.saved"));
      router.refresh();
    } catch {
      toast.error(t(lang, "church.admin.saveFailed"));
    } finally {
      setSaving(false);
    }
  }

  async function handleAddUser() {
    if (!addEmail || !addRole) return;
    setAddingUser(true);
    try {
      const res = await fetch(`/api/churches/${id}/users`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: addEmail, role: addRole }),
      });
      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.error || "Failed to add user");
      }
      toast.success("User added to church");
      setAddEmail("");
      setAddRole("CHURCH_USER");
      router.refresh();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to add user");
    } finally {
      setAddingUser(false);
    }
  }

  if (loading) return <div className="animate-pulse text-muted-foreground">{t(lang, "common.loading")}</div>;
  if (!church) return <div>{t(lang, "common.notFound")}</div>;

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      <div className="flex items-center gap-4">
        <Button variant="ghost" size="icon" asChild>
          <Link href="/admin/churches">
            <ArrowLeft className="h-4 w-4" />
          </Link>
        </Button>
        <div>
          <h1 className="text-3xl font-bold tracking-tight">{church.name}</h1>
          <p className="text-muted-foreground mt-1">{church.code}</p>
        </div>
      </div>

      <div className="flex gap-2 border-b pb-2">
        <Button
          variant={activeTab === "details" ? "default" : "ghost"}
          size="sm"
          onClick={() => router.push(`/admin/churches/${id}?tab=details`)}
        >
          {t(lang, "church.admin.churchDetails")}
        </Button>
        <Button
          variant={activeTab === "users" ? "default" : "ghost"}
          size="sm"
          onClick={() => router.push(`/admin/churches/${id}?tab=users`)}
        >
          {t(lang, "church.admin.manageUsers")} ({church._count?.users || church.users.length})
        </Button>
      </div>

      {activeTab === "details" && (
        <div className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>{t(lang, "church.admin.churchDetails")}</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid gap-4 md:grid-cols-2">
                <div className="space-y-2">
                  <Label htmlFor="name">{t(lang, "church.admin.name")}</Label>
                  <Input
                    id="name"
                    value={form.name}
                    onChange={(e) => setForm({ ...form, name: e.target.value })}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="code">{t(lang, "church.admin.code")}</Label>
                  <Input
                    id="code"
                    value={form.code}
                    onChange={(e) => setForm({ ...form, code: e.target.value })}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="city">{t(lang, "church.admin.city")}</Label>
                  <Input
                    id="city"
                    value={form.city}
                    onChange={(e) => setForm({ ...form, city: e.target.value })}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="district">{t(lang, "church.admin.district")}</Label>
                  <Input
                    id="district"
                    value={form.district}
                    onChange={(e) => setForm({ ...form, district: e.target.value })}
                  />
                </div>
                <div className="space-y-2 md:col-span-2">
                  <Label htmlFor="address">{t(lang, "church.admin.address")}</Label>
                  <Input
                    id="address"
                    value={form.address}
                    onChange={(e) => setForm({ ...form, address: e.target.value })}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="phone">{t(lang, "church.admin.phone")}</Label>
                  <Input
                    id="phone"
                    value={form.phone}
                    onChange={(e) => setForm({ ...form, phone: e.target.value })}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="email">{t(lang, "church.admin.email")}</Label>
                  <Input
                    id="email"
                    type="email"
                    value={form.email}
                    onChange={(e) => setForm({ ...form, email: e.target.value })}
                  />
                </div>
                <div className="flex items-center gap-2 pt-2">
                  <Switch
                    id="isActive"
                    checked={form.isActive}
                    onCheckedChange={(checked) => setForm({ ...form, isActive: checked })}
                  />
                  <Label htmlFor="isActive">{t(lang, "church.admin.isActive")}</Label>
                </div>
              </div>
              <div className="pt-4 flex justify-end">
                <Button onClick={handleSave} disabled={saving}>
                  {saving ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Save className="mr-2 h-4 w-4" />}
                  {t(lang, "common.save")}
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      {activeTab === "users" && (
        <div className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>{t(lang, "church.admin.addUser")}</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="flex gap-3 items-end">
                <div className="flex-1 space-y-2">
                  <Label htmlFor="addEmail">{t(lang, "church.admin.userEmail")}</Label>
                  <Input
                    id="addEmail"
                    placeholder="user@example.com"
                    value={addEmail}
                    onChange={(e) => setAddEmail(e.target.value)}
                  />
                </div>
                <div className="w-44 space-y-2">
                  <Label htmlFor="addRole">{t(lang, "church.admin.userRole")}</Label>
                  <Select value={addRole} onValueChange={(v) => v && setAddRole(v)}>
                    <SelectTrigger id="addRole">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="CHURCH_TREASURER">Church Treasurer</SelectItem>
                      <SelectItem value="CHURCH_PASTOR">Church Pastor</SelectItem>
                      <SelectItem value="CHURCH_USER">Church User</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <Button onClick={handleAddUser} disabled={addingUser || !addEmail}>
                  {addingUser ? <Loader2 className="h-4 w-4 animate-spin" /> : <Plus className="h-4 w-4" />}
                </Button>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>{t(lang, "church.admin.manageUsers")}</CardTitle>
            </CardHeader>
            <CardContent>
              {church.users.length === 0 ? (
                <p className="text-muted-foreground text-center py-8">No users assigned</p>
              ) : (
                <div className="space-y-2">
                  {church.users.map((user) => (
                    <div key={user.id} className="flex items-center justify-between border rounded-lg p-3">
                      <div>
                        <p className="font-medium">{user.name}</p>
                        <p className="text-sm text-muted-foreground">{user.email}</p>
                      </div>
                      <div className="flex items-center gap-2">
                        <Badge
                          className={
                            user.role === "CHURCH_TREASURER"
                              ? "bg-blue-100 text-blue-800"
                              : user.role === "CHURCH_PASTOR"
                                ? "bg-purple-100 text-purple-800"
                                : "bg-gray-100 text-gray-800"
                          }
                        >
                          {user.role.replace(/_/g, " ")}
                        </Badge>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      )}
    </div>
  );
}
