"use client";

import { useSession } from "next-auth/react";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { toast } from "sonner";
import { Loader2, Save } from "lucide-react";

interface Profile {
  id: string;
  name: string;
  email: string;
  city: string;
  department: string;
  title: string;
  defaultCurrency: string;
  monthlyLimit: number;
  receiptLimit: number;
}

export default function ProfilePage() {
  const { data: session, status } = useSession();
  const router = useRouter();
  const [profile, setProfile] = useState<Profile | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (status === "unauthenticated") router.push("/login");
  }, [status, router]);

  useEffect(() => {
    async function load() {
      const res = await fetch("/api/profile");
      const json = await res.json();
      setProfile(json);
      setLoading(false);
    }
    if (status === "authenticated") load();
  }, [status]);

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setSaving(true);

    const form = new FormData(e.currentTarget);
    const data = {
      name: form.get("name") as string,
      city: form.get("city") as string,
      department: form.get("department") as string,
      title: form.get("title") as string,
      defaultCurrency: form.get("defaultCurrency") as string,
    };

    try {
      const res = await fetch("/api/profile", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
      });

      if (!res.ok) throw new Error();
      toast.success("Profile updated!");
    } catch {
      toast.error("Failed to update profile");
    } finally {
      setSaving(false);
    }
  }

  if (loading) return <div className="animate-pulse text-muted-foreground">Loading profile...</div>;
  if (!profile) return <div>Profile not found</div>;

  return (
    <div className="max-w-2xl mx-auto space-y-6">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Profile Settings</h1>
        <p className="text-muted-foreground mt-1">Manage your personal information and preferences</p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Personal Information</CardTitle>
          <CardDescription>Update your profile details</CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-6">
            <div className="space-y-2">
              <Label htmlFor="name">Full Name</Label>
              <Input id="name" name="name" defaultValue={profile.name} required />
            </div>

            <div className="space-y-2">
              <Label htmlFor="email">Email</Label>
              <Input id="email" value={profile.email} disabled className="bg-gray-50" />
              <p className="text-xs text-muted-foreground">Email cannot be changed</p>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="city">City</Label>
                <Input id="city" name="city" defaultValue={profile.city} />
              </div>
              <div className="space-y-2">
                <Label htmlFor="department">Department</Label>
                <Input id="department" name="department" defaultValue={profile.department} />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="title">Role / Title</Label>
                <Input id="title" name="title" defaultValue={profile.title} />
              </div>
              <div className="space-y-2">
                <Label htmlFor="defaultCurrency">Default Currency</Label>
                <Select name="defaultCurrency" defaultValue={profile.defaultCurrency}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="TRY">TRY</SelectItem>
                    <SelectItem value="USD">USD</SelectItem>
                    <SelectItem value="EUR">EUR</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="border-t pt-6">
              <h3 className="text-sm font-medium mb-4">Reimbursement Limits</h3>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Monthly Limit</Label>
                  <Input value={`${profile.monthlyLimit} TRY`} disabled className="bg-gray-50" />
                </div>
                <div className="space-y-2">
                  <Label>Receipt Limit</Label>
                  <Input value={`${profile.receiptLimit} TRY`} disabled className="bg-gray-50" />
                </div>
              </div>
              <p className="text-xs text-muted-foreground mt-2">
                Limits are configured by administrators
              </p>
            </div>

            <Button type="submit" disabled={saving}>
              {saving && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              <Save className="mr-2 h-4 w-4" />
              Save Changes
            </Button>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
