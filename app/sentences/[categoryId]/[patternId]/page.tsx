"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { supabase } from "@/lib/supabase";
import { getDeviceId } from "@/lib/device";

type PatternInfo = {
  pattern_en: string;
  pattern_bn: string;
  category_id: number;
};

type Example = {
  example_en: string;
  example_bn: string;
};

export default function PatternLearnPage() {
  const params = useParams();
  const router = useRouter();
  const categoryId = Number(params.categoryId);
  const patternId = Number(params.patternId);

  const [userId, setUserId] = useState<string | null>(null);
  const [pattern, setPattern] = useState<PatternInfo | null>(null);
  const [examples, setExamples] = useState<Example[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [playingText, setPlayingText] = useState<string | null>(null);

  useEffect(() => {
    async function init() {
      const deviceId = getDeviceId();
      if (!deviceId) return;

      const { data: user } = await supabase
        .from("users")
        .select("id")
        .eq("device_id", deviceId)
        .maybeSingle();
      if (user) setUserId(user.id);

      const { data: patternRow } = await supabase
        .from("sentence_patterns")
        .select("pattern_en, pattern_bn, category_id")
        .eq("id", patternId)
        .maybeSingle();
      setPattern(patternRow as PatternInfo);

      const { data: exampleRows } = await supabase
        .from("pattern_examples")
        .select("example_en, example_bn")
        .eq("pattern_id", patternId)
        .order("order_index", { ascending: true });
      setExamples((exampleRows as Example[]) ?? []);

      setLoading(false);
    }
    init();
  }, [patternId]);

  // 🔊 শ্রুতিমধুর উচ্চারণের জন্য আপগ্রেডেড টেক্সট-টু-স্পিচ মেথড
  function speak(text: string) {
    if (typeof window === "undefined" || !("speechSynthesis" in window)) return;

    window.speechSynthesis.cancel(); // আগের কোনো সাউন্ড চলতে থাকলে তা বন্ধ করবে

    const utterance = new SpeechSynthesisUtterance(text);
    utterance.lang = "en-US";
    utterance.rate = 0.88; // পড়ার স্পিড সামান্য ধীর করা হয়েছে যাতে শ্রুতিমধুর ও স্পষ্ট শোনায়
    utterance.pitch = 1.0; // ন্যাচারাল টিউন
    utterance.volume = 1.0;

    utterance.onstart = () => setPlayingText(text);
    utterance.onend = () => setPlayingText(null);
    utterance.onerror = () => setPlayingText(null);

    window.speechSynthesis.speak(utterance);
  }

  async function handleContinue() {
    if (!userId) return;
    setSaving(true);

    await supabase.from("user_pattern_progress").upsert(
      {
        user_id: userId,
        pattern_id: patternId,
        status: "completed",
        completed_at: new Date().toISOString(),
      },
      { onConflict: "user_id,pattern_id" }
    );

    const { data: allPatterns } = await supabase
      .from("sentence_patterns")
      .select("id")
      .eq("category_id", categoryId);

    const { data: completedRows } = await supabase
      .from("user_pattern_progress")
      .select("pattern_id")
      .eq("user_id", userId)
      .eq("status", "completed")
      .in(
        "pattern_id",
        (allPatterns ?? []).map((p: any) => p.id)
      );

    const total = allPatterns?.length ?? 0;
    const completed = completedRows?.length ?? 0;
    const percent = total > 0 ? Math.round((completed / total) * 100) : 0;
    const catStatus = completed >= total ? "completed" : "in_progress";

    await supabase.from("user_category_progress").upsert(
      {
        user_id: userId,
        category_id: categoryId,
        status: catStatus,
        progress_percent: percent,
      },
      { onConflict: "user_id,category_id" }
    );

    setSaving(false);
    router.push(`/sentences/${categoryId}`);
  }

  if (loading || !pattern) {
    return (
      <main className="min-h-screen bg-slate-50 p-5 pt-8">
        <div className="max-w-md mx-auto space-y-4">
          <div className="h-10 w-2/3 bg-slate-200/60 rounded-2xl animate-pulse" />
          <div className="h-40 bg-slate-200/60 rounded-3xl animate-pulse" />
          <div className="h-20 bg-slate-200/60 rounded-2xl animate-pulse" />
          <div className="h-20 bg-slate-200/60 rounded-2xl animate-pulse" />
        </div>
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-slate-50 pt-6 pb-28 px-4 max-w-md mx-auto">
      {/* Header Section */}
      <div className="flex items-center gap-3.5 mb-6 px-1">
        <button
          onClick={() => router.push(`/sentences/${categoryId}`)}
          className="w-10 h-10 rounded-2xl bg-white border border-slate-200/80 shadow-sm flex items-center justify-center text-slate-700 text-lg hover:bg-slate-50 active:scale-95 transition-all flex-shrink-0"
        >
          ←
        </button>
        <div>
          <h1 className="text-xl font-extrabold text-slate-800 tracking-tight">
            বাক্য শেখো
          </h1>
          <p className="text-xs font-medium text-slate-500 mt-0.5">
            প্যাটার্নটি ভালোভাবে দেখে নিন ও উচ্চারণ শুনুন
          </p>
        </div>
      </div>

      {/* Main Pattern Hero Card */}
      <div className="bg-gradient-to-br from-amber-500 via-orange-500 to-orange-600 rounded-3xl p-6 text-white shadow-xl shadow-orange-500/20 mb-6 relative overflow-hidden">
        <div className="absolute -right-6 -bottom-6 w-32 h-32 bg-white/10 rounded-full blur-xl pointer-events-none" />

        <div className="flex justify-between items-start gap-4">
          <div className="flex-1">
            <span className="inline-block px-3 py-1 rounded-full bg-white/20 text-white text-[10px] font-bold tracking-wider uppercase mb-2">
              মূল প্যাটার্ন
            </span>
            <h2 className="text-2xl font-black tracking-wide leading-tight">
              {pattern.pattern_en}
            </h2>
          </div>
          
          {/* Main Speaker Button */}
          <button
            onClick={() => speak(pattern.pattern_en)}
            className={`w-12 h-12 rounded-2xl backdrop-blur-md flex items-center justify-center text-xl transition-all shadow-md flex-shrink-0 active:scale-90 ${
              playingText === pattern.pattern_en
                ? "bg-white text-orange-600 animate-pulse"
                : "bg-white/20 text-white hover:bg-white/30"
            }`}
            title="উচ্চারণ শুনুন"
          >
            🔊
          </button>
        </div>
        <p className="text-orange-50 text-sm font-medium mt-3 border-t border-white/20 pt-3 leading-relaxed">
          {pattern.pattern_bn}
        </p>
      </div>

      {/* Examples Header */}
      <div className="flex items-center justify-between mb-3 px-1">
        <h3 className="text-xs font-bold text-slate-500 uppercase tracking-wider">
          উদাহরণ বাক্যসমূহ ({examples.length})
        </h3>
        <span className="text-[11px] font-semibold text-orange-600 bg-orange-100/80 px-2.5 py-0.5 rounded-full">
          স্পিকারে চাপ দিয়ে শুনুন
        </span>
      </div>

      {/* Example Sentences List */}
      <div className="flex flex-col gap-3 mb-8">
        {examples.map((ex, i) => {
          const isPlaying = playingText === ex.example_en;

          return (
            <div
              key={i}
              className="bg-white border border-slate-200/80 rounded-2xl p-4 shadow-sm hover:shadow-md transition-all flex items-center justify-between gap-3.5"
            >
              {/* Left Side: Sentence Text */}
              <div className="flex-1">
                <p className="font-bold text-slate-800 text-base leading-snug">
                  {ex.example_en}
                </p>
                <p className="text-xs font-medium text-slate-500 mt-1 leading-relaxed">
                  {ex.example_bn}
                </p>
              </div>

              {/* Right Side: Word-Style Speaker Button */}
              <button
                onClick={() => speak(ex.example_en)}
                className={`w-10 h-10 rounded-xl flex items-center justify-center text-base flex-shrink-0 transition-all active:scale-90 border ${
                  isPlaying
                    ? "bg-orange-500 text-white border-orange-500 shadow-md shadow-orange-500/30 scale-105"
                    : "bg-slate-50 text-orange-600 border-slate-200/80 hover:bg-orange-50 hover:border-orange-200"
                }`}
                title="উচ্চারণ শুনুন"
              >
                🔊
              </button>
            </div>
          );
        })}
      </div>

      {/* Bottom Action Button */}
      <button
        onClick={handleContinue}
        disabled={saving}
        className="w-full bg-gradient-to-r from-amber-500 to-orange-500 hover:from-amber-600 hover:to-orange-600 active:scale-[0.98] text-white font-bold py-4 rounded-2xl shadow-lg shadow-orange-500/25 transition-all flex items-center justify-center gap-2 disabled:opacity-70"
      >
        {saving ? (
          <div className="w-6 h-6 border-2 border-white/30 border-t-white rounded-full animate-spin" />
        ) : (
          <>
            <span>পরবর্তী ধাপে যান</span>
            <span className="text-lg">➜</span>
          </>
        )}
      </button>
    </main>
  );
}
