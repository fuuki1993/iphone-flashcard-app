import { Inter } from "next/font/google";
import "./globals.css";

const inter = Inter({ subsets: ["latin"] });

export const metadata = {
  title: "iPhone Flashcard App",
  description: "A flashcard app for iPhone",
  manifest: `${process.env.NEXT_PUBLIC_BASE_PATH || ''}/manifest.json`,
  icons: {
    icon: [
      { url: `${process.env.NEXT_PUBLIC_BASE_PATH || ''}/icon-192x192.svg`, sizes: '192x192', type: 'svg+xml' },
      { url: `${process.env.NEXT_PUBLIC_BASE_PATH || ''}/icon-512x512.svg`, sizes: '512x512', type: 'svg+xml' },
    ],
    apple: [
      { url: `${process.env.NEXT_PUBLIC_BASE_PATH || ''}/icon-192x192.svg`, sizes: '192x192', type: 'svg+xml' },
      { url: `${process.env.NEXT_PUBLIC_BASE_PATH || ''}/icon-512x512.svg`, sizes: '512x512', type: 'svg+xml' },
    ],
  },
  appleWebApp: {
    capable: true,
    statusBarStyle: "black-translucent",
    title: "iPhone Flashcard App",
  },
  viewport: {
    width: "device-width",
    initialScale: 1,
    maximumScale: 1,
    userScalable: false,
  },
};

export default function RootLayout({ children }) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}