import type { Metadata } from "next";
import type { ReactNode } from "react";
import { Geist_Mono, Outfit } from "next/font/google";
// @ts-expect-error Next.js supports global CSS side-effect imports in app/layout.
import "./globals.css";
import { ThemeProvider } from "@/components/theme-provider"

const outfit = Outfit({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "Karaxys — Real-time API Security Platform",
  description:
    "Karaxys discovers, classifies, and tests every API across your infrastructure using eBPF-powered traffic capture and continuous security testing.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: ReactNode;
}>) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body className={`${outfit.variable} ${geistMono.variable} antialiased`}>
        <ThemeProvider
          attribute="class"
          defaultTheme="dark"
          enableSystem={false}
          disableTransitionOnChange
        >
          {children}
        </ThemeProvider>
      </body>
    </html>
  );
}
