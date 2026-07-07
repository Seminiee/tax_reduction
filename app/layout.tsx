import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import { ChatProvider } from "@/components/chat/ChatContext";
import { ChatPanel } from "@/components/chat/ChatPanel";
import { SiteNav } from "@/components/site-shell/SiteNav";
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
  title: "해외ETF 세후수익 시뮬레이터",
  description: "일반 해외주식 계좌 vs ISA 국내상장 해외ETF 세후수익률 시뮬레이터",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="ko"
      className={`${geistSans.variable} ${geistMono.variable} h-full antialiased`}
    >
      <body className="min-h-full flex flex-col">
        <ChatProvider>
          <SiteNav />
          {children}
          <ChatPanel />
        </ChatProvider>
      </body>
    </html>
  );
}
