import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Join the Team | Trailblaize Growth Space",
  description: "We're looking for 5 exceptional individuals to help us revolutionize alumni engagement. Apply now to join the Trailblaize team.",
  keywords: ["internship", "sales", "growth", "alumni", "Trailblaize", "startup", "career"],
  authors: [{ name: "Trailblaize" }],
  openGraph: {
    title: "Join the Trailblaize Team",
    description: "We're looking for 5 exceptional individuals to help us revolutionize alumni engagement.",
    url: "https://trailblaize.net",
    siteName: "Trailblaize Growth Space",
    type: "website",
  },
  twitter: {
    card: "summary_large_image",
    title: "Join the Trailblaize Team",
    description: "We're looking for 5 exceptional individuals to help us revolutionize alumni engagement.",
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
      <body>
        {children}
      </body>
    </html>
  );
}
