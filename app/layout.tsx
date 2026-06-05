import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "Civic Radar",
  description:
    "A live civic feed dashboard with account watchlists, policy briefs, and anonymous civic signals.",
  icons: {
    icon: "/favicon.svg",
    shortcut: "/favicon.svg",
  },
};

const supabasePublicConfig = {
  anonKey: process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ?? "",
  url: process.env.NEXT_PUBLIC_SUPABASE_URL ?? "",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body
        className={`${geistSans.variable} ${geistMono.variable} antialiased`}
      >
        {supabasePublicConfig.url && supabasePublicConfig.anonKey ? (
          <script
            dangerouslySetInnerHTML={{
              __html: `window.__SUPABASE_URL__=${JSON.stringify(
                supabasePublicConfig.url,
              )};window.__SUPABASE_ANON_KEY__=${JSON.stringify(
                supabasePublicConfig.anonKey,
              )};`,
            }}
          />
        ) : null}
        {children}
      </body>
    </html>
  );
}
