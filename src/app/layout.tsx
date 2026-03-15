import type { Metadata } from "next";
import { JetBrains_Mono, Material_Symbols_Outlined, Public_Sans } from "next/font/google";
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

const materialSymbols = Material_Symbols_Outlined({
  subsets: ["latin"],
  display: "swap",
  variable: "--font-material-symbols-next",
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
      <body
        className={`${fontDisplay.variable} ${fontMono.variable} ${materialSymbols.variable} antialiased font-display`}
      >
        {children}
      </body>
    </html>
  );
}
