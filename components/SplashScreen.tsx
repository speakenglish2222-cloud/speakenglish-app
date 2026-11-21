"use client";

import { useEffect, useState } from "react";

export default function SplashScreen() {
  const [visible, setVisible] = useState(true);
  const [fadeOut, setFadeOut] = useState(false);

  useEffect(() => {
    const fadeTimer = setTimeout(() => {
      setFadeOut(true);
    }, 1300);

    const hideTimer = setTimeout(() => {
      setVisible(false);
    }, 1800);

    return () => {
      clearTimeout(fadeTimer);
      clearTimeout(hideTimer);
    };
  }, []);

  if (!visible) return null;

  return (
    <div
      className={`fixed inset-0 z-50 flex flex-col items-center justify-center bg-white transition-opacity duration-500 ${
        fadeOut ? "opacity-0 pointer-events-none" : "opacity-100"
      }`}
    >
      <div className="flex flex-col items-center animate-pulse">
        <img
          src="/icon-512.png"
          alt="SpeakEnglish Logo"
          className="w-36 h-36 object-contain rounded-2xl transition-transform duration-700 scale-105"
        />
        <p className="mt-3 text-sm font-medium text-slate-600">
          বাংলা থেকে ইংরেজি শিখুন
        </p>
      </div>
    </div>
  );
}
