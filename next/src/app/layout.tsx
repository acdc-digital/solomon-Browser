import type { Metadata } from "next";
import { Inter } from "next/font/google";
import { ThemeProvider } from "@/components/providers/theme-provider"
import { ConvexClientProvider } from "@/components/providers/convex-provider";

import "./globals.css";

const inter = Inter({ subsets: ["latin"] });

export const metadata: Metadata = {
  title: "Solomon-Desktop",
  description: "A new way to useArtficial intellegence within your wokstation.",
  /* icons: {
    icon: [
      {
        media: "(prefers-color-scheme: light)",
        url: "/.svg",
        href: "/.svg",
      },
      {
        media: "(prefers-color-scheme: dark)",
        url: "/.svg",
        href: "/.svg",
      },
    ]
  } */
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body className={inter.className}>
        <ConvexClientProvider>
          <ThemeProvider
            attribute="class"
            defaultTheme="light"
            enableSystem
            disableTransitionOnChange
          >
              {children}
          </ThemeProvider>
        </ConvexClientProvider>
      </body>
    </html>
  );
}