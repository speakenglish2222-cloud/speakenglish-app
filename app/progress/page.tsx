"use client";

import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabase";
import { getDeviceId } from "@/lib/device";
import OnboardingModal from "@/components/OnboardingModal";

type UserRow = {
  id: string;
  name: string | null;
  current_level: string;
  streak_count: number;
  last_active_date: string | null;
};

const LEVEL_CONFIG: Record<
  string,
  { label: string; bg: string; text: string; border: string; badge: string }
> = {
  level1: {
    label: "🟢 বিগিনার / কিডস",
    bg: "bg-emerald-50",
    text: "text-emerald-700",
    border: "border-emerald-200",
    badge: "from-emerald-500 to-teal-600",
  },
  level2: {
    label: "🔵 বেসিক",
    bg: "bg-sky-50",
    text: "text-sky-700",
    border: "border-sky-200",
    badge: "from-sky-500 to-blue-600",
  },
  level3: {
    label: "🟡 ইন্টারমিডিয়েট",
    bg: "bg-amber-50",
    text: "text-amber-700",
    border: "border-amber-200",
    badge: "from-amber-500 to-orange-600",
  },
  level4: {
    label: "🔴 অ্যাডভান্সড",
    bg: "bg-rose-50",
    text: "text-rose-700",
    border: "border-rose-200",
    badge: "from-rose-500 to-pink-600",
  },
};

export default function ProgressPage() {
  const [user, setUser] = useState<UserRow | null>(null);
  const [loading, setLoading] = useState(true);
  const [showEditModal, setShowEditModal] = useState(false);

  // স্ট্যাটস
  const [completedWords, setCompletedWords] = useState(0);
  const [completedPatterns, setCompletedPatterns] = useState(0);

  useEffect(() => {
    async function fetchProgress() {
      const deviceId = getDeviceId();
      if (!deviceId) return;

      const { data: userData } = await supabase
        .from("users")
        .select("id, name, current_level, streak_count, last_active_date")
        .eq("device_id", deviceId)
        .maybeSingle();

      if (userData) {
        setUser(userData as UserRow);

        // ১. শেখা শব্দ
        const { count: wordCount } = await supabase
          .from("user_word_progress")
          .select("*", { count: "exact", head: true })
          .eq("user_id", userData.id)
          .eq("status", "learned");

        setCompletedWords(wordCount ?? 0);

        // ২. সম্পন্ন হওয়া সেন্টেন্স প্যাটার্ন
        const { count: patternCount } = await supabase
          .from("user_pattern_progress")
          .select("*", { count: "exact", head: true })
          .eq("user_id", userData.id)
          .eq("status", "completed");

        setCompletedPatterns(patternCount ?? 0);
      }

      setLoading(false);
    }

    fetchProgress();
  }, []);

  if (loading) {
    return (
      <main className="min-h-screen p-5 pt-8 max-w-md mx-auto space-y-4 bg-slate-50">
        <div className="h-40 bg-slate-200/70 rounded-3xl animate-pulse" />
        <div className="h-28 bg-slate-200/70 rounded-3xl animate-pulse" />
        <div className="h-28 bg-slate-200/70 rounded-3xl animate-pulse" />
      </main>
    );
  }

  const currentLevelInfo =
    LEVEL_CONFIG[user?.current_level ?? "level1"] ?? LEVEL_CONFIG.level1;
  const todayStr = new Date().toISOString().slice(0, 10);
  const isTodayActive = user?.last_active_date === todayStr;

  // পার্সেন্টেজ হিসাব
  const totalScore = completedWords + completedPatterns * 2;
  const overallPercentage = Math.min(100, Math.round((totalScore / 100) * 100));

  return (
    <main className="p-4 pt-6 pb-24 min-h-screen bg-slate-50 max-w-md mx-auto space-y-5">
      {/* Title */}
      <div className="flex items-center justify-between px-1">
        <div>
          <h1 className="text-2xl font-black text-slate-800 tracking-tight">
            আমার অগ্রগতি
          </h1>
          <p className="text-xs text-slate-500 font-semibold">
            আপনার দৈনন্দিন শেখার হিসাব
          </p>
        </div>
        <div className="w-10 h-10 rounded-2xl bg-white shadow-sm border border-slate-200/80 flex items-center justify-center text-xl">
          🎯
        </div>
      </div>

      {/* Profile Card */}
      <section className="bg-white rounded-3xl p-6 border border-slate-200/80 shadow-sm relative overflow-hidden">
        <div className="flex items-center justify-between mb-5">
          <div className="flex items-center gap-3.5">
            <div className={`w-14 h-14 rounded-2xl bg-gradient-to-tr ${currentLevelInfo.badge} flex items-center justify-center text-white text-2xl font-black shadow-md shadow-indigo-500/20`}>
              {user?.name ? user.name.charAt(0).toUpperCase() : "👤"}
            </div>
            <div>
              <span className="text-[10px] font-extrabold text-slate-400 tracking-wider uppercase">
                শিক্ষার্থী প্রোফাইল
              </span>
              <h2 className="text-xl font-black text-slate-800 leading-tight">
                {user?.name || "ব্যবহারকারী"}
              </h2>
            </div>
          </div>
        </div>

        <div className={`p-3.5 rounded-2xl border ${currentLevelInfo.bg} ${currentLevelInfo.border} flex items-center justify-between`}>
          <div>
            <p className="text-[10px] font-bold text-slate-400 uppercase">
              বর্তমান লেভেল
            </p>
            <p className={`text-xs font-black ${currentLevelInfo.text} mt-0.5`}>
              {currentLevelInfo.label}
            </p>
          </div>

          <button
            onClick={() => setShowEditModal(true)}
            className="px-3.5 py-2 bg-white hover:bg-slate-50 text-slate-700 font-bold text-xs rounded-xl shadow-sm border border-slate-200/80 active:scale-95 transition-all flex items-center gap-1.5"
          >
            <span>✏️</span>
            <span>পরিবর্তন</span>
          </button>
        </div>
      </section>

      {/* Stats Grid */}
      <section className="grid grid-cols-2 gap-4">
        <div className="bg-gradient-to-br from-amber-500 via-orange-500 to-orange-600 text-white rounded-3xl p-5 shadow-lg shadow-orange-500/20 relative overflow-hidden flex flex-col justify-between">
          <div className="flex items-center justify-between mb-3">
            <div className="w-10 h-10 rounded-2xl bg-white/20 backdrop-blur-md flex items-center justify-center text-xl shadow-inner">
              🔥
            </div>
            <span className={`text-[10px] font-black px-2.5 py-1 rounded-full ${isTodayActive ? "bg-white/30 text-white" : "bg-black/20 text-amber-200"}`}>
              {isTodayActive ? "আজ সম্পন্ন ✓" : "বাকি আছে ⏳"}
            </span>
          </div>
          <div>
            <p className="text-3xl font-black tracking-tight mb-0.5">
              {user?.streak_count ?? 0} <span className="text-base font-bold text-amber-100">দিন</span>
            </p>
            <p className="text-[11px] text-amber-100 font-semibold opacity-90">
              ডেইলি স্ট্রিক
            </p>
          </div>
        </div>

        <div className="bg-gradient-to-br from-indigo-500 via-purple-500 to-purple-600 text-white rounded-3xl p-5 shadow-lg shadow-indigo-500/20 relative overflow-hidden flex flex-col justify-between">
          <div className="w-10 h-10 rounded-2xl bg-white/20 backdrop-blur-md flex items-center justify-center text-xl mb-3 shadow-inner">
            📚
          </div>
          <div>
            <p className="text-3xl font-black tracking-tight mb-0.5">
              {completedWords} <span className="text-base font-bold text-indigo-100">টি</span>
            </p>
            <p className="text-[11px] text-indigo-100 font-semibold opacity-90">
              শেখা শব্দাবলী
            </p>
          </div>
        </div>
      </section>

      {/* Sentence Practice Stats Card */}
      <section className="bg-white rounded-3xl p-5 border border-slate-200/80 shadow-sm flex items-center gap-4 relative overflow-hidden">
        <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-emerald-400 to-teal-500 text-white flex items-center justify-center text-2xl font-bold flex-shrink-0 shadow-md shadow-teal-500/20">
          💬
        </div>
        <div className="flex-1">
          <div className="flex justify-between items-center mb-1">
            <p className="text-lg font-black text-slate-800">
              {completedPatterns} টি প্যাটার্ন
            </p>
            <span className="text-[10px] font-bold text-teal-600 bg-teal-50 px-2 py-0.5 rounded-full border border-teal-100">
              Mastered
            </span>
          </div>
          <p className="text-xs text-slate-500 font-medium">
            বাক্য তৈরির অনুশীলন সফলভাবে সম্পন্ন হয়েছে
          </p>
        </div>
      </section>

      {/* 📺 🌊 টিভি সংবাদের মতো বড় ও ডায়নামিক লাইভ ওয়েভ গ্রাফ (Live Animated Wave Graph) */}
      <section className="bg-gradient-to-br from-slate-900 via-indigo-950 to-slate-900 text-white rounded-3xl p-6 shadow-2xl relative overflow-hidden border border-indigo-500/30">
        
        {/* টপ হেডার ও লাইভ ব্লিংকিং ডট */}
        <div className="flex items-center justify-between mb-4 z-10 relative">
          <div>
            <div className="flex items-center gap-2">
              <span className="w-2.5 h-2.5 rounded-full bg-emerald-400 animate-ping" />
              <span className="text-[11px] font-black text-emerald-400 uppercase tracking-widest">
                LIVE ACTIVITY GRAPH
              </span>
            </div>
            <h3 className="text-xl font-black text-white mt-1">
              লার্নিং ফ্রিকোয়েন্সি 📊
            </h3>
          </div>
          <div className="text-right">
            <p className="text-2xl font-black text-amber-400">
              {overallPercentage}%
            </p>
            <p className="text-[10px] text-slate-400 font-bold uppercase">
              দক্ষতার লেভেল
            </p>
          </div>
        </div>

        {/* 🌊 অ্যানিমেটেড ওয়েভ সাউন্ড-গ্রাফ উইজেট */}
        <div className="h-32 w-full my-2 flex items-end justify-between gap-1.5 px-2 relative z-10">
          {[40, 75, 45, 90, 60, 100, 70, 85, 50, 95, 65, 80, 55, 90, 75].map(
            (height, idx) => (
              <div
                key={idx}
                className="w-full bg-gradient-to-t from-indigo-500 via-purple-500 to-amber-400 rounded-full transition-all duration-500 animate-pulse"
                style={{
                  height: `${Math.max(15, (height * (overallPercentage || 25)) / 100)}%`,
                  animationDelay: `${idx * 150}ms`,
                  animationDuration: "1.2s",
                }}
              />
            )
          )}
        </div>

        {/* নিচের গ্রিড ও ক্যাপশন */}
        <div className="pt-3 border-t border-white/10 flex items-center justify-between text-[11px] font-medium text-slate-400 z-10 relative">
          <span>📉 নরমাল স্পিড</span>
          <span className="text-amber-300 font-bold">⚡ রিয়েল-টাইম ডায়নামিক</span>
          <span>📈 হাই পিক</span>
        </div>

        {/* ব্যাকগ্রাউন্ড গ্লো ইফেক্ট */}
        <div className="absolute -bottom-10 -right-10 w-40 h-40 bg-indigo-500/20 rounded-full blur-3xl pointer-events-none" />
      </section>

      {/* Motivational Daily Status Card */}
      <section className="bg-white rounded-3xl p-5 border border-slate-200/80 shadow-sm flex items-center justify-between">
        <div className="space-y-1">
          <p className="text-xs font-bold text-slate-400 uppercase tracking-wider">
            💡 আজকের টিপস
          </p>
          <p className="text-xs text-slate-600 font-medium max-w-[220px]">
            প্রতিদিন অন্তত ৫টি করে শব্দ ও ১টি করে বাক্য রিভিশন দিন!
          </p>
        </div>
        <div className="w-12 h-12 rounded-2xl bg-amber-100 text-amber-600 flex items-center justify-center text-2xl flex-shrink-0">
          ⚡
        </div>
      </section>

      {/* Reusable Edit Level Modal */}
      {showEditModal && user && (
        <OnboardingModal
          mode="edit"
          userId={user.id}
          initialName={user.name ?? ""}
          initialLevel={user.current_level}
          onComplete={(updatedUser) => {
            setUser((prev) =>
              prev
                ? {
                    ...prev,
                    name: updatedUser.name,
                    current_level: updatedUser.current_level,
                  }
                : null
            );
            setShowEditModal(false);
          }}
          onClose={() => setShowEditModal(false)}
        />
      )}
    </main>
  );
}
