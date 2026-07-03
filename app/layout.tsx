import type { Metadata } from "next";
import type { ReactNode } from "react";
import Script from "next/script";
import { Geist_Mono, Outfit } from "next/font/google";
import "./globals.css";
import { ThemeProvider } from "@/components/theme-provider"
import { AuthProvider } from "@/lib/auth"

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
  icons: {
    icon: [
      { url: "/karaxys_blk.svg", type: "image/svg+xml" },
      { url: "/karaxys_logo.png", type: "image/png" },
    ],
    apple: "/karaxys_logo.png",
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: ReactNode;
}>) {
  return (
    <html lang="en" suppressHydrationWarning>
      {/* Runtime backend config — must run before the app hydrates so client
          fetches resolve the correct API URL on any host. See app/config.js. */}
      <Script src="/config.js" strategy="beforeInteractive" />
      <body className={`${outfit.variable} ${geistMono.variable} antialiased`}>
        <ThemeProvider
          attribute="class"
          defaultTheme="dark"
          enableSystem={false}
          disableTransitionOnChange
        >
          <AuthProvider>{children}</AuthProvider>
        </ThemeProvider>
      </body>
    </html>
  );
}
