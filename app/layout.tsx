"use client";

import { Providers } from "@/components/providers";
import "./global.css";

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="en">
      <body className="bg-black">
        <Providers>{children}</Providers>
      </body>
    </html>
  );
}
