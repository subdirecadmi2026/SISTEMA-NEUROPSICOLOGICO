import type { Metadata } from "next";
import { Fraunces, Manrope } from "next/font/google";
import { DemoProvider } from "@/lib/demo-store";
import "./globals.css";

const display = Fraunces({
  variable: "--font-display",
  subsets: ["latin"],
  weight: ["500", "600", "700"],
});

const body = Manrope({
  variable: "--font-body",
  subsets: ["latin"],
  weight: ["400", "500", "600", "700"],
});

export const metadata: Metadata = {
  title: "Sacha Wasi | Gestión multi-sucursal",
  description:
    "Sistema web de comida rápida: POS, KDS, recetas, inventario, caja y reportes. Vercel + Supabase.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="es" className={`${display.variable} ${body.variable} h-full`}>
      <body className="min-h-full antialiased">
        <DemoProvider>{children}</DemoProvider>
      </body>
    </html>
  );
}
