import type { Metadata } from "next";
import { GeistSans } from "geist/font/sans";
import "./globals.css";
import PageWrapper from "./PageWrapper";

export const metadata: Metadata = {
  title: "Argus — Monitor de Preços",
  description: "Acompanhe os preços",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="pt-BR" className={GeistSans.variable}>
      <body className="bg-zinc-50 text-zinc-900 antialiased font-sans">
        <PageWrapper>{children}</PageWrapper>
      </body>
    </html>
  );
}
