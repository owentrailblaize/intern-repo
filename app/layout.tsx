import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Trailblaize | Build the Future of Alumni Networks",
  description: "Trailblaize is revolutionizing how organizations connect with their communities. Join 5,500+ users across 5 schools building the future of alumni engagement.",
  keywords: ["alumni", "networking", "community", "organizations", "Trailblaize", "engagement", "growth"],
  authors: [{ name: "Trailblaize" }],
  metadataBase: new URL("https://trailblaize.space"),
  openGraph: {
    title: "Build the Future of Alumni Networks",
    description: "Trailblaize is revolutionizing how organizations connect with their communities. Whether you're joining our team or managing your organization, start your journey here.",
    url: "https://trailblaize.space",
    siteName: "Trailblaize",
    type: "website",
  },
  twitter: {
    card: "summary_large_image",
    title: "Build the Future of Alumni Networks",
    description: "Trailblaize is revolutionizing how organizations connect with their communities. Join 5,500+ users across 5 schools.",
  },
  icons: {
    icon: "/logo-icon.svg",
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <head>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
      </head>
      <body>
        {children}
      </body>
    </html>
  );
}
