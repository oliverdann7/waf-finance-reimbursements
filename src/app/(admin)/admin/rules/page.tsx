"use client";

import { useSession } from "next-auth/react";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";
import { Loader2, Save, ArrowLeft } from "lucide-react";
import Link from "next/link";

interface Rule {
  id: string;
  key: string;
  name: string;
  description: string;
  type: string;
  value: number;
  unit: string;
  active: boolean;
}

export default function AdminRulesPage() {
  const { data: session, status } = useSession();
  const router = useRouter();
  const [rules, setRules] = useState<Rule[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  const role = session?.user?.role;
  const isAdmin = role === "ADMIN" || role === "SUPER_ADMIN";

  useEffect(() => {
    if (status === "authenticated" && !isAdmin) router.push("/dashboard");
    if (status === "unauthenticated") router.push("/login");
  }, [status, isAdmin, router]);

  useEffect(() => {
    async function load() {
      try {
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), 15000);
        const res = await fetch("/api/rules", { signal: controller.signal });
        clearTimeout(timeoutId);
        const json = await res.json();
        setRules(json);
      } catch {
        toast.error("Failed to load rules");
      } finally {
        setLoading(false);
      }
    }
    if (status === "authenticated" && isAdmin) load();
  }, [status, isAdmin]);

  async function handleSave(rule: Rule) {
    setSaving(true);
    try {
      const res = await fetch(`/api/rules`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(rule),
      });
      if (!res.ok) throw new Error();
      toast.success(`${rule.name} updated`);
    } catch {
      toast.error(`Failed to update ${rule.name}`);
    } finally {
      setSaving(false);
    }
  }

  if (loading) return <div className="animate-pulse text-muted-foreground">Loading rules...</div>;

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      <div className="flex items-center gap-4">
        <Button variant="ghost" size="icon" asChild>
          <Link href="/admin">
            <ArrowLeft className="h-4 w-4" />
          </Link>
        </Button>
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Reimbursement Rules</h1>
          <p className="text-muted-foreground mt-1">Configure expense reimbursement rules and limits</p>
        </div>
      </div>

      <div className="space-y-4">
        {rules.map((rule) => (
          <Card key={rule.id}>
            <CardHeader className="pb-3">
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle className="text-lg">{rule.name}</CardTitle>
                  <CardDescription>{rule.description}</CardDescription>
                </div>
                <Switch
                  checked={rule.active}
                  onCheckedChange={(checked) => {
                    const updated = rules.map((r) =>
                      r.id === rule.id ? { ...r, active: checked } : r
                    );
                    setRules(updated);
                    handleSave({ ...rule, active: checked });
                  }}
                />
              </div>
            </CardHeader>
            <CardContent>
              <div className="flex items-center gap-4">
                <div className="flex-1">
                  <Label>Value</Label>
                  <Input
                    type="number"
                    step="0.01"
                    value={rule.value}
                    onChange={(e) => {
                      const updated = rules.map((r) =>
                        r.id === rule.id ? { ...r, value: parseFloat(e.target.value) || 0 } : r
                      );
                      setRules(updated);
                    }}
                  />
                </div>
                <div className="w-24">
                  <Label>Unit</Label>
                  <Input value={rule.unit} disabled className="bg-gray-50" />
                </div>
                <Button
                  className="mt-6"
                  size="sm"
                  onClick={() => handleSave(rule)}
                  disabled={saving}
                >
                  {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
                </Button>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
}
