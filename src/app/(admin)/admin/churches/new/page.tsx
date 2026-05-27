"use client";

import { useSession } from "next-auth/react";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { toast } from "sonner";
import { Save, ArrowLeft, Loader2 } from "lucide-react";
import Link from "next/link";
import { useLanguage } from "@/lib/i18n/client";
import { t } from "@/lib/i18n/client";

export default function NewChurchPage() {
  const { lang } = useLanguage();
  const { data: session, status } = useSession();
  const router = useRouter();
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

  const role = session?.user?.role;
  const isAdmin = role === "ADMIN" || role === "SUPER_ADMIN" || role === "TREASURER";

  useEffect(() => {
    if (status === "authenticated" && !isAdmin) router.push("/dashboard");
    if (status === "unauthenticated") router.push("/login");
  }, [status, isAdmin, router]);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!form.name || !form.code) {
      toast.error("Name and code are required");
      return;
    }
    setSaving(true);
    try {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 15000);
      const res = await fetch("/api/churches", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(form),
        signal: controller.signal,
      });
      clearTimeout(timeoutId);
      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.error || "Failed to create church");
      }
      const church = await res.json();
      toast.success(t(lang, "church.admin.created"));
      router.push(`/admin/churches/${church.id}`);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : t(lang, "church.admin.saveFailed"));
    } finally {
      setSaving(false);
    }
  }

  if (status === "loading") {
    return <div className="animate-pulse text-muted-foreground">{t(lang, "common.loading")}</div>;
  }

  return (
    <div className="max-w-2xl mx-auto space-y-6">
      <div className="flex items-center gap-4">
        <Button variant="ghost" size="icon" asChild>
          <Link href="/admin/churches">
            <ArrowLeft className="h-4 w-4" />
          </Link>
        </Button>
        <div>
          <h1 className="text-3xl font-bold tracking-tight">{t(lang, "church.admin.addChurch")}</h1>
          <p className="text-muted-foreground mt-1">{t(lang, "church.admin.title")}</p>
        </div>
      </div>

      <form onSubmit={handleSubmit}>
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
                  required
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="code">{t(lang, "church.admin.code")}</Label>
                <Input
                  id="code"
                  value={form.code}
                  onChange={(e) => setForm({ ...form, code: e.target.value })}
                  required
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
            <div className="flex gap-3 pt-4">
              <Button type="submit" disabled={saving}>
                {saving ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Save className="mr-2 h-4 w-4" />}
                {t(lang, "common.save")}
              </Button>
              <Button type="button" variant="outline" asChild>
                <Link href="/admin/churches">{t(lang, "common.cancel")}</Link>
              </Button>
            </div>
          </CardContent>
        </Card>
      </form>
    </div>
  );
}
