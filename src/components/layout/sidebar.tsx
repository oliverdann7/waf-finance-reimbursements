"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useSession } from "next-auth/react";
import { cn } from "@/lib/utils";
import {
  LayoutDashboard,
  FileText,
  PlusCircle,
  Receipt,
  Settings,
  Shield,
  Church,
  Building2,
  BarChart3,
  Sliders,
} from "lucide-react";

const workerLinks = [
  { href: "/dashboard", label: "Dashboard", icon: LayoutDashboard },
  { href: "/reports", label: "Reports", icon: FileText },
  { href: "/reports/new", label: "New Report", icon: PlusCircle },
  { href: "/expenses/new", label: "New Expense", icon: PlusCircle },
  { href: "/receipts", label: "Receipts", icon: Receipt },
  { href: "/settings/profile", label: "Settings", icon: Settings },
];

const churchLinks = [
  { href: "/church/dashboard", label: "Church Dashboard", icon: Church },
  { href: "/church/reports", label: "My Church Reports", icon: FileText },
  { href: "/church/reports/new", label: "New Report", icon: PlusCircle },
];

const adminLinks = [
  { href: "/admin", label: "Admin Dashboard", icon: Shield },
  { href: "/admin/reports", label: "All Reports", icon: FileText },
  { href: "/admin/rules", label: "Reimbursement Rules", icon: Settings },
  { href: "/admin/churches", label: "Churches", icon: Building2 },
  { href: "/admin/church-reports", label: "Church Reports", icon: BarChart3 },
  { href: "/admin/church-config", label: "Distribution Config", icon: Sliders },
];

export function Sidebar() {
  const pathname = usePathname();
  const { data: session } = useSession();
  const role = session?.user?.role;
  const isAdmin = role === "ADMIN" || role === "SUPER_ADMIN" || role === "TREASURER";
  const isChurchRole = role === "CHURCH_TREASURER" || role === "CHURCH_PASTOR" || role === "CHURCH_USER";

  let links = workerLinks;
  if (isChurchRole) links = churchLinks;
  if (isAdmin) links = [...workerLinks, ...adminLinks];

  return (
    <aside className="hidden lg:flex w-64 flex-col border-r bg-white min-h-screen">
      <div className="flex h-16 items-center border-b px-6">
        <Link href="/dashboard" className="flex items-center gap-2">
          <div className="h-8 w-8 rounded-lg bg-primary flex items-center justify-center">
            <span className="text-white font-bold text-sm">W</span>
          </div>
          <div>
            <p className="text-sm font-semibold">WAF Finance</p>
            <p className="text-xs text-muted-foreground">Reimbursements</p>
          </div>
        </Link>
      </div>
      <nav className="flex-1 px-3 py-4 space-y-1">
        {links.map((link) => {
          const Icon = link.icon;
          const isActive = pathname === link.href || pathname.startsWith(link.href + "/");
          return (
            <Link
              key={link.href}
              href={link.href}
              className={cn(
                "flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition-colors",
                isActive
                  ? "bg-primary/10 text-primary"
                  : "text-gray-600 hover:bg-gray-100 hover:text-gray-900"
              )}
            >
              <Icon className="h-4 w-4" />
              {link.label}
            </Link>
          );
        })}
      </nav>
      <div className="border-t p-4">
        <p className="text-xs text-muted-foreground text-center">
          WAF Finance Reimbursements
        </p>
      </div>
    </aside>
  );
}
