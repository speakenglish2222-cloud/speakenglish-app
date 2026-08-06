"use client";

import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabase";

type Example = {
  example_en: string;
  example_bn: string;
};

type PracticeWord = {
  id: number;
  word: string;
  bangla_meaning: string;
  examples: Example[];
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

  // ভুল হওয়া প্রশ্ন এবং রিভিশন স্টেট
  const [wrongQuestions, setWrongQuestions] = useState<PracticeWord[]>([]);
  const [isReviewPhase, setIsReviewPhase] = useState(false);

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

      // ২. শব্দের বিস্তারিত তথ্য আনা
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

      // ৪. ৩টি করে উদাহরণ বাক্য আনা (word_examples টেবিল থেকে)
      const { data: exampleRows } = await supabase
        .from("word_examples")
        .select("word_id, example_en, example_bn, order_index")
        .in("word_id", wordIds)
        .order("order_index", { ascending: true });

      const groupedExamples: Record<number, Example[]> = {};
      (exampleRows ?? []).forEach((r: any) => {
        if (!groupedExamples[r.word_id]) groupedExamples[r.word_id] = [];
        groupedExamples[r.word_id].push({
          example_en: r.example_en,
          example_bn: r.example_bn,
        });
      });

      const fullWordList: PracticeWord[] = ((wordRows as any[]) ?? []).map((w) => ({
        id: w.id,
        word: w.word,
        bangla_meaning: w.bangla_meaning,
        examples: groupedExamples[w.id] ?? [],
      }));

      setWords(shuffle(fullWordList));
      setAllMeanings(meanings);
      setLoading(false);
    }

    if (userId) fetchDailyWords();
  }, [userId]);

  const currentWord = words[currentIndex];

  // অপশন তৈরি
  useEffect(() => {
    if (words.length > 0 && currentWord) {
      const wrongOptions = allMeanings
        .filter((m) => m !== currentWord.bangla_meaning)
        .sort(() => 0.5 - Math.random())
        .slice(0, 3);

      const combined = shuffle([currentWord.bangla_meaning, ...wrongOptions]);
      setOptions(combined);
      setSelectedAnswer(null);
    }
  }, [currentIndex, words, allMeanings]);

  // ভয়েস উচ্চারণ
  const speakWord = (text: string) => {
    if (typeof window !== "undefined" && "speechSynthesis" in window) {
      window.speechSynthesis.cancel();
      const utterance = new SpeechSynthesisUtterance(text);
      utterance.lang = "en-US";
      utterance.rate = 0.85;
      window.speechSynthesis.speak(utterance);
    }
  };

  // উত্তর সিলেক্ট করার লজিক
  function handleSelect(option: string) {
    if (selectedAnswer !== null || !currentWord) return;
    setSelectedAnswer(option);

    const isCorrect = option === currentWord.bangla_meaning;

    if (isCorrect) {
      // সঠিক হলে ১.৫ সেকেন্ড পর পরবর্তী প্রশ্ন
      setTimeout(() => {
        goToNextQuestion();
      }, 1500);
    } else {
      // ভুল হলে ভয়েস বাজবে এবং ভুল প্রশ্ন সেভ হবে
      speakWord(currentWord.word);
      if (!wrongQuestions.some((q) => q.id === currentWord.id)) {
        setWrongQuestions((prev) => [...prev, currentWord]);
      }
    }
  }

  function goToNextQuestion() {
    if (currentIndex + 1 < words.length) {
      setCurrentIndex((prev) => prev + 1);
      setSelectedAnswer(null);
    } else {
      // যদি ভুল প্রশ্ন থাকে, তবে সেগুলো আবার রিভিশন করাবে
      if (wrongQuestions.length > 0) {
        setWords(wrongQuestions);
        setWrongQuestions([]);
        setCurrentIndex(0);
        setSelectedAnswer(null);
        setIsReviewPhase(true);
      } else {
        // সব সঠিক হলে পরবর্তী ইনডেক্স দিয়ে সম্পন্ন দেখানো
        setCurrentIndex((prev) => prev + 1);
      }
    }
  }

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

      {/* রিভিশন অ্যালার্ট */}
      {isReviewPhase && !isCompleted && (
        <div className="mb-4 bg-amber-50 border border-amber-200 text-amber-800 text-xs font-bold px-3 py-2 rounded-xl text-center">
          ⚠️ ভুল হওয়া প্রশ্নগুলো পুনরায় প্র্যাকটিস করানো হচ্ছে!
        </div>
      )}

      {!isCompleted && currentWord ? (
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
                  btnStyle =
                    "bg-emerald-500 border-2 border-emerald-500 text-white font-bold shadow-md shadow-emerald-500/20";
                } else if (opt === selectedAnswer) {
                  btnStyle =
                    "bg-rose-500 border-2 border-rose-500 text-white font-bold shadow-md shadow-rose-500/20";
                } else {
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

          {/* 💡 ভুল হলে ৩টি উদাহরণ বাক্য প্রদর্শন ও পরবর্তী বাটন */}
          {selectedAnswer !== null && selectedAnswer !== currentWord.bangla_meaning && (
            <div className="bg-rose-50 border border-rose-200 text-rose-950 rounded-2xl p-4 mt-4 transition-all animate-fadeIn">
              <div className="flex items-center justify-between mb-2">
                <p className="font-extrabold text-xs text-rose-700">
                  ❌ ভুল উত্তর! সঠিক ব্যাখ্যা ও উদাহরণ:
                </p>
                <button
                  onClick={() => speakWord(currentWord.word)}
                  className="bg-white p-1.5 rounded-full shadow-sm text-xs"
                  title="উচ্চারণ শুনুন"
                >
                  🔊
                </button>
              </div>

              <p className="text-xs font-bold mb-2">
                সঠিক অর্থ: <span className="text-indigo-600">{currentWord.bangla_meaning}</span>
              </p>

              {/* ৩টি উদাহরণ বাক্য */}
              {currentWord.examples.length > 0 && (
                <div className="flex flex-col gap-1.5 mt-2">
                  <p className="text-[11px] font-bold text-slate-500">উদাহরণ বাক্যসমূহ (৩টি):</p>
                  {currentWord.examples.slice(0, 3).map((ex, idx) => (
                    <div key={idx} className="bg-white/90 p-2.5 rounded-xl border border-rose-100">
                      <p className="text-xs font-semibold text-slate-800">
                        {idx + 1}. {ex.example_en}
                      </p>
                      <p className="text-[11px] text-slate-500 mt-0.5">
                        👉 {ex.example_bn}
                      </p>
                    </div>
                  ))}
                </div>
              )}

              <button
                onClick={goToNextQuestion}
                className="w-full font-bold py-3 rounded-xl mt-3 text-white text-xs bg-rose-600 hover:bg-rose-700 shadow-md transition-all"
              >
                পরবর্তী প্রশ্ন ➔
              </button>
            </div>
          )}
        </>
      ) : (
        /* কুইজ শেষ হওয়ার বার্তা */
        <div className="bg-emerald-50 border border-emerald-200 text-emerald-800 text-center font-bold p-6 rounded-2xl">
          <p className="text-3xl mb-2">🎉</p>
          <p className="text-lg">দারুণ! আজকের কুইজ সম্পন্ন হয়েছে!</p>
          <p className="text-xs font-normal text-emerald-600 mt-1">
            ভুল হওয়া প্রশ্নগুলোও আপনি সঠিকভাবে সমাধান করেছেন।
          </p>
        </div>
      )}
    </div>
  );
}
