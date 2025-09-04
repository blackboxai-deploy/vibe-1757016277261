import type { Metadata } from 'next';
import { Inter } from 'next/font/google';
import './globals.css';

const inter = Inter({ subsets: ['latin'] });

export const metadata: Metadata = {
  title: 'Radiology Diagnostic System',
  description: 'Advanced AI-powered medical image analysis using Claude Sonnet 4. Upload up to 200 images for comprehensive diagnostic reporting.',
  keywords: 'radiology, medical imaging, AI diagnosis, diagnostic report, medical analysis',
  authors: [{ name: 'Radiology AI System' }],
  robots: 'noindex, nofollow', // Medical applications should not be indexed
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <head>
        <meta name="viewport" content="width=device-width, initial-scale=1" />
        <meta name="theme-color" content="#2563eb" />
        <link rel="icon" href="/favicon.ico" />
      </head>
      <body className={`${inter.className} antialiased bg-gray-50`}>
        <div id="root">
          {children}
        </div>
      </body>
    </html>
  );
}