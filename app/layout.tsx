import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Naija Hustle",
  description: "Build your life from almost nothing in Abuja.",
};

export default function RootLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
