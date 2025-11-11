import type { Metadata } from 'next';
import { Geist, Geist_Mono } from 'next/font/google';
import './globals.css';

const geistSans = Geist({
  variable: '--font-geist-sans',
  subsets: ['latin'],
});

const geistMono = Geist_Mono({
  variable: '--font-geist-mono',
  subsets: ['latin'],
});

export const metadata: Metadata = {
  title: 'Phoenix Wallet Demo',
  description:
    'Interactive demo for Phoenix Wallet showcasing blockchain wallet connections, transactions, and token operations',
  keywords: ['blockchain', 'crypto wallet', 'web3', 'ethereum', 'solana', 'wallet connect', 'phoenix wallet'],
  authors: [{ name: 'Phoenix Wallet Team' }],
  creator: 'Phoenix Wallet',
  openGraph: {
    title: 'Phoenix Wallet Demo',
    description: 'Experience seamless blockchain wallet connectivity and operations with the Phoenix Wallet demo',
    images: ['/phoenix-wallet-og.png'],
  },
  twitter: {
    card: 'summary_large_image',
    title: 'Phoenix Wallet Demo',
    description: 'Experience seamless blockchain wallet connectivity and operations with the Phoenix Wallet demo',
    images: ['/phoenix-wallet-og.png'],
  },
  applicationName: 'Phoenix Wallet Demo',
  themeColor: '#3a86ff',
  viewport: 'width=device-width, initial-scale=1.0',
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <head>
        <link rel="icon" href="/favicon.ico" sizes="any" />
        <link rel="apple-touch-icon" href="/apple-touch-icon.png" />
        <link rel="manifest" href="/manifest.json" />
      </head>
      <body className={`${geistSans.variable} ${geistMono.variable} antialiased`}>{children}</body>
    </html>
  );
}
