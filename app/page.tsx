"use client";

import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabase";
import { getDeviceId } from "@/lib/device";
import TodayPractice from "@/components/TodayPractice";

type UserRow = {
  id: string;
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

  useEffect(() => {
    async function loadOrCreateUser() {
      const deviceId = getDeviceId();
      if (!deviceId) return;

      const { data: existing } = await supabase
        .from("users")
        .select("*")
        .eq("device_id", deviceId)
        .maybeSingle();

      if (existing) {
        setUser(existing as UserRow);
      } else {
        const { data: created } = await supabase
          .from("users")
          .insert({ device_id: deviceId })
          .select()
          .single();
        setUser(created as UserRow);
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
    <main className="p-5 pt-8">
      {/* Hero */}
      <section className="bg-brand text-white rounded-card p-6 mb-5">
        <p className="text-sm opacity-80">স্বাগতম</p>
        <h1 className="text-2xl font-bold mb-3">Hi, শিক্ষার্থী 👋</h1>
        <div className="flex gap-2">
          <span className="bg-white/20 text-sm px-3 py-1 rounded-full">
            {loading ? "..." : LEVEL_LABELS[user?.current_level ?? "level1"]}
          </span>
          <span className="bg-white/20 text-sm px-3 py-1 rounded-full">
            🔥 {loading ? "..." : user?.streak_count ?? 0}
          </span>
        </div>
      </section>

      {/* Challenge progress */}
      <section className="bg-white rounded-card p-5 shadow-sm mb-5">
        <h2 className="font-bold mb-1">৬০ দিনের চ্যালেঞ্জ</h2>
        <p className="text-muted text-sm mb-3">
          {daysSinceStart} তম দিনের লক্ষ্য পূরণ করা বাকি
        </p>
        <div className="w-full bg-surface rounded-full h-2">
          <div
            className="bg-brand h-2 rounded-full transition-all"
            style={{ width: `${progressPercent}%` }}
          />
        </div>
        <p className="text-right text-brand text-sm font-semibold mt-1">
          {progressPercent}%
        </p>
      </section>

      {/* আজকের প্র্যাকটিস */}
      {!loading && user && <TodayPractice userId={user.id} />}

      {/* Quick links */}
      <section className="grid grid-cols-2 gap-4">
        <a
          href="/words"
          className="bg-white rounded-card p-5 shadow-sm text-center"
        >
          <p className="text-3xl mb-2">📖</p>
          <p className="font-semibold">শব্দ শেখো</p>
        </a>
        <a
          href="/sentences"
          className="bg-white rounded-card p-5 shadow-sm text-center"
        >
          <p className="text-3xl mb-2">💬</p>
          <p className="font-semibold">বাক্য প্র্যাকটিস</p>
        </a>
      </section>
    </main>
  );
}
