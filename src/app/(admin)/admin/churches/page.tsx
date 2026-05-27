"use client";

import { useSession } from "next-auth/react";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { toast } from "sonner";
import { Plus, Search, Edit, Users, ArrowLeft } from "lucide-react";
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
  _count?: { users: number };
  users?: { id: string }[];
}

export default function AdminChurchesPage() {
  const { lang } = useLanguage();
  const { data: session, status } = useSession();
  const router = useRouter();
  const [churches, setChurches] = useState<Church[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");

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
        const res = await fetch("/api/churches", { signal: controller.signal });
        clearTimeout(timeoutId);
        const json = await res.json();
        setChurches(json);
      } catch {
        toast.error("Failed to load churches");
      } finally {
        setLoading(false);
      }
    }
    if (status === "authenticated" && isAdmin) load();
  }, [status, isAdmin]);

  const filtered = churches.filter(
    (c) =>
      c.name.toLowerCase().includes(search.toLowerCase()) ||
      c.code.toLowerCase().includes(search.toLowerCase()) ||
      c.city.toLowerCase().includes(search.toLowerCase())
  );

  if (loading) return <div className="animate-pulse text-muted-foreground">{t(lang, "common.loading")}</div>;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <Button variant="ghost" size="icon" asChild>
            <Link href="/admin">
              <ArrowLeft className="h-4 w-4" />
            </Link>
          </Button>
          <div>
            <h1 className="text-3xl font-bold tracking-tight">{t(lang, "church.admin.churches")}</h1>
            <p className="text-muted-foreground mt-1">{t(lang, "church.admin.title")}</p>
          </div>
        </div>
        <Button asChild>
          <Link href="/admin/churches/new">
            <Plus className="mr-2 h-4 w-4" />
            {t(lang, "church.admin.addChurch")}
          </Link>
        </Button>
      </div>

      <div className="relative max-w-sm">
        <Search className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
        <Input
          placeholder={t(lang, "common.search")}
          className="pl-9"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
        />
      </div>

      {filtered.length === 0 ? (
        <Card>
          <CardContent className="py-12 text-center text-muted-foreground">
            {t(lang, "church.admin.noChurches")}
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {filtered.map((church) => (
            <Link key={church.id} href={`/admin/churches/${church.id}`}>
              <Card className="hover:shadow-md transition-shadow cursor-pointer h-full">
                <CardHeader className="pb-3">
                  <div className="flex items-start justify-between">
                    <CardTitle className="text-lg">{church.name}</CardTitle>
                    <Badge className={church.isActive ? "bg-green-100 text-green-800" : "bg-gray-100 text-gray-800"}>
                      {church.isActive ? "Active" : "Inactive"}
                    </Badge>
                  </div>
                </CardHeader>
                <CardContent>
                  <div className="space-y-1 text-sm text-muted-foreground">
                    <p>
                      {t(lang, "church.admin.code")}: <span className="font-mono font-medium">{church.code}</span>
                    </p>
                    <p>
                      {t(lang, "church.admin.city")}: {church.city || "—"}
                    </p>
                    <p>
                      {t(lang, "church.admin.district")}: {church.district || "—"}
                    </p>
                    <p className="flex items-center gap-1 mt-2">
                      <Users className="h-3.5 w-3.5" />
                      {church._count?.users ?? church.users?.length ?? 0} users
                    </p>
                  </div>
                  <div className="flex gap-2 mt-4 pt-3 border-t">
                    <Button size="sm" variant="outline" className="flex-1" asChild>
                      <Link href={`/admin/churches/${church.id}`} onClick={(e) => e.stopPropagation()}>
                        <Edit className="mr-1 h-3.5 w-3.5" />
                        {t(lang, "common.edit")}
                      </Link>
                    </Button>
                    <Button size="sm" variant="outline" className="flex-1" asChild>
                      <Link href={`/admin/churches/${church.id}?tab=users`} onClick={(e) => e.stopPropagation()}>
                        <Users className="mr-1 h-3.5 w-3.5" />
                        {t(lang, "church.admin.manageUsers")}
                      </Link>
                    </Button>
                  </div>
                </CardContent>
              </Card>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}
