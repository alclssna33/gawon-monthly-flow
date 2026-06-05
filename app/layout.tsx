import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "월별 개원 흐름 대시보드",
  description: "개원비밀공간 — 월별 병의원 개원 현황 분석",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="ko">
      <body className="bg-gray-100">{children}</body>
    </html>
  );
}
