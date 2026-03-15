import type { Metadata } from "next";
import "./globals.css";

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
          href="https://fonts.googleapis.com/css2?family=Public+Sans:wght@300;400;500;600;700&family=JetBrains+Mono:wght@400;500&display=swap"
          rel="stylesheet"
        />
        <link
          href="https://fonts.googleapis.com/css2?family=Material+Symbols+Outlined:wght,FILL@100..700,0..1&display=swap"
          rel="stylesheet"
        />
      </head>
      <body className="antialiased font-display">
        {children}
      </body>
    </html>
  );
}
