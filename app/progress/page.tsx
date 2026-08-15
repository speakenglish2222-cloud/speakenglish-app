"use client";

import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabaseClient";
import OnboardingModal from "@/components/OnboardingModal";

interface UserProfile {
  id: string;
  display_name: string;
  skill_level: string;
  streak_count: number;
}

export default function ProgressPage() {
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [stats, setStats] = useState({
    learnedWords: 0,
    bookmarkedWords: 0,
    completedPatterns: 0,
    completedCategories: 0,
  });
  const [weeklyLogs, setWeeklyLogs] = useState<boolean[]>([false, false, false, false, false, false, false]);
  const [loading, setLoading] = useState(true);
  const [showEditModal, setShowEditModal] = useState(false);

  // ডাইনামিক লেভেল ম্যাপার
  const levelBadges: Record<string, string> = {
    level1: "বিগিনার / কিডস ভোকাবুলারি",
    level2: "এলিমেন্টারি ভোকাবুলারি",
    level3: "ইন্টারমিডিয়েট কথপোকথন",
    level4: "এডভান্সড ফ্লুয়েন্সি",
  };

  const fetchUserData = async () => {
    setLoading(true);
    
    // ১. ইউজার ডাটা ফেচ
    const { data: userData } = await supabase.from("users").select("*").single();
    
    if (userData) {
      setProfile(userData);

      // ২. ভোকাবুলারি স্ট্যাট গণনা
      const { count: learnedCount } = await supabase
        .from("user_word_progress")
        .select("*", { count: "exact", head: true })
        .eq("user_id", userData.id)
        .eq("status", "learned");

      const { count: bookmarkCount } = await supabase
        .from("user_word_progress")
        .select("*", { count: "exact", head: true })
        .eq("user_id", userData.id)
        .eq("is_bookmarked", true);

      // ৩. সেন্টেন্স স্ট্যাট গণনা
      const { count: patternCount } = await supabase
        .from("user_pattern_progress")
        .select("*", { count: "exact", head: true })
        .eq("user_id", userData.id)
        .eq("status", "completed");

      const { count: categoryCount } = await supabase
        .from("user_category_progress")
        .select("*", { count: "exact", head: true })
        .eq("user_id", userData.id)
        .gte("progress_percent", 100);

      setStats({
        learnedWords: learnedCount || 0,
        bookmarkedWords: bookmarkCount || 0,
        completedPatterns: patternCount || 0,
        completedCategories: categoryCount || 0,
      });

      // ৪. গত ৭ দিনের রিয়েল অ্যাক্টিভিটি লগ
      const { data: activityLogs } = await supabase
        .from("user_activity_log")
        .select("activity_date")
        .eq("user_id", userData.id);

      const today = new Date();
      const last7Days = Array.from({ length: 7 }, (_, i) => {
        const d = new Date();
        d.setDate(today.getDate() - (6 - i));
        return d.toISOString().split("T")[0];
      });

      const activeDates = new Set(activityLogs?.map((log) => log.activity_date));
      setWeeklyLogs(last7Days.map((date) => activeDates.has(date)));
    }

    setLoading(false);
  };

  useEffect(() => {
    fetchUserData();
  }, []);

  if (loading) {
    return (
      <div className="min-h-screen p-6 flex items-center justify-center bg-[#F8FAFC]">
        <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-[#00A86B]"></div>
      </div>
    );
  }

  const isFirstTimeUser = !profile?.display_name || profile?.display_name === "শিক্ষার্থী";

  return (
    <div className="min-h-screen bg-[#F8FAFC] pb-24 p-4 max-w-md mx-auto">
      {/* First Time / Edit Profile Modal */}
      {(isFirstTimeUser || showEditModal) && profile && (
        <OnboardingModal
          userId={profile.id}
          initialName={profile.display_name !== "শিক্ষার্থী" ? profile.display_name : ""}
          initialLevel={profile.skill_level}
          isEditMode={showEditModal}
          onClose={() => setShowEditModal(false)}
          onComplete={() => {
            setShowEditModal(false);
            fetchUserData();
          }}
        />
      )}

      {/* Dynamic App-Matched Header Card */}
      <div className="bg-gradient-to-r from-[#00A86B] to-[#028A58] text-white rounded-[28px] p-6 shadow-xl shadow-[#00A86B]/20 mb-5 relative overflow-hidden">
        <div className="relative z-10">
          <div className="text-xs font-medium text-white/80">স্বাগতম</div>
          <div className="flex items-center justify-between mt-0.5">
            <h1 className="text-2xl font-bold">Hi, {profile?.display_name || "শিক্ষার্থী"} 👋</h1>
            <button
              onClick={() => setShowEditModal(true)}
              className="bg-white/20 backdrop-blur-md hover:bg-white/30 text-white px-3 py-1 rounded-full text-xs font-semibold transition border border-white/20"
            >
              ⚙️ চেঞ্জ
            </button>
          </div>

          {/* Dynamic Skill Level Badge */}
          <div className="mt-3 inline-flex items-center bg-white/15 backdrop-blur-md px-3.5 py-1.5 rounded-full border border-white/20 text-xs font-semibold">
            {levelBadges[profile?.skill_level || "level1"]}
          </div>

          {/* Dynamic Streak Pill */}
          <div className="mt-4 pt-3.5 border-t border-white/15 flex items-center justify-between">
            <div className="inline-flex items-center gap-1.5 bg-black/15 backdrop-blur-md px-3 py-1 rounded-full text-xs font-bold text-amber-300">
              🔥 {profile?.streak_count || 0} দিন
            </div>
          </div>
        </div>
      </div>

      {/* 60-Day Challenge Box */}
      <div className="bg-white rounded-[24px] p-5 shadow-sm border border-gray-100 mb-5">
        <div className="flex justify-between items-center mb-1.5">
          <h3 className="font-bold text-gray-800 text-base">৬০ দিনের চ্যালেঞ্জ</h3>
          <span className="text-xs font-bold text-[#00A86B] bg-[#E8F8F2] px-2.5 py-1 rounded-full">
            ১৭%
          </span>
        </div>
        <p className="text-xs text-gray-500 mb-3">১০ তম দিনের লক্ষ্য পূরণ বাকি 🎯</p>
        <div className="w-full bg-gray-100 rounded-full h-3">
          <div
            className="bg-[#00A86B] h-3 rounded-full transition-all duration-500"
            style={{ width: "17%" }}
          ></div>
        </div>
      </div>

      {/* Dynamic Learning Statistics Cards */}
      <h3 className="font-bold text-gray-800 mb-3 text-sm px-1">আপনার শিক্ষা ড্যাশবোর্ড</h3>
      <div className="grid grid-cols-2 gap-3 mb-5">
        {/* Words Card */}
        <div className="bg-gradient-to-br from-[#7C4DFF] to-[#651FFF] text-white p-5 rounded-[24px] shadow-lg shadow-[#7C4DFF]/20 relative overflow-hidden">
          <div className="text-3xl mb-2">📚</div>
          <div className="text-2xl font-bold">{stats.learnedWords} টি</div>
          <div className="text-xs text-white/80 mt-1 font-medium">শেখা শব্দ</div>
          <div className="mt-3 text-[11px] bg-white/20 backdrop-blur-sm px-2.5 py-1 rounded-lg inline-block font-semibold">
            ★ {stats.bookmarkedWords} বুকমার্ক
          </div>
        </div>

        {/* Sentences Card */}
        <div className="bg-gradient-to-br from-[#FF6D00] to-[#FF9100] text-white p-5 rounded-[24px] shadow-lg shadow-[#FF6D00]/20 relative overflow-hidden">
          <div className="text-3xl mb-2">💬</div>
          <div className="text-2xl font-bold">{stats.completedPatterns} টি</div>
          <div className="text-xs text-white/80 mt-1 font-medium">শেখা বাক্য</div>
          <div className="mt-3 text-[11px] bg-white/20 backdrop-blur-sm px-2.5 py-1 rounded-lg inline-block font-semibold">
            ✓ {stats.completedCategories} ক্যাটাগরি
          </div>
        </div>
      </div>

      {/* Weekly Activity Grid */}
      <div className="bg-white rounded-[24px] p-5 shadow-sm border border-gray-100">
        <h3 className="font-bold text-gray-800 text-sm mb-3.5">গত ৭ দিনের অ্যাক্টিভিটি</h3>
        <div className="flex justify-between items-center px-1">
          {["শনি", "রবি", "সোম", "মঙ্গল", "বুধ", "বৃহ", "শুক্র"].map((day, idx) => (
            <div key={idx} className="flex flex-col items-center gap-2">
              <div
                className={`w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold transition ${
                  weeklyLogs[idx]
                    ? "bg-[#00A86B] text-white shadow-md shadow-[#00A86B]/30 scale-105"
                    : "bg-gray-100 text-gray-400"
                }`}
              >
                {weeklyLogs[idx] ? "✓" : ""}
              </div>
              <span className="text-[11px] text-gray-500 font-medium">{day}</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
