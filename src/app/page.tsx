"use client";

import { useSession } from "next-auth/react";
import { useEffect, useState, startTransition } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { ArrowRight, FileText, Shield, Receipt, AlertTriangle } from "lucide-react";

export default function Home() {
  const { data: session, status } = useSession();
  const router = useRouter();
  const [timedOut, setTimedOut] = useState(false);

  useEffect(() => {
    if (status === "authenticated") {
      const role = session?.user?.role;
      if (role === "ADMIN" || role === "SUPER_ADMIN" || role === "TREASURER") {
        router.push("/admin");
      } else if (role === "CHURCH_TREASURER" || role === "CHURCH_PASTOR" || role === "CHURCH_USER") {
        router.push("/church/dashboard");
      } else {
        router.push("/dashboard");
      }
    }
  }, [status, session, router]);

  useEffect(() => {
    if (status === "loading") {
      const timer = setTimeout(() => setTimedOut(true), 8000);
      return () => clearTimeout(timer);
    }
    startTransition(() => setTimedOut(false));
  }, [status]);

  if (status === "loading" && !timedOut) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-blue-50 via-white to-indigo-50">
        <div className="animate-pulse text-primary font-semibold">Loading...</div>
      </div>
    );
  }

  if (timedOut) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-blue-50 via-white to-indigo-50">
        <div className="text-center max-w-md mx-auto p-8">
          <AlertTriangle className="h-12 w-12 text-amber-500 mx-auto mb-4" />
          <h2 className="text-xl font-semibold mb-2">Connection Issue</h2>
          <p className="text-muted-foreground mb-6">
            Unable to connect to the server. This may be a database connection problem.
            Please try refreshing the page or contact support.
          </p>
          <Button onClick={() => window.location.reload()}>Refresh Page</Button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-indigo-50">
      <header className="border-b bg-white/80 backdrop-blur-sm">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="h-8 w-8 rounded-lg bg-primary flex items-center justify-center">
              <span className="text-white font-bold text-sm">W</span>
            </div>
            <span className="font-semibold text-lg">WAF Finance</span>
          </div>
          <div className="flex items-center gap-3">
            <Button variant="outline" asChild><Link href="/login">Sign In</Link></Button>
            <Button asChild><Link href="/register">Get Started</Link></Button>
          </div>
        </div>
      </header>

      <main>
        <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-24">
          <div className="text-center max-w-3xl mx-auto">
            <h1 className="text-5xl font-bold tracking-tight text-gray-900 mb-6">
              WAF Expense Reimbursement
              <span className="text-primary block mt-2">Management System</span>
            </h1>
            <p className="text-xl text-gray-600 mb-10 leading-relaxed">
              Streamline your monthly expense reporting. Upload receipts, track approvals,
              and get reimbursed faster with our comprehensive finance management platform.
            </p>
            <div className="flex gap-4 justify-center">
              <Button size="lg" asChild>
                <Link href="/register">
                  Start Now <ArrowRight className="ml-2 h-4 w-4" />
                </Link>
              </Button>
              <Button size="lg" variant="outline" asChild><Link href="/login">Sign In</Link></Button>
            </div>
          </div>
        </section>

        <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-16">
          <div className="grid md:grid-cols-3 gap-8">
            {[
              {
                icon: Receipt,
                title: "Smart Receipt Scanning",
                description: "Upload receipts and let our OCR extract data automatically. Review before saving.",
              },
              {
                icon: FileText,
                title: "Monthly Reports",
                description: "Create and submit monthly expense reports with detailed category breakdowns.",
              },
              {
                icon: Shield,
                title: "Approval Workflow",
                description: "Track your report through submission, review, approval, and payment stages.",
              },
            ].map((feature) => (
              <div
                key={feature.title}
                className="bg-white rounded-xl p-8 shadow-sm border hover:shadow-md transition-shadow"
              >
                <div className="h-12 w-12 rounded-lg bg-primary/10 flex items-center justify-center mb-5">
                  <feature.icon className="h-6 w-6 text-primary" />
                </div>
                <h3 className="text-lg font-semibold mb-3">{feature.title}</h3>
                <p className="text-gray-600 leading-relaxed">{feature.description}</p>
              </div>
            ))}
          </div>
        </section>
      </main>

      <footer className="border-t bg-white/50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-center">
          <p className="text-sm text-muted-foreground">
            &copy; {new Date().getFullYear()} WAF Finance. All rights reserved.
          </p>
        </div>
      </footer>
    </div>
  );
}
