import React from 'react';
import './globals.css';

export const metadata = {
  title: 'CMC OT - OTA DUTY PORTAL',
  description: 'Operating Theatre Assistant Scheduling System',
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="zh-HK">
      <head>
        {/* 引入 Tailwind CSS Play CDN，確保所有 v3 樣式完美渲染 */}
        <script src="https://cdn.tailwindcss.com"></script>
      </head>
      <body className="antialiased bg-slate-50 min-h-screen text-slate-900">
        {children}
      </body>
    </html>
  );
}