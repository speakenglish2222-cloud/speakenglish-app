"use client";

import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabase";

type PracticeWord = {
  id: number;
  word: string;
  bangla_meaning: string;
};

// অ্যারে এলোমেলো (Shuffle) করার হেলপার ফাংশন
function shuffle<T>(arr: T[]): T[] {
  const a = [...arr];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

export default function TodayPractice({ userId }: { userId: string }) {
  const [words, setWords] = useState<PracticeWord[]>([]);
  const [allMeanings, setAllMeanings] = useState<string[]>([]);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [selectedAnswer, setSelectedAnswer] = useState<string | null>(null);
  const [options, setOptions] = useState<string[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function fetchDailyWords() {
      const today = new Date().toISOString().slice(0, 10);

      // ১. আজকের পড়া শব্দগুলো আনা
      const { data: dailyRows } = await supabase
        .from("user_daily_words")
        .select("word_id")
        .eq("user_id", userId)
        .eq("shown_date", today);

      const wordIds = (dailyRows ?? []).map((r: any) => r.word_id);

      if (wordIds.length === 0) {
        setLoading(false);
        return;
      }

      // ২. ওই শব্দগুলোর বিস্তারিত আনা
      const { data: wordRows } = await supabase
        .from("words")
        .select("id, word, bangla_meaning")
        .in("id", wordIds);

      // ৩. অপশন তৈরির জন্য ব্যাকআপ হিসেবে অন্যান্য শব্দ আনা
      const { data: randomRows } = await supabase
        .from("words")
        .select("bangla_meaning")
        .limit(50);

      const meanings = (randomRows ?? []).map((r: any) => r.bangla_meaning);

      // 💡 আপডেট ২: আজকের শব্দগুলো এলোমেলো (Shuffle) করে সেভ করা
      const list = (wordRows as PracticeWord[]) ?? [];
      setWords(shuffle(list));
      setAllMeanings(meanings);
      setLoading(false);
    }

    if (userId) fetchDailyWords();
  }, [userId]);

  // অপশন তৈরি ও এলোমেলো করা
  useEffect(() => {
    if (words.length > 0 && currentIndex < words.length) {
      const currentWord = words[currentIndex];
      const wrongOptions = allMeanings
        .filter((m) => m !== currentWord.bangla_meaning)
        .sort(() => 0.5 - Math.random())
        .slice(0, 3);

      const combined = shuffle([currentWord.bangla_meaning, ...wrongOptions]);
      setOptions(combined);
      setSelectedAnswer(null);
    }
  }, [currentIndex, words, allMeanings]);

  if (loading) {
    return (
      <div className="bg-white rounded-3xl p-6 shadow-sm border border-slate-100 text-center text-slate-400">
        কুইজ লোড হচ্ছে...
      </div>
    );
  }

  if (words.length === 0) {
    return (
      <div className="bg-gradient-to-br from-indigo-50 to-purple-50 rounded-3xl p-6 shadow-sm border border-indigo-100/50 text-center">
        <p className="text-3xl mb-2">🎯</p>
        <p className="font-bold text-indigo-900">আজকের কুইজ পেতে শব্দ শিখুন!</p>
        <p className="text-xs text-indigo-600/80 mt-1">
          উপরে "শব্দ শেখো" বাটনে গিয়ে নতুন শব্দ পড়লে এখানে প্র্যাকটিস খুলে যাবে।
        </p>
      </div>
    );
  }

  const isCompleted = currentIndex >= words.length;
  const currentWord = words[currentIndex % words.length];

  // 💡 আপডেট ১: অপশনে চাপ দিলে ২ সেকেন্ড পর অটোমেটিক পরবর্তী প্রশ্ন আসবে
  function handleSelect(option: string) {
    if (selectedAnswer !== null) return;
    setSelectedAnswer(option);

    setTimeout(() => {
      setCurrentIndex((prev) => prev + 1);
    }, 1500); // ১.৫ থেকে ২ সেকেন্ড সময় দেওয়া হলো
  }

  return (
    <div className="bg-gradient-to-b from-violet-500/5 via-indigo-500/5 to-white rounded-3xl p-6 shadow-md shadow-indigo-100/50 border border-indigo-100/60">
      {/* Quiz Header */}
      <div className="flex items-center justify-between mb-4">
        <span className="bg-indigo-100 text-indigo-700 text-xs font-bold px-3 py-1 rounded-full flex items-center gap-1">
          ⚡ আজকের কুইজ
        </span>
        <span className="text-xs font-bold text-slate-400 bg-slate-100 px-2.5 py-1 rounded-full">
          {Math.min(currentIndex + 1, words.length)} / {words.length}
        </span>
      </div>

      {!isCompleted ? (
        <>
          {/* Target Word Display */}
          <div className="bg-gradient-to-r from-indigo-600 via-purple-600 to-violet-600 text-white rounded-2xl p-6 text-center shadow-lg shadow-indigo-500/20 mb-5 relative overflow-hidden">
            <div className="absolute -right-4 -bottom-4 w-20 h-20 bg-white/10 rounded-full blur-xl" />
            <p className="text-xs text-indigo-200 uppercase tracking-wider mb-1 font-semibold">
              সঠিক বাংলা অর্থ কোনটি?
            </p>
            <h3 className="text-3xl font-extrabold tracking-wide">{currentWord.word}</h3>
          </div>

          {/* Options Grid */}
          <div className="grid grid-cols-1 gap-3">
            {options.map((opt, idx) => {
              let btnStyle =
                "bg-white border-2 border-slate-100 text-slate-700 hover:border-indigo-200 active:scale-[0.99]";

              if (selectedAnswer !== null) {
                if (opt === currentWord.bangla_meaning) {
                  // সঠিক উত্তর (সবুজ)
                  btnStyle =
                    "bg-emerald-500 border-2 border-emerald-500 text-white font-bold shadow-md shadow-emerald-500/20";
                } else if (opt === selectedAnswer) {
                  // ভুল উত্তর (লাল)
                  btnStyle =
                    "bg-rose-500 border-2 border-rose-500 text-white font-bold shadow-md shadow-rose-500/20";
                } else {
                  // বাকিগুলো ফেইড
                  btnStyle = "bg-slate-50 border-2 border-slate-100 text-slate-400 opacity-50";
                }
              }

              return (
                <button
                  key={idx}
                  onClick={() => handleSelect(opt)}
                  disabled={selectedAnswer !== null}
                  className={`p-4 rounded-2xl text-sm text-left transition-all duration-200 font-medium ${btnStyle}`}
                >
                  {opt}
                </button>
              );
            })}
          </div>
        </>
      ) : (
        /* কুইজ শেষ হওয়ার বার্তা */
        <div className="bg-emerald-50 border border-emerald-200 text-emerald-800 text-center font-bold p-6 rounded-2xl">
          <p className="text-3xl mb-2">🎉</p>
          <p className="text-lg">দারুণ! আজকের কুইজ সম্পন্ন হয়েছে!</p>
          <p className="text-xs font-normal text-emerald-600 mt-1">
            আগামীকাল আবার নতুন শব্দ শিখে কুইজ দিন।
          </p>
        </div>
      )}
    </div>
  );
}
