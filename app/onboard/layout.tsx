import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Start Onboarding with Trailblaize",
  description: "Start Onboarding with Trailblaize",
  openGraph: {
    title: "Start Onboarding with Trailblaize",
    description: "Start Onboarding with Trailblaize",
    url: "https://trailblaize.net",
    siteName: "Trailblaize",
    type: "website",
  },
  twitter: {
    card: "summary_large_image",
    title: "Start Onboarding with Trailblaize",
    description: "Start Onboarding with Trailblaize",
  },
  icons: {
    icon: "/logo-icon.svg",
  },
};

export default function OnboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <>
      <link rel="preconnect" href="https://fonts.googleapis.com" />
      <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
      <link 
        href="https://fonts.googleapis.com/css2?family=Instrument+Serif:ital@0;1&display=swap" 
        rel="stylesheet" 
      />
      {children}
    </>
  );
}
