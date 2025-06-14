import type { Metadata } from "next";
import { Inter } from "next/font/google";
import "./global.css";
import { Providers } from "./providers";

const inter = Inter({ subsets: ["latin"] });

export const metadata: Metadata = {
  title: "Archetypes of the Collective Unconscious",
  description: "A journey into the collective unconscious",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="en">
      <body className={inter.className}>
        <Providers>{children}</Providers>
      </body>
    </html>
  );
}
