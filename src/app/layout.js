export const dynamic = "force-dynamic";

import "./globals.css";
import { ThemeProvider } from "@/components/ThemeProvider.js";

export const metadata = {
  title: "AllInAI - AI All in One",
  description: "AllInAI - 智能AI大模型聚合平台 · 一站直达所有AI能力",
};

export default function RootLayout({ children }) {
  return (
    <html lang="zh-CN" suppressHydrationWarning>
      <body className="min-h-screen transition-colors duration-200">
        <ThemeProvider>{children}</ThemeProvider>
      </body>
    </html>
  );
}
