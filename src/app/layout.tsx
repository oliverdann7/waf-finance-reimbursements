import type { Metadata } from "next";
import "./globals.css";
import { Providers } from "@/components/providers";
import { LanguageProvider } from "@/lib/i18n/client";


export const metadata: Metadata = {
  title: "WAF Finance - Reimbursement Management",
  description: "Monthly expense reporting and reimbursement management system",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body>
        <LanguageProvider>
          <Providers>{children}</Providers>
        </LanguageProvider>
      </body>
    </html>
  );
}
