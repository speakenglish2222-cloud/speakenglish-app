"use client";

import { useEffect, useState } from "react";

export default function SplashScreen() {
  const [mounted, setMounted] = useState(true);
  const [active, setActive] = useState(false);
  const [leaving, setLeaving] = useState(false);

  useEffect(() => {
    const raf = requestAnimationFrame(() => {
      setActive(true);
    });

    const leaveTimer = setTimeout(() => {
      setLeaving(true);
    }, 1500);

    const unmountTimer = setTimeout(() => {
      setMounted(false);
    }, 2050);

    return () => {
      cancelAnimationFrame(raf);
      clearTimeout(leaveTimer);
      clearTimeout(unmountTimer);
    };
  }, []);

  if (!mounted) return null;

  return (
    <div
      style={{
        opacity: leaving ? 0 : active ? 1 : 0,
        transition: "opacity 500ms cubic-bezier(0.22, 1, 0.36, 1)",
      }}
      className="fixed inset-0 z-[9999] flex flex-col items-center justify-center bg-white pointer-events-none select-none"
    >
      <div
        style={{
          transform: leaving
            ? "scale(1.04)"
            : active
            ? "scale(1)"
            : "scale(0.92)",
          opacity: leaving ? 0 : active ? 1 : 0,
          transition:
            "transform 700ms cubic-bezier(0.22, 1, 0.36, 1), opacity 600ms cubic-bezier(0.22, 1, 0.36, 1)",
        }}
        className="flex flex-col items-center justify-center px-6 text-center"
      >
        <div className="w-32 h-32 rounded-3xl bg-white shadow-[0_12px_35px_rgba(15,23,42,0.08)] border border-slate-100 flex items-center justify-center overflow-hidden">
          <img
            src="/icon-512.png"
            alt="SpeakEnglish"
            className="w-28 h-28 object-contain"
          />
        </div>

        <p
          style={{
            opacity: leaving ? 0 : active ? 1 : 0,
            transform: active ? "translateY(0px)" : "translateY(8px)",
            transition:
              "transform 650ms cubic-bezier(0.22, 1, 0.36, 1) 120ms, opacity 600ms cubic-bezier(0.22, 1, 0.36, 1) 120ms",
          }}
          className="mt-4 text-sm font-medium tracking-wide text-slate-600"
        >
          বাংলা থেকে ইংরেজি শিখুন
        </p>
      </div>
    </div>
  );
}
