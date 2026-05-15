"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useSession } from "next-auth/react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { MONTHS } from "@/types";
import { toast } from "sonner";
import { Loader2, ArrowLeft } from "lucide-react";
import Link from "next/link";

export default function NewReportPage() {
  const { status } = useSession();
  const router = useRouter();
  const [loading, setLoading] = useState(false);

  if (status === "unauthenticated") {
    router.push("/login");
    return null;
  }

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setLoading(true);

    const form = new FormData(e.currentTarget);
    const data = {
      month: parseInt(form.get("month") as string),
      year: parseInt(form.get("year") as string),
    };

    try {
      const res = await fetch("/api/reports", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
      });

      if (!res.ok) {
        const err = await res.json();
        toast.error(err.error || "Failed to create report");
        return;
      }

      const report = await res.json();
      toast.success("Report created!");
      router.push(`/reports/${report.id}`);
    } catch {
      toast.error("Failed to create report");
    } finally {
      setLoading(false);
    }
  }

  const currentYear = new Date().getFullYear();
  const currentMonth = new Date().getMonth() + 1;

  return (
    <div className="max-w-2xl mx-auto space-y-6">
      <div className="flex items-center gap-4">
        <Button variant="ghost" size="icon" asChild>
          <Link href="/reports">
            <ArrowLeft className="h-4 w-4" />
          </Link>
        </Button>
        <div>
          <h1 className="text-3xl font-bold tracking-tight">New Report</h1>
          <p className="text-muted-foreground mt-1">Create a new monthly expense report</p>
        </div>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Report Details</CardTitle>
          <CardDescription>Select the month and year for this report</CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-6">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="month">Month</Label>
                <Select name="month" defaultValue={String(currentMonth)} required>
                  <SelectTrigger>
                    <SelectValue placeholder="Select month" />
                  </SelectTrigger>
                  <SelectContent>
                    {MONTHS.map((name, i) => (
                      <SelectItem key={i + 1} value={String(i + 1)}>
                        {name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label htmlFor="year">Year</Label>
                <Input
                  id="year"
                  name="year"
                  type="number"
                  defaultValue={currentYear}
                  min={2020}
                  max={2030}
                  required
                />
              </div>
            </div>

            <div className="flex gap-3">
              <Button type="submit" disabled={loading}>
                {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                Create Report
              </Button>
              <Button type="button" variant="outline" asChild><Link href="/reports">Cancel</Link></Button>
            </div>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
