import type { Metadata } from 'next';
import { Suspense } from 'react';
import './globals.css';
import Navbar from '@/components/Navbar';
import Footer from '@/components/Footer';
import { AdminAuthProvider } from '@/lib/admin-auth';

export const metadata: Metadata = {
  title: 'EventPass - Sistema de Registro & Acreditación QR',
  description: 'Plataforma multi-rol para gestión de eventos, venta de boletos, doble agenda y control de accesos QR con PWA móvil.',
  manifest: '/manifest.json',
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="es" className="h-full bg-white text-zinc-900 antialiased">
      <head>
        <meta name="theme-color" content="#9333ea" />
      </head>
      <body className="min-h-full flex flex-col bg-slate-50/60 font-sans">
        <AdminAuthProvider>
          <Suspense fallback={<div className="h-16 bg-white border-b border-purple-100" />}>
            <Navbar />
          </Suspense>
          <main className="flex-1 w-full flex flex-col">
            <Suspense fallback={<div className="p-8 text-center text-xs text-purple-600 font-mono">Cargando módulo...</div>}>
              {children}
            </Suspense>
          </main>
          <Footer />
        </AdminAuthProvider>
      </body>
    </html>
  );
}
