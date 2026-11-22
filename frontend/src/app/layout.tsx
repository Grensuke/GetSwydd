import type { Metadata } from "next";
import { Fraunces, Geist, Geist_Mono } from "next/font/google";
import "./globals.css";
import { AppShell } from "@/components/shell";

const fraunces = Fraunces({
  variable: "--font-fraunces",
  subsets: ["latin"],
  display: "swap",
});

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
  display: "swap",
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
  display: "swap",
});

export const metadata: Metadata = {
  title: {
    default: "GetSwydd - Job Search & Application Assistant",
    template: "%s | GetSwydd",
  },
  description:
    "Full-stack job search and application assistant with explainable matching, verified profiles, and safe submission.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className="h-full" suppressHydrationWarning>
      <head>
        <script>
          {`try{var t=localStorage.getItem("getswydd.theme.v1")||"system";if(t==="dark"||(t==="system"&&window.matchMedia("(prefers-color-scheme: dark)").matches)){document.documentElement.setAttribute("data-theme","dark");}else{document.documentElement.setAttribute("data-theme","light");}}catch(e){}`}
        </script>
      </head>
      <body
        className={`${fraunces.variable} ${geistSans.variable} ${geistMono.variable} min-h-full bg-paper text-ink font-sans antialiased`}
      >
        <AppShell>{children}</AppShell>
      </body>
    </html>
  );
}
