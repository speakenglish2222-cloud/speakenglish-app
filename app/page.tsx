"use client";

import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabase";
import { getDeviceId } from "@/lib/device";
import TodayPractice from "@/components/TodayPractice";
import OnboardingModal from "@/components/OnboardingModal";

type UserRow = {
  id: string;
  name?: string | null;
  device_id: string;
  current_level: string;
  streak_count: number;
  challenge_start_date: string;
};

const LEVEL_LABELS: Record<string, string> = {
  level1: "বিগিনার / কিডস ভোকাবুলারি",
  level2: "বেসিক ভোকাবুলারি",
  level3: "ইন্টারমিডিয়েট (স্পোকেন ও ক্যারিয়ার)",
  level4: "অ্যাডভান্সড ভোকাবুলারি",
};

export default function HomePage() {
  const [user, setUser] = useState<UserRow | null>(null);
  const [loading, setLoading] = useState(true);

  // ⚡ অনবোর্ডিং মডালের জন্য নতুন স্টেটসমূহ
  const [needsOnboarding, setNeedsOnboarding] = useState(false);
  const [deviceId, setDeviceId] = useState("");

  useEffect(() => {
    async function loadOrCreateUser() {
      const devId = getDeviceId();
      if (!devId) return;
      setDeviceId(devId);

      const { data: existing } = await supabase
        .from("users")
        .select("*")
        .eq("device_id", devId)
        .maybeSingle();

      if (existing) {
        setUser(existing as UserRow);
      } else {
        // 🚀 ইউজার না থাকলে স্বয়ংক্রিয়ভাবে ডাটাবেজে রো তৈরি না করে মডাল দেখানো হবে
        setNeedsOnboarding(true);
      }
      setLoading(false);
    }

    loadOrCreateUser();
  }, []);

  const daysSinceStart = user
    ? Math.min(
        60,
        Math.floor(
          (Date.now() - new Date(user.challenge_start_date).getTime()) /
            (1000 * 60 * 60 * 24)
        ) + 1
      )
    : 1;

  const progressPercent = Math.round((daysSinceStart / 60) * 100);

  return (
    <main className="p-5 pt-8 min-h-screen bg-gradient-to-b from-emerald-50/50 via-teal-50/30 to-slate-50 relative">
      {/* Hero Section with Vibrant Gradient */}
      <section className="bg-gradient-to-r from-teal-600 via-emerald-600 to-green-500 text-white rounded-3xl p-6 mb-5 shadow-lg shadow-teal-600/20">
        <p className="text-sm font-medium opacity-90">স্বাগতম</p>
        <h1 className="text-2xl font-extrabold mb-3 tracking-wide">
          Hi, {user?.name ? user.name : "শিক্ষার্থী"} 👋
        </h1>
        <div className="flex flex-wrap gap-2">
          <span className="bg-white/20 backdrop-blur-md text-white text-xs font-semibold px-3 py-1.5 rounded-full border border-white/20">
            {loading ? "..." : LEVEL_LABELS[user?.current_level ?? "level1"]}
          </span>
          <span className="bg-amber-400/30 backdrop-blur-md text-amber-100 text-xs font-bold px-3 py-1.5 rounded-full border border-amber-300/30 flex items-center gap-1">
            🔥 {loading ? "..." : user?.streak_count ?? 0} দিন
          </span>
        </div>
      </section>

      {/* Challenge Progress Card */}
      <section className="bg-white rounded-3xl p-5 shadow-md shadow-slate-100 border border-slate-100 mb-5">
        <div className="flex items-center justify-between mb-2">
          <h2 className="font-bold text-slate-800 text-base">৬০ দিনের চ্যালেঞ্জ</h2>
          <span className="text-xs font-bold px-2.5 py-1 bg-emerald-100 text-emerald-700 rounded-full">
            {progressPercent}%
          </span>
        </div>
        <p className="text-slate-500 text-xs mb-3">
          {daysSinceStart} তম দিনের লক্ষ্য পূরণ করা বাকি 🎯
        </p>
        <div className="w-full bg-slate-100 rounded-full h-3 overflow-hidden p-0.5">
          <div
            className="bg-gradient-to-r from-emerald-500 to-teal-500 h-full rounded-full transition-all duration-500"
            style={{ width: `${progressPercent}%` }}
          />
        </div>
      </section>

      {/* Quick Links Section with Colorful Accent Cards */}
      <section className="grid grid-cols-2 gap-4 mb-5">
        <a
          href="/words"
          className="bg-gradient-to-br from-indigo-500 to-purple-600 text-white rounded-3xl p-5 shadow-md shadow-indigo-500/20 text-center transform active:scale-95 transition-all"
        >
          <div className="w-12 h-12 mx-auto bg-white/20 backdrop-blur-md rounded-2xl flex items-center justify-center text-2xl mb-2">
            📚
          </div>
          <p className="font-bold text-sm">শব্দ শেখো</p>
          <p className="text-[10px] text-indigo-100 opacity-80 mt-0.5">দৈনিক শব্দ ভাণ্ডার</p>
        </a>

        <a
          href="/sentences"
          className="bg-gradient-to-br from-amber-500 to-orange-600 text-white rounded-3xl p-5 shadow-md shadow-orange-500/20 text-center transform active:scale-95 transition-all"
        >
          <div className="w-12 h-12 mx-auto bg-white/20 backdrop-blur-md rounded-2xl flex items-center justify-center text-2xl mb-2">
            💬
          </div>
          <p className="font-bold text-sm">বাক্য প্র্যাকটিস</p>
          <p className="text-[10px] text-amber-100 opacity-80 mt-0.5">দৈনন্দিন কথোপকথন</p>
        </a>
      </section>

      {/* Today Practice (Quiz Section) */}
      {!loading && user && (
        <div className="bg-white rounded-3xl p-1 shadow-md shadow-slate-100 border border-slate-100">
          <TodayPractice userId={user.id} />
        </div>
      )}

      {/* ✨ Onboarding Modal Integration */}
      {needsOnboarding && (
        <OnboardingModal
          mode="onboarding"
          deviceId={deviceId}
          onComplete={(newUser) => {
            setUser(newUser as any);
            setNeedsOnboarding(false);
          }}
        />
      )}
    </main>
  );
}
