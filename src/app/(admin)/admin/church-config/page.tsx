"use client";

import { useSession } from "next-auth/react";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { toast } from "sonner";
import { Save, Loader2, ArrowLeft } from "lucide-react";
import Link from "next/link";
import { useLanguage } from "@/lib/i18n/client";
import { t } from "@/lib/i18n/client";
import { DISTRIBUTION_KEYS } from "@/types";

interface Config {
  id: string;
  key: string;
  name: string;
  description: string;
  percentage: number;
  active: boolean;
}

export default function ChurchConfigPage() {
  const { lang } = useLanguage();
  const { data: session, status } = useSession();
  const router = useRouter();
  const [configs, setConfigs] = useState<Config[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  const role = session?.user?.role;
  const isAdmin = role === "ADMIN" || role === "SUPER_ADMIN" || role === "TREASURER";

  useEffect(() => {
    if (status === "authenticated" && !isAdmin) router.push("/dashboard");
    if (status === "unauthenticated") router.push("/login");
  }, [status, isAdmin, router]);

  useEffect(() => {
    async function load() {
      try {
        const res = await fetch("/api/church-config");
        const json = await res.json();
        setConfigs(json);
      } catch {
        toast.error("Failed to load church config");
      } finally {
        setLoading(false);
      }
    }
    if (status === "authenticated" && isAdmin) load();
  }, [status, isAdmin]);

  const totalPercentage = configs.reduce((sum, c) => sum + c.percentage, 0);
  const isValid = Math.abs(totalPercentage - 100) < 0.01;

  async function handleSave() {
    if (!isValid) {
      toast.error(t(lang, "church.totalMustBe100"));
      return;
    }
    setSaving(true);
    try {
      const res = await fetch("/api/church-config", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ configs }),
      });
      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.error || "Failed to save");
      }
      toast.success(t(lang, "church.configSaved"));
    } catch (err) {
      toast.error(err instanceof Error ? err.message : t(lang, "church.configFailed"));
    } finally {
      setSaving(false);
    }
  }

  function updateConfig(id: string, field: "percentage" | "active", value: number | boolean) {
    setConfigs((prev) =>
      prev.map((c) => (c.id === id ? { ...c, [field]: value } : c))
    );
  }

  if (loading) return <div className="animate-pulse text-muted-foreground">{t(lang, "common.loading")}</div>;

  return (
    <div className="max-w-3xl mx-auto space-y-6">
      <div className="flex items-center gap-4">
        <Button variant="ghost" size="icon" asChild>
          <Link href="/admin">
            <ArrowLeft className="h-4 w-4" />
          </Link>
        </Button>
        <div>
          <h1 className="text-3xl font-bold tracking-tight">{t(lang, "church.config")}</h1>
          <p className="text-muted-foreground mt-1">{t(lang, "church.configDescription")}</p>
        </div>
        <div className="flex-1" />
        <Button onClick={handleSave} disabled={saving || !isValid}>
          {saving ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Save className="mr-2 h-4 w-4" />}
          {t(lang, "common.save")}
        </Button>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>{t(lang, "church.config")}</CardTitle>
          <CardDescription>{t(lang, "church.configurePercentages")}</CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="space-y-4">
            {configs.map((config) => {
              const distKey = DISTRIBUTION_KEYS.find((dk) => dk.key === config.key);
              return (
                <div key={config.id} className="flex items-center gap-4 border-b pb-4 last:border-0 last:pb-0">
                  <div className="flex-1">
                    <Label className="font-medium">{distKey?.labelKey ? t(lang, distKey.labelKey) : config.name}</Label>
                    {config.description && (
                      <p className="text-xs text-muted-foreground mt-0.5">{config.description}</p>
                    )}
                  </div>
                  <div className="w-28">
                    <div className="relative">
                      <Input
                        type="number"
                        step="0.1"
                        min="0"
                        max="100"
                        value={config.percentage}
                        onChange={(e) =>
                          updateConfig(config.id, "percentage", parseFloat(e.target.value) || 0)
                        }
                      />
                      <span className="absolute right-3 top-2.5 text-sm text-muted-foreground">%</span>
                    </div>
                  </div>
                  <Switch
                    checked={config.active}
                    onCheckedChange={(checked) => updateConfig(config.id, "active", checked)}
                  />
                </div>
              );
            })}
          </div>

          <div className="flex items-center justify-between pt-4 border-t">
            <span className="font-medium">{t(lang, "church.totalPercentage")}</span>
            <span className={`text-lg font-bold ${isValid ? "text-green-600" : "text-red-600"}`}>
              {totalPercentage.toFixed(1)}%
            </span>
          </div>
          {!isValid && (
            <p className="text-sm text-red-600">{t(lang, "church.totalMustBe100")}</p>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
