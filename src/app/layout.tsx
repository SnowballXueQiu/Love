import type { Metadata } from "next";
import localFont from "next/font/local";
import "./globals.css";
import "./uno.css";
import BackgroundShapes from "@/components/BackgroundShapes";
import { StrictMode } from 'react';

const arkPixel = localFont({
  src: "./fonts/ark-pixel-12px-proportional-zh_cn.ttf.woff",
  variable: "--font-ark-pixel",
  weight: "100 900",
});

export const metadata: Metadata = {
  title: process.env.NEXT_PUBLIC_SITE_TITLE || "Couple Countdown",
  description: "A Memphis style countdown for couples",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="zh-CN">
      <head>
        <meta name="viewport" content="width=device-width, initial-scale=1.0" />
      </head>
      <body
        className={`${arkPixel.variable} font-sans min-h-screen flex flex-col items-center justify-center p-5`}
      >
        <StrictMode>
          <BackgroundShapes />
          {children}
        </StrictMode>
      </body>
    </html>
  );
}
