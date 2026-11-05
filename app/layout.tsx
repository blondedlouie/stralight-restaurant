import type { Metadata, Viewport } from 'next';
import '@/styles/globals.css';
import { Header } from '@/components/ui/Header';
import { CartDrawer } from '@/components/ui/CartDrawer';
import { AIFloatingSupport } from '@/components/ui/AIFloatingSupport';
import { DevToolbar } from '@/components/dev/DevToolbar';

export const metadata: Metadata = {
  title: 'Starlight Restaurant | Order Online Nairobi',
  description: 'Order legendary Starlight Chicken, pizzas, burgers and shawarmas directly from our Nairobi and Mombasa branches.',
  icons: {
    icon: [{ url: '/images/starlight-logo.svg', type: 'image/svg+xml' }, { url: '/icon.png', type: 'image/png' }, { url: '/favicon.ico', type: 'image/x-icon' }],
    shortcut: '/favicon.ico',
    apple: '/icon.png',
  },
};

export const viewport: Viewport = {
  width: 'device-width',
  initialScale: 1,
  viewportFit: 'cover',
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body className="min-h-screen bg-white text-brand-ink">
        <Header />
        <main>{children}</main>
        <CartDrawer />
        <AIFloatingSupport />
        <DevToolbar />
      </body>
    </html>
  );
}
