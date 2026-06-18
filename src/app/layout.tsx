import type { Metadata } from "next";
import { Inter, Playfair_Display } from "next/font/google";
import "./globals.css";
import { Toaster } from "@/components/ui/toaster";
import { Toaster as SonnerToaster } from "@/components/ui/sonner";
import { ThemeProvider } from "@/components/theme-provider";

const inter = Inter({
  variable: "--font-inter",
  subsets: ["latin"],
  display: "swap",
});

const playfair = Playfair_Display({
  variable: "--font-playfair",
  subsets: ["latin"],
  display: "swap",
});

export const metadata: Metadata = {
  title: "SwapShelf — Hyper-Local Media Exchange",
  description:
    "Borrow and lend books and board games with your neighbors. A warm, community-driven library that lives on your block.",
  keywords: [
    "SwapShelf",
    "book exchange",
    "board game lending",
    "neighborhood library",
    "local sharing",
  ],
  authors: [{ name: "SwapShelf" }],
  icons: {
    icon: "/logo.svg",
  },
  openGraph: {
    title: "SwapShelf — Hyper-Local Media Exchange",
    description:
      "Borrow and lend books and board games with your neighbors.",
    siteName: "SwapShelf",
    type: "website",
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body
        className={`${inter.variable} ${playfair.variable} antialiased bg-background text-foreground`}
      >
        <ThemeProvider
          attribute="class"
          defaultTheme="light"
          enableSystem
          disableTransitionOnChange
        >
          {children}
          <Toaster />
          <SonnerToaster position="top-right" richColors closeButton />
        </ThemeProvider>
      </body>
    </html>
  );
}
