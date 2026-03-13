import type { Metadata } from "next";
import { Cinzel, Cinzel_Decorative, Inter } from "next/font/google";
import "./globals.css";

const cinzel = Cinzel({
  variable: "--font-cinzel",
  subsets: ["latin"],
  weight: ["400", "600", "700", "900"],
});

const cinzelDecorative = Cinzel_Decorative({
  variable: "--font-cinzel-decorative",
  subsets: ["latin"],
  weight: ["400", "700", "900"],
});

const inter = Inter({
  variable: "--font-inter",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "NAGORA — Finance Management | Sahasra TechFest",
  description:
    "Nagora is the official finance management platform for Sahasra TechFest. Track budgets, manage events, and conquer the financial Olympus.",
  keywords: ["finance", "management", "techfest", "LCLG", "Greek", "Nagora"],
  openGraph: {
    title: "NAGORA — Finance Management | Sahasra TechFest",
    description: "Manage your TechFest finances like the gods of Olympus.",
    type: "website",
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body
        className={`${cinzel.variable} ${cinzelDecorative.variable} ${inter.variable} antialiased`}
      >
        {children}
      </body>
    </html>
  );
}
