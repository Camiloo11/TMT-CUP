import type { Metadata } from "next";
import { Modak, Poppins } from "next/font/google";
import "./globals.css";

const poppins = Poppins({
  variable: "--font-poppins",
  subsets: ["latin"],
  weight: ["400", "500", "600", "700"],
});

const modak = Modak({
  variable: "--font-modak",
  subsets: ["latin"],
  weight: "400",
});

export const metadata: Metadata = {
  title: "TMT CUP | Match Supervisor View",
  description: "Mobile-first match supervisor console for fast football tournaments.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="en"
      className={`${poppins.variable} ${modak.variable} h-full antialiased`}
    >
      <body className="min-h-full flex flex-col">{children}</body>
    </html>
  );
}
