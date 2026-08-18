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

const LEVEL_LABELS: Record<string, string> = {
  level1: "বিগিনার / কিডস ভোকাবুলারি",
  level2: "বেসিক ভোকাবুলারি",
  level3: "ইন্টারমিডিয়েট (স্পোকেন ও ক্যারিয়ার)",
  level4: "অ্যাডভান্সড ভোকাবুলারি",
};

const WEEKDAY_LABELS_BN = ["শনি", "রবি", "সোম", "মঙ্গল", "বুধ", "বৃহস্পতি", "শুক্র"];
// getDay(): 0=রবি,1=সোম,...,6=শনি — উপরের অ্যারের ইনডেক্সে ম্যাপ করার জন্য
const JS_DAY_TO_LABEL_INDEX = [1, 2, 3, 4, 5, 6, 0]; // রবি..শনি -> লেবেল ইনডেক্স

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
      <main className="p-5 pt-8">
        <p className="text-muted">লোড হচ্ছে...</p>
      </main>
    );
  }

  if (!user) {
    return (
      <main className="p-5 pt-8">
        <p className="text-muted">
          প্রথমে হোম পেজে গিয়ে আপনার প্রোফাইল সেটআপ করুন।
        </p>
      </main>
    );
  }

  const daysSinceStart = Math.min(
    60,
    Math.floor(
      (Date.now() - new Date(user.challenge_start_date).getTime()) /
        (1000 * 60 * 60 * 24)
    ) + 1
  );
  const progressPercent = Math.round((daysSinceStart / 60) * 100);

  // গত ৭ দিনের বার তৈরি করা (শনি → শুক্র ক্রমে)
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
    <main className="p-5 pt-8 pb-24">
      <h1 className="text-xl font-bold mb-4">প্রোগ্রেস ড্যাশবোর্ড</h1>

      {/* প্রোফাইল কার্ড */}
      <section className="bg-brand text-white rounded-card p-5 mb-5">
        <p className="font-bold text-lg">👤 {user.name || "শিক্ষার্থী"}</p>
        <div className="flex justify-between items-center mt-2">
          <span className="bg-white/20 text-sm px-3 py-1 rounded-full">
            🏷️ {LEVEL_LABELS[user.current_level]}
          </span>
          <button
            onClick={() => setShowEditModal(true)}
            className="bg-white/20 text-sm px-3 py-1 rounded-full"
          >
            ⚙️ Change
          </button>
        </div>
        <p className="mt-3 text-sm">🔥 {user.streak_count} দিন স্ট্রিক</p>
      </section>

      {/* ৬০ দিনের চ্যালেঞ্জ */}
      <section className="bg-white rounded-card p-5 shadow-sm mb-5">
        <div className="flex justify-between items-center mb-1">
          <h2 className="font-bold">৬০ দিনের চ্যালেঞ্জ</h2>
          <span className="text-brand font-semibold text-sm">
            {progressPercent}%
          </span>
        </div>
        <p className="text-muted text-sm mb-3">
          {daysSinceStart} তম দিনের লক্ষ্য পূরণ করা বাকি 🎯
        </p>
        <div className="w-full bg-surface rounded-full h-2">
          <div
            className="bg-brand h-2 rounded-full"
            style={{ width: `${progressPercent}%` }}
          />
        </div>
      </section>

      {/* অর্জন */}
      <p className="font-bold mb-2">📊 আপনার অর্জন</p>
      <section className="grid grid-cols-2 gap-4 mb-5">
        <div className="bg-white rounded-card p-4 shadow-sm">
          <p className="text-sm text-muted">📚 শেখা শব্দ</p>
          <p className="text-xl font-bold text-brand">{learnedWords}টি</p>
          <p className="text-xs text-muted mt-1">★ {bookmarkedWords}টি বুকমার্ক</p>
        </div>
        <div className="bg-white rounded-card p-4 shadow-sm">
          <p className="text-sm text-muted">💬 শেখা বাক্য</p>
          <p className="text-xl font-bold text-brand">
            {categoriesTouched}টি ক্যাটাগরি
          </p>
          <p className="text-xs text-muted mt-1">{patternsCompleted}টি প্যাটার্ন</p>
        </div>
      </section>

      {/* সাপ্তাহিক এক্টিভিটি */}
      <p className="font-bold mb-2">📅 এই সপ্তাহের অ্যাক্টিভিটি</p>
      <section className="bg-white rounded-card p-5 shadow-sm">
        <div className="flex justify-between items-end h-24">
          {last7.map((day, i) => (
            <div key={i} className="flex flex-col items-center gap-1 flex-1">
              <div
                className={`w-4 rounded-full ${
                  day.active ? "bg-brand h-16" : "bg-surface h-4"
                }`}
              />
              <span className="text-[10px] text-muted">{day.label}</span>
            </div>
          ))}
        </div>
      </section>

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
  
