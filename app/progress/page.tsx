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

  const levelBadges: Record<string, string> = {
    level1: "A1 (বিগিনার)",
    level2: "A2 (এলিমেন্টারি)",
    level3: "B1 (ইন্টারমিডিয়েট)",
    level4: "B2 (আপার-ইন্টারমিডিয়েট)",
  };

  const fetchUserData = async () => {
    setLoading(true);
    
    // ১. ইউজার প্রোফাইল ডাটা লোড
    const { data: userData } = await supabase.from("users").select("*").single();
    
    if (userData) {
      setProfile(userData);

      // ২. ভোকাবুলারি স্ট্যাট
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

      // ৩. সেন্টেন্স স্ট্যাট
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

      // ৪. গত ৭ দিনের অ্যাক্টিভিটি চেক
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
      <div className="min-h-screen p-6 flex items-center justify-center bg-gray-50">
        <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-emerald-600"></div>
      </div>
    );
  }

  // যদি ইউজারের নাম সেট না থাকে (First Time Login)
  const isFirstTimeUser = !profile?.display_name || profile?.display_name === "শিক্ষার্থী";

  return (
    <div className="min-h-screen bg-gray-50 pb-20 p-4 max-w-md mx-auto">
      {/* First Time or Edit Modal */}
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

      {/* Header Profile Section */}
      <div className="bg-gradient-to-r from-emerald-600 to-teal-700 text-white rounded-3xl p-5 shadow-lg mb-4">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-xl font-bold">Hi, {profile?.display_name || "শিক্ষার্থী"} 👋</h1>
            <span className="inline-block mt-1 bg-white/20 backdrop-blur-md px-3 py-1 rounded-full text-xs font-medium">
              🏷️ লেভেল: {levelBadges[profile?.skill_level || "level1"]}
            </span>
          </div>
          <button
            onClick={() => setShowEditModal(true)}
            className="bg-white text-emerald-700 font-semibold px-3 py-1.5 rounded-xl text-xs shadow hover:bg-emerald-50 transition"
          >
            ⚙️ চেঞ্জ
          </button>
        </div>

        {/* Streak Counter */}
        <div className="mt-4 pt-4 border-t border-white/20 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <span className="text-2xl">🔥</span>
            <div>
              <div className="text-lg font-bold leading-none">{profile?.streak_count || 0} দিন</div>
              <div className="text-[11px] opacity-80">একটানা প্র্যাকটিস স্ট্রিক</div>
            </div>
          </div>
        </div>
      </div>

      {/* Challenge Tracker */}
      <div className="bg-white rounded-2xl p-4 shadow-sm border border-gray-100 mb-4">
        <div className="flex justify-between items-center mb-2">
          <h3 className="font-bold text-gray-800 text-sm">৬০ দিনের চ্যালেঞ্জ</h3>
          <span className="text-xs font-bold text-emerald-600">১৭%</span>
        </div>
        <p className="text-xs text-gray-500 mb-2">১০ তম দিনের লক্ষ্য পূরণ বাকি 🎯</p>
        <div className="w-full bg-gray-100 rounded-full h-2.5">
          <div className="bg-emerald-500 h-2.5 rounded-full" style={{ width: "17%" }}></div>
        </div>
      </div>

      {/* Statistics Grid */}
      <h3 className="font-bold text-gray-800 mb-2 text-sm">আপনার অর্জনসমূহ</h3>
      <div className="grid grid-cols-2 gap-3 mb-4">
        <div className="bg-white p-4 rounded-2xl border border-gray-100 shadow-sm">
          <div className="text-2xl mb-1">📚</div>
          <div className="text-xl font-bold text-gray-800">{stats.learnedWords} টি</div>
          <div className="text-xs text-gray-500 mt-0.5">শেখা শব্দ</div>
          <div className="text-[11px] text-amber-600 mt-2 font-medium">★ {stats.bookmarkedWords}টি বুকমার্ক</div>
        </div>

        <div className="bg-white p-4 rounded-2xl border border-gray-100 shadow-sm">
          <div className="text-2xl mb-1">💬</div>
          <div className="text-xl font-bold text-gray-800">{stats.completedPatterns} টি</div>
          <div className="text-xs text-gray-500 mt-0.5">শেখা বাক্য/প্যাটার্ন</div>
          <div className="text-[11px] text-emerald-600 mt-2 font-medium">✓ {stats.completedCategories}টি ক্যাটাগরি শেষ</div>
        </div>
      </div>

      {/* Weekly Activity Grid */}
      <div className="bg-white rounded-2xl p-4 shadow-sm border border-gray-100">
        <h3 className="font-bold text-gray-800 text-sm mb-3">গত ৭ দিনের অ্যাক্টিভিটি</h3>
        <div className="flex justify-between items-center px-1">
          {["শনি", "রবি", "সোম", "মঙ্গল", "বুধ", "বৃহ", "শুক্রবার"].map((day, idx) => (
            <div key={idx} className="flex flex-col items-center gap-1.5">
              <div
                className={`w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold ${
                  weeklyLogs[idx] ? "bg-emerald-500 text-white shadow-sm shadow-emerald-200" : "bg-gray-100 text-gray-400"
                }`}
              >
                {weeklyLogs[idx] ? "✓" : ""}
              </div>
              <span className="text-[10px] text-gray-500">{day}</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
