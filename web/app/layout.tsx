import type { Metadata } from "next";
import "./globals.css";
import PageWrapper from "./PageWrapper";

export const metadata: Metadata = {
  title: "Argus — Monitor de Preços",
  description: "Acompanhe os preços",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="pt-BR">
      <body className="bg-slate-50 text-slate-900 antialiased"><PageWrapper>{children}</PageWrapper></body>
    </html>
  );
}
