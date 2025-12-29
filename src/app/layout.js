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

/* ✅ APP METADATA */
export const metadata = {
  title: "Rizzonator",
  description: "AI-powered rizz replies from chat screenshots",
  manifest: "/manifest.json",
};

/* ✅ VIEWPORT SETTINGS (ONLY THIS GOES HERE) */
export const viewport = {
  themeColor: "#2563eb",
};

export default function RootLayout({ children }) {
  return (
    <html lang="en">
      <body className={`${geistSans.variable} ${geistMono.variable}`}>
        {children}
      </body>
    </html>
  );
}