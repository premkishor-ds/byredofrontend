import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: {
    default: "Byredo AI Concierge | Luxury Fragrance & Beauty Search",
    template: "%s | Byredo AI"
  },
  description: "Experience the future of luxury shopping with the Byredo AI Concierge. Discover exquisite perfumes, makeup, and home scents through our context-aware, premium AI search.",
  keywords: ["Byredo", "Luxury Perfume", "Niche Fragrance", "AI Shopping Assistant", "Luxury Beauty", "Byredo Search", "Concierge Intelligence"],
  authors: [{ name: "Byredo Intelligence" }],
  robots: {
    index: false,
    follow: false,
    googleBot: {
      index: false,
      follow: false,
      noimageindex: true,
      'max-video-preview': -1,
      'max-image-preview': 'large',
      'max-snippet': -1,
    },
  },
  openGraph: {
    type: "website",
    locale: "en_US",
    url: "https://byredo-ai.intelligence.com",
    siteName: "Byredo AI Concierge",
    title: "Byredo AI Concierge | Discover Luxury Through Intelligence",
    description: "Personalized, context-aware AI search for the entire Byredo collection.",
    images: [
      {
        url: "https://byredo-ai.intelligence.com/og-image.jpg",
        width: 1200,
        height: 630,
        alt: "Byredo AI Concierge",
      },
    ],
  },
  twitter: {
    card: "summary_large_image",
    title: "Byredo AI Concierge | Luxury Reimagined",
    description: "Discover the world of Byredo through our advanced AI-powered concierge.",
    images: ["https://byredo-ai.intelligence.com/og-image.jpg"],
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className="h-full" suppressHydrationWarning>
      <head>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
        <link href="https://fonts.googleapis.com/css2?family=Inter:ital,opsz,wght@0,14..32,100..900;1,14..32,100..900&display=swap" rel="stylesheet" />
        <meta name="theme-color" content="#ffffff" />
      </head>
      <body className="h-full" style={{ margin: 0, padding: 0 }} suppressHydrationWarning>{children}</body>
    </html>
  );
}
