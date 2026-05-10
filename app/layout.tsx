import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "AIIC Chat",
  description: "A lightweight AI chat web app.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="zh-CN">
      <body>{children}</body>
    </html>
  );
}
