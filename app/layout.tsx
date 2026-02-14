import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import Link from "next/link";
import "./globals.css";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "NYC Coffee AI Cashier",
  description: "AI-powered voice cashier for NYC Coffee shop",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body
        className={`${geistSans.variable} ${geistMono.variable} antialiased`}
      >
        <nav className="border-b border-gray-200 bg-white">
          <div className="mx-auto flex max-w-7xl items-center justify-between px-4 py-3">
            <Link href="/" className="text-xl font-bold text-gray-900">
              NYC Coffee
            </Link>
            <div className="flex gap-6">
              <Link
                href="/customer"
                className="text-sm font-medium text-gray-600 hover:text-gray-900"
              >
                Order
              </Link>
              <Link
                href="/barista"
                className="text-sm font-medium text-gray-600 hover:text-gray-900"
              >
                Barista
              </Link>
              <Link
                href="/owner"
                className="text-sm font-medium text-gray-600 hover:text-gray-900"
              >
                Dashboard
              </Link>
            </div>
          </div>
        </nav>
        <main>{children}</main>
      </body>
    </html>
  );
}
