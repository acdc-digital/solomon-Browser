// Application Layout
// /Users/matthewsimon/Documents/Github/solomon-electron/next/src/app/layout.tsx

import type { Metadata } from "next";
import { Inter } from "next/font/google";
import { ThemeProvider } from "@/components/providers/theme-provider"
import { ConvexClientProvider } from "@/components/providers/convex-provider";
import { Toaster } from "sonner";
import { ModalProvider } from "@/components/providers/modal-provider";

import "./globals.css";

const inter = Inter({ subsets: ["latin"] });

export const metadata: Metadata = {
  title: "Solomon-Desktop",
  description: "A new way to use Artficial intellegence within your wokstation.",
  /*icons: {
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
              <Toaster position="bottom-center" />
              <ModalProvider />
              {children}
          </ThemeProvider>
        </ConvexClientProvider>
      </body>
    </html>
  );
}