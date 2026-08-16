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
};

const LEVEL_LABELS: Record<string, string> = {
  level1: "বিগিনার / কিডস",
  level2: "বেসিক",
  level3: "ইন্টারমিডিয়েট",
  level4: "অ্যাডভান্সড",
};

export default function ProgressPage() {
  const [user, setUser] = useState<UserRow | null>(null);
  const [loading, setLoading] = useState(true);
  const [showEditModal, setShowEditModal] = useState(false);

  // স্ট্যাট কাউন্ট
  const [completedWords, setCompletedWords] = useState(0);
  const [completedPatterns, setCompletedPatterns] = useState(0);

  useEffect(() => {
    async function fetchProgress() {
      const deviceId = getDeviceId();
      if (!deviceId) return;

      // ১. ইউজার ইনফো আনা
      const { data: userData } = await supabase
        .from("users")
        .select("id, name, current_level, streak_count")
        .eq("device_id", deviceId)
        .maybeSingle();

      if (userData) {
        setUser(userData as UserRow);

        // ২. সম্পন্ন হওয়া শব্দের সংখ্যা গণনা
        const { count: wordCount } = await supabase
          .from("user_word_progress")
          .select("*", { count: "exact", head: true })
          .eq("user_id", userData.id)
          .eq("status", "mastered");

        setCompletedWords(wordCount ?? 0);

        // ৩. সম্পন্ন হওয়া সেন্টেন্স প্যাটার্নের সংখ্যা গণনা
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
        <div className="h-32 bg-slate-200/70 rounded-3xl animate-pulse" />
        <div className="h-24 bg-slate-200/70 rounded-3xl animate-pulse" />
        <div className="h-24 bg-slate-200/70 rounded-3xl animate-pulse" />
      </main>
    );
  }

  return (
    <main className="p-5 pt-8 min-h-screen bg-slate-50 max-w-md mx-auto space-y-5">
      <h1 className="text-xl font-extrabold text-slate-800 tracking-tight">
        আমার অগ্রগতি (Progress)
      </h1>

      {/* Profile & Level Card */}
      <section className="bg-white rounded-3xl p-6 border border-slate-200/80 shadow-sm relative overflow-hidden">
        <div className="flex items-center justify-between mb-4">
          <div>
            <p className="text-xs font-bold text-slate-400 uppercase tracking-wider">
              শিক্ষার্থী
            </p>
            <h2 className="text-xl font-black text-slate-800">
              {user?.name || "ব্যবহারকারী"}
            </h2>
          </div>
          <div className="w-12 h-12 rounded-2xl bg-gradient-to-tr from-indigo-500 to-purple-500 flex items-center justify-center text-white text-xl shadow-md">
            👤
          </div>
        </div>

        <div className="flex items-center justify-between pt-4 border-t border-slate-100">
          <div>
            <p className="text-[10px] font-bold text-slate-400 uppercase">
              বর্তমান লেভেল
            </p>
            <p className="text-sm font-extrabold text-indigo-600">
              {LEVEL_LABELS[user?.current_level ?? "level1"]}
            </p>
          </div>

          <button
            onClick={() => setShowEditModal(true)}
            className="px-4 py-2 bg-indigo-50 hover:bg-indigo-100 text-indigo-600 font-bold text-xs rounded-xl transition-all active:scale-95"
          >
            ✏️ লেভেল পরিবর্তন
          </button>
        </div>
      </section>

      {/* Stats Cards */}
      <section className="grid grid-cols-2 gap-4">
        {/* Streak Stats */}
        <div className="bg-gradient-to-br from-amber-500 to-orange-500 text-white rounded-3xl p-5 shadow-lg shadow-orange-500/20">
          <div className="w-10 h-10 rounded-2xl bg-white/20 backdrop-blur-md flex items-center justify-center text-xl mb-3">
            🔥
          </div>
          <p className="text-2xl font-black">{user?.streak_count ?? 0} দিন</p>
          <p className="text-xs text-amber-100 font-medium mt-0.5">
            ডেইলি স্ট্রিক
          </p>
        </div>

        {/* Mastered Words Stats */}
        <div className="bg-gradient-to-br from-indigo-500 to-purple-600 text-white rounded-3xl p-5 shadow-lg shadow-indigo-500/20">
          <div className="w-10 h-10 rounded-2xl bg-white/20 backdrop-blur-md flex items-center justify-center text-xl mb-3">
            📚
          </div>
          <p className="text-2xl font-black">{completedWords}</p>
          <p className="text-xs text-indigo-100 font-medium mt-0.5">
            শেখা শব্দাবলী
          </p>
        </div>
      </section>

      {/* Completed Sentence Patterns */}
      <section className="bg-white rounded-3xl p-5 border border-slate-200/80 shadow-sm flex items-center gap-4">
        <div className="w-12 h-12 rounded-2xl bg-emerald-100 text-emerald-600 flex items-center justify-center text-2xl flex-shrink-0">
          💬
        </div>
        <div>
          <p className="text-xl font-black text-slate-800">
            {completedPatterns} টি প্যাটার্ন
          </p>
          <p className="text-xs text-slate-500 font-medium">
            বাক্য তৈরির অনুশীলন সম্পন্ন হয়েছে
          </p>
        </div>
      </section>

      {/* 🚀 Edit Mode (Reusable Modal Integration) */}
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
