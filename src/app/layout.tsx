import type { Metadata } from "next";
import { JetBrains_Mono, Public_Sans } from "next/font/google";
import "./globals.css";

const fontDisplay = Public_Sans({
  subsets: ["latin"],
  display: "swap",
  variable: "--font-display-next",
});

const fontMono = JetBrains_Mono({
  subsets: ["latin"],
  display: "swap",
  variable: "--font-mono-next",
});

export const metadata: Metadata = {
  title: "Calculus Lab | AI-Powered Math Workspace",
  description: "Real-time OCR and AI tutoring for Multivariable Calculus using Deco Mini 7.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className="dark">
      <head>
        <link
          rel="stylesheet"
          href="https://fonts.googleapis.com/css2?family=Material+Symbols+Outlined:opsz,wght,FILL,GRAD@20..48,100..700,0..1,-50..200"
        />
      </head>
      <body
        className={`${fontDisplay.variable} ${fontMono.variable} antialiased font-display`}
      >
        {children}
      </body>
    </html>
  );
}
