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
      <body className="antialiased bg-slate-50 min-h-screen">
        {children}
      </body>
    </html>
  );
}