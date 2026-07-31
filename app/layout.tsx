import type { Metadata } from "next";
import "./globals.css";
import BottomNav from "@/components/BottomNav";

export const metadata: Metadata = {
  title: "SpeakEnglish — বাংলা থেকে ইংরেজি শিখুন",
  description: "Oxford 3000 শব্দ ও বাক্য দিয়ে ইংরেজি শেখার ফ্রি অ্যাপ",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="bn">
      <body className="bg-slate-50 text-slate-900 pb-20">
        <main className="max-w-md mx-auto min-h-screen p-4">
          {children}
        </main>
        <BottomNav />
      </body>
    </html>
  );
}
