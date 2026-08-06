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

  // মোডাল এবং রিভিশন স্টেট
  const [showWrongModal, setShowWrongModal] = useState(false);
  const [wrongQuestions, setWrongQuestions] = useState<PracticeWord[]>([]);
  const [isReviewPhase, setIsReviewPhase] = useState(false);

  useEffect(() => {
    async function fetchDailyWords() {
      const today = new Date().toISOString().slice(0, 10);

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

      const { data: wordRows } = await supabase
        .from("words")
        .select("id, word, bangla_meaning")
        .in("id", wordIds);

      const { data: randomRows } = await supabase
        .from("words")
        .select("bangla_meaning")
        .limit(50);

      const meanings = (randomRows ?? []).map((r: any) => r.bangla_meaning);

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

  useEffect(() => {
    if (words.length > 0 && currentWord) {
      const wrongOptions = allMeanings
        .filter((m) => m !== currentWord.bangla_meaning)
        .sort(() => 0.5 - Math.random())
        .slice(0, 3);

      const combined = shuffle([currentWord.bangla_meaning, ...wrongOptions]);
      setOptions(combined);
      setSelectedAnswer(null);
      setShowWrongModal(false);
    }
  }, [currentIndex, words, allMeanings]);

  // ভয়েস উচ্চারণ ফাংশন
  const speakText = (text: string) => {
    if (typeof window !== "undefined" && "speechSynthesis" in window) {
      window.speechSynthesis.cancel();
      const utterance = new SpeechSynthesisUtterance(text);
      utterance.lang = "en-US";
      utterance.rate = 0.85;
      window.speechSynthesis.speak(utterance);
    }
  };

  function handleSelect(option: string) {
    if (selectedAnswer !== null || !currentWord) return;
    setSelectedAnswer(option);

    const isCorrect = option === currentWord.bangla_meaning;

    if (isCorrect) {
      // সঠিক হলে ১.২ সেকেন্ডে পরের প্রশ্নে চলে যাবে
      setTimeout(() => {
        goToNextQuestion();
      }, 1200);
    } else {
      // ভুল হলে অডিও বাজবে এবং বটম শীট মোডাল পপ-আপ হবে
      speakText(currentWord.word);
      if (!wrongQuestions.some((q) => q.id === currentWord.id)) {
        setWrongQuestions((prev) => [...prev, currentWord]);
      }
      setTimeout(() => {
        setShowWrongModal(true);
      }, 400);
    }
  }

  function goToNextQuestion() {
    setShowWrongModal(false);
    if (currentIndex + 1 < words.length) {
      setCurrentIndex((prev) => prev + 1);
    } else {
      if (wrongQuestions.length > 0) {
        setWords(wrongQuestions);
        setWrongQuestions([]);
        setCurrentIndex(0);
        setIsReviewPhase(true);
      } else {
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
    <div className="relative bg-gradient-to-b from-violet-500/5 via-indigo-500/5 to-white rounded-3xl p-6 shadow-md shadow-indigo-100/50 border border-indigo-100/60 overflow-hidden">
      {/* Quiz Header */}
      <div className="flex items-center justify-between mb-4">
        <span className="bg-indigo-100 text-indigo-700 text-xs font-bold px-3 py-1 rounded-full flex items-center gap-1">
          ⚡ আজকের কুইজ
        </span>
        <span className="text-xs font-bold text-slate-400 bg-slate-100 px-2.5 py-1 rounded-full">
          {Math.min(currentIndex + 1, words.length)} / {words.length}
        </span>
      </div>

      {/* রিভিশন মোড নোটিশ */}
      {isReviewPhase && !isCompleted && (
        <div className="mb-4 bg-amber-50 border border-amber-200 text-amber-800 text-xs font-bold px-3 py-2 rounded-xl text-center">
          ⚠️ ভুল হওয়া প্রশ্নগুলো পুনরায় প্র্যাকটিস করানো হচ্ছে!
        </div>
      )}

      {!isCompleted && currentWord ? (
        <>
          {/* Target Word Display */}
          <div className="bg-gradient-to-r from-indigo-600 via-purple-600 to-violet-600 text-white rounded-2xl p-6 text-center shadow-lg shadow-indigo-500/20 mb-5 relative overflow-hidden">
            <button
              onClick={() => speakText(currentWord.word)}
              className="absolute right-3 top-3 bg-white/20 hover:bg-white/30 backdrop-blur-md p-2 rounded-full text-white text-xs transition-all"
            >
              🔊
            </button>
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

          {/* 🌟 ডাইনামিক প্রফেশনাল বটম শীট মোডাল (Popup) */}
          {showWrongModal && (
            <div className="fixed inset-0 z-50 flex items-end justify-center bg-slate-900/60 backdrop-blur-sm transition-all duration-300">
              <div className="w-full max-w-md bg-white rounded-t-3xl p-6 shadow-2xl border-t border-slate-100 transform transition-transform animate-in slide-in-from-bottom duration-300">
                
                {/* Header Section */}
                <div className="flex items-center justify-between border-b pb-3 mb-4">
                  <div className="flex items-center gap-2">
                    <div className="w-8 h-8 rounded-full bg-rose-100 text-rose-600 flex items-center justify-center font-bold text-sm">
                      ✕
                    </div>
                    <div>
                      <h4 className="font-extrabold text-slate-800 text-base">ভুল উত্তর!</h4>
                      <p className="text-[11px] text-slate-400">নিচে সঠিক ব্যাখ্যা ও উদাহরণ দেওয়া হলো</p>
                    </div>
                  </div>
                  <button
                    onClick={() => speakText(currentWord.word)}
                    className="bg-slate-100 active:bg-slate-200 p-2 rounded-full text-slate-700 text-xs flex items-center gap-1 font-semibold"
                  >
                    🔊 উচ্চারণ
                  </button>
                </div>

                {/* Correct Meaning Badge */}
                <div className="bg-indigo-50 border border-indigo-100 rounded-2xl p-3 mb-4 flex items-center justify-between">
                  <span className="text-xs font-semibold text-slate-500">শব্দ: <b className="text-slate-800">{currentWord.word}</b></span>
                  <span className="text-xs font-bold text-indigo-700 bg-white px-3 py-1 rounded-xl shadow-sm">
                    অর্থ: {currentWord.bangla_meaning}
                  </span>
                </div>

                {/* 3 Examples List */}
                {currentWord.examples.length > 0 && (
                  <div className="space-y-2 mb-6 max-h-48 overflow-y-auto pr-1">
                    <p className="text-xs font-extrabold text-slate-700 flex items-center gap-1">
                      💡 উদাহরণ বাক্যসমূহ ({currentWord.examples.length}টি):
                    </p>
                    {currentWord.examples.slice(0, 3).map((ex, idx) => (
                      <div
                        key={idx}
                        className="bg-slate-50 p-3 rounded-2xl border border-slate-100 flex items-start justify-between gap-2"
                      >
                        <div>
                          <p className="text-xs font-bold text-slate-800 leading-snug">
                            {idx + 1}. {ex.example_en}
                          </p>
                          <p className="text-[11px] text-slate-500 mt-1 font-medium">
                            👉 {ex.example_bn}
                          </p>
                        </div>
                        <button
                          onClick={() => speakText(ex.example_en)}
                          className="text-xs text-indigo-600 hover:text-indigo-800 p-1 bg-white rounded-lg shadow-sm border border-slate-100"
                          title="বাক্য শুনুন"
                        >
                          🔊
                        </button>
                      </div>
                    ))}
                  </div>
                )}

                {/* Continue Button */}
                <button
                  onClick={goToNextQuestion}
                  className="w-full py-3.5 bg-gradient-to-r from-rose-500 to-indigo-600 hover:from-rose-600 hover:to-indigo-700 text-white font-extrabold rounded-2xl text-sm shadow-lg shadow-indigo-500/25 active:scale-[0.98] transition-all"
                >
                  পরবর্তী প্রশ্ন ➔
                </button>
              </div>
            </div>
          )}
        </>
      ) : (
        /* Quiz Completion View */
        <div className="bg-emerald-50 border border-emerald-200 text-emerald-800 text-center font-bold p-6 rounded-2xl">
          <p className="text-3xl mb-2">🎉</p>
          <p className="text-lg">দারুণ! আজকের কুইজ সম্পন্ন হয়েছে!</p>
          <p className="text-xs font-normal text-emerald-600 mt-1">
            ভুল হওয়া প্রশ্নগুলোও আপনি সফলভাবে রিভিশন করেছেন।
          </p>
        </div>
      )}
    </div>
  );
}
