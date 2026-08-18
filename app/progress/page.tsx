"use client";

import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabase";
import { getDeviceId } from "@/lib/device";
import OnboardingModal from "@/components/OnboardingModal";

type UserRow = {
  id: string;
  device_id: string;
  name: string | null;
  current_level: string;
  streak_count: number;
  challenge_start_date: string;
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

const WEEKDAY_LABELS_BN = ["শনি", "রবি", "সোম", "মঙ্গল", "বুধ", "বৃহস্পতি", "শুক্র"];
const JS_DAY_TO_LABEL_INDEX = [1, 2, 3, 4, 5, 6, 0];

function dateStr(d: Date) {
  return d.toISOString().slice(0, 10);
}

export default function ProgressPage() {
  const [user, setUser] = useState<UserRow | null>(null);
  const [loading, setLoading] = useState(true);
  const [showEditModal, setShowEditModal] = useState(false);

  const [learnedWords, setLearnedWords] = useState(0);
  const [bookmarkedWords, setBookmarkedWords] = useState(0);
  const [categoriesTouched, setCategoriesTouched] = useState(0);
  const [patternsCompleted, setPatternsCompleted] = useState(0);
  const [activeDays, setActiveDays] = useState<Set<string>>(new Set());

  useEffect(() => {
    init();
  }, []);

  async function init() {
    const deviceId = getDeviceId();
    if (!deviceId) return;

    const { data: userRow } = await supabase
      .from("users")
      .select("*")
      .eq("device_id", deviceId)
      .maybeSingle();

    if (!userRow) {
      setLoading(false);
      return;
    }
    setUser(userRow as UserRow);

    const userId = userRow.id;

    const [
      { count: learnedCount },
      { count: bookmarkCount },
      { data: catRows },
      { count: patternCount },
      { data: activityRows },
    ] = await Promise.all([
      supabase
        .from("user_word_progress")
        .select("*", { count: "exact", head: true })
        .eq("user_id", userId)
        .eq("status", "learned"),
      supabase
        .from("user_word_progress")
        .select("*", { count: "exact", head: true })
        .eq("user_id", userId)
        .eq("is_bookmarked", true),
      supabase
        .from("user_category_progress")
        .select("category_id")
        .eq("user_id", userId),
      supabase
        .from("user_pattern_progress")
        .select("*", { count: "exact", head: true })
        .eq("user_id", userId)
        .eq("status", "completed"),
      supabase
        .from("user_activity_log")
        .select("activity_date")
        .eq("user_id", userId)
        .gte(
          "activity_date",
          dateStr(new Date(Date.now() - 6 * 24 * 60 * 60 * 1000))
        ),
    ]);

    setLearnedWords(learnedCount ?? 0);
    setBookmarkedWords(bookmarkCount ?? 0);
    setCategoriesTouched(catRows?.length ?? 0);
    setPatternsCompleted(patternCount ?? 0);
    setActiveDays(
      new Set((activityRows ?? []).map((r: any) => r.activity_date))
    );

    setLoading(false);
  }

  if (loading) {
    return (
      <main className="min-h-screen p-5 pt-8 max-w-md mx-auto space-y-4 bg-slate-50">
        <div className="h-44 bg-slate-200/70 rounded-3xl animate-pulse" />
        <div className="h-28 bg-slate-200/70 rounded-3xl animate-pulse" />
        <div className="h-32 bg-slate-200/70 rounded-3xl animate-pulse" />
      </main>
    );
  }

  if (!user) {
    return (
      <main className="p-5 pt-12 text-center max-w-md mx-auto">
        <p className="text-slate-500 font-semibold">
          প্রথমে হোম পেজে গিয়ে আপনার প্রোফাইল সেটআপ করুন।
        </p>
      </main>
    );
  }

  const currentLevelInfo =
    LEVEL_CONFIG[user.current_level] ?? LEVEL_CONFIG.level1;

  const daysSinceStart = Math.min(
    60,
    Math.floor(
      (Date.now() - new Date(user.challenge_start_date || Date.now()).getTime()) /
        (1000 * 60 * 60 * 24)
    ) + 1
  );
  const progressPercent = Math.round((daysSinceStart / 60) * 100);

  const today = new Date();
  const last7: { label: string; active: boolean }[] = new Array(7);
  for (let i = 0; i < 7; i++) {
    const d = new Date(today);
    d.setDate(today.getDate() - i);
    const jsDay = d.getDay();
    const labelIndex = JS_DAY_TO_LABEL_INDEX[jsDay];
    last7[labelIndex] = {
      label: WEEKDAY_LABELS_BN[labelIndex],
      active: activeDays.has(dateStr(d)),
    };
  }

  return (
    <main className="p-4 pt-6 pb-24 min-h-screen bg-gradient-to-b from-slate-50 via-indigo-50/20 to-slate-100 max-w-md mx-auto space-y-5">
      {/* Title */}
      <div className="flex items-center justify-between px-1">
        <div>
          <h1 className="text-2xl font-black text-slate-800 tracking-tight">
            প্রোগ্রেস ড্যাশবোর্ড
          </h1>
          <p className="text-xs text-slate-500 font-semibold">
            আপনার দৈনন্দিন শেখার সম্পূর্ণ হিসাব
          </p>
        </div>
        <div className="w-10 h-10 rounded-2xl bg-white shadow-sm border border-slate-200/80 flex items-center justify-center text-xl">
          🎯
        </div>
      </div>

      {/* Dynamic Profile Card */}
      <section className="bg-white rounded-3xl p-5 border border-slate-200/80 shadow-sm space-y-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3.5">
            <div
              className={`w-14 h-14 rounded-2xl bg-gradient-to-tr ${currentLevelInfo.badge} flex items-center justify-center text-white text-2xl font-black shadow-md shadow-indigo-500/20`}
            >
              {user.name ? user.name.charAt(0).toUpperCase() : "👤"}
            </div>
            <div>
              <span className="text-[10px] font-extrabold text-slate-400 tracking-wider uppercase">
                শিক্ষার্থী প্রোফাইল
              </span>
              <h2 className="text-xl font-black text-slate-800 leading-tight">
                {user.name || "ব্যবহারকারী"}
              </h2>
            </div>
          </div>
          <div className="bg-orange-50 text-orange-600 border border-orange-100 px-3 py-1 rounded-full text-xs font-black flex items-center gap-1">
            🔥 {user.streak_count} দিন
          </div>
        </div>

        {/* Level Tag & Change Button */}
        <div
          className={`p-3.5 rounded-2xl border ${currentLevelInfo.bg} ${currentLevelInfo.border} flex items-center justify-between`}
        >
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

      {/* ৬০ দিনের চ্যালেঞ্জ */}
      <section className="bg-white rounded-3xl p-5 border border-slate-200/80 shadow-sm space-y-3">
        <div className="flex justify-between items-center">
          <h3 className="font-extrabold text-slate-800 text-sm flex items-center gap-1.5">
            <span>🏆</span> ৬০ দিনের চ্যালেঞ্জ
          </h3>
          <span className="text-xs font-black text-indigo-600 bg-indigo-50 px-2.5 py-1 rounded-full border border-indigo-100">
            {progressPercent}%
          </span>
        </div>
        <p className="text-xs text-slate-500 font-medium">
          {daysSinceStart} তম দিনের লক্ষ্য পূরণ করা বাকি 🎯
        </p>
        <div className="w-full bg-slate-100 rounded-full h-3 overflow-hidden p-0.5 border border-slate-200/50">
          <div
            className="bg-gradient-to-r from-indigo-500 via-purple-500 to-emerald-400 h-full rounded-full transition-all duration-700 ease-out"
            style={{ width: `${progressPercent}%` }}
          />
        </div>
      </section>

      {/* Stats Grid */}
      <section className="grid grid-cols-2 gap-4">
        <div className="bg-gradient-to-br from-indigo-500 via-purple-500 to-purple-600 text-white rounded-3xl p-4 shadow-lg shadow-indigo-500/20 flex flex-col justify-between">
          <div className="w-9 h-9 rounded-xl bg-white/20 backdrop-blur-md flex items-center justify-center text-lg mb-2">
            📚
          </div>
          <div>
            <p className="text-2xl font-black">{learnedWords}টি</p>
            <p className="text-[11px] text-indigo-100 font-semibold opacity-90 mt-0.5">
              শেখা শব্দ (★ {bookmarkedWords} বুকমার্ক)
            </p>
          </div>
        </div>

        <div className="bg-gradient-to-br from-emerald-500 via-teal-500 to-teal-600 text-white rounded-3xl p-4 shadow-lg shadow-teal-500/20 flex flex-col justify-between">
          <div className="w-9 h-9 rounded-xl bg-white/20 backdrop-blur-md flex items-center justify-center text-lg mb-2">
            💬
          </div>
          <div>
            <p className="text-2xl font-black">{patternsCompleted}টি</p>
            <p className="text-[11px] text-teal-100 font-semibold opacity-90 mt-0.5">
              প্যাটার্ন ({categoriesTouched} ক্যাটাগরি)
            </p>
          </div>
        </div>
      </section>

      {/* সাপ্তাহিক অ্যাক্টিভিটি Bar Graph */}
      <section className="bg-white rounded-3xl p-5 border border-slate-200/80 shadow-sm space-y-4">
        <div className="flex items-center justify-between">
          <h3 className="font-extrabold text-slate-800 text-sm flex items-center gap-1.5">
            <span>📅</span> এই সপ্তাহের অ্যাক্টিভিটি
          </h3>
          <span className="text-[10px] text-slate-400 font-bold">গত ৭ দিন</span>
        </div>
        <div className="flex justify-between items-end h-24 pt-2">
          {last7.map((day, i) => (
            <div key={i} className="flex flex-col items-center gap-2 flex-1">
              <div className="h-16 w-full flex items-end justify-center">
                <div
                  className={`w-3.5 rounded-full transition-all duration-500 ${
                    day.active
                      ? "bg-gradient-to-t from-indigo-600 to-purple-500 h-14 shadow-md shadow-indigo-500/30"
                      : "bg-slate-100 h-3"
                  }`}
                />
              </div>
              <span className="text-[10px] font-bold text-slate-400">
                {day.label}
              </span>
            </div>
          ))}
        </div>
      </section>

      {/* Modal */}
      {showEditModal && (
        <OnboardingModal
          mode="edit"
          userId={user.id}
          initialName={user.name ?? ""}
          initialLevel={user.current_level}
          onComplete={(updated) => {
            setUser({ ...user, ...updated } as UserRow);
            setShowEditModal(false);
          }}
          onClose={() => setShowEditModal(false)}
        />
      )}
    </main>
  );
}
