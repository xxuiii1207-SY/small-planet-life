import type { Metadata, Viewport } from "next";
import "./globals.css";

export const metadata: Metadata = {
  metadataBase: new URL("https://small-planet-life.hmm1209qwe.chatgpt.site"),
  title: "小小星球｜个人生活工作台",
  description: "把存钱、倒计时、月度目标、追星行程、生活记录、读书打卡和心愿放在同一颗小小星球。",
  applicationName: "小小星球",
  manifest: "/manifest.webmanifest",
  icons: {
    icon: [
      { url: "/icon-192.png", sizes: "192x192", type: "image/png" },
      { url: "/icon-512.png", sizes: "512x512", type: "image/png" },
    ],
    apple: "/icon-192.png",
  },
  openGraph: {
    title: "小小星球｜个人生活工作台",
    description: "生活有很多面，刚好都装进这一颗小星球。",
    type: "website",
    images: [{ url: "/og.png", width: 1200, height: 630, alt: "小小星球个人生活工作台" }],
  },
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  viewportFit: "cover",
  themeColor: [
    { media: "(prefers-color-scheme: light)", color: "#f5f1ea" },
    { media: "(prefers-color-scheme: dark)", color: "#171715" },
  ],
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="zh-CN" suppressHydrationWarning>
      <body>{children}</body>
    </html>
  );
}
