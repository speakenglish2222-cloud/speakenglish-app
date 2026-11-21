"use client";

import { useEffect, useState } from "react";

export default function SplashScreen() {
  const [stage, setStage] = useState<"enter" | "hold" | "exit" | "done">("enter");

  useEffect(() => {
    const holdTimer = setTimeout(() => {
      setStage("hold");
    }, 80);

    const exitTimer = setTimeout(() => {
      setStage("exit");
    }, 1550);

    const doneTimer = setTimeout(() => {
      setStage("done");
    }, 2150);

    return () => {
      clearTimeout(holdTimer);
      clearTimeout(exitTimer);
      clearTimeout(doneTimer);
    };
  }, []);

  if (stage === "done") return null;

  const isVisible = stage === "hold";

  return (
    <div
      className={`fixed inset-0 z-50 flex flex-col items-center justify-center bg-gradient-to-b from-slate-50 via-white to-emerald-50/40 transition-all duration-500 ease-in-out ${
        isVisible
          ? "opacity-100 pointer-events-auto"
          : "opacity-0 pointer-events-none"
      }`}
    >
      <div className="relative flex flex-col items-center justify-center">
        {/* Soft ambient ring behind logo */}
        <div
          className={`absolute w-44 h-44 rounded-full bg-orange-400/15 blur-xl transition-all duration-700 ease-out ${
            isVisible ? "scale-100 opacity-100" : "scale-75 opacity-0"
          }`}
        />

        {/* Smooth logo entrance & gentle float */}
        <div
          className={`relative p-3 rounded-3xl bg-white shadow-lg shadow-slate-200/80 border border-slate-100 transition-all duration-700 ease-out ${
            stage === "enter"
              ? "opacity-0 scale-75 translate-y-4"
              : stage === "hold"
              ? "opacity-100 scale-100 translate-y-0"
              : "opacity-0 scale-105 -translate-y-2"
          }`}
        >
          <img
            src="/icon-512.png"
            alt="SpeakEnglish Logo"
            className="w-28 h-28 object-contain rounded-2xl"
          />
        </div>

        {/* Text smooth reveal */}
        <div
          className={`mt-4 text-center transition-all duration-700 delay-150 ease-out ${
            isVisible
              ? "opacity-100 translate-y-0"
              : "opacity-0 translate-y-3"
          }`}
        >
          <h2 className="text-lg font-bold tracking-tight text-slate-800">
            Speak<span className="text-orange-500">English</span>
          </h2>
          <p className="mt-1 text-xs font-medium text-slate-500">
            বাংলা থেকে ইংরেজি শিখুন
          </p>
        </div>
      </div>
    </div>
  );
}
