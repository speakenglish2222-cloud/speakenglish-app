"use client";

import { useEffect, useState } from "react";

type Example = {
  example_en: string;
  example_bn: string;
};

type WordCardProps = {
  word: string;
  pos: string | null;
  phoneticBangla: string | null;
  banglaMeaning: string;
  examples: Example[];
  isBookmarked: boolean;
  onToggleBookmark: () => void;
};

export default function WordCard({
  word,
  pos,
  phoneticBangla,
  banglaMeaning,
  examples,
  isBookmarked,
  onToggleBookmark,
}: WordCardProps) {
  const [playingIndex, setPlayingIndex] = useState<number | string | null>(null);
  const [bestVoice, setBestVoice] = useState<SpeechSynthesisVoice | null>(null);

  // ব্রাউজারের সবচেয়ে প্রফেশনাল ও ন্যাচারাল ভয়েসটি সিলেক্ট করার লজিক
  useEffect(() => {
    if (typeof window === "undefined" || !("speechSynthesis" in window)) return;

    const updateVoices = () => {
      const voices = window.speechSynthesis.getVoices();
      if (voices.length === 0) return;

      // প্রফেশনাল ইংলিশ ভয়েসের অগ্রাধিকার তালিকা
      const preferredVoices = voices.filter(
        (v) =>
          v.lang.startsWith("en") &&
          (v.name.includes("Google") ||
            v.name.includes("Natural") ||
            v.name.includes("Enhanced") ||
            v.name.includes("Samantha") ||
            v.name.includes("Karen") ||
            v.name.includes("Daniel") ||
            v.name.includes("US English"))
      );

      // পছন্দমতো ভয়েস না পেলে যেকোনো প্রোপার US/UK ইংলিশ ভয়েস
      const defaultEnglish = voices.find(
        (v) => v.lang === "en-US" || v.lang === "en-GB"
      );

      setBestVoice(preferredVoices[0] || defaultEnglish || voices[0]);
    };

    updateVoices();
    window.speechSynthesis.onvoiceschanged = updateVoices;
  }, []);

  // স্মুথ ও ক্লিয়ার ভয়েস উচ্চারণের ফাংশন
  const speakText = (text: string, id: number | string) => {
    if (typeof window === "undefined" || !("speechSynthesis" in window)) return;

    window.speechSynthesis.cancel(); // আগের কোনো ভয়েস চলতে থাকলে বন্ধ করা

    const utterance = new SpeechSynthesisUtterance(text);
    utterance.lang = "en-US";

    // প্রফেশনাল সাউন্ড তৈরির ফাইন টিউনিং
    utterance.rate = 0.88; // কিছুটা ধীরে যাতে স্পষ্ট শোনা যায়
    utterance.pitch = 1.0; // স্বাভাবিক হিউম্যান টোন

    if (bestVoice) {
      utterance.voice = bestVoice;
    }

    setPlayingIndex(id);

    utterance.onend = () => setPlayingIndex(null);
    utterance.onerror = () => setPlayingIndex(null);

    window.speechSynthesis.speak(utterance);
  };

  return (
    <div className="bg-white rounded-3xl p-5 shadow-sm border border-slate-100 hover:shadow-md transition-all">
      {/* Word Header */}
      <div className="flex items-start justify-between mb-2">
        <div>
          <div className="flex items-center gap-2">
            <h2 className="text-xl font-bold text-slate-800">{word}</h2>
            {pos && (
              <span className="text-[10px] font-semibold text-slate-400 bg-slate-100 px-2 py-0.5 rounded-full">
                {pos}
              </span>
            )}
            {/* মূল শব্দটি শোনার স্পিকার বাটন */}
            <button
              onClick={() => speakText(word, "main-word")}
              className={`w-7 h-7 rounded-full flex items-center justify-center transition-all ${
                playingIndex === "main-word"
                  ? "bg-indigo-600 text-white animate-pulse"
                  : "bg-indigo-50 text-indigo-600 hover:bg-indigo-600 hover:text-white"
              }`}
              title="শব্দের উচ্চারণ শুনুন"
            >
              <svg
                xmlns="http://www.w3.org/2000/svg"
                viewBox="0 0 24 24"
                fill="currentColor"
                className="w-3.5 h-3.5"
              >
                <path d="M13.5 4.06c0-1.336-1.616-2.005-2.56-1.06l-4.5 4.5H4.5A2.25 2.25 0 002.25 9.75v4.5c0 1.242 1.008 2.25 2.25 2.25h1.94l4.5 4.5c.944.945 2.56.276 2.56-1.06V4.06zM18.584 5.106a.75.75 0 011.06 0c3.808 3.807 3.808 9.98 0 13.788a.75.75 0 11-1.06-1.06 8.25 8.25 0 000-11.668.75.75 0 010-1.06z" />
              </svg>
            </button>
          </div>

          {phoneticBangla && (
            <p className="text-xs text-indigo-600 font-medium mt-1">
              🗣️ {phoneticBangla}
            </p>
          )}
        </div>

        {/* Bookmark Button */}
        <button
          onClick={onToggleBookmark}
          className="text-xl p-1.5 hover:bg-slate-50 rounded-full transition-all"
        >
          {isBookmarked ? "🔖" : "📑"}
        </button>
      </div>

      {/* Bangla Meaning */}
      <p className="text-base font-extrabold text-slate-800 mb-4 bg-slate-50 p-2.5 rounded-xl border border-slate-100/80">
        {banglaMeaning}
      </p>

      {/* Examples List */}
      <div className="flex flex-col gap-3">
        {examples.map((ex, i) => (
          <div
            key={i}
            className="bg-indigo-50/40 rounded-2xl p-3 border border-indigo-50/80"
          >
            <div className="flex items-center justify-between gap-2">
              <p className="text-sm font-semibold text-slate-700 leading-snug">
                {ex.example_en}
              </p>

              {/* 🔊 সেন্টেন্সের ডানপাশে প্রফেশনাল স্পিকার বাটন */}
              <button
                onClick={() => speakText(ex.example_en, i)}
                className={`shrink-0 w-8 h-8 rounded-full flex items-center justify-center transition-all ${
                  playingIndex === i
                    ? "bg-indigo-600 text-white scale-110 shadow-md shadow-indigo-500/30 animate-pulse"
                    : "bg-white text-indigo-600 shadow-sm hover:bg-indigo-600 hover:text-white"
                }`}
                title="উচ্চারণ শুনুন"
              >
                <svg
                  xmlns="http://www.w3.org/2000/svg"
                  viewBox="0 0 24 24"
                  fill="currentColor"
                  className="w-4 h-4"
                >
                  <path d="M13.5 4.06c0-1.336-1.616-2.005-2.56-1.06l-4.5 4.5H4.5A2.25 2.25 0 002.25 9.75v4.5c0 1.242 1.008 2.25 2.25 2.25h1.94l4.5 4.5c.944.945 2.56.276 2.56-1.06V4.06zM18.584 5.106a.75.75 0 011.06 0c3.808 3.807 3.808 9.98 0 13.788a.75.75 0 11-1.06-1.06 8.25 8.25 0 000-11.668.75.75 0 010-1.06z" />
                  <path d="M15.932 7.757a.75.75 0 011.061 0 4.5 4.5 0 010 6.364.75.75 0 01-1.06-1.06 3 3 0 000-4.243.75.75 0 010-1.061z" />
                </svg>
              </button>
            </div>

            <p className="text-xs text-slate-500 mt-1">{ex.example_bn}</p>
          </div>
        ))}
      </div>
    </div>
  );
}
